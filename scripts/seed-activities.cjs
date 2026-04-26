#!/usr/bin/env node
/**
 * WriFe Activity Seeder
 * Run once from the project root to seed all activities from content/lessons.json
 *
 * Usage:
 *   node scripts/seed-activities.cjs
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 *   (or set SUPABASE_SERVICE_KEY env var for a service role key that bypasses RLS)
 */

const fs = require('fs')
const path = require('path')

// Load env from .env file
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of envLines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const LESSONS_JSON = path.join(__dirname, '..', 'content', 'lessons.json')
if (!fs.existsSync(LESSONS_JSON)) {
  console.error('❌ content/lessons.json not found. Run parse-lessons.cjs first.')
  process.exit(1)
}

// ── Fetch lesson IDs from Supabase ─────────────────────────────────────────
async function fetchLessonIds() {
  const url = `${SUPABASE_URL}/rest/v1/lessons?select=id,lesson_number&order=lesson_number`
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch lessons: ${res.status} ${await res.text()}`)
  const rows = await res.json()
  const map = {}
  for (const r of rows) map[r.lesson_number] = r.id
  return map
}

// ── Insert a batch of activities ───────────────────────────────────────────
async function insertBatch(rows) {
  const url = `${SUPABASE_URL}/rest/v1/activities`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert failed: ${res.status} ${text}`)
  }
  return rows.length
}

// ── Update total_activities on lessons ─────────────────────────────────────
async function updateLessonCounts() {
  // Supabase doesn't support complex UPDATE via REST — use RPC if available
  // Simplest: fetch current counts and PATCH each lesson
  const countUrl = `${SUPABASE_URL}/rest/v1/activities?select=lesson_id&order=lesson_id`
  const res = await fetch(countUrl, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  const rows = await res.json()
  const counts = {}
  for (const r of rows) counts[r.lesson_id] = (counts[r.lesson_id] || 0) + 1

  for (const [lessonId, count] of Object.entries(counts)) {
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ total_activities: count }),
    })
  }
  console.log(`  Updated total_activities for ${Object.keys(counts).length} lessons`)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 WriFe Activity Seeder\n')

  console.log('📡 Fetching lesson IDs from Supabase...')
  const lessonIds = await fetchLessonIds()
  console.log(`  Found ${Object.keys(lessonIds).length} lessons\n`)

  console.log('📖 Reading content/lessons.json...')
  const data = JSON.parse(fs.readFileSync(LESSONS_JSON, 'utf8'))
  console.log(`  ${data.totalActivities} total activities across ${data.totalLessons} lessons\n`)

  // Build rows
  const rows = []
  let skipped = 0

  for (const lesson of data.lessons) {
    const lessonId = lessonIds[lesson.lessonNumber]
    if (!lessonId) { skipped++; continue }

    for (const act of lesson.activities) {
      const q = act.questionJson || {}
      const questionText = q.question || ''
      if (!questionText || questionText.includes('${')) { skipped++; continue }

      let level = act.level || 'bronze'
      if (!['bronze', 'silver', 'gold'].includes(level)) level = 'bronze'

      let type = act.type || 'mc'
      if (!['mc', 'write', 'match', 'fillblank', 'checklist'].includes(type)) type = 'mc'

      rows.push({
        lesson_id: lessonId,
        level,
        type,
        sort_order: act.sortOrder || 1,
        question_json: q,
        answer_json: act.answerJson || {},
      })
    }
  }

  console.log(`📊 ${rows.length} valid activities to insert (${skipped} skipped as placeholders)\n`)

  // Insert in batches of 50
  const BATCH = 50
  let total = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const batchNum = Math.floor(i / BATCH) + 1
    const totalBatches = Math.ceil(rows.length / BATCH)
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}... `)
    try {
      const inserted = await insertBatch(batch)
      total += inserted
      console.log(`✓ (${inserted} rows)`)
    } catch (err) {
      errors++
      console.log(`✗ Error: ${err.message}`)
    }
  }

  console.log(`\n✅ Done! ${total} activities inserted, ${errors} batch errors`)
  console.log('\n📊 Updating lesson activity counts...')
  await updateLessonCounts()
  console.log('\n🎉 Seeding complete! Refresh the app to see activities in lessons.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
