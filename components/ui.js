// Små återanvändbara UI-komponenter.

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`card stat ${tone || ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

const STATUS = {
  active: ['Aktiv', 'ok'],
  paused: ['Pausad', 'warn'],
  cancelled: ['Avslutad', 'bad'],
  booked: ['Bokad', 'ok'],
  waitlist: ['Kö', 'warn'],
  paid: ['Betald', 'ok'],
  unpaid: ['Obetald', 'warn'],
  overdue: ['Förfallen', 'bad'],
}

export function Badge({ status, children }) {
  const [label, tone] = STATUS[status] || [status, '']
  return <span className={`badge ${tone}`}>{children || label}</span>
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const fmtDate = (d) => new Date(d).toLocaleDateString('sv-SE')
export const fmtTime = (d) => new Date(d).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
export const fmtDay = (d) =>
  new Date(d).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
