import { useState } from 'react'
import { db } from '../lib/db'
import { formatMoney, toCents } from '../lib/money'

export default function MonthlyBudget({ month, total, budget }) {
  const [amount, setAmount] = useState(() =>
    budget?.limitCents > 0 ? (budget.limitCents / 100).toFixed(2) : ''
  )
  const [error, setError] = useState('')
  const limitCents = budget?.limitCents ?? 0
  const overBudget = limitCents > 0 && total > limitCents
  const progress = limitCents > 0 ? Math.min((total / limitCents) * 100, 100) : 0

  async function saveBudget(event) {
    event.preventDefault()
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('Enter a budget greater than 0, like 20000 or 20000.00.')
      return
    }

    try {
      await db.budgets.put({ month, limitCents: toCents(amount) })
      setError('')
    } catch {
      setError('Could not save your budget. Please try again.')
    }
  }

  async function removeBudget() {
    try {
      await db.budgets.delete(month)
      setError('')
    } catch {
      setError('Could not remove your budget. Please try again.')
    }
  }

  return (
    <div className="mt-5 max-w-lg">
      {limitCents > 0 ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className={overBudget ? 'font-medium text-[var(--danger)]' : 'text-[var(--muted)]'}>
              {formatMoney(total)} of {formatMoney(limitCents)} spent
            </span>
            {overBudget && (
              <span className="font-medium text-[var(--danger)]">
                {formatMoney(total - limitCents)} over budget
              </span>
            )}
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-label="Monthly budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${formatMoney(total)} spent of ${formatMoney(limitCents)} budget`}
          >
            <div
              className={`h-full rounded-full transition-[width] ${overBudget ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Set a monthly budget to track your spending.</p>
      )}

      <form onSubmit={saveBudget} className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="monthly-budget" className="sr-only">Monthly budget in PHP</label>
        <div className="flex min-w-0 flex-1 items-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]">
          <span className="text-sm text-[var(--muted)]">₱</span>
          <input
            id="monthly-budget"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setError('')
            }}
            placeholder="Set monthly limit"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)]"
        >
          {limitCents > 0 ? 'Update budget' : 'Set budget'}
        </button>
        {limitCents > 0 && (
          <button
            type="button"
            onClick={removeBudget}
            className="cursor-pointer rounded-md px-2 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Remove
          </button>
        )}
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  )
}
