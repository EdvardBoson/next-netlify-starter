import { setCount, workoutVolume } from '@lib/workouts'

function formatDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatNumber(n) {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 1 })
}

export default function WorkoutList({ workouts, onEdit, onDelete }) {
  if (workouts.length === 0) {
    return <p className="empty">Inga pass loggade än. Tryck på ”Nytt pass” för att börja.</p>
  }

  return (
    <ul className="workout-list">
      {workouts.map((workout) => (
        <li key={workout.id} className="card workout">
          <div className="workout-header">
            <div>
              <h3>{workout.name || 'Pass'}</h3>
              <p className="muted">{formatDate(workout.date)}</p>
            </div>
            <div className="workout-actions">
              <button type="button" className="link-button" onClick={() => onEdit(workout)}>
                Ändra
              </button>
              <button
                type="button"
                className="link-button danger"
                onClick={() => {
                  if (window.confirm('Ta bort det här passet?')) onDelete(workout.id)
                }}
              >
                Ta bort
              </button>
            </div>
          </div>

          <p className="stats">
            {workout.exercises.length} övningar · {setCount(workout)} set · {formatNumber(workoutVolume(workout))} kg
            totalt
          </p>

          <ul className="exercise-summary">
            {workout.exercises.map((exercise) => (
              <li key={exercise.id}>
                <strong>{exercise.name}</strong>
                <span className="muted">
                  {exercise.sets.map((set) => `${formatNumber(set.weight)} kg × ${set.reps}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>

          {workout.notes && <p className="notes">{workout.notes}</p>}
        </li>
      ))}
    </ul>
  )
}
