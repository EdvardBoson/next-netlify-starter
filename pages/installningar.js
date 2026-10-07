import { useRef, useState } from 'react'
import Layout from '@components/Layout'
import { Field } from '@components/ui'
import { downloadFile, useStore } from '@lib/store'

export default function Settings() {
  const { state, setState, reset, notify } = useStore()
  const fileRef = useRef(null)
  const [org, setOrg] = useState(null)

  if (!state) return <Layout title="Inställningar" />
  const form = org || state.org
  const set = (k) => (e) => setOrg({ ...form, [k]: e.target.value })

  const importJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      try {
        const data = JSON.parse(text)
        if (!Array.isArray(data.members) || !data.org) throw new Error('fel format')
        setState(data)
        notify('Data importerades.')
      } catch (err) {
        notify('Filen kunde inte läsas som en Arena-export.', 'error')
      }
    })
    e.target.value = ''
  }

  return (
    <Layout title="Inställningar">
      <section className="grid two">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            setState((s) => ({ ...s, org: form }))
            setOrg(null)
            notify('Inställningarna sparades.')
          }}
        >
          <h2>Organisation</h2>
          <div className="form-grid">
            <Field label="Namn">
              <input className="input" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Typ av verksamhet">
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="gym">Gym / träningscenter</option>
                <option value="forening">Idrottsförening</option>
                <option value="kombinerad">Kombinerad (förening med gym)</option>
              </select>
            </Field>
            <Field label="Organisationsnummer">
              <input className="input" value={form.orgNumber || ''} onChange={set('orgNumber')} />
            </Field>
            <Field label="Ort">
              <input className="input" value={form.city || ''} onChange={set('city')} />
            </Field>
          </div>
          <div className="modal-actions">
            <button className="btn primary">Spara</button>
          </div>
        </form>

        <div className="card">
          <h2>Data</h2>
          <p className="muted">
            I den här versionen sparas all data lokalt i webbläsaren. Exportera regelbundet som säkerhetskopia, eller koppla
            på en databas enligt README för fleranvändardrift.
          </p>
          <div className="stack">
            <button className="btn" onClick={() => downloadFile('arena-export.json', JSON.stringify(state, null, 2), 'application/json')}>
              Exportera all data (JSON)
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Importera data (JSON)
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={importJSON} />
            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm('Ersätt all data med exempeldata? Detta går inte att ångra.')) {
                  reset()
                  notify('Exempeldata återställd.')
                }
              }}
            >
              Återställ exempeldata
            </button>
          </div>
        </div>
      </section>
    </Layout>
  )
}
