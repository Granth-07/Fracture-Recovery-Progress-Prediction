import { NavLink } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <span className="text-brand-400 text-xl">⚕</span>
          <span className="font-bold text-white tracking-tight">Recovery Dashboard</span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink
            to="/dashboard"
            id="nav-dashboard"
            className={({ isActive }) =>
              `btn-ghost text-sm px-3 py-1.5 ${isActive ? 'text-brand-400' : ''}`
            }
          >
            Patients
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
