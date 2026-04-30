/**
 * lessonParser.ts — browser-compatible port of scripts/parse-lessons.cjs
 *
 * Pure functions — no Node.js APIs. Accepts HTML text strings read via
 * the browser FileReader API and returns structured ParsedLesson objects.
 */
import type {
  ActivityType,
  ActivityLevel,
  ParsedActivity,
  ParsedLesson,
  MCQuestion,
  MatchQuestion,
  FillBlankQuestion,
  WriteQuestion,
  ChecklistQuestion,
} from '../types'

// ── World / lesson mappings ──────────────────────────────────────
const WORLD_RANGES: Array<{ world: number; min: number; max: number }> = [
  { world: 1, min: 1,  max: 9  },
  { world: 2, min: 10, max: 19 },
  { world: 3, min: 20, max: 31 },
  { world: 4, min: 32, max: 45 },
  { world: 5, min: 46, max: 51 },
  { world: 6, min: 52, max: 61 },
]

export const LESSON_TITLES: Record<number, string> = {
  1:'Personal Narrative',2:'Telling Our Story',3:'WriFe Lesson 3',4:'WriFe Lesson 4',
  5:'Five-Part Story Structure',6:'Basic Story Types',7:'Nouns and Determiners',
  8:'WriFe Lesson 8',9:'WriFe Lesson 9',10:'Basic Tenses',
  11:'Subject, Main Verb and Object',12:'WriFe Lesson 12',13:'WriFe Lesson 13',
  14:'Pronouns',15:'Prepositions',16:'Retrieving Information from Text',
  17:'Retrieving Information from Text II',18:'Statements and Questions',
  19:'WriFe Lesson 19',20:'Phrases',21:'Clauses',
  22:'Dependent and Independent Clauses',23:'What is a Sentence?',
  24:'Simple Sentences with Different Lengths',25:'Different Ways of Forming Simple Sentences',
  26:'WriFe Lesson 26',27:'What is a Paragraph?',28:'WriFe Lesson 28',
  29:'Three-Paragraph Narratives',30:'Compound and Complex Sentences',
  31:'WriFe Lesson 31',32:'Noun, Adjective and Adverbial Phrases',33:'Direct Speech',
  34:'Personal Pronouns',35:'Story Analysis',36:'WriFe Lesson 36',
  37:'WriFe Lesson 37',38:'WriFe Lesson 38',39:'WriFe Lesson 39',40:'Story Planning',
  41:'WriFe Lesson 41',42:'WriFe Lesson 42',43:'Developing a Timeline',
  44:'Shaping the Contents',45:'Similes, Metaphors and Personification',
  46:"Show Don't Tell",47:'Reading Aloud and Feedback',
  48:'Transitions - Cohesion in Storyline',49:'Transitions - Cohesion Across Paragraphs',
  50:'Transitions - Cohesion Within Paragraphs',51:'Final Draft',
  52:'Writing a News Report',53:'Writing an Information Report',54:'Diaries and Journals',
  55:'Argument Writing',56:'Letter Writing',57:'Explanations and Instructions',
  58:'Biography Writing',59:'Persuasive Posters and Advertising',60:'Speech Writing',
  61:'Descriptions: Characters, Settings and Thoughts',
}

export function getWorldForLesson(lessonNum: number): number {
  return WORLD_RANGES.find(r => lessonNum >= r.min && lessonNum <= r.max)?.world ?? 1
}

export function levelFromWeek(weekStr: string | number): ActivityLevel {
  const n = parseInt(String(weekStr).toLowerCase().replace('w', '').trim(), 10)
  if (n <= 2) return 'bronze'
  if (n <= 4) return 'silver'
  return 'gold'
}

/** Extract lesson number from filename e.g. "L06_Interactive_Practice.html" → 6 */
export function lessonNumFromFilename(filename: string): number | null {
  const m = filename.match(/L(\d{2})_/i) ?? filename.match(/lesson[_\s-]?(\d{1,2})/i)
  return m ? parseInt(m[1], 10) : null
}

// ── Activity extraction ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractActivitiesFromJS(html: string): any[] {
  const activities = []

  // Pattern 1: compact JS object with unquoted keys
  const compactRe = /\{[^{}]*?id\s*:\s*\d+[^{}]*?type\s*:\s*'(mc|write|match|fillblank|checklist)'[^{}]*?\}/gs
  for (const match of html.matchAll(compactRe)) {
    try {
      const obj = match[0]
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}')
      activities.push(JSON.parse(obj))
    } catch { /* skip malformed */ }
  }
  if (activities.length > 0) return activities

  // Pattern 2: already JSON-quoted keys
  const jsonRe = /\{[^{}]*?"type"\s*:\s*"(mc|write|match|fillblank|checklist)"[^{}]*?\}/gs
  for (const match of html.matchAll(jsonRe)) {
    try { activities.push(JSON.parse(match[0])) } catch { /* skip */ }
  }
  return activities
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseRaw(raw: any, lessonNum: number, sortOrder: number): ParsedActivity {
  const levelStr = String(raw.level ?? raw.lvl ?? 'w1')
  const level = levelFromWeek(levelStr.replace('w', ''))
  const type = (raw.type ?? 'mc') as ActivityType

  const base = { type, level, sort_order: sortOrder }

  switch (type) {
    case 'mc': {
      const q: MCQuestion = {
        question: raw.q ?? raw.question ?? '',
        options: raw.opts ?? raw.options ?? [],
        correct: raw.ans ?? raw.correct ?? '',
        feedback: {
          correct: raw.fb?.c ?? raw.feedback?.correct ?? 'Correct!',
          wrong:   raw.fb?.w ?? raw.feedback?.wrong   ?? 'Not quite — check again.',
        },
      }
      return { ...base, question_json: q, answer_json: { correct: q.correct } }
    }
    case 'match': {
      const q: MatchQuestion = {
        question:    raw.q ?? raw.question ?? 'Match the items.',
        instruction: raw.inst ?? raw.instruction ?? 'Click left then right to match.',
        pairs:       raw.pairs ?? [],
      }
      return { ...base, question_json: q, answer_json: { pairs: q.pairs } }
    }
    case 'fillblank': {
      const q: FillBlankQuestion = {
        question: raw.q ?? raw.question ?? '',
        template: raw.template ?? raw.q ?? '',
        blanks:   raw.blanks ?? [],
        feedback: raw.fb?.c ?? raw.feedback ?? 'Check your answers.',
      }
      return { ...base, question_json: q, answer_json: { blanks: q.blanks } }
    }
    case 'write': {
      const q: WriteQuestion = {
        question:    raw.q ?? raw.question ?? '',
        prompt:      raw.q ?? raw.prompt ?? '',
        instruction: raw.inst ?? raw.instruction ?? 'Write your answer.',
        modelAnswer: raw.model ?? raw.modelAnswer ?? '',
      }
      return { ...base, question_json: q, answer_json: { modelAnswer: q.modelAnswer } }
    }
    case 'checklist': {
      const q: ChecklistQuestion = {
        question:    raw.q ?? raw.question ?? '',
        instruction: raw.inst ?? raw.instruction ?? 'Check each item that applies.',
        items:       raw.items ?? [],
      }
      return { ...base, question_json: q, answer_json: { items: q.items } }
    }
    default: {
      const q: MCQuestion = {
        question: raw.q ?? '', options: [], correct: '',
        feedback: { correct: 'Correct!', wrong: 'Not quite.' },
      }
      return { ...base, type: 'mc', question_json: q, answer_json: { correct: '' } }
    }
  }
  void lessonNum // suppress unused warning — available for future use
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Parse a single lesson HTML file's text content into a ParsedLesson.
 * @param htmlText  Raw HTML string from FileReader
 * @param filename  Original filename (used to infer lesson number)
 * @param overrideLessonNum  Explicit lesson number (takes priority over filename)
 */
export function parseHtmlToLesson(
  htmlText: string,
  filename: string,
  overrideLessonNum?: number,
): ParsedLesson {
  const lessonNum = overrideLessonNum ?? lessonNumFromFilename(filename) ?? 0
  const world_id  = getWorldForLesson(lessonNum)
  const title     = LESSON_TITLES[lessonNum] ?? `Lesson ${lessonNum}`

  const rawActivities = extractActivitiesFromJS(htmlText)
  const activities = rawActivities.map((raw, i) => normaliseRaw(raw, lessonNum, i + 1))

  return { lesson_number: lessonNum, title, world_id, activities }
}
