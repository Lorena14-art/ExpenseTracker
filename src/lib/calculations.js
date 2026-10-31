import { daysInMonth } from './dates'

export const totalCents = (expenses) =>
  expenses.reduce((sum, e) => sum + e.amountCents, 0)

export function totalsByCategory(expenses) {
  const map = {}
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + e.amountCents
  }
  return map
}

// Every day of the month, including days with 0 spending
export function totalsByDay(expenses, month) {
  const totals = Array.from({ length: daysInMonth(month) }, (_, i) => ({
    day: i + 1,
    cents: 0,
  }))
  for (const e of expenses) {
    if (!e.date.startsWith(month)) continue
    const dayIndex = Number(e.date.slice(8, 10)) - 1
    if (totals[dayIndex]) totals[dayIndex].cents += e.amountCents
  }
  return totals
}

export const percent = (part, whole) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100)
