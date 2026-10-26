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

// Utveckling per pass för en övning, äldst först
export function exerciseHistory(workouts, name) {
  const key = name.toLowerCase()
  const points = []
  for (const workout of workouts) {
    const sets = workout.exercises
      .filter((e) => e.name.toLowerCase() === key)
      .flatMap((e) => e.sets)
    if (sets.length === 0) continue
    points.push({
      date: workout.date,
      oneRm: Math.max(...sets.map((s) => estimateOneRepMax(s.weight, s.reps))),
      maxWeight: Math.max(...sets.map((s) => s.weight)),
      volume: sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
    })
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

function mondayOf(date) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Total volym per vecka (måndag–söndag) för de senaste `weeks` veckorna
export function weeklyVolume(workouts, weeks = 12) {
  const start = mondayOf(today())
  start.setDate(start.getDate() - 7 * (weeks - 1))
  const buckets = []
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + 7 * i)
    buckets.push({ week: isoDate(d), volume: 0, sessions: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.week, i]))
  for (const workout of workouts) {
    const i = index.get(isoDate(mondayOf(workout.date)))
    if (i === undefined) continue
    buckets[i].volume += workoutVolume(workout)
    buckets[i].sessions += 1
  }
  return buckets
}
