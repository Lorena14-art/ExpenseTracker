import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { formatMoney } from '../lib/money'
import Pagination from './Pagination'

const PAGE_SIZE = 5

export default function ExpenseList({ expenses, categories, onLoadSample, onEdit, onDeleted }) {
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [page, setPage] = useState(1)
  const deleteDialog = useRef(null)
  const activeCategory = categories.some((item) => item.name === category) ? category : ''
  const hasActiveFilters = Boolean(
    search.trim() || activeCategory || dateFrom || dateTo || amountMin || amountMax
  )
  const minAmountCents = amountMin === '' ? null : Math.round(Number(amountMin) * 100)
  const maxAmountCents = amountMax === '' ? null : Math.round(Number(amountMax) * 100)
  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = !activeCategory || expense.category === activeCategory
    const matchesSearch = (expense.note ?? '').toLowerCase().includes(search.trim().toLowerCase())
    const matchesDateFrom = !dateFrom || expense.date >= dateFrom
    const matchesDateTo = !dateTo || expense.date <= dateTo
    const matchesAmountMin = minAmountCents === null || expense.amountCents >= minAmountCents
    const matchesAmountMax = maxAmountCents === null || expense.amountCents <= maxAmountCents
    return (
      matchesCategory &&
      matchesSearch &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesAmountMin &&
      matchesAmountMax
    )
  }).sort((first, second) => {
    if (sortOrder === 'oldest') return first.date.localeCompare(second.date)
    if (sortOrder === 'amount-high') return second.amountCents - first.amountCents
    if (sortOrder === 'amount-low') return first.amountCents - second.amountCents
    if (sortOrder === 'category') return first.category.localeCompare(second.category)
    return second.date.localeCompare(first.date)
  })
  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageExpenses = filteredExpenses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

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
      </div>

      {expenses.length > 0 && (
        <div className="mt-3 mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="sr-only" htmlFor="expense-search">Search expense notes</label>
          <input
            id="expense-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search notes"
            className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <label className="sr-only" htmlFor="expense-category-filter">Filter by category</label>
          <select
            id="expense-category-filter"
            value={activeCategory}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
            className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="expense-sort">Sort expenses</label>
          <select
            id="expense-sort"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value)
              setPage(1)
            }}
            className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-high">Amount: high to low</option>
            <option value="amount-low">Amount: low to high</option>
            <option value="category">Category: A to Z</option>
          </select>
          <details className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 sm:col-span-3">
            <summary className="cursor-pointer text-sm font-medium">More filters</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor="expense-date-from" className="mb-1 block text-xs text-[var(--muted)]">
                    From date
                  </label>
                  <input
                    id="expense-date-from"
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(event) => {
                      setDateFrom(event.target.value)
                      setPage(1)
                    }}
                    className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="expense-date-to" className="mb-1 block text-xs text-[var(--muted)]">
                    To date
                  </label>
                  <input
                    id="expense-date-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => {
                      setDateTo(event.target.value)
                      setPage(1)
                    }}
                    className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor="expense-amount-min" className="mb-1 block text-xs text-[var(--muted)]">
                    Minimum amount (PHP)
                  </label>
                  <input
                    id="expense-amount-min"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amountMin}
                    onChange={(event) => {
                      setAmountMin(event.target.value)
                      setPage(1)
                    }}
                    className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-sm"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="expense-amount-max" className="mb-1 block text-xs text-[var(--muted)]">
                    Maximum amount (PHP)
                  </label>
                  <input
                    id="expense-amount-max"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amountMax}
                    onChange={(event) => {
                      setAmountMax(event.target.value)
                      setPage(1)
                    }}
                    className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </details>
          {(hasActiveFilters || sortOrder !== 'newest') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setCategory('')
                setDateFrom('')
                setDateTo('')
                setAmountMin('')
                setAmountMax('')
                setSortOrder('newest')
                setPage(1)
              }}
              className="col-span-2 justify-self-start cursor-pointer text-sm text-[var(--muted)] underline hover:text-[var(--text)] sm:col-span-3"
            >
              Clear filters and sorting
            </button>
          )}
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
        <p className="py-4 text-[var(--muted)]">No expenses match your current filters.</p>
      ) : (
        <ul>
          {pageExpenses.map((e) => (
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
      {filteredExpenses.length > 0 && (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filteredExpenses.length}
          onPageChange={setPage}
        />
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
