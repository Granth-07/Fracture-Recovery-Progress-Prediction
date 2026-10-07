import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_PATIENTS } from '../data/MOCK_DATA'
import { StatusBadge } from '../components/StatusBadge'
import type { PatientSummary, InjuryType, PatientStatus } from '../types/contract'

const INJURY_EMOJI: Record<InjuryType, string> = {
  wrist: '🤝',
  ankle: '🦵',
  elbow: '💪',
}

type SortKey = keyof Pick<PatientSummary, 'name' | 'days_since_injury' | 'status'>

function formatLastCheckin(iso: string | null) {
  if (!iso) return <span className="text-rose-400 text-xs">Never</span>
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return <span className="text-emerald-400 text-xs">Today</span>
  if (days === 1) return <span className="text-slate-300 text-xs">Yesterday</span>
  return <span className="text-slate-400 text-xs">{days}d ago</span>
}

export function PatientList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<PatientStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    let list = MOCK_PATIENTS.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      return matchSearch && matchStatus
    })
    list = [...list].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va
      }
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
    return list
  }, [search, filterStatus, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="opacity-30 ml-1">↕</span>
    return <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
  }

  const counts = {
    on_track: MOCK_PATIENTS.filter((p) => p.status === 'on_track').length,
    plateaued: MOCK_PATIENTS.filter((p) => p.status === 'plateaued').length,
    no_recent_checkin: MOCK_PATIENTS.filter((p) => p.status === 'no_recent_checkin').length,
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Patient Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            {MOCK_PATIENTS.length} patients · Functional recovery tracking
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          id="filter-on-track"
          onClick={() => setFilterStatus(filterStatus === 'on_track' ? 'all' : 'on_track')}
          className={`card text-left transition-all duration-150 hover:border-emerald-500/40 ${filterStatus === 'on_track' ? 'border-emerald-500/60 bg-emerald-500/5' : ''}`}
        >
          <p className="text-2xl font-bold text-emerald-400">{counts.on_track}</p>
          <p className="text-xs text-slate-400 mt-1">On Track</p>
        </button>
        <button
          id="filter-plateaued"
          onClick={() => setFilterStatus(filterStatus === 'plateaued' ? 'all' : 'plateaued')}
          className={`card text-left transition-all duration-150 hover:border-amber-500/40 ${filterStatus === 'plateaued' ? 'border-amber-500/60 bg-amber-500/5' : ''}`}
        >
          <p className="text-2xl font-bold text-amber-400">{counts.plateaued}</p>
          <p className="text-xs text-slate-400 mt-1">Plateaued</p>
        </button>
        <button
          id="filter-no-checkin"
          onClick={() => setFilterStatus(filterStatus === 'no_recent_checkin' ? 'all' : 'no_recent_checkin')}
          className={`card text-left transition-all duration-150 hover:border-rose-500/40 ${filterStatus === 'no_recent_checkin' ? 'border-rose-500/60 bg-rose-500/5' : ''}`}
        >
          <p className="text-2xl font-bold text-rose-400">{counts.no_recent_checkin}</p>
          <p className="text-xs text-slate-400 mt-1">No Recent Check-in</p>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          id="patient-search"
          type="text"
          placeholder="Search patients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 bg-surface-card border border-surface-border rounded-xl px-4 py-2.5
                     text-sm text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
        />
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" id="patient-table">
            <thead>
              <tr className="text-left text-slate-400 border-b border-surface-border bg-surface-card">
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => toggleSort('name')}
                >
                  Patient <SortIcon k="name" />
                </th>
                <th className="px-6 py-4 font-medium">Injury</th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => toggleSort('days_since_injury')}
                >
                  Days Since Injury <SortIcon k="days_since_injury" />
                </th>
                <th className="px-6 py-4 font-medium">Last Check-in</th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => toggleSort('status')}
                >
                  Status <SortIcon k="status" />
                </th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No patients match your search.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr
                  key={p.patient_id}
                  id={`patient-row-${p.patient_id}`}
                  className="table-row-hover border-b border-surface-border/50"
                  onClick={() => navigate(`/patients/${p.patient_id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-700/50 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
                        {p.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-medium text-slate-100">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 capitalize">
                    {INJURY_EMOJI[p.injury_type]} {p.injury_type}
                  </td>
                  <td className="px-6 py-4 text-slate-300">{p.days_since_injury}d</td>
                  <td className="px-6 py-4">{formatLastCheckin(p.last_checkin)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      id={`btn-checkin-${p.patient_id}`}
                      className="btn-primary text-xs py-1.5 px-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/patients/${p.patient_id}/checkin`)
                      }}
                    >
                      Start Check-in
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
