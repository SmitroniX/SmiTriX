import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if ((!user && !isGuest) || loc.pathname.startsWith('/login')) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k =>
    cur === k ||
    (cur === 'history' && k === 'stats') ||
    ((cur === 'settings' || cur === 'checkin' || cur === 'admin') && k === 'home') ||
    (cur === 'plans' && k === 'profile') ||
    (cur === 'muscles' && k === 'library')

  const startWorkout = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { onStart(r.id); return }
    }
    nav('/workout')
  }
  const Tab = ({ k, icon, to, label }) => (
    <button className={on(k) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )

  return (
    <nav id="tabbar">
      <Tab k="home" icon="house" to="/home" label={t('Home')} />
      <Tab k="plan" icon="calendar" to="/plan" label={t('Plan')} />
      <button className={'start' + (S.active ? ' rec' : '') + (cur === 'workout' ? ' on' : '')} onClick={startWorkout}>
        <span className="cir"><Icon name="dumbbell" /></span>
        <span>{S.active ? t('Resume') : t('Workout')}</span>
      </button>
      <Tab k="stats" icon="chart" to="/stats" label={t('Stats')} />
      <Tab k="library" icon="list" to="/library" label={t('Exercises')} />
      <Tab k="profile" icon="person" to="/profile" label={t('Profile')} />
    </nav>
  )
}
