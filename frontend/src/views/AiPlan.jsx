import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { allExercises, matchExercise } from '../lib/exercises.js'
import { buildAiPlanPrompt, parseAiPlanText } from '../lib/gymmane-measures.js'
import { uid } from '../lib/format.js'
import { DEFAULT_GLYPH } from '../lib/glyphs.js'
import { t } from '../lib/i18n.js'
import { Rise } from '../components/GymManeMotion.jsx'
import Icon from '../components/Icon.jsx'

// GymMane Offline AI Plan Builder (ai_plan_screen.dart)
// Copy prompt → paste into any AI → paste answer back → creates real routines offline!
export default function AiPlan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [answer, setAnswer] = useState('')
  const [showFmt, setShowFmt] = useState(false)
  const [result, setResult] = useState(null)

  const prompt = buildAiPlanPrompt(S)

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      useUI.getState().toast(t('AI prompt copied — paste it into ChatGPT, Claude or Gemini'), { icon: 'copy', accent: 'var(--acc)' })
    } catch {
      useUI.getState().toast(t('Could not copy automatically — tap "Show format" below'))
    }
  }

  const pasteClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText()
      if (txt) setAnswer(txt)
    } catch {
      useUI.getState().toast(t('Long-press inside the box to paste'))
    }
  }

  const doImport = () => {
    const parsed = parseAiPlanText(answer)
    if (!parsed.length) {
      setResult({ failed: true, routines: 0, exercises: 0, missed: [] })
      return
    }
    const lib = allExercises(S)
    const missed = []
    let addedEx = 0
    const createdRoutines = []

    for (const r of parsed) {
      const exList = []
      for (const item of r.items) {
        const hit = lib.find(e => e.name.toLowerCase() === item.name.toLowerCase()) ||
          lib.find(e => matchExercise(e, item.name))
        if (hit) {
          exList.push({ id: hit.id, sets: item.sets, reps: item.reps })
          addedEx++
        } else {
          missed.push(item.name)
        }
      }
      if (exList.length) {
        createdRoutines.push({
          id: uid(),
          name: r.name,
          emoji: DEFAULT_GLYPH,
          group: 'AI Plan',
          ex: exList,
        })
      }
    }

    if (createdRoutines.length) {
      update(s => {
        s.routines = [...(s.routines || []), ...createdRoutines]
      })
      useUI.getState().toast(t('Imported {0} routines ({1} exercises)', createdRoutines.length, addedEx), {
        icon: 'sparkles',
        accent: 'var(--gm-sage)',
      })
    }
    setResult({ failed: false, routines: createdRoutines.length, exercises: addedEx, missed })
  }

  return (
    <div className="narrow">
      <div className="hdr" style={{ alignItems: 'center' }}>
        <button type="button" className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 10 }}>
          <h1 style={{ fontSize: 24 }}>{t('AI Routine Builder')}</h1>
          <div className="sub">{t('100% offline prompt & parser')}</div>
        </div>
      </div>

      <Rise index={0}>
        <div className="card">
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <Icon name="shield" style={{ color: 'var(--gm-sage)', fontSize: 18 }} />
            <span className="gm-micro" style={{ color: 'var(--gm-sage)' }}>{t('FULLY OFFLINE · NO API KEY NEEDED')}</span>
          </div>
          <p className="muted small" style={{ lineHeight: 1.5, marginBottom: 16 }}>
            {t('Ask any AI (ChatGPT, Claude, Gemini, local LLM) to design your training split, then paste its reply below. SmiTriX matches every exercise against your library automatically.')}
          </p>
          {[
            t('Copy the ready-made prompt template'),
            t('Paste it into your favorite AI and add your goals'),
            t('Paste the AI response below and tap Import'),
          ].map((stepText, idx) => (
            <div key={idx} className="row" style={{ gap: 11, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ember-soft)', color: 'var(--ember)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {idx + 1}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{stepText}</span>
            </div>
          ))}
        </div>
      </Rise>

      <Rise index={1}>
        <button type="button" className="btn primary" style={{ minHeight: 52, marginBottom: 16 }} onClick={copyPrompt}>
          <Icon name="copy" /> {t('Copy prompt for AI')}
        </button>

        <textarea
          className="input"
          rows={9}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={t('Paste the AI routine answer here...')}
          style={{ width: '100%', borderRadius: 20, padding: 16, fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}
        />

        <div className="row between" style={{ marginBottom: 14 }}>
          <button type="button" className="gm-see-all" onClick={pasteClipboard}>
            <Icon name="clipboard" style={{ fontSize: 13 }} /> {t('Paste')}
          </button>
          <button type="button" className="btn plain sm" style={{ color: 'var(--acc)', fontSize: 13 }} onClick={() => setShowFmt(f => !f)}>
            {showFmt ? t('Hide format') : t('Show format')}
          </button>
        </div>

        {showFmt && (
          <pre style={{ background: 'var(--surface)', padding: 14, borderRadius: 16, fontSize: 11.5, color: 'var(--label-2)', overflowX: 'auto', marginBottom: 14, whiteSpace: 'pre-wrap' }}>
            {prompt}
          </pre>
        )}

        <button type="button" className="btn primary" disabled={!answer.trim()} style={{ minHeight: 52 }} onClick={doImport}>
          <Icon name="sparkles" /> {t('Import routines')}
        </button>

        {result && (
          <div className="card" style={{ marginTop: 16, borderColor: result.routines > 0 ? 'var(--gm-sage)' : 'var(--gm-danger)' }}>
            <div style={{ fontWeight: 800, color: result.routines > 0 ? 'var(--gm-sage)' : 'var(--gm-danger)' }}>
              {result.failed
                ? t('Could not read any routines — make sure lines use "## Routine: Name" and "- Exercise | 3x10".')
                : t('Added {0} routines with {1} exercises!', result.routines, result.exercises)}
            </div>
            {result.missed?.length > 0 && (
              <div className="muted small" style={{ marginTop: 8 }}>
                {t('Unmatched exercises:')} {result.missed.join(', ')}
              </div>
            )}
            {result.routines > 0 && (
              <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => nav('/plan')}>
                {t('View in Routines')}
              </button>
            )}
          </div>
        )}
      </Rise>
    </div>
  )
}
