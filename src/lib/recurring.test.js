import { describe, expect, it } from 'vitest'
import { recurringExpenseForMonth } from './recurring'

describe('recurringExpenseForMonth', () => {
  const rule = {
    amountCents: 150000,
    category: 'Bills',
    dayOfMonth: 31,
    note: 'Internet',
  }

  it('creates the monthly expense on the requested day', () => {
    expect(recurringExpenseForMonth(rule, '2026-10')).toEqual({
      amountCents: 150000,
      category: 'Bills',
      note: 'Internet',
      date: '2026-10-31',
    })
  })

  it('uses the last day when the requested day is beyond the month', () => {
    expect(recurringExpenseForMonth(rule, '2026-02').date).toBe('2026-02-28')
    expect(recurringExpenseForMonth(rule, '2024-02').date).toBe('2024-02-29')
  })
})
