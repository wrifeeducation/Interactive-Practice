/**
 * AnalyticsTab — platform-wide stats for the admin dashboard.
 * Queries Supabase aggregates to show usage metrics.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface Stats {
  totalPupils: number
  totalTeachers: number
  totalLessons: number
  totalActivities: number
  totalXP: number
  lessonsCompleted: number
  activeStreaks: number
}

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <p style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value.toLocaleString()}</p>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>{label}</p>
    </div>
  )
}

export default function AnalyticsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [
          { count: totalPupils },
          { count: totalTeachers },
          { count: totalLessons },
          { count: totalActivities },
          { count: lessonsCompleted },
          { count: activeStreaks },
          xpResult,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'pupil'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('lessons').select('id', { count: 'exact', head: true }),
          supabase.from('activities').select('id', { count: 'exact', head: true }),
          supabase.from('pupil_progress').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null),
          supabase.from('streaks').select('id', { count: 'exact', head: true }).gt('current_streak', 0),
          supabase.from('pupil_progress').select('xp_earned'),
        ])

        const totalXP = (xpResult.data ?? []).reduce((s: number, r: { xp_earned: number }) => s + (r.xp_earned ?? 0), 0)

        setStats({
          totalPupils:      totalPupils  ?? 0,
          totalTeachers:    totalTeachers ?? 0,
          totalLessons:     totalLessons  ?? 0,
          totalActivities:  totalActivities ?? 0,
          totalXP,
          lessonsCompleted: lessonsCompleted ?? 0,
          activeStreaks:    activeStreaks ?? 0,
        })
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 24 }}>Loading analytics…</p>
  if (error)   return <p style={{ color: 'var(--color-incorrect)', padding: 24 }}>Error: {error}</p>
  if (!stats)  return null

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Platform Analytics</h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 24 }}>Live counts from the database</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard icon="🎒" value={stats.totalPupils}      label="Pupils signed up"     color="var(--color-brand-primary)" />
        <StatCard icon="📋" value={stats.totalTeachers}    label="Teachers registered"  color="var(--color-brand-primary)" />
        <StatCard icon="📖" value={stats.totalLessons}     label="Lessons published"    color="var(--color-world-2)" />
        <StatCard icon="❓" value={stats.totalActivities}  label="Activities in DB"     color="var(--color-world-3)" />
        <StatCard icon="✅" value={stats.lessonsCompleted} label="Lessons completed"    color="var(--color-correct)" />
        <StatCard icon="⭐" value={stats.totalXP}          label="Total XP awarded"     color="var(--color-xp)" />
        <StatCard icon="🔥" value={stats.activeStreaks}    label="Active streaks"       color="var(--color-streak)" />
      </div>
    </div>
  )
}
