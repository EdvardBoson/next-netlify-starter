import { useMemo, useState } from 'react'
import Layout from '@components/Layout'
import { Badge, Field, Modal, fmtDate } from '@components/ui'
import { downloadFile, useStore } from '@lib/store'
import { ageAt, fullName, nextMemberNumber, toCSV, uid } from '@lib/logic.mjs'

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', birthDate: '', planId: '', status: 'active', teamIds: [], notes: '' }

export default function Members() {
  const { state, setState, notify } = useStore()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  const plans = useMemo(() => new Map((state?.plans || []).map((p) => [p.id, p])), [state])
  const rows = useMemo(() => {
    if (!state) return []
    const q = query.trim().toLowerCase()
    return state.members
      .filter((m) => statusFilter === 'all' || m.status === statusFilter)
      .filter((m) => !q || `${m.number} ${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'sv'))
  }, [state, query, statusFilter])

  const saveMember = (form) => {
    if (!form.firstName.trim() || !form.lastName.trim()) return notify('För- och efternamn krävs.', 'error')
    setState((s) => {
      if (form.id) return { ...s, members: s.members.map((m) => (m.id === form.id ? form : m)) }
      const member = { ...form, id: uid('mem'), number: nextMemberNumber(s.members), joinedAt: new Date().toISOString() }
      return { ...s, members: [...s.members, member] }
    })
    notify(form.id ? 'Medlemmen uppdaterades.' : 'Ny medlem registrerad.')
    setEditing(null)
  }

  const exportCSV = () => {
    const csv = toCSV(rows, [
      { label: 'Medlemsnr', value: (m) => m.number },
      { label: 'Förnamn', value: (m) => m.firstName },
      { label: 'Efternamn', value: (m) => m.lastName },
      { label: 'E-post', value: (m) => m.email },
      { label: 'Telefon', value: (m) => m.phone },
      { label: 'Födelsedatum', value: (m) => m.birthDate },
      { label: 'Medlemskap', value: (m) => plans.get(m.planId)?.name },
      { label: 'Status', value: (m) => m.status },
      { label: 'Medlem sedan', value: (m) => fmtDate(m.joinedAt) },
    ])
    downloadFile('medlemmar.csv', csv)
  }

  return (
    <Layout
      title="Medlemmar"
      actions={
        <>
          <button className="btn" onClick={exportCSV}>
            Exportera CSV
          </button>
          <button className="btn primary" onClick={() => setEditing({ ...EMPTY, planId: state?.plans[0]?.id || '' })}>
            + Ny medlem
          </button>
        </>
      }
    >
      {state && (
        <div className="card">
          <div className="toolbar">
            <input
              className="input"
              type="search"
              placeholder="Sök namn, e-post eller medlemsnummer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Sök medlem"
            />
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrera status">
              <option value="all">Alla statusar</option>
              <option value="active">Aktiva</option>
              <option value="paused">Pausade</option>
              <option value="cancelled">Avslutade</option>
            </select>
            <span className="muted">{rows.length} st</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>Namn</th>
                  <th>Ålder</th>
                  <th>Kontakt</th>
                  <th>Medlemskap</th>
                  <th>Lag</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => setEditing(m)}>
                    <td className="mono">{m.number}</td>
                    <td>
                      <strong>{fullName(m)}</strong>
                    </td>
                    <td>{ageAt(m.birthDate) ?? '–'}</td>
                    <td>
                      <div>{m.email}</div>
                      <small className="muted">{m.phone}</small>
                    </td>
                    <td>{plans.get(m.planId)?.name || '–'}</td>
                    <td>{m.teamIds.map((t) => state.teams.find((x) => x.id === t)?.name).filter(Boolean).join(', ') || '–'}</td>
                    <td>
                      <Badge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && <MemberForm initial={editing} state={state} onSave={saveMember} onClose={() => setEditing(null)} />}
    </Layout>
  )
}

function MemberForm({ initial, state, onSave, onClose }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggleTeam = (id) =>
    setForm({ ...form, teamIds: form.teamIds.includes(id) ? form.teamIds.filter((t) => t !== id) : [...form.teamIds, id] })

  const visits = initial.id ? state.checkins.filter((c) => c.memberId === initial.id).length : 0
  const unpaid = initial.id ? state.invoices.filter((i) => i.memberId === initial.id && i.status === 'unpaid') : []

  return (
    <Modal title={initial.id ? `${fullName(initial)} · #${initial.number}` : 'Ny medlem'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        {initial.id && (
          <p className="muted">
            {visits} besök · {unpaid.length} obetalda fakturor · medlem sedan {fmtDate(initial.joinedAt)}
          </p>
        )}
        <div className="form-grid">
          <Field label="Förnamn">
            <input className="input" value={form.firstName} onChange={set('firstName')} required />
          </Field>
          <Field label="Efternamn">
            <input className="input" value={form.lastName} onChange={set('lastName')} required />
          </Field>
          <Field label="E-post">
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Telefon">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Födelsedatum">
            <input className="input" type="date" value={form.birthDate} onChange={set('birthDate')} />
          </Field>
          <Field label="Medlemskap">
            <select className="input" value={form.planId} onChange={set('planId')}>
              {state.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="active">Aktiv</option>
              <option value="paused">Pausad</option>
              <option value="cancelled">Avslutad</option>
            </select>
          </Field>
        </div>
        <fieldset className="chips">
          <legend>Lag / grupper</legend>
          {state.teams.map((t) => (
            <label key={t.id} className="chip">
              <input type="checkbox" checked={form.teamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
              {t.name}
            </label>
          ))}
        </fieldset>
        <Field label="Anteckningar">
          <textarea className="input" rows={2} value={form.notes || ''} onChange={set('notes')} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="btn primary">
            Spara
          </button>
        </div>
      </form>
    </Modal>
  )
}
