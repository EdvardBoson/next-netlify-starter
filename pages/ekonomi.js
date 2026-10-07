import { useState } from 'react'
import Layout from '@components/Layout'
import { Badge, Field, Modal, Stat, fmtDate } from '@components/ui'
import { downloadFile, useStore } from '@lib/store'
import { formatSEK, fullName, generateInvoices, mrr, periodKey, toCSV, uid } from '@lib/logic.mjs'

const PERIOD = { month: 'per månad', year: 'per år', once: 'engångs' }

export default function Finance() {
  const { state, setState, run, notify } = useStore()
  const [filter, setFilter] = useState('unpaid')
  const [creatingPlan, setCreatingPlan] = useState(false)

  if (!state) return <Layout title="Ekonomi" />
  const now = new Date()
  const members = new Map(state.members.map((m) => [m.id, m]))
  const invoiceStatus = (i) => (i.status === 'unpaid' && new Date(i.dueDate) < now ? 'overdue' : i.status)
  const invoices = state.invoices
    .filter((i) => filter === 'all' || invoiceStatus(i) === filter || (filter === 'unpaid' && invoiceStatus(i) === 'overdue'))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const paidThisMonth = state.invoices
    .filter((i) => i.status === 'paid' && i.paidAt && periodKey(i.paidAt) === periodKey(now))
    .reduce((s, i) => s + i.amount, 0)
  const unpaid = state.invoices.filter((i) => i.status === 'unpaid')

  const generate = () =>
    run(
      (s) => generateInvoices(s, now),
      (r) => (r.created.length ? `${r.created.length} ${r.created.length === 1 ? 'faktura' : 'fakturor'} skapades för ${periodKey(now)}.` : 'Alla fakturor för perioden finns redan.')
    )

  const markPaid = (id) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: 'paid', paidAt: new Date().toISOString() } : i)),
    }))
    notify('Fakturan markerades som betald.')
  }

  const exportCSV = () =>
    downloadFile(
      'fakturor.csv',
      toCSV(invoices, [
        { label: 'Fakturadatum', value: (i) => fmtDate(i.issuedAt) },
        { label: 'Medlemsnr', value: (i) => members.get(i.memberId)?.number },
        { label: 'Namn', value: (i) => fullName(members.get(i.memberId)) },
        { label: 'Beskrivning', value: (i) => i.description },
        { label: 'Belopp', value: (i) => i.amount },
        { label: 'Förfallodatum', value: (i) => fmtDate(i.dueDate) },
        { label: 'Status', value: (i) => invoiceStatus(i) },
      ])
    )

  const savePlan = (p) => {
    setState((s) => ({ ...s, plans: [...s.plans, { ...p, id: uid('plan'), price: Number(p.price) }] }))
    notify('Medlemskapet skapades.')
    setCreatingPlan(false)
  }

  return (
    <Layout
      title="Ekonomi"
      actions={
        <>
          <button className="btn" onClick={exportCSV}>
            Exportera CSV
          </button>
          <button className="btn primary" onClick={generate}>
            Skapa fakturor för {periodKey(now)}
          </button>
        </>
      }
    >
      <section className="grid stats">
        <Stat label="Återkommande intäkter" value={formatSEK(mrr(state))} hint="per månad" />
        <Stat label="Inbetalt denna månad" value={formatSEK(paidThisMonth)} />
        <Stat label="Utestående" value={formatSEK(unpaid.reduce((s, i) => s + i.amount, 0))} hint={`${unpaid.length} fakturor`} />
        <Stat
          label="Förfallna"
          value={unpaid.filter((i) => new Date(i.dueDate) < now).length}
          tone={unpaid.some((i) => new Date(i.dueDate) < now) ? 'warn' : ''}
        />
      </section>

      <section className="grid two wide-left">
        <div className="card">
          <div className="toolbar">
            <h2 className="grow">Fakturor</h2>
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrera fakturor">
              <option value="unpaid">Obetalda</option>
              <option value="overdue">Förfallna</option>
              <option value="paid">Betalda</option>
              <option value="all">Alla</option>
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medlem</th>
                  <th>Beskrivning</th>
                  <th>Belopp</th>
                  <th>Förfaller</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Inga fakturor i urvalet.
                    </td>
                  </tr>
                )}
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td>{fullName(members.get(i.memberId))}</td>
                    <td>{i.description}</td>
                    <td className="mono">{formatSEK(i.amount)}</td>
                    <td>{fmtDate(i.dueDate)}</td>
                    <td>
                      <Badge status={invoiceStatus(i)} />
                    </td>
                    <td>
                      {i.status === 'unpaid' && (
                        <button className="btn small" onClick={() => markPaid(i.id)}>
                          Markera betald
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="toolbar">
            <h2 className="grow">Medlemskap & priser</h2>
            <button className="btn small" onClick={() => setCreatingPlan(true)}>
              + Nytt
            </button>
          </div>
          <ul className="list">
            {state.plans.map((p) => (
              <li key={p.id}>
                <span className="grow">
                  {p.name}
                  <br />
                  <small className="muted">
                    {state.members.filter((m) => m.planId === p.id && m.status === 'active').length} aktiva
                  </small>
                </span>
                <span className="mono">
                  {formatSEK(p.price)} <small className="muted">{PERIOD[p.period]}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {creatingPlan && <PlanForm onSave={savePlan} onClose={() => setCreatingPlan(false)} />}
    </Layout>
  )
}

function PlanForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', price: 399, period: 'month' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal title="Nytt medlemskap" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <div className="form-grid">
          <Field label="Namn">
            <input className="input" value={form.name} onChange={set('name')} required placeholder="t.ex. Familjekort" />
          </Field>
          <Field label="Pris (kr)">
            <input className="input" type="number" min="0" value={form.price} onChange={set('price')} />
          </Field>
          <Field label="Period">
            <select className="input" value={form.period} onChange={set('period')}>
              <option value="month">Per månad</option>
              <option value="year">Per år</option>
              <option value="once">Engångs (t.ex. klippkort)</option>
            </select>
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
