import { useState } from 'react'
import Layout from '@components/Layout'
import { Badge, Field, Modal, Stat, fmtDate } from '@components/ui'
import { downloadFile, useStore } from '@lib/store'
import { LOK_RULES, ageAt, fullName, lokEvaluation, lokSummary, toCSV, uid } from '@lib/logic.mjs'

export default function Teams() {
  const { state, setState, notify } = useStore()
  const [teamId, setTeamId] = useState(null)
  const [registering, setRegistering] = useState(null)
  const [creatingTeam, setCreatingTeam] = useState(false)

  if (!state) return <Layout title="Lag & närvaro" />
  const team = state.teams.find((t) => t.id === teamId) || state.teams[0]
  const roster = team ? state.members.filter((m) => m.teamIds.includes(team.id)) : []
  const activities = team
    ? state.activities.filter((a) => a.teamId === team.id).sort((a, b) => b.date.localeCompare(a.date))
    : []
  const summary = team ? lokSummary(state, team.id) : null

  const saveActivity = (act) => {
    setState((s) => ({
      ...s,
      activities: act.id && s.activities.some((a) => a.id === act.id)
        ? s.activities.map((a) => (a.id === act.id ? act : a))
        : [...s.activities, { ...act, id: uid('act') }],
    }))
    notify('Närvaron sparades.')
    setRegistering(null)
  }

  const saveTeam = (t) => {
    const created = { ...t, id: uid('team') }
    setState((s) => ({ ...s, teams: [...s.teams, created] }))
    setTeamId(created.id)
    setCreatingTeam(false)
    notify('Laget skapades.')
  }

  const exportLok = () => {
    const members = new Map(state.members.map((m) => [m.id, m]))
    const rows = []
    for (const a of activities) {
      const ev = lokEvaluation(state, a)
      for (const id of a.attendeeIds) {
        const m = members.get(id)
        rows.push({ a, m, ev })
      }
    }
    const csv = toCSV(rows, [
      { label: 'Datum', value: (r) => fmtDate(r.a.date) },
      { label: 'Lag', value: () => team.name },
      { label: 'Aktivitet', value: (r) => r.a.type },
      { label: 'Längd (min)', value: (r) => r.a.durationMin },
      { label: 'Ledare', value: () => team.leader },
      { label: 'Deltagare', value: (r) => fullName(r.m) },
      { label: 'Födelsedatum', value: (r) => r.m?.birthDate },
      { label: 'Ålder', value: (r) => ageAt(r.m?.birthDate, r.a.date) },
      { label: 'LOK-grundande sammankomst', value: (r) => (r.ev.qualifies ? 'Ja' : 'Nej') },
    ])
    downloadFile(`narvaro-${team.name.replace(/\s+/g, '-').toLowerCase()}.csv`, csv)
  }

  return (
    <Layout
      title="Lag & närvaro"
      actions={
        <>
          <button className="btn" onClick={() => setCreatingTeam(true)}>
            + Nytt lag
          </button>
          {team && (
            <>
              <button className="btn" onClick={exportLok}>
                Exportera närvaro (CSV)
              </button>
              <button
                className="btn primary"
                onClick={() =>
                  setRegistering({
                    teamId: team.id,
                    date: new Date().toISOString(),
                    type: 'Träning',
                    durationMin: 90,
                    attendeeIds: [],
                  })
                }
              >
                + Registrera närvaro
              </button>
            </>
          )}
        </>
      }
    >
      <div className="tabs" role="tablist">
        {state.teams.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={team?.id === t.id}
            className={team?.id === t.id ? 'tab active' : 'tab'}
            onClick={() => setTeamId(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {team && (
        <>
          <section className="grid stats">
            <Stat label="Spelare / deltagare" value={roster.length} hint={team.ageGroup} />
            <Stat label="Ledare" value={team.leader} hint={team.sport} />
            <Stat label="Sammankomster" value={summary.total} />
            <Stat label="LOK-grundande" value={summary.sessions} hint={`${summary.participants} deltagartillfällen`} />
          </section>

          <section className="grid two">
            <div className="card">
              <h2>Sammankomster</h2>
              <ul className="list">
                {activities.length === 0 && <li className="muted">Ingen närvaro registrerad ännu.</li>}
                {activities.map((a) => {
                  const ev = lokEvaluation(state, a)
                  return (
                    <li key={a.id} className="clickable" onClick={() => setRegistering(a)}>
                      <span className="mono">{fmtDate(a.date)}</span>
                      <span className="grow">
                        {a.type} · {a.durationMin} min · {a.attendeeIds.length} närvarande
                        {!ev.qualifies && <small className="muted"> ({ev.reasons.join(', ')})</small>}
                      </span>
                      <Badge status={ev.qualifies ? 'paid' : 'unpaid'}>{ev.qualifies ? 'LOK ✓' : 'Ej LOK'}</Badge>
                    </li>
                  )
                })}
              </ul>
              <p className="muted small">
                LOK-regler som används: {LOK_RULES.minAge}–{LOK_RULES.maxAge} år, minst {LOK_RULES.minParticipants} deltagare,
                minst {LOK_RULES.minDurationMin} min. Kontrollera alltid mot Riksidrottsförbundets aktuella regler.
              </p>
            </div>
            <div className="card">
              <h2>Trupp</h2>
              <ul className="list">
                {roster.length === 0 && <li className="muted">Lägg till medlemmar i laget under Medlemmar.</li>}
                {roster.map((m) => {
                  const attended = activities.filter((a) => a.attendeeIds.includes(m.id)).length
                  const pct = activities.length ? Math.round((attended / activities.length) * 100) : 0
                  return (
                    <li key={m.id}>
                      <span className="grow">{fullName(m)}</span>
                      <small className="muted">{ageAt(m.birthDate)} år</small>
                      <span className="meter" aria-label={`Närvaro ${pct}%`}>
                        <span style={{ width: `${pct}%` }} />
                      </span>
                      <small className="mono">{pct}%</small>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        </>
      )}

      {registering && (
        <AttendanceForm
          initial={registering}
          roster={state.members.filter((m) => m.teamIds.includes(registering.teamId))}
          onSave={saveActivity}
          onClose={() => setRegistering(null)}
        />
      )}
      {creatingTeam && <TeamForm onSave={saveTeam} onClose={() => setCreatingTeam(false)} />}
    </Layout>
  )
}

function AttendanceForm({ initial, roster, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial, date: initial.date.slice(0, 10) })
  const toggle = (id) =>
    setForm({
      ...form,
      attendeeIds: form.attendeeIds.includes(id) ? form.attendeeIds.filter((x) => x !== id) : [...form.attendeeIds, id],
    })
  return (
    <Modal title={initial.id ? 'Redigera närvaro' : 'Registrera närvaro'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ ...form, date: new Date(`${form.date}T18:00`).toISOString(), durationMin: Number(form.durationMin) })
        }}
      >
        <div className="form-grid">
          <Field label="Datum">
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Typ">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Träning</option>
              <option>Match</option>
              <option>Tävling</option>
              <option>Teori</option>
            </select>
          </Field>
          <Field label="Längd (min)">
            <input
              className="input"
              type="number"
              min="15"
              step="15"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
            />
          </Field>
        </div>
        <fieldset className="chips">
          <legend>
            Närvarande ({form.attendeeIds.length}/{roster.length}){' '}
            <button type="button" className="btn small" onClick={() => setForm({ ...form, attendeeIds: roster.map((m) => m.id) })}>
              Markera alla
            </button>
          </legend>
          {roster.map((m) => (
            <label key={m.id} className="chip">
              <input type="checkbox" checked={form.attendeeIds.includes(m.id)} onChange={() => toggle(m.id)} />
              {fullName(m)}
            </label>
          ))}
        </fieldset>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="btn primary">
            Spara närvaro
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TeamForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', sport: '', leader: '', ageGroup: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal title="Nytt lag / grupp" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <div className="form-grid">
          <Field label="Namn">
            <input className="input" value={form.name} onChange={set('name')} required placeholder="t.ex. P15 Handboll" />
          </Field>
          <Field label="Idrott">
            <input className="input" value={form.sport} onChange={set('sport')} />
          </Field>
          <Field label="Ledare">
            <input className="input" value={form.leader} onChange={set('leader')} />
          </Field>
          <Field label="Åldersgrupp">
            <input className="input" value={form.ageGroup} onChange={set('ageGroup')} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="btn primary">
            Skapa lag
          </button>
        </div>
      </form>
    </Modal>
  )
}
