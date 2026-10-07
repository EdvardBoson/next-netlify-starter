import Link from 'next/link'
import Layout from '@components/Layout'
import { Stat, fmtTime } from '@components/ui'
import { useStore } from '@lib/store'
import { bookedCount, dashboardStats, formatSEK, fullName, lokSummary, sameDay } from '@lib/logic.mjs'

export default function Dashboard() {
  const { state } = useStore()
  return <Layout title="Översikt">{state && <DashboardBody state={state} />}</Layout>
}

function DashboardBody({ state }) {
  const now = new Date()
  const s = dashboardStats(state, now)
  const lok = lokSummary(state)
  const max = Math.max(1, ...s.last14.map((d) => d.count))
  const todays = state.classes.filter((c) => sameDay(c.start, now)).sort((a, b) => a.start.localeCompare(b.start))
  const members = new Map(state.members.map((m) => [m.id, m]))
  const recent = [...state.checkins].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)

  return (
    <>
      <section className="grid stats">
        <Stat label="Aktiva medlemmar" value={s.active} hint={`${state.members.length} totalt`} />
        <Stat label="Återkommande intäkter" value={formatSEK(s.mrr)} hint="per månad (MRR)" />
        <Stat label="Incheckningar idag" value={s.checkinsToday} />
        <Stat label="Beläggning 7 dagar" value={`${s.occupancy}%`} hint={`${s.upcomingClasses} pass`} />
        <Stat
          label="Obetalt"
          value={formatSEK(s.unpaidSum)}
          hint={`${s.overdueCount} förfallna`}
          tone={s.overdueCount ? 'warn' : ''}
        />
        <Stat label="LOK-stödsgrundande" value={lok.sessions} hint={`av ${lok.total} sammankomster`} />
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Incheckningar senaste 14 dagarna</h2>
          <div className="bars" role="img" aria-label="Stapeldiagram över incheckningar per dag">
            {s.last14.map((d) => (
              <div key={d.date.toISOString()} className="bar-col" title={`${d.date.toLocaleDateString('sv-SE')}: ${d.count}`}>
                <span className="bar-value">{d.count}</span>
                <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
                <span className="bar-label">{d.date.getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Dagens pass</h2>
          {todays.length === 0 && <p className="muted">Inga pass schemalagda idag.</p>}
          <ul className="list">
            {todays.map((c) => {
              const booked = bookedCount(state, c.id)
              return (
                <li key={c.id}>
                  <span className="mono">{fmtTime(c.start)}</span>
                  <span className="grow">
                    {c.title} <small className="muted">· {c.instructor}</small>
                  </span>
                  <span className="meter" aria-label={`${booked} av ${c.capacity} platser bokade`}>
                    <span style={{ width: `${(booked / c.capacity) * 100}%` }} />
                  </span>
                  <small className="mono">
                    {booked}/{c.capacity}
                  </small>
                </li>
              )
            })}
          </ul>
          <Link href="/schema">
            <a className="link">Till schemat →</a>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Senaste incheckningar</h2>
        <ul className="list">
          {recent.map((c) => (
            <li key={c.id}>
              <span className="mono">{new Date(c.at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="grow">{fullName(members.get(c.memberId))}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
