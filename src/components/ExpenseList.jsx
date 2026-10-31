import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { formatMoney } from '../lib/money'

export default function ExpenseList({ expenses, categories, onExport, onLoadSample, onEdit, onDeleted }) {
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const deleteDialog = useRef(null)
  const activeCategory = categories.some((item) => item.name === category) ? category : ''
  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = !activeCategory || expense.category === activeCategory
    const matchesSearch = (expense.note ?? '').toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    if (expenseToDelete && !deleteDialog.current?.open) {
      deleteDialog.current?.showModal()
    }
  }, [expenseToDelete])

  async function confirmDelete() {
    const deletedId = expenseToDelete.id
    await db.expenses.delete(deletedId)
    onDeleted?.(deletedId)
    deleteDialog.current?.close()
  }

  return (
    <section>
      <div className="flex items-center justify-between pt-[22px]">
        <h2 className="mb-2.5 text-base font-semibold">Expenses</h2>
        <button
          type="button"
          onClick={onExport}
          className="shrink-0 cursor-pointer rounded-md border border-[var(--line)] px-2.5 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
        >
          Export CSV
        </button>
      </div>

      {expenses.length > 0 && (
        <div className="mt-3 mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="expense-search">Search expense notes</label>
          <input
            id="expense-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes"
            className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <label className="sr-only" htmlFor="expense-category-filter">Filter by category</label>
          <select
            id="expense-category-filter"
            value={activeCategory}
            onChange={(event) => setCategory(event.target.value)}
            className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="py-4 text-[var(--muted)]">
          No expenses this month. Add one on the left, or{' '}
          <button
            type="button"
            onClick={onLoadSample}
            className="cursor-pointer rounded-md border border-[var(--line)] px-2.5 py-1 text-sm hover:border-[var(--muted)]"
          >
            load sample data
          </button>
        </p>
      ) : filteredExpenses.length === 0 ? (
        <p className="py-4 text-[var(--muted)]">No expenses match your search or category filter.</p>
      ) : (
        <ul>
          {filteredExpenses.map((e) => (
            <li key={e.id} className="flex min-w-0 items-center gap-2 border-b border-[var(--line)] py-[11px] sm:gap-3">
              <span
                className="size-[9px] shrink-0 rounded-full"
                style={{ background: categories.find((item) => item.name === e.category)?.color ?? '#6b7280' }}
              />
              <button
                type="button"
                onClick={() => onEdit?.(e)}
                aria-label={`Edit ${e.category} expense`}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <span>{e.category}</span>
                <small className="block truncate text-[var(--muted)]">
                  {e.date}{e.note && ` · ${e.note}`}
                </small>
              </button>
              <span className="shrink-0 text-sm font-medium tabular-nums sm:text-base">{formatMoney(e.amountCents)}</span>
              <button
                type="button"
                onClick={() => onEdit?.(e)}
                aria-label={`Edit ${e.category} expense`}
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--accent)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="m16 5 3 3" />
                  <path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setExpenseToDelete(e)}
                aria-label={`Delete ${e.category} expense`}
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--danger)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="m19 6-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {expenseToDelete && (
        <dialog
          ref={deleteDialog}
          aria-labelledby="delete-dialog-title"
          onClose={() => setExpenseToDelete(null)}
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-[var(--text)] shadow-xl backdrop:bg-black/50"
        >
          <h2 id="delete-dialog-title" className="text-lg font-semibold">
            Delete this expense?
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This will permanently delete the {expenseToDelete.category} expense
            from {expenseToDelete.date}.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => deleteDialog.current?.close()}
              className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="cursor-pointer rounded-md bg-[var(--danger)] px-3 py-2 text-sm text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </dialog>
      )}
    </section>
  )
}
