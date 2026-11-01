import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { formatMoney, toCents } from '../lib/money'

export default function RecurringExpenses({
  month,
  categories,
  recurringExpenses,
  syncError,
  openRequest = 0,
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    if (openRequest > 0 && !dialog.current?.open) {
      dialog.current?.showModal()
    }
  }, [openRequest])

  async function addRecurringExpense(event) {
    event.preventDefault()
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }

    const selectedCategory = categories.some((item) => item.name === category)
      ? category
      : categories[0]?.name
    const day = Number(dayOfMonth)
    if (!selectedCategory || !Number.isInteger(day) || day < 1 || day > 31) {
      setError('Choose a category and a day from 1 to 31.')
      return
    }

    try {
      await db.recurringExpenses.add({
        amountCents: toCents(amount),
        category: selectedCategory,
        dayOfMonth: day,
        note: note.trim(),
        startMonth: month,
      })
      setAmount('')
      setDayOfMonth('1')
      setNote('')
      setError('')
    } catch {
      setError('Could not save this recurring expense. Please try again.')
    }
  }

  async function removeRecurringExpense(id) {
    try {
      await db.recurringExpenses.delete(id)
      setError('')
    } catch {
      setError('Could not remove this recurring expense. Please try again.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls="recurring-expenses-dialog"
        className="hidden shrink-0 cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold hover:border-[var(--muted)] sm:inline-flex"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="size-4"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Recurring expenses
      </button>
      <dialog
        ref={dialog}
        id="recurring-expenses-dialog"
        aria-labelledby="recurring-expenses-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--text)] shadow-xl backdrop:bg-black/50"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <h2 id="recurring-expenses-title" className="text-base font-semibold">
            Recurring expenses
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close recurring expenses"
            className="cursor-pointer rounded-md px-2 py-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>
        <div className="grid gap-3 p-4">
        <p className="text-xs text-[var(--muted)]">
          Automatically add these to each month. Days beyond the end of a month use its last day.
          Removing a rule won’t delete expenses already added.
        </p>
        {syncError && <p role="alert" className="text-sm text-[var(--danger)]">{syncError}</p>}

        {recurringExpenses.length > 0 && (
          <ul className="grid gap-2">
            {recurringExpenses.map((expense) => (
              <li key={expense.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {expense.category} · {formatMoney(expense.amountCents)}
                  <small className="block text-[var(--muted)]">
                    Day {expense.dayOfMonth}{expense.note ? ` · ${expense.note}` : ''}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => removeRecurringExpense(expense.id)}
                  aria-label={`Remove recurring ${expense.category} expense`}
                  className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addRecurringExpense} className="grid gap-2 border-t border-[var(--line)] pt-3">
          <label htmlFor="recurring-amount" className="text-xs text-[var(--muted)]">Amount (PHP)</label>
          <input
            id="recurring-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-sm"
          />
          <label htmlFor="recurring-category" className="text-xs text-[var(--muted)]">Category</label>
          <select
            id="recurring-category"
            value={categories.some((item) => item.name === category) ? category : categories[0]?.name ?? ''}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-sm"
          >
            {categories.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
          <label htmlFor="recurring-day" className="text-xs text-[var(--muted)]">Day of month</label>
          <input
            id="recurring-day"
            type="number"
            min="1"
            max="31"
            step="1"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-sm"
          />
          <label htmlFor="recurring-note" className="text-xs text-[var(--muted)]">Note (optional)</label>
          <input
            id="recurring-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={100}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--onaccent)] hover:bg-[var(--accent-h)]"
          >
            Add recurring expense
          </button>
        </form>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
      </dialog>
    </>
  )
}
