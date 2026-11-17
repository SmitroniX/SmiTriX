import { useState, useEffect } from 'react'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { starterPlanSheet } from '../sheets.jsx'
import { nav } from '../lib/nav.js'

export const TUTORIAL_STORAGE_KEY = 'smitrix_tutorial_seen'

export function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

export function resetTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/* =========================================================================
   AegisDNS-Inspired Vector Illustrations & Tactical Telemetry Graphic HUDs
   ========================================================================= */

function AegisSecurityShieldSvg() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 12px' }}>
      <svg width="220" height="110" viewBox="0 0 220 110" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="aegisGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Radar Concentric Rings */}
        <circle cx="110" cy="55" r="48" fill="url(#aegisGlow)" stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="110" cy="55" r="32" fill="none" stroke="var(--acc)" strokeOpacity="0.3" strokeWidth="1" />
        {/* Rotating sweep line */}
        <line x1="110" y1="55" x2="155" y2="25" stroke="var(--acc)" strokeWidth="1.5" strokeOpacity="0.6" style={{ transformOrigin: '110px 55px', animation: 'aegisRadarSweep 6s linear infinite' }} />
        {/* Cyber Shield */}
        <path d="M110 32 L130 40 L130 62 Q110 80 110 82 Q110 80 90 62 L90 40 Z" fill="rgba(15, 23, 42, 0.85)" stroke="var(--acc)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.4))' }} />
        {/* Core Lock Node */}
        <circle cx="110" cy="55" r="6" fill="var(--acc)" />
        <path d="M107 55 L113 55 M110 52 L110 58" stroke="var(--on-acc)" strokeWidth="1.5" />
        {/* Telemetry data pins */}
        <circle cx="60" cy="30" r="3" fill="var(--blue)" />
        <line x1="60" y1="30" x2="88" y2="45" stroke="var(--blue)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
        <text x="32" y="22" fill="var(--blue)" fontSize="8" fontFamily="monospace" fontWeight="700">PRIVACY: LOCAL_VAULT</text>
        <circle cx="160" cy="80" r="3" fill="var(--purple)" />
        <line x1="160" y1="80" x2="128" y2="68" stroke="var(--purple)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
        <text x="140" y="94" fill="var(--purple)" fontSize="8" fontFamily="monospace" fontWeight="700">AES: ZERO_TRACKING</text>
      </svg>
    </div>
  )
}

function AegisPlanMatrixSvg() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 10px' }}>
      <svg width="240" height="90" viewBox="0 0 240 90">
        {/* Trace Route Line */}
        <path d="M 30 45 L 85 25 L 145 65 L 205 35" fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="5 5" style={{ animation: 'aegisTraceFlow 3s linear infinite' }} />
        {/* Matrix Nodes */}
        <g transform="translate(30, 45)">
          <circle r="12" fill="rgba(59,130,246,0.15)" stroke="var(--blue)" strokeWidth="1.5" />
          <circle r="4" fill="var(--blue)" />
          <text y="24" fill="var(--label-2)" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="700">MON · PUSH</text>
        </g>
        <g transform="translate(85, 25)">
          <circle r="10" fill="var(--surface-3)" stroke="var(--border-hairline)" strokeWidth="1" />
          <circle r="3" fill="var(--label-3)" />
          <text y="22" fill="var(--label-3)" fontSize="8" fontFamily="monospace" textAnchor="middle">TUE · REST</text>
        </g>
        <g transform="translate(145, 65)">
          <circle r="12" fill="rgba(59,130,246,0.15)" stroke="var(--blue)" strokeWidth="1.5" />
          <circle r="4" fill="var(--blue)" />
          <text y="24" fill="var(--label-2)" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="700">WED · PULL</text>
        </g>
        <g transform="translate(205, 35)">
          <circle r="12" fill="rgba(59,130,246,0.25)" stroke="var(--acc)" strokeWidth="2" />
          <circle r="5" fill="var(--acc)" />
          <text y="24" fill="var(--acc)" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="700">FRI · LEGS</text>
        </g>
      </svg>
    </div>
  )
}

function AegisWorkoutTelemetrySvg({ unit = 'kg' }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 10px' }}>
      <svg width="240" height="95" viewBox="0 0 240 95">
        {/* HUD Frame */}
        <rect x="10" y="8" width="220" height="78" rx="12" fill="rgba(18,18,24,0.7)" stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" />
        {/* Set Counter Box */}
        <rect x="22" y="24" width="36" height="46" rx="8" fill="var(--surface-3)" />
        <text x="40" y="44" fill="var(--label-3)" fontSize="9" fontFamily="monospace" textAnchor="middle">SET</text>
        <text x="40" y="60" fill="var(--label-1)" fontSize="16" fontFamily="monospace" fontWeight="800" textAnchor="middle">01</text>
        {/* Metric Readout 1: Load */}
        <text x="75" y="36" fill="var(--label-3)" fontSize="8" fontFamily="monospace">LOAD</text>
        <text x="75" y="56" fill="var(--label-1)" fontSize="15" fontFamily="monospace" fontWeight="700">80 <tspan fontSize="10" fill="var(--label-3)">{unit}</tspan></text>
        {/* Metric Readout 2: Reps */}
        <text x="125" y="36" fill="var(--label-3)" fontSize="8" fontFamily="monospace">REPS</text>
        <text x="125" y="56" fill="var(--label-1)" fontSize="15" fontFamily="monospace" fontWeight="700">10 <tspan fontSize="10" fill="var(--orange)">RIR 2</tspan></text>
        {/* Rest Timer Ring Simulation */}
        <circle cx="195" cy="47" r="22" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle cx="195" cy="47" r="22" fill="none" stroke="var(--acc)" strokeWidth="3" strokeDasharray="138" strokeDashoffset="45" style={{ transformOrigin: '195px 47px', transform: 'rotate(-90deg)' }} />
        <text x="195" y="44" fill="var(--acc)" fontSize="11" fontFamily="monospace" fontWeight="800" textAnchor="middle">01:30</text>
        <text x="195" y="56" fill="var(--label-3)" fontSize="7" fontFamily="monospace" textAnchor="middle">REST</text>
      </svg>
    </div>
  )
}

function AegisStatsSignalSvg() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 10px' }}>
      <svg width="240" height="90" viewBox="0 0 240 90">
        <defs>
          <linearGradient id="sigGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--blue)" />
            <stop offset="50%" stopColor="var(--purple)" />
            <stop offset="100%" stopColor="var(--acc)" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="20" y1="70" x2="220" y2="70" stroke="var(--border-hairline)" strokeWidth="1" />
        <line x1="20" y1="45" x2="220" y2="45" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="20" y1="20" x2="220" y2="20" stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Dynamic Wave */}
        <path d="M 20 65 Q 60 62 80 40 T 130 50 T 170 28 T 220 22" fill="none" stroke="url(#sigGrad)" strokeWidth="2.5" />
        {/* Peak PR Point */}
        <circle cx="220" cy="22" r="5" fill="var(--acc)" style={{ animation: 'aegisPulse 1.5s infinite ease-in-out' }} />
        <text x="215" y="14" fill="var(--acc)" fontSize="8" fontFamily="monospace" fontWeight="800" textAnchor="end">NEW PR 🏆</text>
        <text x="25" y="82" fill="var(--label-3)" fontSize="8" fontFamily="monospace">WEEK 1</text>
        <text x="110" y="82" fill="var(--label-3)" fontSize="8" fontFamily="monospace">STREAK: 8 WKS</text>
        <text x="215" y="82" fill="var(--label-3)" fontSize="8" fontFamily="monospace" textAnchor="end">1RM +12%</text>
      </svg>
    </div>
  )
}

/**
 * The AegisDNS-Inspired Multi-Step Tutorial Modal Dialog.
 */
export function TutorialDialog({ initialStep = 0, close }) {
  const [step, setStep] = useState(initialStep)
  const S = useStore(s => s.S)

  const onFinish = () => {
    markTutorialSeen()
    close()
  }

  const onLoadStarter = () => {
    markTutorialSeen()
    close()
    setTimeout(() => starterPlanSheet(), 150)
  }

  const onStartWorkout = () => {
    markTutorialSeen()
    close()
    nav('/workout')
  }

  const onGoPlan = () => {
    markTutorialSeen()
    close()
    nav('/plan')
  }

  const onGoLibrary = () => {
    markTutorialSeen()
    close()
    nav('/library')
  }

  const steps = [
    // Step 0: Welcome
    {
      badge: t('Welcome'),
      badgeColor: 'var(--acc)',
      icon: 'sparkles',
      iconTint: 'var(--acc)',
      title: t('Welcome to SmiTriX'),
      subtitle: t('A private, fast, distraction-free gym tracker. Here is a quick 1-minute guide on how everything works!'),
      renderIllustration: () => <AegisSecurityShieldSvg />,
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span className="lrow-i" style={{ background: 'color-mix(in srgb, var(--blue) 20%, transparent)', color: 'var(--blue)', marginTop: 2 }}>
                <Icon name="calendar" />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{t('1. Plan your week')}</div>
                <div className="muted small">{t('Choose a starter plan or assign routines (Push, Pull, Legs) to training days.')}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span className="lrow-i" style={{ background: 'color-mix(in srgb, var(--orange) 20%, transparent)', color: 'var(--orange)', marginTop: 2 }}>
                <Icon name="dumbbell" />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{t('2. Log at the gym')}</div>
                <div className="muted small">{t('Tap Start on today’s workout. Enter weight, reps, and check off sets with an auto rest timer.')}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span className="lrow-i" style={{ background: 'color-mix(in srgb, var(--purple) 20%, transparent)', color: 'var(--purple)', marginTop: 2 }}>
                <Icon name="chart" />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{t('3. Track progress')}</div>
                <div className="muted small">{t('Watch your weekly streaks, estimated 1RMs, and muscle volume analytics climb.')}</div>
              </div>
            </div>
          </div>

          <div className="dim small" style={{ textAlign: 'center', marginTop: 4 }}>
            🔒 {t('100% offline-first: your workout data stays securely on your phone.')}
          </div>
        </div>
      )
    },

    // Step 1: Plan
    {
      badge: t('Plan Tab'),
      badgeColor: 'var(--blue)',
      icon: 'calendar',
      iconTint: 'var(--blue)',
      title: t('Step 1: Your Weekly Plan'),
      subtitle: t('A Plan is made of Routines scheduled onto your week.'),
      renderIllustration: () => <AegisPlanMatrixSvg />,
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Think of a Routine as a workout template (e.g. “Push”, “Pull”, or “Upper Body”). You assign each routine to the days you train.')}
          </div>

          <div className="card" style={{ padding: '10px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="lbl2" style={{ marginBottom: 6 }}>{t('Sample 3-day schedule:')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="tag acc"><Icon name="arm" /> {t('Mon: Push')}</span>
              <span className="tag"><Icon name="moon" /> {t('Tue: Rest')}</span>
              <span className="tag acc"><Icon name="pullup" /> {t('Wed: Pull')}</span>
              <span className="tag"><Icon name="moon" /> {t('Thu: Rest')}</span>
              <span className="tag acc"><Icon name="legs" /> {t('Fri: Legs')}</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--label-2)', margin: 0 }}>
            <li><b>{t('Starter Plans')}:</b> {t('Tap “Load starter plan” anytime to load a balanced 3-day PPL, 4-day Upper/Lower, or Full Body split.')}</li>
            <li><b>{t('Rep Ranges & Targets')}:</b> {t('Set target rep ranges (e.g. 8–12 reps) and progression rules so you always know what to lift.')}</li>
            <li><b>{t('Rest Days')}:</b> {t('Any day without a routine is automatically treated as a recovery day.')}</li>
          </ul>
        </div>
      )
    },

    // Step 2: Workout
    {
      badge: t('Workout Tab'),
      badgeColor: 'var(--orange)',
      icon: 'dumbbell',
      iconTint: 'var(--orange)',
      title: t('Step 2: Logging a Workout'),
      subtitle: t('When training, tap the big Start button in the center of the tab bar.'),
      renderIllustration: () => <AegisWorkoutTelemetrySvg unit={S.unit || 'kg'} />,
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('SmiTriX makes logging effortless so you never waste time fiddling with your phone at the gym.')}
          </div>

          <div className="card" style={{ padding: '10px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="lbl2" style={{ marginBottom: 6 }}>{t('Exercise: Bench Press (Barbell)')}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="muted" style={{ fontWeight: 600, fontSize: 14 }}>1</span>
              <span style={{ background: 'var(--surface-3)', padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                80 <span className="muted" style={{ fontSize: 12 }}>{S.unit || 'kg'}</span>
              </span>
              <span style={{ background: 'var(--surface-3)', padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                10 <span className="muted" style={{ fontSize: 12 }}>reps</span>
              </span>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--acc)', color: 'var(--on-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={18} />
              </span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--label-2)', margin: 0 }}>
            <li><b>{t('Complete Sets')}:</b> {t('Enter weight and reps, then tap the checkmark to record the set.')}</li>
            <li><b>{t('Auto Rest Timer')}:</b> {t('Begins counting down immediately with audio and vibration alerts when rest is over.')}</li>
            <li><b>{t('RIR / Effort')}:</b> {t('Optionally log Reps In Reserve (e.g. 2 RIR = could do 2 more reps) to pace your intensity.')}</li>
            <li><b>{t('Finish Session')}:</b> {t('Tap the checkered flag to complete the session and record new personal records (PRs)!')}</li>
          </ul>
        </div>
      )
    },

    // Step 3: Exercise Library
    {
      badge: t('Exercises Tab'),
      badgeColor: 'var(--teal)',
      icon: 'list',
      iconTint: 'var(--teal)',
      title: t('Step 3: 1,300+ Exercise Library'),
      subtitle: t('Form instructions, muscle activation maps, and equipment filters at your fingertips.'),
      renderIllustration: () => (
        <div style={{ position: 'relative', width: '100%', height: 85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="220" height="85" viewBox="0 0 220 85">
            <rect x="15" y="10" width="190" height="65" rx="10" fill="rgba(20,184,166,0.08)" stroke="var(--teal)" strokeWidth="1.5" strokeDasharray="6 3" />
            <circle cx="50" cy="42" r="18" fill="rgba(20,184,166,0.2)" />
            <circle cx="50" cy="42" r="6" fill="var(--teal)" />
            <line x1="30" y1="42" x2="70" y2="42" stroke="var(--teal)" strokeWidth="1" />
            <line x1="50" y1="22" x2="50" y2="62" stroke="var(--teal)" strokeWidth="1" />
            <text x="82" y="38" fill="var(--label-1)" fontSize="13" fontWeight="700">1,324 EXERCISES</text>
            <text x="82" y="52" fill="var(--teal)" fontSize="9" fontFamily="monospace">ANATOMICAL ACTIVATION MAPS</text>
          </svg>
        </div>
      ),
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Explore a comprehensive catalog of exercises with animated guides and targeted anatomical charts.')}
          </div>

          <div className="card" style={{ padding: '10px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Incline Dumbbell Press</span>
              <span className="tag acc" style={{ fontSize: 10 }}>Chest</span>
            </div>
            <div className="dim small" style={{ marginBottom: 6, fontSize: 11 }}>Primary: Upper Chest · Secondary: Triceps, Front Delts</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="tag" style={{ fontSize: 10 }}>Dumbbell</span>
              <span className="tag" style={{ fontSize: 10 }}>Push</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--label-2)', margin: 0 }}>
            <li><b>{t('Muscle Heatmaps')}:</b> {t('See exactly which muscles each exercise engages.')}</li>
            <li><b>{t('Equipment Filters')}:</b> {t('Filter by Barbell, Dumbbell, Cables, Machines, or Bodyweight to match your gym.')}</li>
            <li><b>{t('Custom Exercises')}:</b> {t('Easily add your own custom exercises if your gym has specialized equipment.')}</li>
          </ul>
        </div>
      )
    },

    // Step 4: Stats & Analytics
    {
      badge: t('Stats Tab'),
      badgeColor: 'var(--purple)',
      icon: 'chart',
      iconTint: 'var(--purple)',
      title: t('Step 4: Streaks & Analytics'),
      subtitle: t('Every logged set automatically powers your personal analytics.'),
      renderIllustration: () => <AegisStatsSignalSvg />,
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Track your long-term consistency, strength milestones, and training volume without complex spreadsheets.')}
          </div>

          <div className="card" style={{ padding: '10px 14px', background: 'var(--surface-2)', margin: 0, border: '1px solid var(--border-hairline)' }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <div className="row" style={{ gap: 8, fontSize: 16, fontWeight: 700 }}>
                <Icon name="flame" style={{ color: 'var(--orange)' }} />
                <span>{t('Workout Streaks')}</span>
              </div>
              <span className="tag" style={{ color: 'var(--orange)', fontSize: 11 }}>Active</span>
            </div>
            <div className="muted small">{t('Stay consistent week over week to keep your workout streak growing.')}</div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: 'var(--label-2)', margin: 0 }}>
            <li><b>{t('Estimated 1RM')}:</b> {t('Calculates your One-Rep Max trends on compound lifts safely from your rep sets.')}</li>
            <li><b>{t('Volume & Muscle Balance')}:</b> {t('See total lifted tonnage per week and muscle group distribution.')}</li>
            <li><b>{t('History & Calendar')}:</b> {t('Review past workouts, view set history, and repeat previous sessions.')}</li>
          </ul>
        </div>
      )
    },

    // Step 5: Ready to start
    {
      badge: t('Ready to Lift'),
      badgeColor: 'var(--green)',
      icon: 'rocket',
      iconTint: 'var(--green)',
      title: t('You’re Ready to Go!'),
      subtitle: t('How would you like to start your training journey?'),
      renderIllustration: () => (
        <div style={{ position: 'relative', width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="220" height="80" viewBox="0 0 220 80">
            <circle cx="110" cy="40" r="32" fill="rgba(34,197,94,0.1)" stroke="var(--acc)" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="110" cy="40" r="16" fill="rgba(34,197,94,0.25)" />
            <path d="M102 40 L108 46 L118 34" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="110" y="68" fill="var(--acc)" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle">MISSION READY</text>
          </svg>
        </div>
      ),
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn primary" style={{ width: '100%', padding: '13px', fontSize: 15 }} onClick={onLoadStarter}>
            <Icon name="sparkles" style={{ marginRight: 8 }} />
            {t('Load a Ready-Made Plan')}
          </button>

          <Button style={{ width: '100%', padding: '11px' }} onClick={onGoPlan}>
            <Icon name="calendar" style={{ marginRight: 8 }} />
            {t('Build My Own Plan')}
          </Button>

          <Button style={{ width: '100%', padding: '11px' }} onClick={onStartWorkout}>
            <Icon name="dumbbell" style={{ marginRight: 8 }} />
            {t('Start a Freestyle Workout')}
          </Button>

          <Button variant="ghost" className="dim" style={{ width: '100%' }} onClick={onGoLibrary}>
            <Icon name="list" style={{ marginRight: 8 }} />
            {t('Explore Exercise Library')}
          </Button>

          <div className="dim small" style={{ textAlign: 'center', marginTop: 4 }}>
            {t('You can always reopen this guide anytime from the help icon or Settings.')}
          </div>
        </div>
      )
    }
  ]

  const current = steps[step] || steps[0]
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  return (
    <div className="aegis-hud-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', minHeight: 490 }}>
      {/* Top Telemetry Header Bar */}
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="aegis-badge" style={{ color: current.badgeColor, background: `color-mix(in srgb, ${current.badgeColor} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${current.badgeColor} 40%, transparent)` }}>
            <span className="aegis-dot" style={{ background: current.badgeColor, boxShadow: `0 0 8px ${current.badgeColor}` }} />
            {current.badge}
          </span>
          <span className="dim small" style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
            {t('{0} of {1}', step + 1, steps.length)}
          </span>
        </div>
        <button className="iconbtn" onClick={onFinish} aria-label={t('Close tutorial')} style={{ width: 28, height: 28 }}>
          <Icon name="xmark" size={14} />
        </button>
      </div>

      {/* Title & Subtitle */}
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-.02em', color: 'var(--label-1)' }}>
          {current.title}
        </h2>
        <div className="muted small" style={{ fontSize: 12 }}>{current.subtitle}</div>
      </div>

      {/* Aegis Animated Illustration */}
      {current.renderIllustration && current.renderIllustration()}

      {/* Content Area */}
      <div style={{ flex: 1, margin: '6px 0 14px' }}>
        {current.renderContent()}
      </div>

      {/* Bottom Step Indicator Dots & Navigation Controls */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-hairline)', paddingTop: 12 }}>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              style={{
                width: step === idx ? 24 : 8,
                height: 6,
                borderRadius: 3,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: step === idx ? 'var(--acc)' : 'var(--surface-3)',
                boxShadow: step === idx ? '0 0 8px var(--acc)' : 'none',
                transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              aria-label={t('Go to step {0}', idx + 1)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="row between" style={{ gap: 10 }}>
          {!isFirst ? (
            <Button onClick={() => setStep(s => Math.max(0, s - 1))} style={{ flex: 1 }}>
              {t('Back')}
            </Button>
          ) : (
            <Button variant="ghost" className="dim" onClick={onFinish} style={{ flex: 1 }}>
              {t('Skip tour')}
            </Button>
          )}

          {!isLast ? (
            <button className="btn primary" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} style={{ flex: 1.4 }}>
              {t('Next')} →
            </button>
          ) : (
            <button className="btn primary" onClick={onFinish} style={{ flex: 1.4 }}>
              {t('Got it!')} ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function openTutorial(initialStep = 0) {
  useUI.getState().openSheet(close => <TutorialDialog initialStep={initialStep} close={close} />, { kind: 'center' })
}

export function TutorialWelcomeCard({ onDismiss }) {
  return (
    <div className="card aegis-hud-card" style={{ padding: '16px', border: '1px solid color-mix(in srgb, var(--acc) 40%, transparent)' }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)', width: 32, height: 32, fontSize: 16 }}>
            <Icon name="sparkles" />
          </span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{t('New to SmiTriX?')}</span>
        </div>
        {onDismiss && (
          <button className="iconbtn" style={{ width: 28, height: 28, fontSize: 13 }} onClick={onDismiss} aria-label={t('Dismiss')}>
            <Icon name="xmark" />
          </button>
        )}
      </div>
      <div className="muted small" style={{ marginBottom: 12, lineHeight: 1.5 }}>
        {t('Take a quick 1-minute visual tour to see how to plan routines, log workouts with the rest timer, and track your gains.')}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Button variant="primary" size="sm" icon="play" onClick={() => openTutorial(0)}>
          {t('Start Tour')}
        </Button>
        <Button size="sm" icon="sparkles" onClick={starterPlanSheet}>
          {t('Starter Plans')}
        </Button>
      </div>
    </div>
  )
}

export function TutorialPromptChecker() {
  const ready = useStore(s => s.ready)
  const workoutsCount = useStore(s => s.S.workouts.length)

  useEffect(() => {
    if (!ready) return
    if (workoutsCount === 0 && !hasSeenTutorial()) {
      const tm = setTimeout(() => {
        if (!hasSeenTutorial()) {
          openTutorial(0)
        }
      }, 1800)
      return () => clearTimeout(tm)
    }
  }, [ready, workoutsCount])

  return null
}
