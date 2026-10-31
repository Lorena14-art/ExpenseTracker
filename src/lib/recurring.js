import { db } from './db'
import { daysInMonth, pad } from './dates'

export function recurringExpenseForMonth(rule, month) {
  const day = Math.min(rule.dayOfMonth, daysInMonth(month))
  return {
    amountCents: rule.amountCents,
    category: rule.category,
    note: rule.note,
    date: `${month}-${pad(day)}`,
  }
}

export async function addRecurringExpensesForMonth(month) {
  return db.transaction(
    'rw',
    db.expenses,
    db.recurringExpenses,
    db.recurringOccurrences,
    async () => {
      const rules = await db.recurringExpenses.toArray()
      let addedCount = 0

      for (const rule of rules) {
        if (rule.startMonth && month < rule.startMonth) continue

        const occurrenceKey = [rule.id, month]
        const exists = await db.recurringOccurrences.get(occurrenceKey)
        if (exists) continue

        const expenseId = await db.expenses.add({
          ...recurringExpenseForMonth(rule, month),
          recurringId: rule.id,
          recurringMonth: month,
        })
        await db.recurringOccurrences.add({
          recurringId: rule.id,
          month,
          expenseId,
        })
        addedCount += 1
      }

      return addedCount
    }
  )
}
