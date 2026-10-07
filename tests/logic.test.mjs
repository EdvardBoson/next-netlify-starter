import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeed } from '../lib/seed.mjs'
import {
  bookClass,
  bookedCount,
  cancelBooking,
  checkIn,
  dashboardStats,
  generateInvoices,
  lokEvaluation,
  toCSV,
} from '../lib/logic.mjs'

const NOW = new Date('2026-10-07T10:00:00')

const member = (id, overrides = {}) => ({
  id,
  number: id.replace('m', '10'),
  firstName: 'Test',
  lastName: id,
  email: `${id}@example.se`,
  birthDate: '2014-01-01',
  planId: 'p1',
  status: 'active',
  teamIds: [],
  ...overrides,
})

const base = () => ({
  plans: [
    { id: 'p1', name: 'Månad', price: 400, period: 'month' },
    { id: 'p2', name: 'År', price: 3600, period: 'year' },
  ],
  members: [member('m1'), member('m2'), member('m3'), member('m4', { status: 'paused' })],
  classes: [{ id: 'c1', title: 'Yoga', start: '2026-10-08T18:00:00', durationMin: 60, capacity: 2 }],
  bookings: [],
  checkins: [],
  teams: [],
  activities: [],
  invoices: [],
})

test('bokning fyller platser och lägger sedan på kö', () => {
  let s = base()
  s = bookClass(s, 'c1', 'm1', NOW).state
  s = bookClass(s, 'c1', 'm2', NOW).state
  const r = bookClass(s, 'c1', 'm3', NOW)
  assert.equal(r.booking.status, 'waitlist')
  assert.equal(bookedCount(r.state, 'c1'), 2)
})

test('bokning nekas för dubbletter, inaktiva medlemmar och passerade pass', () => {
  let s = bookClass(base(), 'c1', 'm1', NOW).state
  assert.match(bookClass(s, 'c1', 'm1', NOW).error, /redan bokad/)
  assert.match(bookClass(s, 'c1', 'm4', NOW).error, /aktivt medlemskap/)
  assert.match(bookClass(s, 'c1', 'm2', new Date('2026-10-09')).error, /redan börjat/)
})

test('avbokning flyttar upp första personen i kön', () => {
  let s = base()
  s = bookClass(s, 'c1', 'm1', NOW).state
  s = bookClass(s, 'c1', 'm2', NOW).state
  s = bookClass(s, 'c1', 'm3', new Date(NOW.getTime() + 1000)).state
  const first = s.bookings.find((b) => b.memberId === 'm1')
  const r = cancelBooking(s, first.id)
  assert.equal(r.promoted.memberId, 'm3')
  assert.equal(r.state.bookings.find((b) => b.memberId === 'm3').status, 'booked')
  assert.equal(bookedCount(r.state, 'c1'), 2)
})

test('incheckning: medlemsnummer, dubbelincheckning och förfallen faktura', () => {
  const s = base()
  s.invoices.push({ id: 'i1', memberId: 'm1', status: 'unpaid', dueDate: '2026-09-01', amount: 400 })
  const r = checkIn(s, '101', NOW)
  assert.equal(r.member.id, 'm1')
  assert.equal(r.warnings.length, 1)
  assert.match(checkIn(r.state, 'm1@example.se', NOW).error, /redan incheckad/)
  assert.match(checkIn(s, '104', NOW).error, /aktivt medlemskap/)
  assert.match(checkIn(s, '999', NOW).error, /Ingen medlem/)
})

test('fakturering är idempotent och hoppar över årsplaner utanför januari', () => {
  const s = base()
  s.members[2].planId = 'p2'
  const r1 = generateInvoices(s, NOW)
  assert.equal(r1.created.length, 2) // m1, m2 (m3 årsplan, m4 pausad)
  const r2 = generateInvoices(r1.state, NOW)
  assert.equal(r2.created.length, 0)
  const jan = generateInvoices(s, new Date('2027-01-01T10:00:00'))
  assert.equal(jan.created.length, 3)
})

test('LOK-bedömning kräver ålder, antal och längd', () => {
  const s = base()
  s.members.push(member('m5', { birthDate: '1980-01-01' }))
  const act = { date: '2026-10-01T18:00:00', durationMin: 90, attendeeIds: ['m1', 'm2', 'm3', 'm5'] }
  const ok = lokEvaluation(s, act)
  assert.equal(ok.qualifies, true)
  assert.equal(ok.eligibleCount, 3) // vuxen räknas inte
  assert.equal(lokEvaluation(s, { ...act, durationMin: 45 }).qualifies, false)
  assert.equal(lokEvaluation(s, { ...act, attendeeIds: ['m1', 'm5'] }).qualifies, false)
})

test('CSV använder semikolon och escapar specialtecken', () => {
  const csv = toCSV([{ a: 'x;y', b: 'säg "hej"' }], [
    { label: 'A', value: (r) => r.a },
    { label: 'B', value: (r) => r.b },
  ])
  assert.equal(csv, 'A;B\n"x;y";"säg ""hej"""')
})

test('exempeldata är konsekvent och ger rimlig statistik', () => {
  const s = createSeed(NOW)
  const ids = new Set(s.members.map((m) => m.id))
  assert.ok(s.bookings.every((b) => ids.has(b.memberId)))
  assert.ok(s.checkins.every((c) => ids.has(c.memberId)))
  for (const c of s.classes) assert.ok(bookedCount(s, c.id) <= c.capacity)
  const stats = dashboardStats(s, NOW)
  assert.ok(stats.active > 0 && stats.mrr > 0 && stats.checkinsToday > 0)
})
