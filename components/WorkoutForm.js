import { useState } from 'react'
import { cleanWorkout, emptyExercise, emptySet } from '@lib/workouts'

export default function WorkoutForm({ initialWorkout, knownExercises, onSave, onCancel }) {
  const [workout, setWorkout] = useState(initialWorkout)
  const [error, setError] = useState('')

  function update(fields) {
    setWorkout((current) => ({ ...current, ...fields }))
  }

  function updateExercise(exerciseId, fields) {
    update({
      exercises: workout.exercises.map((e) => (e.id === exerciseId ? { ...e, ...fields } : e)),
    })
  }

  function updateSet(exercise, setId, fields) {
    updateExercise(exercise.id, {
      sets: exercise.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
    })
  }

  function addSet(exercise) {
    const last = exercise.sets[exercise.sets.length - 1]
    updateExercise(exercise.id, { sets: [...exercise.sets, emptySet(last)] })
  }

  function removeSet(exercise, setId) {
    updateExercise(exercise.id, { sets: exercise.sets.filter((s) => s.id !== setId) })
  }

  function addExercise() {
    update({ exercises: [...workout.exercises, emptyExercise()] })
  }

  function removeExercise(exerciseId) {
    update({ exercises: workout.exercises.filter((e) => e.id !== exerciseId) })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const cleaned = cleanWorkout(workout)
    if (cleaned.exercises.length === 0) {
      setError('Lägg till minst en övning med namn och ett set med reps.')
      return
    }
    setError('')
    onSave(cleaned)
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <div className="row">
        <label className="field">
          <span>Datum</span>
          <input type="date" value={workout.date} onChange={(e) => update({ date: e.target.value })} required />
        </label>
        <label className="field grow">
          <span>Passnamn</span>
          <input
            type="text"
            placeholder="t.ex. Ben, Push, Helkropp"
            value={workout.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
      </div>

      <datalist id="exercise-names">
        {knownExercises.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {workout.exercises.map((exercise, index) => (
        <fieldset key={exercise.id} className="exercise">
          <div className="exercise-header">
            <input
              type="text"
              className="exercise-name"
              list="exercise-names"
              placeholder={`Övning ${index + 1}, t.ex. Knäböj`}
              aria-label={`Namn på övning ${index + 1}`}
              value={exercise.name}
              onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => removeExercise(exercise.id)}
              aria-label="Ta bort övning"
              title="Ta bort övning"
            >
              ✕
            </button>
          </div>

          <div className="sets">
            <div className="set-row set-labels">
              <span>Set</span>
              <span>Vikt (kg)</span>
              <span>Reps</span>
              <span />
            </div>
            {exercise.sets.map((set, setIndex) => (
              <div key={set.id} className="set-row">
                <span className="set-number">{setIndex + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  aria-label={`Vikt set ${setIndex + 1}`}
                  value={set.weight}
                  onChange={(e) => updateSet(exercise, set.id, { weight: e.target.value })}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  aria-label={`Reps set ${setIndex + 1}`}
                  value={set.reps}
                  onChange={(e) => updateSet(exercise, set.id, { reps: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeSet(exercise, set.id)}
                  aria-label="Ta bort set"
                  title="Ta bort set"
                  disabled={exercise.sets.length === 1}
                >
                  −
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="link-button" onClick={() => addSet(exercise)}>
            + Lägg till set
          </button>
        </fieldset>
      ))}

      <button type="button" className="secondary" onClick={addExercise}>
        + Lägg till övning
      </button>

      <label className="field">
        <span>Anteckningar</span>
        <textarea
          rows="2"
          placeholder="Hur kändes passet?"
          value={workout.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary">
          Spara pass
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </form>
  )
}
