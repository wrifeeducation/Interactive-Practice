#!/usr/bin/env node
/**
 * WriFe Lesson Parser
 * Reads all 61 interactive practice HTML files and outputs content/lessons.json
 */

const fs = require('fs')
const path = require('path')

const LESSONS_ROOT = '/sessions/ecstatic-trusting-darwin/mnt/WriFe Lessons'
const OUTPUT_DIR = path.join(__dirname, '..', 'content')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'lessons.json')
const REPORT_FILE = path.join(OUTPUT_DIR, 'parse-report.md')

// World mapping
const WORLD_MAP = {
  1: { world: 1, range: [1, 9] },
  2: { world: 2, range: [10, 19] },
  3: { world: 3, range: [20, 31] },
  4: { world: 4, range: [32, 45] },
  5: { world: 5, range: [46, 51] },
  6: { world: 6, range: [52, 61] },
}

const LESSON_TITLES = {
  1: 'WriFe Lesson 1 - Interactive Practice',
  2: 'Telling Our Story',
  3: 'WriFe Lesson 3',
  4: 'WriFe Lesson 4',
  5: 'Five-Part Story Structure',
  6: 'Basic Story Types',
  7: 'Nouns and Determiners',
  8: 'WriFe Lesson 8',
  9: 'WriFe Lesson 9',
  10: 'Basic Tenses',
  11: 'Subject, Main Verb and Object',
  12: 'WriFe Lesson 12',
  13: 'WriFe Lesson 13',
  14: 'Pronouns',
  15: 'Prepositions',
  16: 'Retrieving Information from Text',
  17: 'Retrieving Information from Text II',
  18: 'Statements and Questions',
  19: 'WriFe Lesson 19',
  20: 'Phrases',
  21: 'Clauses',
  22: 'Dependent and Independent Clauses',
  23: 'What is a Sentence?',
  24: 'Simple Sentences with Different Lengths',
  25: 'Different Ways of Forming Simple Sentences',
  26: 'WriFe Lesson 26',
  27: 'What is a Paragraph?',
  28: 'WriFe Lesson 28',
  29: 'Three-Paragraph Narratives',
  30: 'Compound and Complex Sentences',
  31: 'WriFe Lesson 31',
  32: 'Noun, Adjective and Adverbial Phrases',
  33: 'Direct Speech',
  34: 'Personal Pronouns',
  35: 'Story Analysis',
  36: 'WriFe Lesson 36',
  37: 'WriFe Lesson 37',
  38: 'WriFe Lesson 38',
  39: 'WriFe Lesson 39',
  40: 'Story Planning',
  41: 'WriFe Lesson 41',
  42: 'WriFe Lesson 42',
  43: 'Developing a Timeline',
  44: 'Shaping the Contents',
  45: 'Similes, Metaphors and Personification',
  46: 'Show Don\'t Tell',
  47: 'Reading Aloud and Feedback',
  48: 'Transitions - Cohesion in Storyline',
  49: 'Transitions - Cohesion Across Paragraphs',
  50: 'Transitions - Cohesion Within Paragraphs',
  51: 'Final Draft',
  52: 'Writing a News Report',
  53: 'Writing an Information Report',
  54: 'Diaries and Journals',
  55: 'Argument Writing',
  56: 'Letter Writing',
  57: 'Explanations and Instructions',
  58: 'Biography Writing',
  59: 'Persuasive Posters and Advertising',
  60: 'Speech Writing',
  61: 'Descriptions: Characters, Settings and Thoughts',
}

function getWorldForLesson(lessonNum) {
  for (const [worldId, data] of Object.entries(WORLD_MAP)) {
    if (lessonNum >= data.range[0] && lessonNum <= data.range[1]) return parseInt(worldId)
  }
  return 1
}

function levelFromWeek(weekStr) {
  if (!weekStr) return 'bronze'
  const w = weekStr.toString().toLowerCase().replace('w', '').trim()
  const num = parseInt(w)
  if (num <= 2) return 'bronze'
  if (num <= 4) return 'silver'
  return 'gold'
}

function findLessonFile(lessonNum) {
  const padded = String(lessonNum).padStart(2, '0')
  // Try multiple folder name patterns
  const patterns = [
    `Lesson_${padded}:`,
    `Lesson_${padded}: `,
    `Lesson_${padded}`,
  ]
  for (const folder of patterns) {
    const dir = path.join(LESSONS_ROOT, folder)
    if (fs.existsSync(dir)) {
      const htmlFile = path.join(dir, `L${padded}_Interactive_Practice.html`)
      if (fs.existsSync(htmlFile)) return htmlFile
      // Try listing the dir for any matching html
      try {
        const files = fs.readdirSync(dir)
        const html = files.find(f => f.includes('Interactive_Practice') && f.endsWith('.html'))
        if (html) return path.join(dir, html)
      } catch {}
    }
  }
  return null
}

function extractActivitiesFromJS(html) {
  const activities = []

  // Pattern 1: compact JS object format used in L52–L61 and some others
  // Matches: {id:N,level:'wX',type:'mc', ...}
  const compactPattern = /\{[^{}]*?id\s*:\s*\d+[^{}]*?type\s*:\s*'(mc|write|match|fillblank|checklist)'[^{}]*?\}/gs
  const matches = html.matchAll(compactPattern)

  for (const match of matches) {
    try {
      // Convert JS object syntax to JSON-parseable
      let obj = match[0]
        .replace(/(\w+)\s*:/g, '"$1":')      // quote keys
        .replace(/'/g, '"')                   // single → double quotes
        .replace(/,\s*}/g, '}')              // trailing commas
        .replace(/:\s*"([^"]*)",\s*"(\w+)":/g, ':"$1","$2":') // fix nested
      const parsed = JSON.parse(obj)
      if (parsed.type && parsed.id) activities.push(parsed)
    } catch {}
  }

  if (activities.length > 0) return activities

  // Pattern 2: longer format with quoted keys — { "id": 1, "type": "mc", ... }
  const jsonPattern = /\{[^{}]*?"type"\s*:\s*"(mc|write|match|fillblank|checklist)"[^{}]*?\}/gs
  const jsonMatches = html.matchAll(jsonPattern)
  for (const match of jsonMatches) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed.type) activities.push(parsed)
    } catch {}
  }

  return activities
}

function extractActivitiesFromHTML(html) {
  // Fallback: extract from HTML structure using regex
  const activities = []
  const activityBlockRe = /<div[^>]*class="[^"]*activity[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*activity[^"]*"|<script|$)/gi
  const titleRe = /class="activity-title[^"]*"[^>]*>([^<]+)</i
  const typeRe = /class="activity-type[^"]*"[^>]*>([^<]+)</i
  const h3Re = /<h3[^>]*>([^<]+)<\/h3>/i

  let id = 1
  const blocks = html.match(/<div[^>]*id="activity\d+"[^>]*>([\s\S]*?)(?=<div[^>]*id="activity\d+"|<\/div>\s*<\/div>\s*<script)/gi) || []

  for (const block of blocks) {
    const titleMatch = block.match(titleRe) || block.match(h3Re)
    const typeMatch = block.match(typeRe)
    const weekMatch = block.match(/\(W(\d)\)/i)
    const optionsCount = (block.match(/class="option"/gi) || []).length

    if (!titleMatch) continue
    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
    const typeStr = typeMatch ? typeMatch[1].toLowerCase() : ''
    const level = weekMatch ? levelFromWeek(weekMatch[1]) : 'bronze'

    // Infer type from context
    let type = 'mc'
    if (typeStr.includes('match')) type = 'match'
    else if (typeStr.includes('fill') || typeStr.includes('cloze') || typeStr.includes('blank')) type = 'fillblank'
    else if (typeStr.includes('writ') || typeStr.includes('creat')) type = 'write'
    else if (typeStr.includes('check')) type = 'checklist'
    else if (optionsCount >= 2) type = 'mc'

    activities.push({
      id,
      level: `w${weekMatch ? weekMatch[1] : '1'}`,
      type,
      q: title,
      opts: [],
      ans: '',
      fb: { c: 'Well done!', w: 'Check your answer.' }
    })
    id++
  }

  return activities
}

function normaliseActivity(raw, lessonNum, sortOrder) {
  const levelStr = raw.level || raw.lvl || 'w1'
  const level = levelFromWeek(String(levelStr).replace('w', ''))

  const base = {
    lessonNumber: lessonNum,
    sortOrder,
    level,
    type: raw.type || 'mc',
  }

  switch (raw.type) {
    case 'mc':
      return {
        ...base,
        questionJson: {
          question: raw.q || raw.question || '',
          options: raw.opts || raw.options || [],
          correct: raw.ans || raw.correct || '',
          feedback: {
            correct: raw.fb?.c || raw.feedback?.correct || 'Correct!',
            wrong: raw.fb?.w || raw.feedback?.wrong || 'Not quite — have another look.',
          }
        },
        answerJson: { correct: raw.ans || raw.correct || '' }
      }

    case 'match':
      return {
        ...base,
        questionJson: {
          question: raw.q || raw.question || 'Match the items.',
          instruction: raw.inst || raw.instruction || 'Click an item on the left, then its match on the right.',
          pairs: raw.pairs || [],
        },
        answerJson: { pairs: raw.pairs || [] }
      }

    case 'fillblank':
      return {
        ...base,
        questionJson: {
          question: raw.q || raw.question || '',
          template: raw.template || raw.q || '',
          blanks: raw.blanks || [],
          feedback: raw.fb?.c || raw.feedback || 'Check your answers.',
        },
        answerJson: { blanks: raw.blanks || [] }
      }

    case 'write':
      return {
        ...base,
        questionJson: {
          question: raw.q || raw.question || '',
          prompt: raw.q || raw.prompt || '',
          instruction: raw.inst || raw.instruction || 'Write your answer in the box.',
          modelAnswer: raw.model || raw.modelAnswer || '',
        },
        answerJson: { modelAnswer: raw.model || raw.modelAnswer || '' }
      }

    case 'checklist':
      return {
        ...base,
        questionJson: {
          question: raw.q || raw.question || '',
          instruction: raw.inst || raw.instruction || 'Check each item that applies.',
          items: raw.items || [],
        },
        answerJson: { items: raw.items || [] }
      }

    default:
      return {
        ...base,
        type: 'mc',
        questionJson: {
          question: raw.q || raw.question || '',
          options: raw.opts || [],
          correct: raw.ans || '',
          feedback: { correct: 'Correct!', wrong: 'Not quite.' }
        },
        answerJson: { correct: raw.ans || '' }
      }
  }
}

// ── Main ──────────────────────────────────────────────────────

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const results = []
const reportRows = []
let totalActivities = 0

for (let lessonNum = 1; lessonNum <= 61; lessonNum++) {
  const htmlPath = findLessonFile(lessonNum)
  const world = getWorldForLesson(lessonNum)
  const title = LESSON_TITLES[lessonNum] || `Lesson ${lessonNum}`

  if (!htmlPath) {
    results.push({ lessonNumber: lessonNum, world, title, activities: [] })
    reportRows.push(`| L${lessonNum} | ${title} | 0 | FILE NOT FOUND | — |`)
    continue
  }

  const html = fs.readFileSync(htmlPath, 'utf8')

  // Try JS extraction first, fallback to HTML
  let rawActivities = extractActivitiesFromJS(html)
  const method = rawActivities.length > 0 ? 'JS' : 'HTML'
  if (rawActivities.length === 0) rawActivities = extractActivitiesFromHTML(html)

  const normalised = rawActivities.map((raw, i) => normaliseActivity(raw, lessonNum, i + 1))

  // Count by type
  const typeCounts = {}
  const levelCounts = { bronze: 0, silver: 0, gold: 0 }
  for (const a of normalised) {
    typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
    levelCounts[a.level]++
  }

  const typeStr = Object.entries(typeCounts).map(([t, c]) => `${t}:${c}`).join(', ')
  const levelStr = `B:${levelCounts.bronze} S:${levelCounts.silver} G:${levelCounts.gold}`

  results.push({ lessonNumber: lessonNum, world, title, activities: normalised })
  reportRows.push(`| L${lessonNum} | ${title} | ${normalised.length} | ${typeStr} | ${levelStr} | ${method} |`)
  totalActivities += normalised.length

  process.stdout.write(`L${String(lessonNum).padStart(2,'0')}: ${normalised.length} activities (${method})\n`)
}

// Write lessons.json
const output = {
  generatedAt: new Date().toISOString(),
  totalLessons: 61,
  totalActivities,
  lessons: results,
}
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
console.log(`\n✅ Written to ${OUTPUT_FILE}`)
console.log(`📊 Total: ${totalActivities} activities across 61 lessons`)

// Write parse-report.md
const reportContent = `# WriFe Lesson Parse Report

Generated: ${new Date().toISOString()}
Total lessons: 61
Total activities parsed: ${totalActivities}

## Per-Lesson Breakdown

| Lesson | Title | Count | Types | Levels (B/S/G) | Method |
|--------|-------|-------|-------|-----------------|--------|
${reportRows.join('\n')}

## Notes
- Method "JS" = activities extracted from embedded JavaScript data arrays (more reliable)
- Method "HTML" = activities inferred from HTML structure (less structured, some data may be approximate)
- Lessons with 0 activities need manual content entry or HTML inspection
`
fs.writeFileSync(REPORT_FILE, reportContent)
console.log(`📄 Report written to ${REPORT_FILE}`)
