// Exempeldata så att plattformen går att demonstrera direkt.
// Datum skapas relativt "nu" så att schema och statistik alltid ser aktuella ut.
import { DAY_MS, generateInvoices } from './logic.mjs'

const FIRST = ['Alva', 'Elias', 'Maja', 'Liam', 'Ella', 'Noah', 'Wilma', 'Hugo', 'Saga', 'Oscar', 'Alice', 'William', 'Vera', 'Lucas', 'Elsa', 'Adam', 'Astrid', 'Leo', 'Freja', 'Isak', 'Nora', 'Viktor', 'Ebba', 'Anton']
const LAST = ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson']

export function createSeed(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const at = (dayOffset, hour, minute = 0) => {
    const d = new Date(today.getTime() + dayOffset * DAY_MS)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  const plans = [
    { id: 'plan_gym', name: 'Gymkort månad', price: 449, period: 'month' },
    { id: 'plan_student', name: 'Student månad', price: 299, period: 'month' },
    { id: 'plan_year', name: 'Årskort', price: 4490, period: 'year' },
    { id: 'plan_forening', name: 'Föreningsavgift', price: 350, period: 'year' },
    { id: 'plan_klipp', name: '10-kort', price: 900, period: 'once' },
  ]

  const teams = [
    { id: 'team_f14', name: 'F14 Fotboll', sport: 'Fotboll', leader: 'Karin Holm', ageGroup: 'Flickor 2012' },
    { id: 'team_p12', name: 'P12 Innebandy', sport: 'Innebandy', leader: 'Johan Berg', ageGroup: 'Pojkar 2014' },
    { id: 'team_sen', name: 'Senior Löpgrupp', sport: 'Löpning', leader: 'Sara Lind', ageGroup: 'Vuxna' },
  ]

  const planCycle = ['plan_gym', 'plan_gym', 'plan_student', 'plan_year', 'plan_forening', 'plan_klipp']
  const members = Array.from({ length: 24 }, (_, i) => {
    const first = FIRST[i]
    const last = LAST[i % LAST.length]
    // Blanda åldrar: yngre medlemmar i ungdomslagen, vuxna på gymmet.
    const youth = i % 3 !== 0
    const birthYear = youth ? today.getFullYear() - (10 + (i % 8)) : today.getFullYear() - (26 + (i % 30))
    const teamIds = youth ? [i % 2 ? 'team_p12' : 'team_f14'] : i % 4 === 0 ? ['team_sen'] : []
    return {
      id: `mem_${i + 1}`,
      number: String(1001 + i),
      firstName: first,
      lastName: last,
      email: `${first}.${last}`.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o') + '@example.se',
      phone: `070-${String(1000000 + i * 7919).slice(-7)}`,
      birthDate: `${birthYear}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      planId: youth ? 'plan_forening' : planCycle[i % planCycle.length],
      status: i === 5 ? 'paused' : i === 17 ? 'cancelled' : 'active',
      joinedAt: new Date(today.getTime() - (30 + i * 23) * DAY_MS).toISOString(),
      teamIds,
      notes: '',
    }
  })

  const templates = [
    { title: 'Spinning', instructor: 'Emma', hour: 7, duration: 45, capacity: 20, location: 'Cykelsalen' },
    { title: 'Styrka & kondition', instructor: 'Ali', hour: 12, duration: 60, capacity: 16, location: 'Sal 1' },
    { title: 'Yoga', instructor: 'Linnea', hour: 17, duration: 60, capacity: 18, location: 'Sal 2' },
    { title: 'Crossfit', instructor: 'Marcus', hour: 18, minute: 30, duration: 60, capacity: 12, location: 'Box' },
  ]
  const classes = []
  for (let d = -3; d <= 7; d++) {
    templates.forEach((t, ti) => {
      if ((d + ti) % 3 === 2) return // inte alla pass varje dag
      classes.push({
        id: `cls_${d + 3}_${ti}`,
        title: t.title,
        instructor: t.instructor,
        start: at(d, t.hour, t.minute || 0),
        durationMin: t.duration,
        capacity: t.capacity,
        location: t.location,
      })
    })
  }

  const active = members.filter((m) => m.status === 'active')
  const bookings = []
  classes.forEach((c, ci) => {
    const n = Math.min(c.capacity, 4 + ((ci * 5) % (c.capacity + 3)))
    for (let k = 0; k < n; k++) {
      const m = active[(ci * 3 + k) % active.length]
      if (bookings.some((b) => b.classId === c.id && b.memberId === m.id)) continue
      bookings.push({ id: `bk_${ci}_${k}`, classId: c.id, memberId: m.id, status: 'booked', createdAt: at(-4, 8) })
    }
  })

  const checkins = []
  for (let d = -13; d <= 0; d++) {
    const count = d === 0 ? 6 : 5 + ((d * 7 + 20) % 9)
    for (let k = 0; k < count; k++) {
      const m = active[(k * 5 + d * 3 + 40) % active.length]
      if (checkins.some((c) => c.memberId === m.id && c.at.slice(0, 10) === at(d, 0).slice(0, 10))) continue
      checkins.push({ id: `ci_${d + 13}_${k}`, memberId: m.id, at: at(d, 6 + ((k * 3) % 14), (k * 17) % 60) })
    }
  }

  const activities = []
  teams.forEach((team, ti) => {
    const roster = members.filter((m) => m.teamIds.includes(team.id))
    for (let w = 0; w < 4; w++) {
      const date = at(-(w * 7 + ti + 1), 18)
      const attendees = roster.filter((_, ri) => (ri + w) % 4 !== 0).map((m) => m.id)
      activities.push({
        id: `act_${team.id}_${w}`,
        teamId: team.id,
        date,
        type: w === 1 ? 'Match' : 'Träning',
        durationMin: w === 3 ? 45 : 90,
        attendeeIds: attendees,
      })
    }
  })

  let state = {
    version: 1,
    org: { name: 'Arena Sport & Gym', type: 'kombinerad', orgNumber: '802400-0000', city: 'Göteborg' },
    plans,
    members,
    classes,
    bookings,
    checkins,
    teams,
    activities,
    invoices: [],
  }

  // Förra månadens fakturor (en del betalda) samt innevarande månads.
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  state = generateInvoices(state, lastMonth).state
  state.invoices = state.invoices.map((inv, i) => (i % 5 === 0 ? inv : { ...inv, status: 'paid', paidAt: inv.dueDate }))
  state = generateInvoices(state, new Date(today.getFullYear(), today.getMonth(), 1)).state

  return state
}
