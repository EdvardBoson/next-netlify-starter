// Ren affärslogik utan beroenden till React eller webbläsaren.
// Alla funktioner tar ett state-objekt och returnerar ett nytt (eller ett resultat),
// vilket gör dem lätta att testa och att senare flytta till ett backend-API.

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const DAY_MS = 24 * 60 * 60 * 1000

export const sameDay = (a, b) => {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

export const fullName = (m) => (m ? `${m.firstName} ${m.lastName}` : 'Okänd')

export const ageAt = (birthDate, at = new Date()) => {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const d = new Date(at)
  let age = d.getFullYear() - b.getFullYear()
  const beforeBirthday = d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export const formatSEK = (n) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n || 0)

export const nextMemberNumber = (members) =>
  String(members.reduce((max, m) => Math.max(max, Number(m.number) || 0), 1000) + 1)

// ---------- Medlemskap ----------

// Månadsvärde av en plan, för att räkna fram återkommande intäkter (MRR).
export const monthlyValue = (plan) => {
  if (!plan) return 0
  if (plan.period === 'month') return plan.price
  if (plan.period === 'year') return plan.price / 12
  return 0
}

export const mrr = (state) => {
  const plans = new Map(state.plans.map((p) => [p.id, p]))
  return Math.round(
    state.members.filter((m) => m.status === 'active').reduce((sum, m) => sum + monthlyValue(plans.get(m.planId)), 0)
  )
}

// ---------- Bokning ----------

export const activeBookings = (state, classId) =>
  state.bookings.filter((b) => b.classId === classId && b.status !== 'cancelled')

export const bookedCount = (state, classId) =>
  state.bookings.filter((b) => b.classId === classId && b.status === 'booked').length

export const waitlist = (state, classId) =>
  state.bookings
    .filter((b) => b.classId === classId && b.status === 'waitlist')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

export function bookClass(state, classId, memberId, now = new Date()) {
  const cls = state.classes.find((c) => c.id === classId)
  const member = state.members.find((m) => m.id === memberId)
  if (!cls) return { error: 'Passet finns inte.' }
  if (!member) return { error: 'Medlemmen finns inte.' }
  if (member.status !== 'active') return { error: `${fullName(member)} har inget aktivt medlemskap.` }
  if (new Date(cls.start) < now) return { error: 'Passet har redan börjat.' }
  if (activeBookings(state, classId).some((b) => b.memberId === memberId)) {
    return { error: `${fullName(member)} är redan bokad på passet.` }
  }
  const status = bookedCount(state, classId) < cls.capacity ? 'booked' : 'waitlist'
  const booking = { id: uid('bk'), classId, memberId, status, createdAt: now.toISOString() }
  return { state: { ...state, bookings: [...state.bookings, booking] }, booking }
}

// Avbokar och flyttar automatiskt upp först i kön om en plats frigörs.
export function cancelBooking(state, bookingId) {
  const target = state.bookings.find((b) => b.id === bookingId)
  if (!target || target.status === 'cancelled') return { state }
  let bookings = state.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
  let promoted = null
  if (target.status === 'booked') {
    const next = waitlist({ ...state, bookings }, target.classId)[0]
    if (next) {
      promoted = next
      bookings = bookings.map((b) => (b.id === next.id ? { ...b, status: 'booked' } : b))
    }
  }
  return { state: { ...state, bookings }, promoted }
}

// ---------- Incheckning ----------

export function checkIn(state, query, now = new Date()) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return { error: 'Ange medlemsnummer eller e-post.' }
  const member = state.members.find((m) => m.number === q || (m.email || '').toLowerCase() === q)
  if (!member) return { error: `Ingen medlem hittades för "${query}".` }
  if (member.status !== 'active') return { error: `${fullName(member)} har inget aktivt medlemskap (${member.status}).`, member }
  if (state.checkins.some((c) => c.memberId === member.id && sameDay(c.at, now))) {
    return { error: `${fullName(member)} är redan incheckad idag.`, member }
  }
  const warnings = []
  const overdue = state.invoices.filter(
    (i) => i.memberId === member.id && i.status === 'unpaid' && new Date(i.dueDate) < now
  )
  if (overdue.length) warnings.push(`${overdue.length} förfallen faktura – påminn om betalning.`)
  const checkin = { id: uid('ci'), memberId: member.id, at: now.toISOString() }
  return { state: { ...state, checkins: [...state.checkins, checkin] }, member, warnings }
}

// ---------- Fakturering ----------

export const periodKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Skapar månadsfakturor för aktiva medlemmar med månadsplan (och årsfakturor i januari).
// Idempotent: körs den två gånger för samma period skapas inga dubbletter.
export function generateInvoices(state, date = new Date(), dueInDays = 14) {
  const period = periodKey(date)
  const isJanuary = new Date(date).getMonth() === 0
  const plans = new Map(state.plans.map((p) => [p.id, p]))
  const created = []
  for (const m of state.members) {
    if (m.status !== 'active') continue
    const plan = plans.get(m.planId)
    if (!plan || plan.price <= 0) continue
    if (plan.period === 'year' && !isJanuary) continue
    if (plan.period === 'once') continue
    const exists = state.invoices.some((i) => i.memberId === m.id && i.period === period && i.planId === plan.id)
    if (exists) continue
    created.push({
      id: uid('inv'),
      memberId: m.id,
      planId: plan.id,
      period,
      description: `${plan.name} ${period}`,
      amount: plan.price,
      issuedAt: new Date(date).toISOString(),
      dueDate: new Date(new Date(date).getTime() + dueInDays * DAY_MS).toISOString(),
      status: 'unpaid',
    })
  }
  return { state: { ...state, invoices: [...state.invoices, ...created] }, created }
}

// ---------- Lag, närvaro & LOK-stöd ----------

// Standardvärden baserade på RF:s regler för LOK-stöd. Kontrollera alltid mot
// aktuella regler hos Riksidrottsförbundet innan rapportering.
export const LOK_RULES = { minAge: 7, maxAge: 25, minParticipants: 3, maxParticipants: 30, minDurationMin: 60 }

export function lokEvaluation(state, activity, rules = LOK_RULES) {
  const members = new Map(state.members.map((m) => [m.id, m]))
  const eligible = activity.attendeeIds
    .map((id) => members.get(id))
    .filter(Boolean)
    .filter((m) => {
      const age = ageAt(m.birthDate, activity.date)
      return age !== null && age >= rules.minAge && age <= rules.maxAge
    })
  const reasons = []
  if (activity.durationMin < rules.minDurationMin) reasons.push(`kortare än ${rules.minDurationMin} min`)
  if (eligible.length < rules.minParticipants) reasons.push(`färre än ${rules.minParticipants} deltagare ${rules.minAge}–${rules.maxAge} år`)
  return {
    qualifies: reasons.length === 0,
    eligibleCount: Math.min(eligible.length, rules.maxParticipants),
    reasons,
  }
}

export function lokSummary(state, teamId = null, rules = LOK_RULES) {
  const acts = state.activities.filter((a) => !teamId || a.teamId === teamId)
  let sessions = 0
  let participants = 0
  for (const a of acts) {
    const r = lokEvaluation(state, a, rules)
    if (r.qualifies) {
      sessions += 1
      participants += r.eligibleCount
    }
  }
  return { total: acts.length, sessions, participants }
}

// ---------- Statistik ----------

export function dashboardStats(state, now = new Date()) {
  const active = state.members.filter((m) => m.status === 'active').length
  const checkinsToday = state.checkins.filter((c) => sameDay(c.at, now)).length
  const upcoming = state.classes.filter((c) => new Date(c.start) >= now && new Date(c.start) < new Date(now.getTime() + 7 * DAY_MS))
  const capacity = upcoming.reduce((s, c) => s + c.capacity, 0)
  const booked = upcoming.reduce((s, c) => s + bookedCount(state, c.id), 0)
  const unpaid = state.invoices.filter((i) => i.status === 'unpaid')
  const overdue = unpaid.filter((i) => new Date(i.dueDate) < now)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now.getTime() - (13 - i) * DAY_MS)
    return { date: day, count: state.checkins.filter((c) => sameDay(c.at, day)).length }
  })
  return {
    active,
    mrr: mrr(state),
    checkinsToday,
    upcomingClasses: upcoming.length,
    occupancy: capacity ? Math.round((booked / capacity) * 100) : 0,
    unpaidSum: unpaid.reduce((s, i) => s + i.amount, 0),
    overdueCount: overdue.length,
    last14,
  }
}

// ---------- Export ----------

export function toCSV(rows, columns) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Semikolon som avgränsare så att filen öppnas korrekt i svenskt Excel.
  const header = columns.map((c) => esc(c.label)).join(';')
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(';'))
  return [header, ...body].join('\n')
}
