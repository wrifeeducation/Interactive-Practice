#!/usr/bin/env node
/**
 * parse-all-lessons.js
 * Parses all WriFe lesson HTML files and regenerates lessons.json
 *
 * Handles 5 format types found across the lesson library:
 *   1. compact acts[]        – Rebuilt L01-L11, L54-L67
 *   2. const activities[]    – L13, L16-17, L19-20, L26, L29-35, L37-45, L51-53
 *   3. data-correct HTML     – L21-L25, L36
 *   4. data-answer HTML      – L46-L50
 *   5. onclick checkAnswer   – L12, L15, L18, L31
 *
 * Usage:  node scripts/parse-all-lessons.js
 * Output: content/lessons.json  +  content/parse-report.md
 */

'use strict'

const fs   = require('fs')
const path = require('path')
const vm   = require('vm')
const cheerio = require('cheerio')

// ─── Paths ──────────────────────────────────────────────────────────────────

const REBUILT_DIR  = path.join(__dirname, '../../WriFe Lessons/Rebuilt Interactive Practice Files')
const LESSONS_DIR  = path.join(__dirname, '../../WriFe Lessons')
const OUTPUT_JSON  = path.join(__dirname, '../content/lessons.json')
const OUTPUT_REPORT = path.join(__dirname, '../content/parse-report.md')

// ─── World / Level mappings ─────────────────────────────────────────────────

function getWorldId(n) {
  if (n <=  9) return 1
  if (n <= 19) return 2
  if (n <= 31) return 3
  if (n <= 45) return 4
  if (n <= 51) return 5
  if (n <= 61) return 6
  return 7 // L62-L67 bonus
}

const WORLD_TITLES = {
  1: 'Story Seeds',
  2: 'Grammar Toolkit',
  3: 'Sentence Builders',
  4: "Writer's Craft",
  5: 'Flow & Finish',
  6: 'Genre Arena',
  7: 'Extended Writing',
}

/** W1/W2 → bronze, W3/W4 → silver, W5/W6 → gold */
function weekToLevel(weekStr) {
  const n = parseInt(String(weekStr).replace(/\D/g, ''), 10)
  if (n <= 2) return 'bronze'
  if (n <= 4) return 'silver'
  return 'gold'
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace. */
function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract a balanced JS array literal starting from `startIdx` in `str`.
 * Returns the raw string of the array including the outer [ ].
 */
function extractBalancedArray(str, startIdx) {
  let depth = 0
  let i = startIdx
  let inStr = false
  let strChar = ''
  let inTemplate = false

  while (i < str.length) {
    const ch = str[i]

    if (inStr) {
      if (ch === '\\') { i += 2; continue }
      if (ch === strChar) inStr = false
      i++; continue
    }
    if (inTemplate) {
      if (ch === '\\') { i += 2; continue }
      if (ch === '`') inTemplate = false
      i++; continue
    }

    if (ch === '"' || ch === "'") { inStr = true; strChar = ch; i++; continue }
    if (ch === '`') { inTemplate = true; i++; continue }

    if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return str.slice(startIdx, i + 1)
    }
    i++
  }
  return null
}

/** Build a minimal MCQuestion-compatible object. */
function makeMC(question, options, correctText, feedbackCorrect, feedbackWrong) {
  return {
    question_json: {
      question:  question,
      options:   options,
      correct:   correctText,
      feedback:  {
        correct: feedbackCorrect || 'Well done!',
        wrong:   feedbackWrong  || 'Not quite — have another look.',
      },
    },
    answer_json: { correct: correctText },
  }
}

/** Build a MatchQuestion-compatible object. */
function makeMatch(question, instruction, pairs) {
  return {
    question_json: { question, instruction: instruction || 'Match each item on the left with the correct item on the right.', pairs },
    answer_json:   { pairs },
  }
}

/** Build a FillBlankQuestion-compatible object. */
function makeFillBlank(question, template, blanks, feedback) {
  return {
    question_json: { question, template, blanks, feedback: feedback || 'Check the correct words.' },
    answer_json:   { blanks },
  }
}

/** Build a WriteQuestion-compatible object. */
function makeWrite(question, prompt, instruction, modelAnswer) {
  return {
    question_json: {
      question,
      prompt:      prompt || question,
      instruction: instruction || 'Write your answer in full sentences.',
      modelAnswer: modelAnswer || '',
    },
    answer_json: { modelAnswer: modelAnswer || '' },
  }
}

/** Build a ChecklistQuestion-compatible object. */
function makeChecklist(question, instruction, items) {
  return {
    question_json: { question, instruction: instruction || 'Tick each criterion you have met.', items },
    answer_json:   { items },
  }
}

// ─── Format 1: compact acts[] ───────────────────────────────────────────────

function parseActsFormat(html, lessonNum) {
  // Find the last <script> block (activities are always in the last script)
  const scripts = []
  const scriptRe = /<script>([\s\S]*?)<\/script>/gi
  let m
  while ((m = scriptRe.exec(html)) !== null) scripts.push(m[1])
  const script = scripts[scripts.length - 1] || ''

  // Find the opening bracket of the acts array
  const headerIdx = script.search(/const\s+acts\s*=\s*\[/)
  if (headerIdx === -1) return null

  const bracketIdx = script.indexOf('[', headerIdx)
  const raw = extractBalancedArray(script, bracketIdx)
  if (!raw) return null

  // Evaluate safely in a VM sandbox
  let acts
  try {
    const sandbox = {}
    vm.createContext(sandbox)
    vm.runInContext(`var __acts = ${raw}`, sandbox)
    acts = sandbox.__acts
  } catch (e) {
    console.warn(`  [acts] VM eval failed for L${lessonNum}: ${e.message}`)
    return null
  }

  if (!Array.isArray(acts)) return null

  const activities = []
  let sortOrder = 1

  for (const a of acts) {
    const level = weekToLevel(a.level || 'w1')
    const type  = normaliseType(a.type || 'mc')

    // Build the question text: combine instruction + extract + question
    let questionText = a.q || ''
    if (a.ins) questionText = a.ins + (a.q ? '\n\n' + a.q : '')
    if (a.ex)  questionText = questionText + '\n\n' + a.ex

    let qj, aj

    if (type === 'mc') {
      const opts  = (a.opts || []).map(o => String(o))
      const corIdx = Number(a.cor) || 0
      const correctText = opts[corIdx] || opts[0] || ''
      ;({ question_json: qj, answer_json: aj } = makeMC(
        questionText, opts, correctText,
        a.fb?.c || '', a.fb?.w || ''
      ))

    } else if (type === 'match') {
      // Various match sub-formats all use a pairs{leftIdx:rightIdx} object
      // with left items in: left[] / leftItems[]
      // and right items in: right[] / rightItems[]
      let pairs
      const leftArr  = a.left  || a.leftItems  || []
      const rightArr = a.right || a.rightItems || []
      if (Array.isArray(leftArr) && Array.isArray(rightArr) && a.pairs && typeof a.pairs === 'object' && !Array.isArray(a.pairs)) {
        pairs = Object.entries(a.pairs).map(([li, ri]) => ({
          left:  String(leftArr[parseInt(li)]  || ''),
          right: String(rightArr[parseInt(ri)] || ''),
        }))
      } else if (Array.isArray(a.pairs)) {
        pairs = a.pairs.map(p => ({
          left:  String(p.l || p.left  || ''),
          right: String(p.r || p.right || ''),
        }))
      } else {
        pairs = []
      }
      ;({ question_json: qj, answer_json: aj } = makeMatch(questionText, a.ins || a.instruction || '', pairs))

    } else if (type === 'fillblank') {
      // Handle {before, after, answer} blank format → template string + blanks[]
      let tmpl, blanks
      if (Array.isArray(a.blanks) && a.blanks.length > 0 && 'before' in (a.blanks[0] || {})) {
        tmpl   = a.blanks.map(b => `${b.before || ''}___${b.after || ''}`).join(' ')
        blanks = a.blanks.map((b, i) => ({ index: i, answer: String(b.answer || b.ans || '') }))
      } else {
        tmpl   = a.tmpl || a.template || questionText
        blanks = (a.blanks || []).map((b, i) => ({ index: b.idx ?? b.index ?? i, answer: String(b.ans || b.answer || '') }))
      }
      ;({ question_json: qj, answer_json: aj } = makeFillBlank(questionText, tmpl, blanks, a.fb?.c || ''))

    } else if (type === 'write') {
      // ph = placeholder template shown to pupil
      ;({ question_json: qj, answer_json: aj } = makeWrite(
        questionText, a.ph || a.prompt || '', a.ins || '', a.model || a.modelAnswer || ''
      ))

    } else if (type === 'checklist') {
      // checkItems or items
      const rawItems = a.checkItems || a.items || []
      const items = rawItems.map((it, idx) => ({
        id:   String(it.id || idx + 1),
        text: stripHtml(String(it.text || it.criterion || it)),
      }))
      ;({ question_json: qj, answer_json: aj } = makeChecklist(questionText, a.ins || a.instruction || '', items))

    } else {
      continue // skip unknown types
    }

    activities.push({ type, level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  }

  return activities
}

// ─── Format 2: const activities[] ─────────────────────────────────────────

function parseActivitiesFormat(html, lessonNum) {
  const scripts = []
  const scriptRe = /<script>([\s\S]*?)<\/script>/gi
  let m
  while ((m = scriptRe.exec(html)) !== null) scripts.push(m[1])
  const script = scripts[scripts.length - 1] || ''

  const headerIdx = script.search(/const\s+activities\s*=\s*\[/)
  if (headerIdx === -1) return null

  const bracketIdx = script.indexOf('[', headerIdx)
  const raw = extractBalancedArray(script, bracketIdx)
  if (!raw) return null

  let activitiesArr
  try {
    const sandbox = {}
    vm.createContext(sandbox)
    vm.runInContext(`var __acts = ${raw}`, sandbox)
    activitiesArr = sandbox.__acts
  } catch (e) {
    console.warn(`  [activities] VM eval failed for L${lessonNum}: ${e.message}`)
    return null
  }

  if (!Array.isArray(activitiesArr)) return null

  const activities = []
  let sortOrder = 1

  for (const a of activitiesArr) {
    // Level: new format uses level:'w4', old format uses week:'W1'
    const levelRaw = a.level || a.week || 'W1'
    const level = weekToLevel(levelRaw)
    const type  = normaliseType(a.type || 'multiple-choice')

    // Extract plain question text — handle both HTML content and plain string
    let questionText = ''
    if (a.question && typeof a.question === 'string') {
      questionText = stripHtml(a.question)
    } else if (a.content) {
      const $c = cheerio.load(String(a.content))
      const qEl = $c('.question').first()
      questionText = qEl.length
        ? stripHtml($c('.question').map((_, el) => $c(el).html()).get().join(' '))
        : stripHtml(String(a.content))
    }
    if (!questionText && a.title) questionText = String(a.title)

    let qj, aj

    if (type === 'mc') {
      const opts = (a.options || a.opts || []).map(o => stripHtml(String(o)))
      const corIdx = typeof a.correct === 'number' ? a.correct : 0
      const correctText = opts[corIdx] || opts[0] || ''
      const fbCorrect = (a.feedback?.correct || (typeof a.feedback === 'string' ? a.feedback : ''))
      const fbWrong   = (a.feedback?.wrong   || (typeof a.feedback === 'string' ? a.feedback : ''))
      ;({ question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, fbCorrect, fbWrong))

    } else if (type === 'match') {
      let pairs
      if (Array.isArray(a.left) && Array.isArray(a.right) && a.pairs && typeof a.pairs === 'object' && !Array.isArray(a.pairs)) {
        pairs = Object.entries(a.pairs).map(([li, ri]) => ({
          left:  String(a.left[parseInt(li)]  || ''),
          right: String(a.right[parseInt(ri)] || ''),
        }))
      } else if (Array.isArray(a.leftItems) && Array.isArray(a.rightItems) && a.pairs && typeof a.pairs === 'object' && !Array.isArray(a.pairs)) {
        // leftItems[] + rightItems[] + pairs{leftIdx: rightIdx}
        pairs = Object.entries(a.pairs).map(([li, ri]) => ({
          left:  String(a.leftItems[parseInt(li)]  || ''),
          right: String(a.rightItems[parseInt(ri)] || ''),
        }))
      } else if (Array.isArray(a.pairs)) {
        pairs = a.pairs.map(p => ({
          left:  stripHtml(String(p.left || p.l || p.term || '')),
          right: stripHtml(String(p.right || p.r || p.definition || '')),
        }))
      } else {
        pairs = []
      }
      ;({ question_json: qj, answer_json: aj } = makeMatch(questionText, a.instruction || '', pairs))

    } else if (type === 'fillblank') {
      let tmpl, blanks
      if (Array.isArray(a.blanks) && a.blanks.length > 0 && 'before' in (a.blanks[0] || {})) {
        tmpl   = a.blanks.map(b => `${b.before || ''}___${b.after || ''}`).join(' ')
        blanks = a.blanks.map((b, i) => ({ index: i, answer: String(b.answer || b.ans || '') }))
      } else {
        tmpl   = a.template || a.tmpl || questionText
        blanks = (a.blanks || []).map((b, i) => ({ index: b.index ?? b.idx ?? i, answer: String(b.answer || b.ans || '') }))
      }
      const fbText = a.feedback?.correct || (typeof a.feedback === 'string' ? a.feedback : '')
      ;({ question_json: qj, answer_json: aj } = makeFillBlank(questionText, tmpl, blanks, fbText))

    } else if (type === 'write') {
      const model = a.modelAnswer || a.model || ''
      ;({ question_json: qj, answer_json: aj } = makeWrite(
        questionText, a.ph || a.prompt || '', a.instruction || a.ins || '', model
      ))

    } else if (type === 'checklist') {
      const rawItems = a.checkItems || a.items || a.criteria || []
      const items = rawItems.map((it, idx) => ({
        id:   String(it.id || idx + 1),
        text: stripHtml(String(it.text || it.criterion || it)),
      }))
      ;({ question_json: qj, answer_json: aj } = makeChecklist(questionText, a.instruction || a.ins || '', items))

    } else {
      continue
    }

    activities.push({ type, level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  }

  return activities
}

// ─── Format 3: data-correct HTML ────────────────────────────────────────────

function parseDataCorrectFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  // Match both data-activity="N" AND id="activityN" containers
  const activityEls = $('[data-activity], div.activity[id^="activity"]').toArray()

  for (const el of activityEls) {
    const $el = $(el)

    // Determine week/level from multiple sources
    const diffAttr   = $el.attr('data-difficulty') || ''
    const weekAttr   = $el.attr('data-week') || ''
    const actNumText = $el.find('.activity-number, .activity-title').first().text() || ''
    const weekTagTxt = $el.find('.week-tag').first().text() || ''
    const combined   = [diffAttr, weekAttr, actNumText, weekTagTxt].join(' ')
    const weekMatch  = combined.match(/W(\d)/)
    const level      = weekMatch ? weekToLevel('W' + weekMatch[1]) : 'bronze'

    // Extract question text — look for dedicated question elements, avoid option containers
    let questionText = ''
    const qEl = $el.find('.question-text, .question-box').first()
    if (qEl.length) {
      questionText = stripHtml(qEl.html() || '')
    } else {
      // Walk through <p> and <h3>/<h4> elements that aren't inside option containers
      const parts = []
      $el.find('p, h3, h4').each((_, node) => {
        const $node = $(node)
        if ($node.closest('.options, .option-container').length) return
        if ($node.find('.option').length) return
        const t = $node.text().trim()
        if (t && !t.match(/^Activity \d+ of \d+/) && !t.match(/^W\d/)) parts.push(t)
      })
      questionText = parts.slice(0, 3).join(' ').trim()
    }

    // Extract options and find correct
    const opts = []
    let correctText = ''
    $el.find('.option[data-correct], .option-btn[data-correct], button[data-correct]').each((_, opt) => {
      const $opt  = $(opt)
      const text  = stripHtml($opt.html() || '')
      const isCorrect = $opt.attr('data-correct') === 'true'
      opts.push(text)
      if (isCorrect) correctText = text
    })

    if (!opts.length || !questionText) continue

    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  }

  return activities.length ? activities : null
}

// ─── Format 4: data-answer HTML ─────────────────────────────────────────────

function parseDataAnswerFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  // Match both data-activity="N" AND id="activityN" containers (L14 uses id=)
  $('[data-activity], div.activity[id^="activity"]').each((_, el) => {
    const $el = $(el)

    // Skip if this activity has no data-answer options (avoid false matches)
    if (!$el.find('[data-answer]').length) return

    // Level from badge class: badge-w1, badge-w2 … or week-tag span
    const badgeClass = $el.find('[class*="badge-w"]').first().attr('class') || ''
    const wMatch = badgeClass.match(/badge-w(\d)/)
    let level = wMatch ? weekToLevel('W' + wMatch[1]) : null
    if (!level) {
      const weekTagText = $el.find('.week-tag').first().text().trim()
      const wm = weekTagText.match(/W(\d)/)
      level = wm ? weekToLevel('W' + wm[1]) : 'bronze'
    }

    // Question text: gather all text inside .question div, excluding the options container
    let questionText = ''
    const qDiv = $el.find('.question').first()
    if (qDiv.length) {
      // Try headings/paragraphs first
      const parts = []
      qDiv.find('h3, h4, p').each((_, node) => {
        const $n = $(node)
        if ($n.closest('.options').length) return
        const t = $n.text().trim()
        if (t) parts.push(t)
      })
      questionText = parts.join(' ').trim()
      // Fallback: plain text content of .question div itself
      if (!questionText) questionText = stripHtml(qDiv.clone().find('.options').remove().end().html() || '')
    }
    if (!questionText) {
      // Fallback: children before option container
      const parts = []
      $el.children().each((_, child) => {
        const $c = $(child)
        if ($c.hasClass('feedback') || $c.find('[data-answer]').length > 0) return
        const t = $c.text().trim().replace(/W\d\s*-\s*[A-Za-z\s]+/g, '').trim()
        if (t) parts.push(t)
      })
      questionText = parts.join(' ').trim()
    }

    // Options
    const opts = []
    let correctText = ''
    $el.find('.option[data-answer], .option-btn[data-answer], button[data-answer]').each((_, opt) => {
      const $opt = $(opt)
      const text = stripHtml($opt.html() || '')
      opts.push(text)
      if ($opt.attr('data-answer') === 'correct') correctText = text
    })

    if (!opts.length || !questionText) return

    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Format 5a: onclick checkAnswer(N, 'letter') ────────────────────────────

function parseOnclickFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  // Build a map of actNum → correct letter from button onclick attrs
  const correctLetters = {}
  $('button[onclick*="checkAnswer"]').each((_, btn) => {
    const attr = $(btn).attr('onclick') || ''
    const m = attr.match(/checkAnswer\s*\(\s*(\d+)\s*,\s*['"]([a-z])['"]/)
    if (m) correctLetters[parseInt(m[1])] = m[2]
  })

  $('div.activity').each((_, el) => {
    const $el = $(el)
    const weekTagText = $el.find('.week-tag').first().text().trim()
    const wMatch = weekTagText.match(/W(\d)/)
    const level  = wMatch ? weekToLevel('W' + wMatch[1]) : 'bronze'

    // Activity number — try multiple onclick patterns
    let actNum = null
    $el.find('.option[onclick]').first().each((_, opt) => {
      const oc = $(opt).attr('onclick') || ''
      const m1 = oc.match(/selectOption\s*\(\s*this\s*,\s*(\d+)/)      // selectOption(this, N, ...)
      const m2 = oc.match(/selectOption\s*\(\s*(\d+)\s*,/)              // selectOption(N, 'letter')
      const mn = m1 || m2
      if (mn) actNum = parseInt(mn[1])
    })

    let questionText = ''
    const qEls = $el.find('.question, p.question')
    if (qEls.length) {
      questionText = qEls.map((_, q) => stripHtml($(q).html() || '')).get().join(' ')
    } else {
      const h3 = $el.find('h3').first().clone()
      h3.find('.week-tag').remove()
      questionText = h3.text().trim()
    }

    const opts = []
    const letterMap = {}
    $el.find('.option[onclick*="selectOption"]').each((_, opt) => {
      const $opt = $(opt)
      const text = stripHtml($opt.html() || '')
      const oc   = $opt.attr('onclick') || ''
      // Try pattern: selectOption(this, N, 'letter')
      const mL = oc.match(/selectOption\s*\(\s*this\s*,\s*\d+\s*,\s*['"]([a-z])['"]/)
      const letter = mL ? mL[1] : String.fromCharCode(97 + opts.length)
      letterMap[letter] = text
      opts.push(text)
    })

    if (!opts.length || !questionText || actNum === null) return

    const correctLetter = correctLetters[actNum]
    const correctText   = correctLetter ? (letterMap[correctLetter] || opts[0]) : opts[0]
    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Format 5b: selectOption(this, true/false, N)  (L12, L31) ────────────────

function parseSelectTrueFalseFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  $('div.activity').each((_, el) => {
    const $el = $(el)
    const weekTagText = $el.find('.week-tag').first().text().trim()
    const wMatch = weekTagText.match(/W(\d)/)
    const level  = wMatch ? weekToLevel('W' + wMatch[1]) : 'bronze'

    let questionText = ''
    const qEls = $el.find('.question, p.question, .question-text')
    if (qEls.length) {
      questionText = qEls.map((_, q) => stripHtml($(q).html() || '')).get().join(' ')
    } else {
      const h3 = $el.find('h3').first().clone()
      h3.find('.week-tag').remove()
      questionText = h3.text().trim()
    }

    const opts = []
    let correctText = ''
    $el.find('.option[onclick*="selectOption"]').each((_, opt) => {
      const $opt = $(opt)
      const text = stripHtml($opt.html() || '')
      const oc   = $opt.attr('onclick') || ''
      // Pattern: selectOption(this, true/false, N)  OR  selectOption(this, N, true/false)
      const mTF1 = oc.match(/selectOption\s*\(\s*this\s*,\s*(true|false)\s*,/)
      const mTF2 = oc.match(/selectOption\s*\(\s*this\s*,\s*\d+\s*,\s*(true|false)/)
      const isCorrect = (mTF1 && mTF1[1] === 'true') || (mTF2 && mTF2[1] === 'true')
      opts.push(text)
      if (isCorrect) correctText = text
    })

    if (!opts.length || !questionText) return
    if (!correctText) correctText = opts[0]
    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Format 5c: data-correct="A" on activity div  (L36) ─────────────────────

function parseActivityLetterCorrectFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  $('[data-activity][data-correct]').each((_, el) => {
    const $el = $(el)
    const weekAttr = $el.attr('data-week') || ''
    const level    = weekAttr ? weekToLevel(weekAttr) : 'bronze'
    const correctLetter = ($el.attr('data-correct') || 'A').toUpperCase()

    let questionText = ''
    // Try headings/paragraphs first
    $el.find('p, h3, h4').each((_, node) => {
      const $n = $(node)
      if ($n.closest('.options, .option-list').length) return
      const t = $n.text().trim()
      if (t) questionText += (questionText ? ' ' : '') + t
    })
    // Fallback: plain text in .question div (L36 uses bare text nodes inside .question)
    if (!questionText) {
      const qDiv = $el.find('.question').first()
      if (qDiv.length) questionText = stripHtml(qDiv.clone().find('.options').remove().end().html() || '').trim()
    }
    // Last resort: direct text children of activity excluding .options container
    if (!questionText) {
      const parts = []
      $el.children().each((_, child) => {
        const $c = $(child)
        if ($c.hasClass('options') || $c.hasClass('feedback') || $c.hasClass('buttons') || $c.hasClass('activity-header')) return
        const t = $c.text().trim().replace(/Activity\s+\d+/i, '').replace(/W\d[^.]*/, '').trim()
        if (t) parts.push(t)
      })
      questionText = parts.join(' ').trim()
    }

    const opts = []
    let correctText = ''
    $el.find('.option').each((_, opt) => {
      const $opt = $(opt)
      const text = stripHtml($opt.html() || '')
      const letter = String.fromCharCode(65 + opts.length) // A, B, C, D
      opts.push(text)
      if (letter === correctLetter) correctText = text
    })

    if (!opts.length || !questionText) return
    if (!correctText) correctText = opts[0]
    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Format 5d: selectOption(N, 'letter') + checkActivityN() JS (L18) ────────

function parseSelectLetterFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  // Extract correct letters from JS function bodies:
  // function checkActivityN() { ... if (selectedOptions[N] === 'letter') ...
  const correctLetters = {}
  const scriptContent = $('script').map((_, s) => $(s).html() || '').get().join('\n')
  const checkFnRe = /function\s+checkActivity(\d+)\s*\(\s*\)\s*\{[^}]*selectedOptions\[(\d+)\]\s*===\s*['"]([a-z])['"][^}]*\}/g
  let m
  while ((m = checkFnRe.exec(scriptContent)) !== null) {
    correctLetters[parseInt(m[2])] = m[3]
  }

  $('div.activity[id^="activity"]').each((_, el) => {
    const $el = $(el)
    const idStr = $el.attr('id') || ''
    const actNum = parseInt(idStr.replace('activity', ''))

    const weekTagText = $el.find('.week-tag').first().text().trim()
    const wMatch = weekTagText.match(/W(\d)/)
    const level = wMatch ? weekToLevel('W' + wMatch[1]) : 'bronze'

    // Question text: try .question div plain text, then p/h3
    let questionText = ''
    const qDiv = $el.find('.question').first()
    if (qDiv.length) {
      questionText = stripHtml(qDiv.clone().find('.options').remove().end().html() || '').trim()
    }
    if (!questionText) {
      const parts = []
      $el.find('p, h3, h4').each((_, node) => {
        const $n = $(node)
        if ($n.closest('.options').length) return
        const t = $n.text().trim()
        if (t) parts.push(t)
      })
      questionText = parts.join(' ').trim()
    }

    // Options: gathered from selectOption(N, 'letter') divs
    const opts = []
    let correctText = ''
    const correctLetter = correctLetters[actNum] || null
    $el.find('.option[onclick*="selectOption"]').each((_, opt) => {
      const $opt = $(opt)
      const oc = $opt.attr('onclick') || ''
      const lm = oc.match(/selectOption\s*\(\s*\d+\s*,\s*['"]([a-z])['"]/)
      const letter = lm ? lm[1] : null
      const text = stripHtml($opt.html() || '')
      opts.push(text)
      if (letter && letter === correctLetter) correctText = text
    })

    if (!opts.length || !questionText) return
    if (!correctText && opts.length) correctText = opts[0]
    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Type normalisation ─────────────────────────────────────────────────────

function normaliseType(raw) {
  const t = String(raw).toLowerCase().trim()
  if (t === 'mc' || t === 'multiple-choice' || t === 'multiplechoice' || t === 'multiple_choice') return 'mc'
  if (t === 'match' || t === 'matching' || t === 'drag' || t === 'drag-drop') return 'match'
  if (t === 'fillblank' || t === 'fill-blank' || t === 'fill-in-the-blank' || t === 'fill_blank' || t === 'fill-in') return 'fillblank'
  if (t === 'write' || t === 'writing' || t === 'open' || t === 'freewrite') return 'write'
  if (t === 'checklist' || t === 'check' || t === 'self-check' || t === 'selfcheck') return 'checklist'
  return t
}

// ─── Format detection ────────────────────────────────────────────────────────

function detectFormat(html) {
  if (/const\s+acts\s*=\s*\[/.test(html))                              return 'acts'
  if (/const\s+activities\s*=\s*\[/.test(html))                        return 'activities'
  if (/data-answer\s*=\s*["'](correct|incorrect)/.test(html))          return 'data-answer'
  if (/\bdata-activity\b[^>]+data-correct\s*=\s*["'][A-D]/.test(html)) return 'activity-letter'
  if (/data-correct\s*=\s*["'](true|false)/.test(html))                return 'data-correct'
  if (/checkAnswer\s*\(\s*\d+\s*,\s*['"][a-z]['"]/.test(html))                          return 'onclick'
  if (/selectOption\s*\(\s*\d+\s*,\s*['"][a-z]['"]/.test(html) &&
      /function\s+checkActivity\d+/.test(html))                                          return 'select-letter'
  if (/selectOption\s*\(\s*this\s*,\s*(true|false)/.test(html))                          return 'select-tf'
  if (/selectOption\s*\(\s*this\s*,\s*\d+\s*,\s*(true|false)/.test(html))               return 'select-tf'
  return 'unknown'
}

// ─── Find HTML file for a lesson ────────────────────────────────────────────

function findLessonFile(lessonNum) {
  const padded = String(lessonNum).padStart(2, '0')

  // L01-L11 → Rebuilt folder first
  if (lessonNum <= 11) {
    const rebuilt = path.join(REBUILT_DIR, `L${padded}_Interactive_Practice.html`)
    if (fs.existsSync(rebuilt)) return { file: rebuilt, source: 'rebuilt' }
  }

  // Try various folder name suffixes used in the filesystem
  const suffixes = [':', ': ', ' :', '']
  for (const suf of suffixes) {
    const dir  = path.join(LESSONS_DIR, `Lesson_${padded}${suf}`)
    const file = path.join(dir, `L${padded}_Interactive_Practice.html`)
    if (fs.existsSync(file)) return { file, source: 'original' }
  }

  return null
}

// ─── Get lesson title from HTML ──────────────────────────────────────────────

function getLessonTitle(html, lessonNum) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/)
  if (m) {
    return m[1]
      .replace(/WriFe\s+Lesson\s+\d+\s*[–-]\s*/i, '')
      .replace(/WriFe\s+Lesson\s+\d+\s*[-:]\s*/i, '')
      .replace(/\s*[-–|]\s*Interactive Practice.*$/i, '')
      .trim()
  }
  return `Lesson ${lessonNum}`
}

// ─── Parse one lesson ────────────────────────────────────────────────────────

function parseLesson(lessonNum) {
  const found = findLessonFile(lessonNum)
  if (!found) return { lessonNum, title: `Lesson ${lessonNum}`, activities: [], format: 'missing', source: 'none' }

  const html   = fs.readFileSync(found.file, 'utf8')
  const title  = getLessonTitle(html, lessonNum)
  const format = detectFormat(html)

  let activities = null

  if      (format === 'acts')           activities = parseActsFormat(html, lessonNum)
  else if (format === 'activities')     activities = parseActivitiesFormat(html, lessonNum)
  else if (format === 'data-answer')    activities = parseDataAnswerFormat(html)
  else if (format === 'activity-letter') activities = parseActivityLetterCorrectFormat(html)
  else if (format === 'data-correct')   activities = parseDataCorrectFormat(html)
  else if (format === 'onclick')        activities = parseOnclickFormat(html)
  else if (format === 'select-letter')  activities = parseSelectLetterFormat(html)
  else if (format === 'select-tf')      activities = parseSelectTrueFalseFormat(html)

  return {
    lessonNum,
    title,
    activities: activities || [],
    format,
    source: found.source,
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('WriFe Lesson Parser — starting\n')

  // Determine lesson range (L01-L67)
  const LESSON_COUNT = 67
  const results = []

  for (let n = 1; n <= LESSON_COUNT; n++) {
    process.stdout.write(`  Parsing L${String(n).padStart(2, '0')}…`)
    const result = parseLesson(n)
    results.push(result)
    const cnt = result.activities.length
    const flag = cnt > 0 ? `✓ ${cnt}` : (result.format === 'missing' ? '— missing' : `✗ 0 (${result.format})`)
    console.log(` ${flag}`)
  }

  // Build lessons.json
  const lessons = results.map(r => ({
    lessonNumber: r.lessonNum,
    world: getWorldId(r.lessonNum),
    title: r.title,
    activities: r.activities,
  }))

  const totalActivities = lessons.reduce((s, l) => s + l.activities.length, 0)

  const output = {
    generatedAt:    new Date().toISOString(),
    totalLessons:   lessons.length,
    totalActivities,
    lessons,
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2))
  console.log(`\n✅ lessons.json written — ${lessons.length} lessons, ${totalActivities} activities`)

  // Build parse report
  const rows = results.map(r => {
    const acts  = r.activities
    const types = [...new Set(acts.map(a => a.type))].join(', ') || '—'
    const bsq   = [
      acts.filter(a => a.level === 'bronze').length,
      acts.filter(a => a.level === 'silver').length,
      acts.filter(a => a.level === 'gold').length,
    ].join('/')
    return `| L${String(r.lessonNum).padStart(2,'0')} | ${r.title} | ${acts.length} | ${types} | B/S/G: ${bsq} | ${r.format} / ${r.source} |`
  })

  const report = [
    `# WriFe Lesson Parse Report`,
    `Generated: ${new Date().toISOString()}`,
    `Total activities: ${totalActivities}`,
    '',
    `| Lesson | Title | Count | Types | Levels | Format / Source |`,
    `|--------|-------|-------|-------|--------|-----------------|`,
    ...rows,
  ].join('\n')

  fs.writeFileSync(OUTPUT_REPORT, report)
  console.log('✅ parse-report.md written')

  // Summary
  const withActs = results.filter(r => r.activities.length > 0).length
  const missing  = results.filter(r => r.format === 'missing').length
  const unknown  = results.filter(r => r.format === 'unknown' && r.activities.length === 0).length
  console.log(`\nSummary:`)
  console.log(`  ${withActs}/${LESSON_COUNT} lessons have activities`)
  console.log(`  ${missing} files not found`)
  console.log(`  ${unknown} unknown format (0 activities)`)
}

main()
