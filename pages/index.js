import { useRef, useState } from 'react'
import Head from 'next/head'
import Header from '@components/Header'
import Footer from '@components/Footer'
import WorkoutForm from '@components/WorkoutForm'
import WorkoutList from '@components/WorkoutList'
import PersonalRecords from '@components/PersonalRecords'
import ProgressCharts from '@components/ProgressCharts'
import { emptyWorkout, exerciseNames, personalRecords, useWorkouts } from '@lib/workouts'

export default function Home() {
  const { workouts, loaded, saveWorkout, deleteWorkout, replaceAll } = useWorkouts()
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('history')
  const fileInput = useRef(null)

  function handleSave(workout) {
    saveWorkout(workout)
    setEditing(null)
    setTab('history')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(workouts, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `styrkelogg-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    file.text().then((text) => {
      try {
        const data = JSON.parse(text)
        if (!Array.isArray(data)) throw new Error('Fel format')
        if (window.confirm(`Ersätt din logg med ${data.length} pass från filen?`)) replaceAll(data)
      } catch (e) {
        window.alert('Kunde inte läsa filen. Är det en export från Styrkeloggen?')
      }
    })
  }

  return (
    <div className="container">
      <Head>
        <title>Styrkeloggen</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Header title="Styrkeloggen" subtitle="Logga dina styrkepass och följ din utveckling." />

        {editing ? (
          <section className="section">
            <h2>{workouts.some((w) => w.id === editing.id) ? 'Ändra pass' : 'Nytt pass'}</h2>
            <WorkoutForm
              key={editing.id}
              initialWorkout={editing}
              knownExercises={exerciseNames(workouts)}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </section>
        ) : (
          <>
            <button type="button" className="primary big" onClick={() => setEditing(emptyWorkout())}>
              + Nytt pass
            </button>

            <nav className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'history'}
                className={tab === 'history' ? 'active' : ''}
                onClick={() => setTab('history')}
              >
                Historik ({workouts.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'records'}
                className={tab === 'records' ? 'active' : ''}
                onClick={() => setTab('records')}
              >
                Personbästa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'progress'}
                className={tab === 'progress' ? 'active' : ''}
                onClick={() => setTab('progress')}
              >
                Utveckling
              </button>
            </nav>

            <section className="section">
              {!loaded ? null : tab === 'history' ? (
                <WorkoutList workouts={workouts} onEdit={(w) => setEditing(w)} onDelete={deleteWorkout} />
              ) : tab === 'records' ? (
                <PersonalRecords records={personalRecords(workouts)} />
              ) : (
                <ProgressCharts workouts={workouts} />
              )}
            </section>

            <div className="backup">
              <button type="button" className="link-button" onClick={exportData} disabled={workouts.length === 0}>
                Exportera backup
              </button>
              <button type="button" className="link-button" onClick={() => fileInput.current.click()}>
                Importera backup
              </button>
              <input ref={fileInput} type="file" accept="application/json" hidden onChange={importData} />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
