import { describe, it, expect } from 'vitest'
import { totalCents, totalsByCategory, totalsByDay, percent } from './calculations'

const sample = [
  { amountCents: 1000, category: 'Food', date: '2026-10-01' },
  { amountCents: 2500, category: 'Food', date: '2026-10-02' },
  { amountCents: 500, category: 'Bills', date: '2026-10-02' },
]

describe('calculations', () => {
  it('sums all expenses', () => expect(totalCents(sample)).toBe(4000))
  it('handles empty list', () => expect(totalCents([])).toBe(0))
  it('groups by category', () =>
    expect(totalsByCategory(sample)).toEqual({ Food: 3500, Bills: 500 }))
  it('fills every day of the month', () => {
    const days = totalsByDay(sample, '2026-10')
    expect(days).toHaveLength(31)
    expect(days[1].cents).toBe(3000)
    expect(days[4].cents).toBe(0)
  })
  it('ignores expenses from a prior month while the selected month changes', () => {
    const days = totalsByDay(sample, '2026-02')
    expect(days).toHaveLength(28)
    expect(days.every((day) => day.cents === 0)).toBe(true)
  })
  it('percent avoids divide by zero', () => expect(percent(5, 0)).toBe(0))
})
