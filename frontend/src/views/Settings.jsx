import { useEffect, useRef, useState, useMemo, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { workoutControls } from '../lib/workout-controls.js'
import { convertStateUnit } from '../lib/units.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ, weekStartOf, MONDAY, SUNDAY } from '../lib/format.js'
import { effortOf } from '../lib/history.js'
import { api, passkeyLogin, passkeyRegister } from '../lib/api.js'
import { pushSupported, enablePush, disablePush, sendTestPush } from '../lib/push.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS } from '../lib/i18n.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE, isAndroid, shareExport, syncReminder, checkNotificationPermission, requestNotificationPermission, sendTestNotification } from '../lib/mobile.js'
import { checkForUpdate } from '../lib/update.js'
import { ConnectSheet } from './MobileOnboarding.jsx'
import { starterPlanSheet, confirmSheet, importFromApp, importFromHevy, importHubSheet, equipmentProfileSheet, menuSheet } from '../sheets.jsx'
import { openTutorial } from '../components/TutorialDialog.jsx'
import { startAppUpdate } from '../components/UpdateDialog.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField } from '../components/ui.jsx'
import { playRestChime } from '../lib/sound.js'
import { getApiKey, setApiKey, clearApiKey, hasApiKey, getHevyApiKey, setHevyApiKey, clearHevyApiKey } from '../lib/coach-secrets.js'
import { HTTP_PROVIDERS, HTTP_PROVIDER_IDS, validateBaseUrl } from '../../../api/coach/core/providers.js'
import { testHevyApiKey } from '../lib/import-hevy.js'
import { setAnalyticsConsent } from '../lib/analytics.js'
import { isAdminEmail } from '../lib/firebase.js'
import { HEAT_TONES } from '../lib/gymmane-awards.js'
import { CATALOGUE } from '../lib/exercises.js'
import { Rise } from '../components/GymManeMotion.jsx'

const REPO_URL = 'https://github.com/SmitroniX/SmiTriX'
const BUG_URL = `${REPO_URL}/issues/new?labels=bug`
const FEATURE_URL = `${REPO_URL}/issues/new?labels=enhancement`
const COFFEE_URL = 'https://buymeacoffee.com/asmit_jogdand'
const DISCORD_URL = 'https://discord.gg/ZFQV5dza9P'

const HELP_TOPICS = [
  {
    id: 'import',
    q: 'How do I import workouts from Hevy, Strong or FitNotes?',
    a: 'Open Data & backup and choose "Import from another app" for CSV/XML backups, or "Import from Hevy" with a Hevy Pro API key.',
    section: 'data',
  },
  {
    id: 'units',
    q: 'How do I switch between kg and lb?',
    a: 'Open General → Weight unit. SmiTriX offers to convert all logged weights automatically or keep your numbers and change only the label.',
    section: 'general',
  },
  {
    id: 'rest',
    q: 'How do I change the rest timer sound or duration?',
    a: 'Set your default rest timer in Training, and customize chimes, voice coach, screen flash and edge glow in Reminders & alarm.',
    section: 'alerts',
  },
  {
    id: 'privacy',
    q: 'Where is my workout data stored?',
    a: 'On the website and demo, everything stays 100% locally in your browser with no account required. On the mobile app, optional cloud sync backs up your sessions.',
    section: 'about',
  },
  {
    id: 'onboarding',
    q: 'Can I re-run the initial setup walkthrough?',
    a: 'Yes — tap "Run setup walkthrough" inside Support to update your name, units, body stats, weekly goal and training places.',
    section: 'support',
  },
]

const SEARCH_INDEX = [
  { label: 'Theme (Dark, OLED, Light, System)', section: 'general', icon: 'moon' },
  { label: 'Language', section: 'general', icon: 'globe' },
  { label: 'Weight unit (kg / lb)', section: 'general', icon: 'scale' },
  { label: 'Week starts on (Monday / Sunday)', section: 'general', icon: 'calendar' },
  { label: 'Accent color', section: 'general', icon: 'sparkles' },
  { label: 'Background pattern (Warm Dots / Grid / Solid)', section: 'general', icon: 'grid' },
  { label: 'Heatmap palette', section: 'general', icon: 'flame' },
  { label: 'Body diagram (Male / Female)', section: 'general', icon: 'figureStrength' },
  { label: 'Workout view (Cards / List)', section: 'training', icon: 'list' },
  { label: 'Workout density (Spacious / Compact)', section: 'training', icon: 'table' },
  { label: 'Workout controls', section: 'training', icon: 'wrench' },
  { label: 'Rest timer & rest-pause duration', section: 'training', icon: 'timer' },
  { label: 'Exercise animations (Full / Small / Hidden)', section: 'training', icon: 'figureRun' },
  { label: 'Effort per set (RIR / RPE)', section: 'training', icon: 'target' },
  { label: 'Start countdown & Deload reduction', section: 'training', icon: 'feather' },
  { label: 'Equipment profiles & Places', section: 'training', icon: 'dumbbell' },
  { label: 'Sounds & Rest timer chime', section: 'alerts', icon: 'bell' },
  { label: 'Voice coach', section: 'alerts', icon: 'mic' },
  { label: 'Flash screen & Rest edge glow', section: 'alerts', icon: 'sun' },
  { label: 'Workout day reminders & Notifications', section: 'alerts', icon: 'calendar' },
  { label: 'Weekly workout goal', section: 'home', icon: 'target' },
  { label: 'Gym check-in pass card', section: 'home', icon: 'qr' },
  { label: 'Nutrition & Recovery hubs', section: 'home', icon: 'forkKnife' },
  { label: 'AI Coach & Manage API Keys', section: 'beta', icon: 'sparkles' },
  { label: 'Load starter plan', section: 'data', icon: 'sparkles' },
  { label: 'Import from Hevy, Strong or FitNotes', section: 'data', icon: 'shuffle' },
  { label: 'Export / Import JSON backup', section: 'data', icon: 'download' },
  { label: 'Reset everything', section: 'data', icon: 'trash' },
  { label: 'Setup walkthrough & Support', section: 'support', icon: 'help' },
  { label: 'About SmiTriX, Version & Credits', section: 'about', icon: 'info' },
]

function useIsDesktop() {
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false))
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = e => setWide(e.matches)
    setWide(mql.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])
  return wide
}

export default function Settings({ initialSection = null }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const coachLocal = useStore(s => s.coachLocal)
  const { update, replaceState, setUser, pullState, pushState, signOut, resetDemo } = useStore()
  const toast = useUI(s => s.toast)
  const isAdmin = Boolean(user?.admin || isAdminEmail(user?.email))
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()
  const isDesktop = useIsDesktop()

  const [section, setSection] = useState(initialSection)
  const [deskSection, setDeskSection] = useState(initialSection || 'general')
  const [query, setQuery] = useState('')
  const [openHelpId, setOpenHelpId] = useState(null)

  const [hasCoachKey, setHasCoachKey] = useState(false)
  const [hasHevyKey, setHasHevyKey] = useState(false)
  const [savedProviderCount, setSavedProviderCount] = useState(0)

  const refreshApiKeys = async () => {
    let count = 0
    for (const id of HTTP_PROVIDER_IDS) {
      if (await hasApiKey(id)) count++
    }
    setSavedProviderCount(count)
    const activeKey = await getApiKey(coachLocal?.provider)
    setHasCoachKey(!!activeKey)
    const hevy = await getHevyApiKey()
    setHasHevyKey(!!hevy)
  }
  useEffect(() => { refreshApiKeys() }, [coachLocal])

  const switchUnit = v => {
    if (v === S.unit) return
    menuSheet({
      title: t('Convert to {0}?', v),
      subtitle: t('Every stored weight — logged sets, working weights, routine targets, body weight, bar weights — is in {0}. Convert the numbers, or keep them and only change the label?', S.unit),
      items: [
        { icon: 'shuffle', label: t('Convert the numbers'), onClick: () => replaceState(convertStateUnit(useStore.getState().S, v)) },
        { icon: 'pencil', label: t('Keep the numbers, change the label'), onClick: () => update(s => { s.unit = v }) },
      ],
    })
  }

  // In-app Android APK updater (strictly gated on MOBILE && isAndroid)
  const [updateInfo, setUpdateInfo] = useState(null)
  useEffect(() => {
    if (!MOBILE) return
    isAndroid().then(ok => { if (ok) checkForUpdate().then(setUpdateInfo).catch(() => {}) })
  }, [])

  const onUpdateRowClick = () => {
    if (!updateInfo?.hasUpdate) return
    if (updateInfo.apkUrl) {
      const version = updateInfo.latestVersion
      confirmSheet({
        title: t('Update to {0}?', version),
        message: t('The latest version will be downloaded and the installer will open.'),
        confirmText: t('Download & Install'),
        cancelText: t('Remind me later'),
        onConfirm: () => startAppUpdate(updateInfo),
      })
    } else {
      window.open(updateInfo.releaseUrl || `${REPO_URL}/releases`, '_blank', 'noopener')
    }
  }

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'smitrix-backup-' + todayISO() + '.json'
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch {}
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }

  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not a SmiTriX backup')
        confirmSheet({
          title: t('Import backup?'),
          message: t('This replaces all current data with the backup file.'),
          confirmText: t('Import'),
          danger: true,
          onConfirm: () => {
            replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true)
            toast(t('Backup imported'))
          },
        })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }

  // Category groups matching GymMane's exact 08-settings.png structure
  const categories = useMemo(() => {
    const list = [
      { id: 'general', group: 'app', icon: 'sliders', title: t('General') },
      { id: 'training', group: 'app', icon: 'dumbbell', title: t('Training') },
      { id: 'alerts', group: 'app', icon: 'bell', title: t('Reminders & alarm') },
      { id: 'home', group: 'home', icon: 'home', title: t('Home') },
      { id: 'beta', group: 'home', icon: 'sparkles', title: t('Beta') },
      { id: 'data', group: 'data', icon: 'download', title: t('Data & backup') },
      { id: 'support', group: 'data', icon: 'heart', title: t('Support') },
      { id: 'about', group: 'data', icon: 'info', title: t('About SmiTriX') },
    ]
    if (MOBILE || isAdmin) {
      list.unshift({ id: 'account', group: 'app', icon: 'personCircle', title: t('Account & Sync') })
    }
    return list
  }, [isAdmin])

  const openCategory = id => {
    setQuery('')
    if (isDesktop) setDeskSection(id)
    else setSection(id)
  }

  const qLower = query.trim().toLowerCase()
  const searchHits = useMemo(() => {
    if (!qLower) return []
    return SEARCH_INDEX.filter(item =>
      item.label.toLowerCase().includes(qLower) || t(item.label).toLowerCase().includes(qLower)
    ).slice(0, 8)
  }, [qLower])

  const helpHits = useMemo(() => {
    if (!qLower) return []
    return HELP_TOPICS.filter(h =>
      h.q.toLowerCase().includes(qLower) || h.a.toLowerCase().includes(qLower)
    )
  }, [qLower])

  const sectionTitle = id => categories.find(c => c.id === id)?.title || t('Settings')

  const renderSectionBody = id => {
    if (id === 'account' && (MOBILE || isAdmin)) {
      return (
        <>
          <Section title={t('Account & Cloud Sync')}>
            <Row
              icon="personCircle"
              iconTint="var(--acc)"
              title={user ? user.name : t('Athlete Profile')}
              subtitle={user ? (user.email || t('Verified Cloud Athlete')) : t('Manage your athlete identity')}
              accessory="chevron"
              onClick={() => nav('/profile')}
            />
            {user ? (
              <>
                <Row icon="cloud" iconTint="var(--blue)" title={t('Cloud Sync Active')} subtitle={user.email || user.name} />
                {isAdmin && (
                  <Row
                    icon="shield"
                    iconTint="var(--red)"
                    title={t('Cloud Admin Dashboard')}
                    subtitle="smitronix0826@gmail.com"
                    accessory="chevron"
                    onClick={() => nav('/admin')}
                  />
                )}
                <Row
                  icon="signOut"
                  iconTint="var(--red)"
                  title={t('Sign out')}
                  danger
                  onClick={() => confirmSheet({
                    title: t('Sign out?'),
                    message: t('Your workouts remain saved. You can sign back in anytime.'),
                    confirmText: t('Sign out'),
                    danger: true,
                    onConfirm: async () => {
                      try { await signOut() } catch {}
                      setUser(null)
                      useStore.getState().setGuest(!MOBILE)
                      nav(MOBILE ? '/login' : '/home')
                      toast(t('Signed out'))
                    },
                  })}
                />
              </>
            ) : MOBILE ? (
              <>
                <Row
                  icon="lock"
                  iconTint="var(--blue)"
                  title={t('Sign in with Google or Email')}
                  subtitle={t('Sync your workouts across devices and back up to cloud')}
                  accessory="chevron"
                  onClick={() => nav('/login')}
                />
                <Row
                  icon="link"
                  iconTint="var(--indigo)"
                  title={t('Connect to self-hosted server')}
                  subtitle={t('Sync this device to your own SmiTriX instance instead.')}
                  accessory="chevron"
                  onClick={() => useUI.getState().openSheet(close => <ConnectSheet close={close} />)}
                />
              </>
            ) : null}
          </Section>
        </>
      )
    }

    if (id === 'general') {
      return (
        <>
          <Section title={t('General')} footer={t('Switching the unit offers to convert every stored weight.')}>
            <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')}>
              <Segmented
                className="seg-inline"
                options={[
                  { value: 'dark', icon: 'moon', label: t('Dark') },
                  { value: 'oled', icon: 'eye', label: t('OLED') },
                  { value: 'light', icon: 'sun', label: t('Light') },
                  { value: 'system', icon: 'gear', label: t('System') },
                ]}
                value={S.theme || 'dark'}
                onChange={v => update(s => { s.theme = v })}
              />
            </Row>
            <SelectRow
              icon="globe"
              iconTint="var(--blue)"
              title={t('Language')}
              value={S.lang || 'en'}
              onChange={v => update(s => { s.lang = v })}
              options={Object.entries(LANGS).map(([k, name]) => ({
                value: k,
                label: name,
                subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
              }))}
            />
            <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
              <Segmented
                className="seg-inline"
                options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
                value={S.unit}
                onChange={v => switchUnit(v)}
              />
            </Row>
            <Row icon="calendar" iconTint="var(--orange)" title={t('Week starts on')}>
              <Segmented
                className="seg-inline"
                options={[{ value: MONDAY, label: t('Monday') }, { value: SUNDAY, label: t('Sunday') }]}
                value={weekStartOf(S)}
                onChange={v => update(s => { s.weekStart = v })}
              />
            </Row>
            <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
              <Segmented
                className="seg-inline"
                options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
                value={S.body === 'female' ? 'female' : 'male'}
                onChange={v => update(s => { s.body = v })}
              />
            </Row>
            <SelectRow
              icon="grid"
              iconTint="var(--acc)"
              title={t('Background pattern')}
              value={S.bgPattern ?? 'dots'}
              onChange={v => update(s => { s.bgPattern = v })}
              options={[
                { value: 'dots', label: t('Warm Dots') },
                { value: 'grid', label: t('Subtle Grid') },
                { value: 'none', label: t('Solid') },
              ]}
            />
            <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
              <span className="lrow-t">{t('Accent color')}</span>
              <div className="swatches">
                {Object.entries(ACCENTS).map(([k, c]) => (
                  <button
                    key={k}
                    type="button"
                    className={'swatch' + ((S.accent || 'peach') === k ? ' on' : '')}
                    style={{ background: c }}
                    onClick={() => update(s => { s.accent = k })}
                    aria-label={k}
                  />
                ))}
              </div>
            </div>
            <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingTop: 12, paddingBottom: 14 }}>
              <span className="lrow-t">{t('Heatmap palette')}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.values(HEAT_TONES).map(tone => {
                  const on = (S.heatTone || 'ember') === tone.id
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => update(s => { s.heatTone = tone.id })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 11px',
                        borderRadius: 999,
                        background: on ? 'var(--surface-2)' : 'transparent',
                        border: on ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                        color: 'var(--label)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        {tone.ramp.slice(1).map((c, i) => (
                          <span key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                        ))}
                      </span>
                      <span>{t(tone.name)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>
        </>
      )
    }

    if (id === 'training') {
      return (
        <>
          <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
            <Row icon="list" iconTint="var(--blue)" title={t('Workout view')}>
              <Segmented
                className="seg-inline"
                options={[{ value: 'cards', label: t('Cards') }, { value: 'list', label: t('List') }]}
                value={S.workoutView === 'list' ? 'list' : 'cards'}
                onChange={v => update(s => { s.workoutView = v })}
              />
            </Row>
            <Row icon="table" iconTint="var(--cyan, #06b6d4)" title={t('Workout density')}>
              <Segmented
                className="seg-inline"
                options={[{ value: 'spacious', label: t('Spacious') }, { value: 'compact', label: t('Compact') }]}
                value={S.workoutDensity === 'compact' ? 'compact' : 'spacious'}
                onChange={v => update(s => { s.workoutDensity = v })}
              />
            </Row>
            <Row
              icon="wrench"
              iconTint="var(--purple)"
              title={t('Workout controls')}
              accessory="chevron"
              subtitle={t('Everything hidden here stays one tap away: the ⋯ button of an exercise and the number of a set.')}
              onClick={() => workoutControlsSheet()}
            />
            <SelectRow
              icon="timer"
              iconTint="var(--orange)"
              title={t('Rest timer')}
              value={S.restSec}
              onChange={v => update(s => { s.restSec = v })}
              options={[{ value: 0, label: t('Off') }, ...[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + 's' }))]}
            />
            <SelectRow
              icon="bolt"
              iconTint="var(--acc)"
              title={t('Rest-pause rest')}
              value={S.restPauseSec}
              onChange={v => update(s => { s.restPauseSec = v })}
              options={[10, 15, 20, 30].map(v => ({ value: v, label: v + 's' }))}
            />
            <Row icon="figureRun" iconTint="var(--green)" title={t('Exercise animations')}>
              <Segmented
                className="seg-inline"
                options={[{ value: 'full', label: t('Full') }, { value: 'mini', label: t('Small') }, { value: 'off', label: t('Hidden') }]}
                value={S.gifSize === 'mini' || S.gifSize === 'off' ? S.gifSize : 'full'}
                onChange={v => update(s => { s.gifSize = v })}
              />
            </Row>
            <SelectRow
              icon="timer"
              iconTint="var(--acc)"
              title={t('Start countdown')}
              value={S.startCountdownSec || 0}
              onChange={v => update(s => { s.startCountdownSec = Number(v) || 0 })}
              options={[{ value: 0, label: t('Off') }, { value: 3, label: '3s' }, { value: 5, label: '5s' }]}
            />
            <SelectRow
              icon="feather"
              iconTint="var(--teal)"
              title={t('Deload reduction')}
              value={S.deloadPct ?? 20}
              onChange={v => update(s => { s.deloadPct = Number(v) || 20 })}
              options={[10, 15, 20, 25, 30].map(p => ({ value: p, label: `−${p}%` }))}
            />
            <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
              <button type="button" className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
              <Segmented
                className="seg-inline"
                options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
                value={effortOf(S)}
                onChange={v => update(s => { s.effort = v; delete s.showRir })}
              />
            </Row>
            {(wakeOK || !MOBILE) && (
              <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')} subtitle={wakeOK ? null : t('Not supported in this browser.')}>
                <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK} onChange={v => update(s => { s.keepAwake = v })} />
              </Row>
            )}
          </Section>
          <EquipmentCard S={S} update={update} />
        </>
      )
    }

    if (id === 'alerts') {
      return (
        <>
          <Section title={t('Rest alarm & cues')}>
            <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
              <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
            </Row>
            <SelectRow
              icon="bell"
              iconTint="var(--pink)"
              title={t('Rest timer chime')}
              value={S.restChime || 'bell'}
              onChange={v => {
                update(s => { s.restChime = v })
                playRestChime(v, true)
              }}
              options={[
                { value: 'bell', label: t('Bell chime') },
                { value: 'beeps', label: t('3-2-1 countdown beeps') },
                { value: 'gong', label: t('Gentle gong') },
                { value: 'digital', label: t('Digital chime') },
              ]}
            />
            <Row icon="volume" iconTint="var(--pink)" title={t('Preview chime')} subtitle={t('Test the selected rest timer chime')}>
              <Button size="sm" icon="play" onClick={() => playRestChime(S.restChime || 'bell', true)}>{t('Test chime')}</Button>
            </Row>
            <Row icon="mic" iconTint="var(--teal)" title={t('Voice coach')} subtitle={t('Spoken rest countdown and set announcements')}>
              <Switch
                checked={!!S.voiceCoach}
                onChange={v => {
                  if (v && !S.voiceCoach) {
                    confirmSheet({
                      title: t('Enable voice coach?'),
                      message: t("SmiTriX will speak rest countdowns, set announcements, and workout achievements using your device's voice. You can turn this off anytime."),
                      confirmText: t('Turn on'),
                      onConfirm: () => update(s => { s.voiceCoach = true }),
                    })
                  } else {
                    update(s => { s.voiceCoach = v })
                  }
                }}
              />
            </Row>
            <Row icon="sun" iconTint="var(--yellow)" title={t('Flash screen when timer ends')}>
              <Switch checked={!!S.timerFlash} onChange={v => update(s => { s.timerFlash = v })} />
            </Row>
            <Row icon="sparkles" iconTint="var(--gm-sage, #8FA377)" title={t('Rest edge glow')} subtitle={t('Soft glowing border pulse when rest timer finishes')}>
              <Switch checked={S.restGlow !== false} onChange={v => update(s => { s.restGlow = v })} />
            </Row>
          </Section>
          {(user || MOBILE) && <NotificationsCard S={S} update={update} toast={toast} />}
        </>
      )
    }

    if (id === 'home') {
      return (
        <Section title={t('Home screen')}>
          <SelectRow
            icon="target"
            iconTint="var(--gm-sage, #8FA377)"
            title={t('Weekly workout goal')}
            value={S.weeklyTarget || 4}
            onChange={v => update(s => { s.weeklyTarget = Number(v) || 4 })}
            options={[1, 2, 3, 4, 5, 6, 7].map(n => ({ value: n, label: t('{0} days / week', n) }))}
          />
          <Row icon="qr" iconTint="var(--blue)" title={t('Gym check-in')} subtitle={t('Show Gym Pass QR codes in your profile & check-in screen.')}>
            <Switch checked={S.checkIn !== false} onChange={v => update(s => { s.checkIn = v })} />
          </Row>
          <Row icon="forkKnife" iconTint="var(--acc)" title={t('Nutrition hub')} subtitle={t('Show Nutrition folder card on Home')}>
            <Switch checked={S.nutritionOn !== false} onChange={v => update(s => { s.nutritionOn = v })} />
          </Row>
          <Row icon="wind" iconTint="var(--gm-sage, #8FA377)" title={t('Recovery hub')} subtitle={t('Show Recovery folder card on Home')}>
            <Switch checked={S.recoveryOn !== false} onChange={v => update(s => { s.recoveryOn = v })} />
          </Row>
        </Section>
      )
    }

    if (id === 'beta') {
      return (
        <>
          <Section
            title={t('AI Coach & API Keys')}
            footer={
              coachLocal?.mode === 'byok'
                ? t('Using your personal API key. Direct HTTPS requests never leave this device unencrypted.')
                : coachLocal?.mode === 'server'
                  ? t('Using instance-wide AI Coach configured on your SmiTriX server.')
                  : t('AI Coach designs personalized routines and reviews progress. Keys are stored safely on this device.')
            }
          >
            <Row
              icon="sparkles"
              iconTint="var(--acc)"
              title={t('AI Coach')}
              accessory="chevron"
              subtitle={
                coachLocal?.mode === 'server'
                  ? t('Active · Runs on your SmiTriX server')
                  : coachLocal?.mode === 'byok'
                    ? (hasCoachKey || HTTP_PROVIDERS[coachLocal?.provider]?.keyOptional
                        ? t('Active · {0}{1}', HTTP_PROVIDERS[coachLocal?.provider]?.label || coachLocal?.provider || 'BYOK', coachLocal?.model ? ` (${coachLocal.model})` : '')
                        : t('Needs API key · {0}', HTTP_PROVIDERS[coachLocal?.provider]?.label || coachLocal?.provider || 'BYOK'))
                    : (user && config?.coach?.enabled)
                      ? t('Available via server · Tap to configure')
                      : t('Off — configure provider & API key')
              }
              onClick={() => nav('/coach/setup')}
            />
            <Row
              icon="key"
              iconTint="var(--teal)"
              title={t('Manage API Keys')}
              accessory="chevron"
              subtitle={
                (savedProviderCount > 0 && hasHevyKey)
                  ? t('{0} AI & Hevy keys saved', savedProviderCount)
                  : savedProviderCount > 0
                    ? t('{0} AI Coach {1} saved', savedProviderCount, savedProviderCount === 1 ? 'key' : 'keys')
                    : hasHevyKey
                      ? t('Hevy Pro key saved')
                      : t('Configure keys for AI Coach and Hevy')
              }
              onClick={() => useUI.getState().openSheet(close => <ApiKeyManagerSheet close={close} onUpdate={refreshApiKeys} />)}
            />
            <Row
              icon="mapPin"
              iconTint="var(--gm-sage)"
              title={t('Training Places')}
              subtitle={t('Manage Gym, Home and Outdoor equipment kits')}
              accessory="chevron"
              onClick={() => nav('/places')}
            />
            {isAdmin && (
              <Row
                icon="shield"
                iconTint="var(--red)"
                title={t('Cloud Admin Dashboard')}
                subtitle="smitronix0826@gmail.com"
                accessory="chevron"
                onClick={() => nav('/admin')}
              />
            )}
          </Section>
        </>
      )
    }

    if (id === 'data') {
      return (
        <Section title={t('Data & backup')}>
          {MOBILE && updateInfo?.hasUpdate && updateInfo.apkUrl && (
            <Row
              icon="info"
              iconTint="var(--purple)"
              title={t('SmiTriX v{0} available', updateInfo.latestVersion)}
              accessory="chevron"
              onClick={onUpdateRowClick}
            />
          )}
          <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan')} accessory="chevron" onClick={starterPlanSheet} />
          <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')} subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')} accessory="chevron" onClick={importHubSheet} />
          <Row icon="key" iconTint="var(--teal)" title={t('Import from Hevy')} subtitle={t('Pull your history with a Hevy Pro API key')} accessory="chevron" onClick={importFromHevy} />
          <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current?.click()} />
          <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
          {MOBILE && (
            <Row
              icon="history"
              iconTint="var(--blue)"
              title={t('Auto-backup on changes')}
              subtitle={t('Saves a dated copy to the Documents folder after finishing a workout or editing a routine.')}
            >
              <Switch checked={!!S.autoBackup} onChange={v => update(s => { s.autoBackup = v })} />
            </Row>
          )}
          <Row
            icon="chartLine"
            iconTint="var(--indigo)"
            title={t('Anonymous Diagnostics & Telemetry')}
            subtitle={t('Helps detect crashes and improve performance. Strictly zero personal data.')}
          >
            <Switch
              checked={S.analyticsOptIn !== false}
              onChange={v => {
                update(s => { s.analyticsOptIn = v })
                setAnalyticsConsent(v)
                toast(v ? t('Telemetry enabled') : t('Telemetry disabled'))
              }}
            />
          </Row>
          {DEMO && (
            <Row
              icon="refresh"
              iconTint="var(--acc)"
              title={t('Reset demo data')}
              subtitle={t('Restore the built-in sample workouts and routines')}
              accessory="chevron"
              onClick={async () => {
                await resetDemo()
                toast(t('Demo data restored'))
              }}
            />
          )}
          <Row
            icon="trash"
            iconTint="var(--red)"
            title={t('Reset everything')}
            danger
            onClick={() => confirmSheet({
              title: t('Reset everything?'),
              message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'),
              confirmText: t('Delete everything'),
              danger: true,
              onConfirm: () => {
                if (DEMO) {
                  try { localStorage.setItem('gym_demo_seeded_v1', 'cleared') } catch {}
                }
                replaceState(JSON.parse(JSON.stringify(DEF)), true)
                nav('/home')
                toast(t('All data reset'))
              },
            })}
          />
        </Section>
      )
    }

    if (id === 'support') {
      return (
        <>
          <Section title={t('Help & Setup')}>
            <Row
              icon="sparkles"
              iconTint="var(--acc)"
              title={t('Run setup walkthrough')}
              subtitle={t('Update your name, units, body measurements, weekly goal and places')}
              accessory="chevron"
              onClick={() => openTutorial(0)}
            />
          </Section>
          <Section title={t('Community & Support')}>
            <Row
              icon="warning"
              iconTint="var(--red)"
              title={t('Report a bug')}
              subtitle="github.com/SmitroniX/SmiTriX"
              accessory="chevron"
              onClick={() => window.open(BUG_URL, '_blank', 'noopener')}
            />
            <Row
              icon="lightbulb"
              iconTint="var(--yellow)"
              title={t('Suggest a feature')}
              subtitle="github.com/SmitroniX/SmiTriX"
              accessory="chevron"
              onClick={() => window.open(FEATURE_URL, '_blank', 'noopener')}
            />
            <Row
              icon="heart"
              iconTint="var(--acc)"
              title={t('Buy me a coffee')}
              subtitle="buymeacoffee.com/asmit_jogdand"
              accessory="chevron"
              onClick={() => window.open(COFFEE_URL, '_blank', 'noopener')}
            />
            <Row
              icon="chat"
              iconTint="var(--indigo)"
              title={t('Join Discord community')}
              subtitle="discord.gg/ZFQV5dza9P"
              accessory="chevron"
              onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')}
            />
          </Section>
        </>
      )
    }

    if (id === 'about') {
      return <AboutSmiTriXSection />
    }

    return null
  }

  const renderHubList = () => (
    <div>
      {/* GymMane Top Bar: Back circle + Large Settings title */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            type="button"
            className="iconbtn"
            onClick={() => nav('/home')}
            aria-label={t('Back')}
            style={{ width: 40, height: 40 }}
          >
            <Icon name="chevronLeft" />
          </button>
          <span className="dim small" style={{ fontWeight: 700 }}>v{__APP_VERSION__}</span>
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.05 }}>
          {t('Settings')}
        </h1>

        {/* GymMane Search Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          height: 50,
          padding: '0 16px',
          borderRadius: 999,
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--sep) 45%, transparent)',
        }}>
          <Icon name="search" style={{ fontSize: 17, color: query ? 'var(--label)' : 'var(--label-3)' }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Search settings or ask')}
            aria-label={t('Search settings or ask')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: 'var(--label)',
              fontSize: 15,
              fontWeight: 600,
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={t('Clear search')}
              onClick={() => setQuery('')}
              style={{ color: 'var(--label-2)', display: 'flex', padding: 4, cursor: 'pointer' }}
            >
              <Icon name="xmark" style={{ fontSize: 15 }} />
            </button>
          )}
        </div>
      </div>

      {/* Android Update Banner (only on native Android when a newer APK is available) */}
      {MOBILE && updateInfo?.hasUpdate && updateInfo.apkUrl && (
        <div style={{ marginBottom: 14 }}>
          <Section>
            <Row
              icon="info"
              iconTint="var(--acc)"
              title={t('SmiTriX v{0} available', updateInfo.latestVersion)}
              subtitle={t('Tap to download & install update')}
              accessory="chevron"
              onClick={onUpdateRowClick}
            />
          </Section>
        </div>
      )}

      {/* Search Results Mode */}
      {qLower ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searchHits.map((hit, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openCategory(hit.section)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 15px',
                borderRadius: 20,
                background: 'var(--surface)',
                border: '1px solid color-mix(in srgb, var(--sep) 35%, transparent)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--label) 9%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--label)',
                fontSize: 17,
                flex: 'none',
              }}>
                <Icon name={hit.icon} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>{t(hit.label)}</div>
                <div className="dim small">{sectionTitle(hit.section)}</div>
              </div>
              <Icon name="chevronRight" style={{ color: 'var(--label-3)', fontSize: 14 }} />
            </button>
          ))}

          {helpHits.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="gm-micro" style={{ padding: '0 4px 8px' }}>{t('QUESTIONS')}</div>
              <div style={{ background: 'var(--surface)', borderRadius: 22, overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--sep) 35%, transparent)' }}>
                {helpHits.map((h, i) => {
                  const open = openHelpId === h.id
                  return (
                    <div key={h.id} style={{ borderTop: i > 0 ? '1px solid var(--sep-op)' : 'none' }}>
                      <button
                        type="button"
                        onClick={() => setOpenHelpId(open ? null : h.id)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          textAlign: 'left',
                          color: 'var(--label)',
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{t(h.q)}</span>
                        <Icon name={open ? 'chevronUp' : 'chevronDown'} style={{ color: 'var(--label-3)', fontSize: 14 }} />
                      </button>
                      {open && (
                        <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--label-2)', lineHeight: 1.5 }}>
                          <div>{t(h.a)}</div>
                          {h.section && (
                            <button
                              type="button"
                              onClick={() => openCategory(h.section)}
                              style={{ marginTop: 8, color: 'var(--acc)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                            >
                              {t('Open {0}', sectionTitle(h.section))} →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {searchHits.length === 0 && helpHits.length === 0 && (
            <div className="dim" style={{ padding: '14px 6px', fontSize: 14.5 }}>
              {t('No matching settings found for "{0}".', query)}
            </div>
          )}
        </div>
      ) : (
        /* GymMane Grouped Category Bubbles */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { key: 'app', label: t('YOUR APP') },
            { key: 'home', label: t('HOME AND EXTRAS') },
            { key: 'data', label: t('DATA AND HELP') },
          ].map(grp => {
            const items = categories.filter(c => c.group === grp.key)
            if (!items.length) return null
            return (
              <div key={grp.key}>
                <div className="gm-micro" style={{ padding: '0 4px 10px' }}>{grp.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((cat, idx) => {
                    const active = isDesktop && deskSection === cat.id
                    return (
                      <Rise key={cat.id} index={idx}>
                        <button
                          type="button"
                          className="gm-settings-bubble"
                          data-settings-cat={cat.id}
                          onClick={() => openCategory(cat.id)}
                          style={{
                            width: '100%',
                            height: 64,
                            padding: '0 14px',
                            borderRadius: 22,
                            background: 'var(--surface)',
                            border: active
                              ? '1.5px solid color-mix(in srgb, var(--label) 55%, transparent)'
                              : '1px solid color-mix(in srgb, var(--sep) 32%, transparent)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'transform 140ms var(--ease), border-color 180ms',
                          }}
                        >
                          <span style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'color-mix(in srgb, var(--label) 9%, transparent)',
                            color: 'var(--label)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 19,
                            flex: 'none',
                          }}>
                            <Icon name={cat.icon} />
                          </span>
                          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--label)' }}>
                            {cat.title}
                          </span>
                          <Icon name="chevronRight" style={{ fontSize: 15, color: 'var(--label-3)' }} />
                        </button>
                      </Rise>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className={isDesktop ? '' : 'narrow'}>
      <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
      <input
        ref={importRef}
        type="file"
        accept=".csv,.xml,text/csv,text/xml"
        style={{ display: 'none' }}
        onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }}
      />

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '350px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div>{renderHubList()}</div>
          <div style={{ paddingTop: 52 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.025em' }}>
              {sectionTitle(deskSection)}
            </h2>
            {renderSectionBody(deskSection)}
          </div>
        </div>
      ) : section ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button
              type="button"
              className="iconbtn"
              onClick={() => setSection(null)}
              aria-label={t('Back to Settings')}
              style={{ width: 40, height: 40 }}
            >
              <Icon name="chevronLeft" />
            </button>
            <div>
              <div className="gm-micro" style={{ fontSize: 10 }}>{t('SETTINGS')}</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
                {sectionTitle(section)}
              </h1>
            </div>
          </div>
          {renderSectionBody(section)}
        </div>
      ) : (
        renderHubList()
      )}
    </div>
  )
}

function AboutSmiTriXSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* GymMane About Runner Hero Card */}
      <div className="gm-hero-card" style={{ minHeight: 168, marginBottom: 0 }}>
        <div className="gm-hero-orb-1" />
        <div className="gm-hero-orb-2" />
        <img src="./smitrix-ui/img/runner.png" alt="SmiTriX" className="gm-hero-runner" style={{ height: 142 }} />
        <div style={{ position: 'relative', zIndex: 1, paddingTop: 14 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>SmiTriX</div>
          <div style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'var(--surface-2)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--label-2)',
          }}>
            v{__APP_VERSION__}
          </div>
        </div>
      </div>

      {/* 3 Promises */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        {[
          { icon: 'sparkles', title: t('Free forever'), sub: t('Open source under GNU AGPL v3.0 — no paywalls, no ads.') },
          { icon: 'shield', title: t('Private & local-first'), sub: t('Works offline on your device. No login needed on website or demo.') },
          { icon: 'download', title: t('Yours to take'), sub: t('Import from Hevy, Strong or FitNotes and export full JSON backups anytime.') },
        ].map((r, i) => (
          <div key={r.title} style={{ display: 'flex', gap: 13, padding: '14px 16px', borderTop: i > 0 ? '1px solid var(--sep-op)' : 'none' }}>
            <Icon name={r.icon} style={{ fontSize: 19, color: 'var(--acc)', marginTop: 1, flex: 'none' }} />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.title}</div>
              <div className="dim small" style={{ marginTop: 2, lineHeight: 1.4 }}>{r.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* What's Inside */}
      <div>
        <div className="gm-micro" style={{ padding: '0 4px 8px' }}>{t("WHAT'S INSIDE")}</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
          {[
            { icon: 'dumbbell', title: t('{0}+ exercises', CATALOGUE.length), sub: t('Animated demonstrations, body map targeting and custom exercises.') },
            { icon: 'sliders', title: t('12 strength & body calculators'), sub: t('1RM, plates, BMI, macros, body fat, warm-up, RPE, Wilks, FFMI, water & more.') },
            { icon: 'chartLine', title: t('Smart progression & recovery'), sub: t('Automatic progression cues, fatigue recovery map, streaks, medals and monthly recap.') },
          ].map((r, i) => (
            <div key={r.title} style={{ display: 'flex', gap: 13, padding: '14px 16px', borderTop: i > 0 ? '1px solid var(--sep-op)' : 'none' }}>
              <Icon name={r.icon} style={{ fontSize: 19, color: 'var(--label-2)', marginTop: 1, flex: 'none' }} />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.title}</div>
                <div className="dim small" style={{ marginTop: 2, lineHeight: 1.4 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <Section title={t('Credits & Licenses')}>
        <Row
          icon="heart"
          iconTint="var(--acc)"
          title={t('Made by Asmit Jogdand (SmitroniX)')}
          subtitle="github.com/SmitroniX"
          accessory="chevron"
          onClick={() => window.open('https://github.com/SmitroniX', '_blank', 'noopener')}
        />
        <Row
          icon="link"
          iconTint="var(--blue)"
          title={t('Source code (AGPL v3.0)')}
          subtitle="github.com/SmitroniX/SmiTriX"
          accessory="chevron"
          onClick={() => window.open(REPO_URL, '_blank', 'noopener')}
        />
        <Row
          icon="sparkles"
          iconTint="var(--gm-sage)"
          title={t('Buy me a coffee')}
          subtitle="buymeacoffee.com/asmit_jogdand"
          accessory="chevron"
          onClick={() => window.open(COFFEE_URL, '_blank', 'noopener')}
        />
      </Section>

      <div className="dim small" style={{ textAlign: 'center', lineHeight: 1.6, paddingBottom: 12 }}>
        SmiTriX v{__APP_VERSION__} · © 2026 Asmit Jogdand (SmitroniX)<br />
        {t('Free & open source (GNU AGPL v3.0)')} · Based on GymMane by InlitX (GPL v3.0)<br />
        Nunito font (SIL OFL 1.1) · exercise data: hasaneyldrm/exercises-dataset (MIT)<br />
        exercise images & animations © <a href="https://gymvisual.com/" target="_blank" rel="noopener">Gym visual</a>
      </div>
    </div>
  )
}

const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
const EFFORT_TYPICAL = 2

function WorkoutControlsSheet() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const wc = workoutControls(S)
  const set = (k, v) => update(s => { s.wc = { ...workoutControls(s), [k]: v } })
  return <>
    <h3>{t('Workout controls')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Everything hidden here stays one tap away: the ⋯ button of an exercise and the number of a set.')}</div>
    <Section>
      <Row icon="plus" iconTint="var(--acc)" title={t('Weight and reps buttons')} subtitle={t('Off: tap the number and type it')}>
        <Switch checked={wc.steppers} onChange={v => set('steppers', v)} />
      </Row>
      <Row icon="bolt" iconTint="var(--orange)" title={t('Drop and burst shortcuts on every set')}>
        <Switch checked={wc.setShortcuts} onChange={v => set('setShortcuts', v)} />
      </Row>
      <Row icon="link" iconTint="var(--blue)" title={t('Superset buttons in the exercise header')}>
        <Switch checked={wc.pairButtons} onChange={v => set('pairButtons', v)} />
      </Row>
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Move, swap and remove buttons below the exercise')}>
        <Switch checked={wc.exerciseButtons} onChange={v => set('exerciseButtons', v)} />
      </Row>
      <Row icon="arrowDown" iconTint="var(--acc)" title={t('Cascade weight to next sets')} subtitle={t('Carry weight changes forward to following matching sets')}>
        <Switch checked={wc.cascadeWeight !== false} onChange={v => set('cascadeWeight', v)} />
      </Row>
    </Section>
  </>
}
function workoutControlsSheet() {
  useUI.getState().openSheet(() => <WorkoutControlsSheet />)
}

const DownloadProgress = forwardRef(function DownloadProgress(_, ref) {
  const [pct, setPct] = useState(0)
  const [text, setText] = useState(t('Starting download…'))
  if (ref) ref(function update(received, total) {
    if (total > 0) {
      const p = Math.min(100, Math.round((received / total) * 100))
      setPct(p)
      setText(t('{0} %', p))
    } else {
      setText(t('{0} MB', (received / 1_000_000).toFixed(1)))
    }
  })
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <h3>{t('Downloading update…')}</h3>
      <div style={{ margin: '16px 0', height: 6, borderRadius: 3, background: 'var(--fill-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'var(--acc)', borderRadius: 3, transition: 'width .2s' }} />
      </div>
      <div className="muted small">{text}</div>
    </div>
  )
})

function effortHelpSheet() {
  useUI.getState().openSheet(() => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

function NotificationsCard({ S, update, toast }) {
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <PushCard S={S} update={update} toast={toast} />
}

function MobileReminderCard({ S, update, toast }) {
  const [perm, setPerm] = useState('prompt')
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })

  useEffect(() => {
    if (typeof checkNotificationPermission === 'function') {
      checkNotificationPermission().then(p => p && setPerm(p)).catch(() => {})
    }
  }, [])

  const toggle = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
      if (typeof checkNotificationPermission === 'function') {
        checkNotificationPermission().then(p => p && setPerm(p)).catch(() => {})
      }
    }
    setReminder({ on })
  }

  const askPerm = async () => {
    if (typeof requestNotificationPermission !== 'function') return
    const res = await requestNotificationPermission()
    setPerm(res)
    if (res === 'granted') {
      toast(t('Notification permission granted!'))
      if (typeof sendTestNotification === 'function') await sendTestNotification()
    } else {
      toast(t('Permission not granted'))
    }
  }

  const testNotify = async ev => {
    ev?.stopPropagation?.()
    if (typeof sendTestNotification !== 'function') return
    const ok = await sendTestNotification()
    if (ok) toast(t('Notification sent — check your notification bar!'))
    else toast(t('Please enable notification permission first'))
  }

  return (
    <Section title={t('Notifications')} footer={S.reminder?.on ? t('Reminds you at this time on days that have a routine planned.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={!!S.reminder?.on} onChange={toggle} />
      </Row>
      {S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time} onChange={e => setReminder({ time: e.target.value })} />
        </Row>
      )}
      <Row
        icon="bell"
        iconTint="var(--blue)"
        title={t('Notification bar & Lock screen')}
        subtitle={perm === 'granted' ? t('Permission granted (Android)') : t('Tap to allow notifications in status bar')}
      >
        {perm === 'granted'
          ? <Button size="sm" variant="tinted" icon="sparkles" onClick={testNotify}>{t('Test')}</Button>
          : <Button size="sm" variant="accent" onClick={askPerm}>{t('Allow')}</Button>}
      </Row>
    </Section>
  )
}

function PushCard({ S, update, toast }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setOn(!!sub)).catch(() => {})
  }, [supported])

  const toggle = async v => {
    setBusy(true)
    try {
      if (!v) { await disablePush(); setOn(false); toast(t('Notifications off')) }
      else { await enablePush(); setOn(true); toast(t('Notifications on')) }
    } catch (e) { toast(e.message || t('Could not change notification settings')) }
    setBusy(false)
  }
  const test = async () => {
    try { await sendTestPush(); toast(t('Test sent — should arrive any second')) }
    catch (e) { toast(e.message || t('Test failed')) }
  }

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  return <>
    <Section title={t('Notifications')}>
      <Row icon="bell" iconTint="var(--red)" title={t('Push notifications')} subtitle={t('Rest-timer alerts, even if SmiTriX is closed.')}>
        <Switch checked={on} disabled={busy} onChange={toggle} />
      </Row>
      {on && (
        <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
          <Switch checked={!!S.reminder?.on} onChange={() => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: !s.reminder?.on, tz: localTZ() } })} />
        </Row>
      )}
      {on && S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time} onChange={e => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), time: e.target.value, tz: localTZ() } })} />
        </Row>
      )}
    </Section>
    {on && <div style={{ marginTop: -12, marginBottom: 22 }}><Button size="sm" icon="bell" onClick={test}>{t('Send test notification')}</Button></div>}
  </>
}

function EquipmentCard({ S, update }) {
  const profiles = S.equipProfiles || []
  const remove = p => confirmSheet({
    title: t('Delete profile?'),
    message: t('"{0}" and its equipment list will be removed.', p.name),
    confirmText: t('Delete'),
    danger: true,
    onConfirm: () => update(s => {
      s.equipProfiles = (s.equipProfiles || []).filter(x => x.id !== p.id)
      if (s.activeEquipId === p.id) s.activeEquipId = (s.equipProfiles[0] && s.equipProfiles[0].id) || null
    }),
  })
  return (
    <Section title={t('Equipment')} footer={t('Filters the exercise library and picker, and flags routine exercises that need something you don’t have in the active profile.')}>
      {profiles.length > 0 && (
        <Row icon="dumbbell" iconTint="var(--acc)" title={t('Filter by equipment')}>
          <Switch checked={!!S.equipFilterOn} onChange={v => update(s => { s.equipFilterOn = v })} />
        </Row>
      )}
      {profiles.length > 0 && (
        <SelectRow
          icon="list"
          iconTint="var(--blue)"
          title={t('Active profile')}
          value={S.activeEquipId || ''}
          onChange={v => update(s => { s.activeEquipId = v })}
          options={profiles.map(p => ({ value: p.id, label: p.name }))}
        />
      )}
      {profiles.map(p => (
        <Row
          key={p.id}
          icon="dumbbell"
          iconTint="var(--teal)"
          title={p.name}
          subtitle={t('{0} equipment types', p.equipment.length)}
          accessory="chevron"
          onClick={() => equipmentProfileSheet(p)}
        >
          <button type="button" className="iconbtn" aria-label={t('Delete')} onClick={ev => { ev.stopPropagation(); remove(p) }}><Icon name="trash" /></button>
        </Row>
      ))}
      <Row icon="plus" iconTint="var(--acc)" title={t('Add equipment profile')} accessory="chevron" onClick={() => equipmentProfileSheet(null)} />
    </Section>
  )
}

export function ApiKeyManagerSheet({ close, onUpdate }) {
  const toast = useUI(s => s.toast)
  const coachLocal = useStore(s => s.coachLocal)
  const setCoachLocal = useStore(s => s.setCoachLocal)
  const [tab, setTab] = useState('coach')

  const [selectedProvider, setSelectedProvider] = useState(coachLocal?.provider || 'anthropic')
  const [baseUrl, setBaseUrl] = useState(coachLocal?.baseUrl || '')

  const [coachKey, setCoachKey] = useState('')
  const [providerKeys, setProviderKeys] = useState({})
  const [showCoachKey, setShowCoachKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const [hevyKey, setHevyKey] = useState('')
  const [hasHevyKey, setHasHevyKey] = useState(false)
  const [showHevyKey, setShowHevyKey] = useState(false)
  const [testingHevy, setTestingHevy] = useState(false)
  const [hevyTestResult, setHevyTestResult] = useState(null)

  const refreshProviderKeys = async () => {
    const map = {}
    for (const id of HTTP_PROVIDER_IDS) {
      map[id] = !!(await getApiKey(id))
    }
    setProviderKeys(map)
  }

  useEffect(() => {
    refreshProviderKeys()
    getHevyApiKey().then(k => setHasHevyKey(!!k))
  }, [])

  const providerMeta = HTTP_PROVIDERS[selectedProvider] || {}
  const hasCoachKey = !!providerKeys[selectedProvider]
  const isActiveCoach = coachLocal?.mode === 'byok' && coachLocal?.provider === selectedProvider

  const saveCoachKey = async () => {
    if (!providerMeta.keyOptional && !coachKey.trim()) return
    if (coachKey.trim()) await setApiKey(coachKey.trim(), selectedProvider)
    if (selectedProvider === 'compatible') {
      const v = validateBaseUrl(baseUrl)
      if (!v.ok) { toast(v.error); return }
      if (!v.value && !coachLocal?.baseUrl) { toast(t('Enter an endpoint URL')); return }
      await setCoachLocal({ baseUrl: v.value || null, provider: 'compatible' })
    }
    setCoachKey('')
    await refreshProviderKeys()
    toast(t('AI Coach key saved ({0})', providerMeta.label))
    onUpdate?.()
  }

  const removeCoachKey = async () => {
    await clearApiKey(selectedProvider)
    setCoachKey('')
    setTestResult(null)
    await refreshProviderKeys()
    toast(t('AI Coach key removed ({0})', providerMeta.label))
    onUpdate?.()
  }

  const activateProvider = async () => {
    const v = validateBaseUrl(selectedProvider === 'compatible' ? (baseUrl || coachLocal?.baseUrl) : '')
    if (!v.ok) return toast(v.error)
    if (selectedProvider === 'compatible' && !v.value) return toast(t('Enter an endpoint URL first'))
    const targetModel = providerMeta.defaultModel || (coachLocal?.provider === selectedProvider ? (coachLocal?.model || '') : '') || (testResult?.models?.[0] || '')
    await setCoachLocal({
      mode: 'byok',
      provider: selectedProvider,
      model: targetModel,
      baseUrl: selectedProvider === 'compatible' ? (v.value || null) : null,
    })
    toast(t('{0} is now your active Coach', providerMeta.label))
    onUpdate?.()
  }

  const testCoachConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const startMs = Date.now()
    try {
      const local = await import('../lib/coach-local.js')
      const targetBase = selectedProvider === 'compatible' ? (baseUrl || coachLocal?.baseUrl) : null
      const v = validateBaseUrl(targetBase)
      if (!v.ok) { setTestResult({ ok: false, message: v.error }); toast(v.error); setTesting(false); return }
      if (selectedProvider === 'compatible' && !v.value) {
        setTestResult({ ok: false, message: t('Enter an endpoint URL for OpenAI-compatible') })
        toast(t('Enter an endpoint URL'))
        setTesting(false)
        return
      }
      const k = coachKey.trim() || await getApiKey(selectedProvider)
      if (!providerMeta.keyOptional && !k) { toast(t('Enter an API key first')); setTesting(false); return }
      const r = await local.localModels({ provider: selectedProvider, baseUrl: v.value }, k)
      const elapsed = Date.now() - startMs
      if (r.ok) {
        setTestResult({ ok: true, models: r.models, message: t('Connected! {0} models available ({1}ms)', r.models.length, elapsed) })
        toast(t('Connection successful!'))
      } else {
        setTestResult({ ok: false, message: r.error || t('Could not reach provider') })
        toast(r.error || t('Test failed'))
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message || t('Connection error') })
      toast(e.message || t('Connection error'))
    } finally {
      setTesting(false)
    }
  }

  const saveHevyKey = async () => {
    if (!hevyKey.trim()) return
    await setHevyApiKey(hevyKey.trim())
    setHasHevyKey(true)
    setHevyKey('')
    toast(t('Hevy API key saved'))
    onUpdate?.()
  }

  const removeHevyKey = async () => {
    await clearHevyApiKey()
    setHasHevyKey(false)
    setHevyKey('')
    setHevyTestResult(null)
    toast(t('Hevy API key removed'))
    onUpdate?.()
  }

  const testHevyConnection = async () => {
    setTestingHevy(true)
    setHevyTestResult(null)
    try {
      const k = hevyKey.trim() || await getHevyApiKey()
      if (!k) { toast(t('Enter an API key first')); setTestingHevy(false); return }
      const r = await testHevyApiKey(k)
      if (r.ok) {
        setHevyTestResult({ ok: true, message: t('Connected to Hevy API successfully!') })
        toast(t('Hevy connection successful!'))
      } else if (r.error === 'auth') {
        setHevyTestResult({ ok: false, message: t('API key was refused by Hevy (401/403)') })
        toast(t('Hevy API key refused'))
      } else {
        setHevyTestResult({ ok: false, message: r.error || t('Connection error') })
        toast(t('Test failed: {0}', r.error || 'error'))
      }
    } catch (e) {
      setHevyTestResult({ ok: false, message: e.message || t('Connection error') })
      toast(e.message || t('Connection error'))
    } finally {
      setTestingHevy(false)
    }
  }

  return <>
    <h3>{t('Manage API Keys')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('Keys are stored securely on this device and are only used for direct requests.')}
    </div>
    <Segmented
      className="seg-inline"
      style={{ marginBottom: 16 }}
      options={[
        { value: 'coach', label: t('AI Coach'), icon: 'sparkles' },
        { value: 'hevy', label: t('Hevy Pro'), icon: 'key' },
      ]}
      value={tab}
      onChange={setTab}
    />
    {tab === 'coach' ? (
      <div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {HTTP_PROVIDER_IDS.map(id => (
            <button
              key={id}
              type="button"
              className={'chip' + (id === selectedProvider ? ' on' : '')}
              onClick={() => { setSelectedProvider(id); setCoachKey(''); setTestResult(null) }}
            >
              {HTTP_PROVIDERS[id].label}
              {providerKeys[id] && <span className="adm-chip-key" style={{ marginLeft: 5 }}>✓</span>}
            </button>
          ))}
        </div>
        <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
          <span className="small bold">{providerMeta.label || 'AI Provider'}</span>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            {hasCoachKey && <span className="adm-pill ok">✓ {t('Saved')}</span>}
            {isActiveCoach && <span className="adm-pill info">{t('Active Coach')}</span>}
          </div>
        </div>
        {providerMeta.baseUrl && (
          <div style={{ marginBottom: 10 }}>
            <label className="small dim" style={{ display: 'block', marginBottom: 4 }}>{t('Endpoint URL')}</label>
            <TextField
              value={baseUrl}
              placeholder="http://localhost:11434  or  https://openrouter.ai/api"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={e => setBaseUrl(e.target.value)}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <TextField
            type={showCoachKey ? 'text' : 'password'}
            value={coachKey}
            placeholder={hasCoachKey ? '••••••••  ' + t('(saved — enter new to replace)') : (providerMeta.keyPlaceholder || 'sk-…')}
            autoCapitalize="none"
            autoCorrect="off"
            onChange={e => setCoachKey(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button variant="tinted" icon={showCoachKey ? 'eyeSlash' : 'eye'} onClick={() => setShowCoachKey(!showCoachKey)} aria-label={showCoachKey ? t('Hide key') : t('Show key')} />
        </div>
        <div className="small dim" style={{ marginBottom: 12 }}>
          {hasCoachKey
            ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {t('API key saved for {0}', providerMeta.label)}</span>
            : providerMeta.keyOptional
              ? t('Optional for local models (e.g. Ollama)')
              : t('Required for {0}', providerMeta.label)}
        </div>
        {testResult && (
          <div className={'adm-result ' + (testResult.ok ? 'ok' : 'bad')} style={{ marginBottom: 10 }}>
            <b>{testResult.ok ? t('Passed') : t('Failed')}:</b> {testResult.message}
          </div>
        )}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {(coachKey.trim() || (providerMeta.keyOptional && baseUrl !== (coachLocal?.baseUrl || ''))) && (
            <Button variant="primary" icon="check" onClick={saveCoachKey}>{t('Save key')}</Button>
          )}
          <Button variant="tinted" icon="sparkles" disabled={testing || (!providerMeta.keyOptional && !hasCoachKey && !coachKey.trim())} onClick={testCoachConnection}>
            {testing ? t('Testing…') : t('Test connection')}
          </Button>
          {!isActiveCoach && (hasCoachKey || providerMeta.keyOptional) && (
            <Button variant="tinted" icon="sparkles" onClick={activateProvider}>{t('Use for AI Coach')}</Button>
          )}
          {hasCoachKey && <Button danger icon="trash" onClick={removeCoachKey}>{t('Remove key')}</Button>}
        </div>
      </div>
    ) : (
      <div>
        <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
          <span className="small bold">{t('Hevy Pro API key')}</span>
          {hasHevyKey && <span className="adm-pill ok">✓ {t('Saved')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <TextField
            type={showHevyKey ? 'text' : 'password'}
            value={hevyKey}
            placeholder={hasHevyKey ? '••••••••  ' + t('(saved — enter new to replace)') : 'api-key-…'}
            autoCapitalize="none"
            autoCorrect="off"
            onChange={e => setHevyKey(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button variant="tinted" icon={showHevyKey ? 'eyeSlash' : 'eye'} onClick={() => setShowHevyKey(!showHevyKey)} aria-label={showHevyKey ? t('Hide key') : t('Show key')} />
        </div>
        {hevyTestResult && (
          <div className={'adm-result ' + (hevyTestResult.ok ? 'ok' : 'bad')} style={{ marginBottom: 10 }}>
            <b>{hevyTestResult.ok ? t('Passed') : t('Failed')}:</b> {hevyTestResult.message}
          </div>
        )}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {hevyKey.trim() && <Button variant="primary" icon="check" onClick={saveHevyKey}>{t('Save key')}</Button>}
          <Button variant="tinted" icon="sparkles" disabled={testingHevy || (!hasHevyKey && !hevyKey.trim())} onClick={testHevyConnection}>
            {testingHevy ? t('Testing…') : t('Test connection')}
          </Button>
          {hasHevyKey && <Button danger icon="trash" onClick={removeHevyKey}>{t('Remove key')}</Button>}
        </div>
        <div className="dim small" style={{ marginTop: 12, lineHeight: 1.5 }}>
          {t('Saved key is auto-used in Settings → Import from Hevy so you don’t have to re-enter it.')}{' '}
          <a href="https://hevy.com/settings?developer" target="_blank" rel="noopener noreferrer">{t('Get your key on hevy.com')}</a>
        </div>
      </div>
    )}
    <div style={{ height: 12 }} />
  </>
}
