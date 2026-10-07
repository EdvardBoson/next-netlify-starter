import { useRef, useState } from 'react'
import Layout from '@components/Layout'
import { fmtTime } from '@components/ui'
import { useStore } from '@lib/store'
import { checkIn, fullName, sameDay } from '@lib/logic.mjs'

// Incheckning i receptionen eller via en surfplatta vid entrén.
// Fältet fungerar även med en streckkods-/QR-läsare som "skriver" medlemsnumret.
export default function CheckIn() {
  const { state, setState } = useStore()
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const submit = (e) => {
    e.preventDefault()
    const r = checkIn(state, value)
    if (r.state) setState(r.state)
    setResult(r)
    setValue('')
    inputRef.current?.focus()
  }

  const today = state ? state.checkins.filter((c) => sameDay(c.at, new Date())).sort((a, b) => b.at.localeCompare(a.at)) : []
  const members = new Map((state?.members || []).map((m) => [m.id, m]))

  return (
    <Layout title="Incheckning">
      {state && (
        <div className="grid two">
          <div className="card checkin">
            <form onSubmit={submit}>
              <label htmlFor="checkin-input" className="big-label">
                Skanna kort eller ange medlemsnummer / e-post
              </label>
              <div className="toolbar">
                <input
                  id="checkin-input"
                  ref={inputRef}
                  className="input big"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  placeholder="t.ex. 1001"
                />
                <button className="btn primary big">Checka in</button>
              </div>
            </form>
            {result && (
              <div className={`result ${result.error ? 'bad' : 'ok'}`} role="status">
                {result.error ? (
                  <>
                    <strong>✕ Nekad</strong>
                    <p>{result.error}</p>
                  </>
                ) : (
                  <>
                    <strong>✓ Välkommen, {result.member.firstName}!</strong>
                    <p>
                      {fullName(result.member)} · #{result.member.number}
                    </p>
                    {result.warnings.map((w) => (
                      <p key={w} className="warn-text">
                        ⚠ {w}
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="card">
            <h2>Incheckade idag ({today.length})</h2>
            <ul className="list">
              {today.map((c) => (
                <li key={c.id}>
                  <span className="mono">{fmtTime(c.at)}</span>
                  <span className="grow">{fullName(members.get(c.memberId))}</span>
                  <small className="muted">#{members.get(c.memberId)?.number}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Layout>
  )
}
