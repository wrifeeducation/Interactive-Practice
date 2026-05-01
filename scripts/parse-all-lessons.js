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
      const pairs = (a.pairs || []).map(p => ({ left: String(p.l || p.left || ''), right: String(p.r || p.right || '') }))
      ;({ question_json: qj, answer_json: aj } = makeMatch(questionText, a.ins, pairs))

    } else if (type === 'fillblank') {
      const tmpl   = a.tmpl || a.template || questionText
      const blanks = (a.blanks || []).map(b => ({ index: b.idx ?? b.index ?? 0, answer: String(b.ans || b.answer || '') }))
      ;({ question_json: qj, answer_json: aj } = makeFillBlank(questionText, tmpl, blanks, a.fb?.c))

    } else if (type === 'write') {
      ;({ question_json: qj, answer_json: aj } = makeWrite(
        questionText, a.prompt, a.ins, a.model || a.modelAnswer || ''
      ))

    } else if (type === 'checklist') {
      const items = (a.items || []).map((it, idx) => ({
        id:   String(it.id || idx + 1),
        text: String(it.text || it),
      }))
      ;({ question_json: qj, answer_json: aj } = makeChecklist(questionText, a.ins, items))

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
    const level = weekToLevel(a.week || 'W1')
    const type  = normaliseType(a.type || 'multiple-choice')

    // Extract plain question text from the content HTML
    let questionText = ''
    if (a.content) {
      const $c = cheerio.load(String(a.content))
      // Prefer .question class, then <p> text, then full stripped content
      const qEl = $c('.question').first()
      if (qEl.length) {
        questionText = stripHtml($c('.question').map((_, el) => $c(el).html()).get().join(' '))
      } else {
        questionText = stripHtml(String(a.content))
      }
    }
    if (!questionText && a.title) questionText = a.title

    // If there's a dedicated question field, prefer it
    if (a.question) questionText = stripHtml(String(a.question))

    let qj, aj

    if (type === 'mc') {
      const opts = (a.options || a.opts || []).map(o => stripHtml(String(o)))
      const corIdx = typeof a.correct === 'number' ? a.correct : 0
      const correctText = opts[corIdx] || opts[0] || ''
      const fb = typeof a.feedback === 'string' ? a.feedback : ''
      ;({ question_json: qj, answer_json: aj } = makeMC(
        questionText, opts, correctText, fb, fb
      ))

    } else if (type === 'match') {
      const pairs = (a.pairs || a.matches || []).map(p => ({
        left:  stripHtml(String(p.left || p.l || p.term || '')),
        right: stripHtml(String(p.right || p.r || p.definition || '')),
      }))
      ;({ question_json: qj, answer_json: aj } = makeMatch(questionText, a.instruction, pairs))

    } else if (type === 'fillblank') {
      const tmpl   = a.template || a.tmpl || questionText
      const blanks = (a.blanks || []).map(b => ({ index: b.index ?? b.idx ?? 0, answer: String(b.answer || b.ans || '') }))
      const fb = typeof a.feedback === 'string' ? a.feedback : ''
      ;({ question_json: qj, answer_json: aj } = makeFillBlank(questionText, tmpl, blanks, fb))

    } else if (type === 'write') {
      const model = typeof a.modelAnswer === 'string' ? a.modelAnswer :
                    typeof a.model       === 'string' ? a.model       : ''
      ;({ question_json: qj, answer_json: aj } = makeWrite(
        questionText, a.prompt, a.instruction, model
      ))

    } else if (type === 'checklist') {
      const items = (a.items || a.criteria || []).map((it, idx) => ({
        id:   String(it.id || idx + 1),
        text: stripHtml(String(it.text || it.criterion || it)),
      }))
      ;({ question_json: qj, answer_json: aj } = makeChecklist(questionText, a.instruction, items))

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

  $('[data-activity]').each((_, el) => {
    const $el = $(el)

    // Determine week/level
    const diffAttr   = $el.attr('data-difficulty') || ''
    const actNumText = $el.find('.activity-number').first().text() || ''
    const weekMatch  = (diffAttr + actNumText).match(/W(\d)/)
    const level      = weekMatch ? weekToLevel('W' + weekMatch[1]) : 'bronze'

    // Extract question text
    let questionText = ''
    const qEl = $el.find('.question, p.question, .question-text').first()
    if (qEl.length) {
      questionText = stripHtml(qEl.html() || '')
    } else {
      // Fall back: grab all <p> text before the options div
      const parts = []
      $el.children().each((_, child) => {
        const $child = $(child)
        if ($child.hasClass('options') || $child.find('.option').length) return false
        const t = $child.text().trim()
        if (t && !t.match(/^Activity \d/)) parts.push(t)
      })
      questionText = parts.join(' ').trim()
    }

    // Extract options and find correct
    const opts = []
    let correctText = ''
    $el.find('.option[data-correct]').each((_, opt) => {
      const $opt  = $(opt)
      const text  = stripHtml($opt.html() || '')
      const isCorrect = $opt.attr('data-correct') === 'true'
      opts.push(text)
      if (isCorrect) correctText = text
    })

    if (!opts.length || !questionText) return

    const { question_json: qj, answer_json: aj } = makeMC(questionText, opts, correctText, '', '')
    activities.push({ type: 'mc', level, sort_order: sortOrder++, question_json: qj, answer_json: aj })
  })

  return activities.length ? activities : null
}

// ─── Format 4: data-answer HTML ─────────────────────────────────────────────

function parseDataAnswerFormat(html) {
  const $ = cheerio.load(html)
  const activities = []
  let sortOrder = 1

  $('[data-activity]').each((_, el) => {
    const $el = $(el)

    // Level from badge class: badge-w1, badge-w2 …
    const badgeClass = $el.find('[class*="badge-w"]').first().attr('class') || ''
    const wMatch = badgeClass.match(/badge-w(\d)/)
    const level  = wMatch ? weekToLevel('W' + wMatch[1]) : 'bronze'

    // Question text: first meaningful <p> or heading inside the activity
    let questionText = ''
    $el.children().each((_, child) => {
      const $child = $(child)
      if ($child.find('.option[data-answer]').length) return false
      const t = $child.text().trim()
      if (t) { questionText += (questionText ? ' ' : '') + t }
    })
    questionText = questionText.replace(/W\d\s*-\s*[A-Za-z\s]+/g, '').trim()

    // Options
    const opts = []
    let correctText = ''
    $el.find('.option[data-answer]').each((_, opt) => {
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

// ─── Format 5: onclick checkAnswer(N, 'letter') ──────────────────────────────

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

  // Parse each activity block
  $('div.activity').each((_, el) => {
    const $el = $(el)

    // Week/level from .week-tag or data-week
    const weekTagText = $el.find('.week-tag').first().text().trim()
    const wMatch = weekTagText.match(/W(\d)/)
    const level  = wMatch ? weekToLevel('W' + wMatch[1]) : 'bronze'

    // Activity number from the options' onclick
    let actNum = null
    $el.find('.option[onclick]').first().each((_, opt) => {
      const m = $(opt).attr('onclick')?.match(/selectOption\s*\(\s*this\s*,\s*(\d+)/)
      if (m) actNum = parseInt(m[1])
    })

    // Question text
    let questionText = ''
    const qEls = $el.find('.question, p.question')
    if (qEls.length) {
      questionText = qEls.map((_, q) => stripHtml($(q).html() || '')).get().join(' ')
    } else {
      // Use h3 title minus the week-tag
      const h3 = $el.find('h3').first()
      h3.find('.week-tag').remove()
      questionText = h3.text().trim()
    }

    // Options
    const opts = []
    const letterMap = {} // letter → option text
    $el.find('.option[onclick*="selectOption"]').each((_, opt) => {
      const $opt  = $(opt)
      const text  = stripHtml($opt.html() || '')
      const m     = $opt.attr('onclick')?.match(/selectOption\s*\(\s*this\s*,\s*\d+\s*,\s*['"]([a-z])['"]/)
      const letter = m ? m[1] : String.fromCharCode(97 + opts.length)
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
  if (/const\s+acts\s*=\s*\[/.test(html))        return 'acts'
  if (/const\s+activities\s*=\s*\[/.test(html))   return 'activities'
  if (/data-correct\s*=\s*["'](true|false)/.test(html)) return 'data-correct'
  if (/data-answer\s*=\s*["'](correct|incorrect)/.test(html)) return 'data-answer'
  if (/checkAnswer\s*\(\s*\d+\s*,\s*['"][a-z]['"]/.test(html)) return 'onclick'
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

  if (format === 'acts')         activities = parseActsFormat(html, lessonNum)
  else if (format === 'activities')  activities = parseActivitiesFormat(html, lessonNum)
  else if (format === 'data-correct') activities = parseDataCorrectFormat(html)
  else if (format === 'data-answer')  activities = parseDataAnswerFormat(html)
  else if (format === 'onclick')      activities = parseOnclickFormat(html)

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
