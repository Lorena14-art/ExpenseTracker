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

export function filterExpensesByDateRange(expenses, startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return []
  return expenses.filter((expense) => expense.date >= startDate && expense.date <= endDate)
}

export function previousDateRange(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return null

  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  const durationDays = (end.getTime() - start.getTime()) / 86400000 + 1
  const previousEnd = new Date(start.getTime() - 86400000)
  const previousStart = new Date(previousEnd.getTime() - (durationDays - 1) * 86400000)
  const toDateString = (date) => date.toISOString().slice(0, 10)

  return {
    startDate: toDateString(previousStart),
    endDate: toDateString(previousEnd),
  }
}
