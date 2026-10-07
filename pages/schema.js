import { useState } from 'react'
import Layout from '@components/Layout'
import { Badge, Field, Modal, fmtDay, fmtTime } from '@components/ui'
import { useStore } from '@lib/store'
import { DAY_MS, bookClass, bookedCount, cancelBooking, fullName, sameDay, uid, waitlist } from '@lib/logic.mjs'

export default function Schedule() {
  const { state, setState, notify } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)

  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY_MS))

  const addClass = (form) => {
    const start = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(start.getTime())) return notify('Ange giltigt datum och tid.', 'error')
    const repeat = Math.max(1, Number(form.repeatWeeks) || 1)
    const created = Array.from({ length: repeat }, (_, w) => ({
      id: uid('cls'),
      title: form.title,
      instructor: form.instructor,
      location: form.location,
      start: new Date(start.getTime() + w * 7 * DAY_MS).toISOString(),
      durationMin: Number(form.durationMin),
      capacity: Number(form.capacity),
    }))
    setState((s) => ({ ...s, classes: [...s.classes, ...created] }))
    notify(repeat > 1 ? `${repeat} pass skapade.` : 'Passet skapades.')
    setCreating(false)
  }

  return (
    <Layout
      title="Schema & bokning"
      actions={
        <>
          <button className="btn" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Föregående vecka">
            ←
          </button>
          <button className="btn" onClick={() => setWeekOffset(0)}>
            Denna vecka
          </button>
          <button className="btn" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Nästa vecka">
            →
          </button>
          <button className="btn primary" onClick={() => setCreating(true)}>
            + Nytt pass
          </button>
        </>
      }
    >
      {state && (
        <div className="week">
          {days.map((day) => {
            const classes = state.classes.filter((c) => sameDay(c.start, day)).sort((a, b) => a.start.localeCompare(b.start))
            const isToday = sameDay(day, new Date())
            return (
              <div key={day.toISOString()} className={`day ${isToday ? 'today' : ''}`}>
                <h3>{fmtDay(day)}</h3>
                {classes.length === 0 && <p className="muted small">Inga pass</p>}
                {classes.map((c) => {
                  const booked = bookedCount(state, c.id)
                  const queue = waitlist(state, c.id).length
                  const past = new Date(c.start) < new Date()
                  return (
                    <button key={c.id} className={`class-card ${past ? 'past' : ''}`} onClick={() => setOpenId(c.id)}>
                      <span className="mono">
                        {fmtTime(c.start)} · {c.durationMin} min
                      </span>
                      <strong>{c.title}</strong>
                      <small className="muted">
                        {c.instructor} · {c.location}
                      </small>
                      <span className="meter">
                        <span style={{ width: `${Math.min(100, (booked / c.capacity) * 100)}%` }} />
                      </span>
                      <small>
                        {booked}/{c.capacity} bokade{queue ? ` · ${queue} i kö` : ''}
                      </small>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
      {openId && <ClassModal classId={openId} onClose={() => setOpenId(null)} />}
      {creating && <ClassForm onSave={addClass} onClose={() => setCreating(false)} />}
    </Layout>
  )
}

function ClassModal({ classId, onClose }) {
  const { state, run, setState, notify } = useStore()
  const [memberId, setMemberId] = useState('')
  const cls = state.classes.find((c) => c.id === classId)
  if (!cls) return null
  const members = new Map(state.members.map((m) => [m.id, m]))
  const list = state.bookings
    .filter((b) => b.classId === classId && b.status !== 'cancelled')
    .sort((a, b) => (a.status === b.status ? a.createdAt.localeCompare(b.createdAt) : a.status === 'booked' ? -1 : 1))
  const bookedIds = new Set(list.map((b) => b.memberId))
  const candidates = state.members
    .filter((m) => m.status === 'active' && !bookedIds.has(m.id))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'sv'))

  const book = () => {
    if (!memberId) return
    run(
      (s) => bookClass(s, classId, memberId),
      (r) => (r.booking.status === 'booked' ? 'Bokning klar.' : 'Passet är fullt – medlemmen står i kö.')
    )
    setMemberId('')
  }

  const cancel = (bookingId) =>
    run(
      (s) => cancelBooking(s, bookingId),
      (r) => (r.promoted ? `Avbokat. ${fullName(members.get(r.promoted.memberId))} flyttades upp från kön.` : 'Avbokat.')
    )

  const remove = () => {
    if (!window.confirm('Ta bort passet och alla dess bokningar?')) return
    setState((s) => ({
      ...s,
      classes: s.classes.filter((c) => c.id !== classId),
      bookings: s.bookings.filter((b) => b.classId !== classId),
    }))
    notify('Passet togs bort.')
    onClose()
  }

  return (
    <Modal title={`${cls.title} · ${fmtDay(cls.start)} ${fmtTime(cls.start)}`} onClose={onClose}>
      <p className="muted">
        {cls.instructor} · {cls.location} · {cls.durationMin} min · {bookedCount(state, classId)}/{cls.capacity} platser
      </p>
      <div className="toolbar">
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label="Välj medlem att boka">
          <option value="">Välj medlem att boka…</option>
          {candidates.map((m) => (
            <option key={m.id} value={m.id}>
              {fullName(m)} (#{m.number})
            </option>
          ))}
        </select>
        <button className="btn primary" onClick={book} disabled={!memberId}>
          Boka
        </button>
      </div>
      <ul className="list">
        {list.length === 0 && <li className="muted">Inga bokningar ännu.</li>}
        {list.map((b) => (
          <li key={b.id}>
            <span className="grow">{fullName(members.get(b.memberId))}</span>
            <Badge status={b.status} />
            <button className="btn small" onClick={() => cancel(b.id)}>
              Avboka
            </button>
          </li>
        ))}
      </ul>
      <div className="modal-actions">
        <button className="btn danger" onClick={remove}>
          Ta bort pass
        </button>
      </div>
    </Modal>
  )
}

function ClassForm({ onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    instructor: '',
    location: 'Sal 1',
    date: new Date().toISOString().slice(0, 10),
    time: '18:00',
    durationMin: 60,
    capacity: 15,
    repeatWeeks: 1,
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal title="Nytt pass" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <div className="form-grid">
          <Field label="Namn på passet">
            <input className="input" value={form.title} onChange={set('title')} required placeholder="t.ex. Cirkelträning" />
          </Field>
          <Field label="Instruktör / ledare">
            <input className="input" value={form.instructor} onChange={set('instructor')} required />
          </Field>
          <Field label="Plats">
            <input className="input" value={form.location} onChange={set('location')} />
          </Field>
          <Field label="Datum">
            <input className="input" type="date" value={form.date} onChange={set('date')} required />
          </Field>
          <Field label="Starttid">
            <input className="input" type="time" value={form.time} onChange={set('time')} required />
          </Field>
          <Field label="Längd (min)">
            <input className="input" type="number" min="15" step="5" value={form.durationMin} onChange={set('durationMin')} />
          </Field>
          <Field label="Max deltagare">
            <input className="input" type="number" min="1" value={form.capacity} onChange={set('capacity')} />
          </Field>
          <Field label="Upprepa antal veckor">
            <input className="input" type="number" min="1" max="52" value={form.repeatWeeks} onChange={set('repeatWeeks')} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="btn primary">
            Skapa
          </button>
        </div>
      </form>
    </Modal>
  )
}
