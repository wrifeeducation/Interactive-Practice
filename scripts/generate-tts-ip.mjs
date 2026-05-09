/**
 * WF-IP-TTS-04: Generate TTS audio for WriFe Interactive Practice.
 *
 * Generates all IP-specific ElevenLabs recordings and uploads them to
 * Supabase Storage (same shared bucket as wrifeapp: tts-audio).
 *
 * REUSED phrases (already in Supabase from wrifeapp) are NOT re-generated:
 *   feedback--correct, feedback--try-again, xp--earned, xp--streak
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... \
 *   ALISTAIR_VOICE_ID=l30f87tf05uxyknGdDw6 \
 *   AMELIA_VOICE_ID=ZF6FPAbjXT4488VcRRnw \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/generate-tts-ip.mjs
 *
 * Optional:
 *   SUPABASE_URL  — defaults to the WriFe Platform project
 *   DRY_RUN=1     — print phrases without calling ElevenLabs or Supabase
 */

const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY
const ALISTAIR_VOICE_ID   = process.env.ALISTAIR_VOICE_ID
const AMELIA_VOICE_ID     = process.env.AMELIA_VOICE_ID
const SUPABASE_URL        = process.env.SUPABASE_URL || 'https://gzmgjkbtsvezfclmreru.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const DRY_RUN             = process.env.DRY_RUN === '1'

if (!DRY_RUN && (!ELEVENLABS_API_KEY || !ALISTAIR_VOICE_ID || !AMELIA_VOICE_ID || !SUPABASE_SERVICE_KEY)) {
  console.error('❌  Missing env vars. Set ELEVENLABS_API_KEY, ALISTAIR_VOICE_ID, AMELIA_VOICE_ID, SUPABASE_SERVICE_KEY.')
  process.exit(1)
}

const MODEL_ID = 'eleven_turbo_v2_5'

const ALISTAIR_SETTINGS = {
  stability:         0.55,
  similarity_boost:  0.75,
  style:             0.20,
  use_speaker_boost: true,
}

const AMELIA_SETTINGS = {
  stability:         0.50,
  similarity_boost:  0.80,
  style:             0.25,
  use_speaker_boost: true,
}

/**
 * Phrase definitions.
 *
 * key         — matches tts-manifest.ts key
 * voice       — 'alistair' | 'amelia'
 * text        — the exact string ElevenLabs will speak
 * storagePath — path within the tts-audio bucket
 */
const PHRASES = [
  // ── Activity session opener ──────────────────────────────────────────────
  {
    key: 'activity-intro',
    voice: 'amelia',
    text: "Let's go! Work through the activities and earn your stars.",
    storagePath: 'amelia/ip/activity-intro.mp3',
  },

  // ── Match activity ───────────────────────────────────────────────────────
  {
    key: 'match-complete',
    voice: 'alistair',
    text: 'All matched! Well done!',
    storagePath: 'alistair/ip/match-complete.mp3',
  },

  // ── Write activity ───────────────────────────────────────────────────────
  {
    key: 'write-reveal',
    voice: 'alistair',
    text: "Here's the model answer. How did you do?",
    storagePath: 'alistair/ip/write-reveal.mp3',
  },

  // ── Lesson complete ──────────────────────────────────────────────────────
  {
    key: 'lesson-complete--1star',
    voice: 'amelia',
    text: 'Good effort! You earned one star. Keep practising to get more!',
    storagePath: 'amelia/ip/lesson-complete--1star.mp3',
  },
  {
    key: 'lesson-complete--2stars',
    voice: 'amelia',
    text: 'Well done! You earned two stars!',
    storagePath: 'amelia/ip/lesson-complete--2stars.mp3',
  },
  {
    key: 'lesson-complete--3stars',
    voice: 'amelia',
    text: 'Amazing! Three stars! You are a superstar!',
    storagePath: 'amelia/ip/lesson-complete--3stars.mp3',
  },

  // ── Boss challenge ───────────────────────────────────────────────────────
  {
    key: 'boss-intro',
    voice: 'alistair',
    text: 'Boss Challenge! Answer all fifteen questions to unlock the next world.',
    storagePath: 'alistair/ip/boss-intro.mp3',
  },
  {
    key: 'boss-complete--great',
    voice: 'amelia',
    text: 'Incredible! You smashed the Boss Challenge! Amazing work!',
    storagePath: 'amelia/ip/boss-complete--great.mp3',
  },
  {
    key: 'boss-complete--good',
    voice: 'amelia',
    text: 'Well done! You completed the Boss Challenge!',
    storagePath: 'amelia/ip/boss-complete--good.mp3',
  },
  {
    key: 'boss-complete--ok',
    voice: 'amelia',
    text: 'Good try! You finished the Boss Challenge. Keep practising to improve your score!',
    storagePath: 'amelia/ip/boss-complete--ok.mp3',
  },

  // ── World unlock ─────────────────────────────────────────────────────────
  {
    key: 'world-unlocked',
    voice: 'amelia',
    text: 'Amazing! A new world has unlocked! Keep going!',
    storagePath: 'amelia/ip/world-unlocked.mp3',
  },

  // ── Badge celebration ────────────────────────────────────────────────────
  {
    key: 'badge-unlocked',
    voice: 'amelia',
    text: "You've earned a badge! Brilliant work!",
    storagePath: 'amelia/ip/badge-unlocked.mp3',
  },
]

async function generateMp3(text, voiceId, voiceSettings) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: voiceSettings,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs error ${res.status}: ${err}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function uploadToSupabase(mp3, storagePath) {
  const url = `${SUPABASE_URL}/storage/v1/object/tts-audio/${storagePath}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: mp3,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload error ${res.status}: ${err}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/tts-audio/${storagePath}`
}

async function main() {
  console.log(`\n🎙  WriFe IP TTS Generation — ${PHRASES.length} phrases\n`)

  if (DRY_RUN) {
    console.log('DRY RUN — no API calls will be made.\n')
    for (const p of PHRASES) {
      console.log(`  [${p.voice.padEnd(8)}] ${p.key}`)
      console.log(`           "${p.text}"`)
      console.log(`           → ${p.storagePath}\n`)
    }
    return
  }

  let passed = 0
  let failed = 0

  for (const phrase of PHRASES) {
    const voiceId = phrase.voice === 'alistair' ? ALISTAIR_VOICE_ID : AMELIA_VOICE_ID
    const settings = phrase.voice === 'alistair' ? ALISTAIR_SETTINGS : AMELIA_SETTINGS

    process.stdout.write(`  [${phrase.voice.padEnd(8)}] ${phrase.key} … `)

    try {
      const mp3 = await generateMp3(phrase.text, voiceId, settings)
      const publicUrl = await uploadToSupabase(mp3, phrase.storagePath)
      console.log(`✅  ${mp3.length.toLocaleString()} bytes`)
      console.log(`              ${publicUrl}`)
      passed++
    } catch (err) {
      console.log(`❌  ${err.message}`)
      failed++
    }
  }

  console.log(`\n${passed} succeeded, ${failed} failed.`)

  if (failed === 0) {
    console.log('\n🎉  All done! The tts-manifest.ts URLs are already correct — no changes needed.')
    console.log('    Deploy to Vercel and the voices will be live.')
  } else {
    console.log('\n⚠️   Some phrases failed. Re-run the script to retry.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n❌', err.message)
  process.exit(1)
})
