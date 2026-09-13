import { useState, useEffect } from 'react'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { starterPlanSheet } from '../sheets.jsx'
import { nav } from '../lib/nav.js'

export const TUTORIAL_STORAGE_KEY = 'smitrix_tutorial_seen'

/**
 * Checks if the user has completed or dismissed the tutorial.
 */
export function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Marks the tutorial as seen in localStorage.
 */
export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

/**
 * Resets the tutorial seen flag so it can be triggered again.
 */
export function resetTutorialSeen() {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * The multi-step tutorial modal dialog.
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
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

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
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

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Think of a Routine as a workout template (e.g. “Push”, “Pull”, or “Upper Body”). You assign each routine to the days you train.')}
          </div>

          {/* Visual demo row */}
          <div className="card" style={{ padding: '10px 14px', background: 'var(--surface-2)', margin: 0 }}>
            <div className="lbl2" style={{ marginBottom: 6 }}>{t('Sample 3-day schedule:')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="tag acc"><Icon name="arm" /> {t('Mon: Push')}</span>
              <span className="tag"><Icon name="moon" /> {t('Tue: Rest')}</span>
              <span className="tag acc"><Icon name="pullup" /> {t('Wed: Pull')}</span>
              <span className="tag"><Icon name="moon" /> {t('Thu: Rest')}</span>
              <span className="tag acc"><Icon name="legs" /> {t('Fri: Legs')}</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--label-2)' }}>
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('SmiTriX makes logging effortless so you never waste time fiddling with your phone at the gym.')}
          </div>

          {/* Mock set row */}
          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
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

          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--label-2)' }}>
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Explore a comprehensive catalog of exercises with animated guides and targeted anatomical charts.')}
          </div>

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Incline Dumbbell Press</span>
              <span className="tag acc" style={{ fontSize: 11 }}>Chest</span>
            </div>
            <div className="dim small" style={{ marginBottom: 6 }}>Primary: Upper Chest · Secondary: Triceps, Front Delts</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="tag" style={{ fontSize: 11 }}>Dumbbell</span>
              <span className="tag" style={{ fontSize: 11 }}>Push</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--label-2)' }}>
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--label-2)' }}>
            {t('Track your long-term consistency, strength milestones, and training volume without complex spreadsheets.')}
          </div>

          <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)', margin: 0 }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <div className="row" style={{ gap: 8, fontSize: 18, fontWeight: 700 }}>
                <Icon name="flame" style={{ color: 'var(--orange)' }} />
                <span>{t('Workout Streaks')}</span>
              </div>
              <span className="tag" style={{ color: 'var(--orange)' }}>Active</span>
            </div>
            <div className="muted small">{t('Stay consistent week over week to keep your workout streak growing.')}</div>
          </div>

          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--label-2)' }}>
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
      renderContent: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn primary" style={{ width: '100%', padding: '14px', fontSize: 16 }} onClick={onLoadStarter}>
            <Icon name="sparkles" style={{ marginRight: 8 }} />
            {t('Load a Ready-Made Plan')}
          </button>

          <Button style={{ width: '100%', padding: '12px' }} onClick={onGoPlan}>
            <Icon name="calendar" style={{ marginRight: 8 }} />
            {t('Build My Own Plan')}
          </Button>

          <Button style={{ width: '100%', padding: '12px' }} onClick={onStartWorkout}>
            <Icon name="dumbbell" style={{ marginRight: 8 }} />
            {t('Start a Freestyle Workout')}
          </Button>

          <Button variant="ghost" className="dim" style={{ width: '100%' }} onClick={onGoLibrary}>
            <Icon name="list" style={{ marginRight: 8 }} />
            {t('Explore Exercise Library')}
          </Button>

          <div className="dim small" style={{ textAlign: 'center', marginTop: 6 }}>
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
    <div style={{ padding: '8px 2px 2px', display: 'flex', flexDirection: 'column', minHeight: 460 }}>
      {/* Header bar: Badge, Step indicator, and Close */}
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="tag" style={{ color: current.badgeColor, background: `color-mix(in srgb, ${current.badgeColor} 18%, transparent)`, fontWeight: 600 }}>
            {current.badge}
          </span>
          <span className="dim small" style={{ fontWeight: 500 }}>
            {t('{0} of {1}', step + 1, steps.length)}
          </span>
        </div>
        <button className="iconbtn" onClick={onFinish} aria-label={t('Close tutorial')}>
          <Icon name="xmark" />
        </button>
      </div>

      {/* Main step card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span className="lrow-i" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 24, background: `color-mix(in srgb, ${current.iconTint} 18%, transparent)`, color: current.iconTint }}>
          <Icon name={current.icon} />
        </span>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-.02em' }}>{current.title}</h2>
          <div className="muted small" style={{ marginTop: 2 }}>{current.subtitle}</div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, margin: '12px 0 20px' }}>
        {current.renderContent()}
      </div>

      {/* Bottom Step Indicator Dots & Navigation Controls */}
      <div style={{ marginTop: 'auto', borderTop: 'var(--hair) solid var(--sep)', paddingTop: 14 }}>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              style={{
                width: step === idx ? 22 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: step === idx ? 'var(--acc)' : 'var(--surface-3)',
                transition: 'all .2s ease'
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

/**
 * Opens the interactive tutorial modal.
 * @param {number} initialStep - 0 to 5
 */
export function openTutorial(initialStep = 0) {
  useUI.getState().openSheet(close => <TutorialDialog initialStep={initialStep} close={close} />, { kind: 'center' })
}

/**
 * Friendly first-launch banner or card prompt component for new users.
 */
export function TutorialWelcomeCard({ onDismiss }) {
  return (
    <div className="card" style={{ border: '1px solid color-mix(in srgb, var(--acc) 40%, transparent)', background: 'color-mix(in srgb, var(--acc) 6%, var(--surface))' }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row" style={{ gap: 8 }}>
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

/**
 * First-launch auto prompt for new users mounted in Shell.
 * If user has 0 workouts logged and has never seen the tutorial, offers a friendly tour.
 */
export function TutorialPromptChecker() {
  const ready = useStore(s => s.ready)
  const workoutsCount = useStore(s => s.S.workouts.length)

  useEffect(() => {
    if (!ready) return
    // Only prompt for brand new accounts with 0 workouts who haven't seen the tutorial
    if (workoutsCount === 0 && !hasSeenTutorial()) {
      const tm = setTimeout(() => {
        // Double check condition before popping
        if (!hasSeenTutorial()) {
          openTutorial(0)
        }
      }, 1800)
      return () => clearTimeout(tm)
    }
  }, [ready, workoutsCount])

  return null
}
