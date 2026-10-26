import { useEffect, useState } from 'react'

const STORAGE_KEY = 'styrkelogg.workouts.v1'

export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function today() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function emptySet(previous) {
  return { id: createId(), reps: previous?.reps ?? '', weight: previous?.weight ?? '' }
}

export function emptyExercise(name = '') {
  return { id: createId(), name, sets: [emptySet()] }
}

export function emptyWorkout() {
  return { id: createId(), date: today(), name: '', notes: '', exercises: [emptyExercise()] }
}

function toNumber(value) {
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

// Epley-formeln för uppskattat 1RM
export function estimateOneRepMax(weight, reps) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function workoutVolume(workout) {
  return workout.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((sum, set) => sum + toNumber(set.reps) * toNumber(set.weight), 0),
    0
  )
}

export function setCount(workout) {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

// Rensar bort tomma övningar/set och gör om värden till siffror innan sparning
export function cleanWorkout(workout) {
  const exercises = workout.exercises
    .map((exercise) => ({
      ...exercise,
      name: exercise.name.trim(),
      sets: exercise.sets
        .map((set) => ({ ...set, reps: toNumber(set.reps), weight: toNumber(set.weight) }))
        .filter((set) => set.reps > 0),
    }))
    .filter((exercise) => exercise.name && exercise.sets.length > 0)

  return { ...workout, name: workout.name.trim(), notes: workout.notes.trim(), exercises }
}

export function personalRecords(workouts) {
  const records = {}
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const key = exercise.name.toLowerCase()
      for (const set of exercise.sets) {
        const oneRm = estimateOneRepMax(set.weight, set.reps)
        const record = records[key] || { name: exercise.name, maxWeight: 0, bestOneRm: 0, sessions: new Set() }
        record.sessions.add(workout.id)
        if (set.weight > record.maxWeight) {
          record.maxWeight = set.weight
          record.maxWeightReps = set.reps
          record.maxWeightDate = workout.date
        }
        if (oneRm > record.bestOneRm) {
          record.bestOneRm = oneRm
        }
        records[key] = record
      }
    }
  }
  return Object.values(records)
    .map((r) => ({ ...r, sessions: r.sessions.size }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}

export function exerciseNames(workouts) {
  const names = new Map()
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      names.set(exercise.name.toLowerCase(), exercise.name)
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'sv'))
}

function sortWorkouts(workouts) {
  return [...workouts].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(stored)) setWorkouts(sortWorkouts(stored))
    } catch (e) {
      // Ogiltig eller blockerad lagring: börja med en tom logg
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
    } catch (e) {
      // Lagringen kan vara full eller avstängd i privat läge
    }
  }, [workouts, loaded])

  function saveWorkout(workout) {
    setWorkouts((current) => sortWorkouts([...current.filter((w) => w.id !== workout.id), workout]))
  }

  function deleteWorkout(id) {
    setWorkouts((current) => current.filter((w) => w.id !== id))
  }

  function replaceAll(next) {
    setWorkouts(sortWorkouts(next))
  }

  return { workouts, loaded, saveWorkout, deleteWorkout, replaceAll }
}
