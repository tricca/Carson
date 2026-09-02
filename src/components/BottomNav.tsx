import { NavLink } from 'react-router-dom'
import { ClockIcon, CoinIcon, DocumentIcon, DotsIcon, HomeIcon } from './icons'

const ITEMS = [
  { to: '/', label: 'Oggi', icon: HomeIcon, end: true },
  { to: '/ore', label: 'Ore', icon: ClockIcon, end: false },
  { to: '/pagamenti', label: 'Paghe', icon: CoinIcon, end: false },
  { to: '/contributi', label: 'INPS', icon: DocumentIcon, end: false },
  { to: '/altro', label: 'Altro', icon: DotsIcon, end: false },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
