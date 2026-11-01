import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { totalCents, totalsByCategory, totalsByDay } from './lib/calculations'
import { formatMoney } from './lib/money'
import { currentMonth, daysInMonth, pad, previousMonth } from './lib/dates'
import { addRecurringExpensesForMonth } from './lib/recurring'
import ExpenseForm from './components/ExpenseForm'
import MonthlyBudget from './components/MonthlyBudget'
import ExpenseList from './components/ExpenseList'
import CategoryManager from './components/CategoryManager'
import RecurringExpenses from './components/RecurringExpenses'
import InstallAppButton from './components/InstallAppButton'
import PinGate from './components/PinGate'
import CategoryChart from './components/CategoryChart'
import TrendChart from './components/TrendChart'
import Analytics from './components/Analytics'

const SAMPLE = [
  ['Food', 35000, 'Groceries'],
  ['Transport', 8000, 'Jeepney and tricycle'],
  ['Bills', 150000, 'Electricity'],
  ['Food', 12000, 'Lunch with team'],
  ['Shopping', 89900, 'Shoes'],
  ['Health', 25000, 'Vitamins'],
  ['Food', 4500, 'Coffee'],
  ['Transport', 20000, 'Grab ride'],
  ['Bills', 79900, 'Internet'],
  ['Other', 10000, 'Gift'],
]

export default function App() {
  return (
    <PinGate>
      {(pinControls) => <ExpenseTracker {...pinControls} />}
    </PinGate>
  )
}

function ExpenseTracker({ pinEnabled, onLock, onOpenPinSettings }) {
  const [month, setMonth] = useState(currentMonth())
  const [view, setView] = useState('dashboard')
  const [editingExpense, setEditingExpense] = useState(null)
  const [recurringSyncError, setRecurringSyncError] = useState('')
  const [categoryManagerRequest, setCategoryManagerRequest] = useState(0)
  const [recurringExpensesRequest, setRecurringExpensesRequest] = useState(0)

  const expenses =
    useLiveQuery(
      () => db.expenses.where('date').startsWith(month).reverse().sortBy('date'),
      [month]
    ) ?? []
  const comparisonMonth = previousMonth(month)
  const previousExpenses = useLiveQuery(
    () => db.expenses.where('date').startsWith(comparisonMonth).toArray(),
    [comparisonMonth]
  )
  const budget = useLiveQuery(() => db.budgets.get(month), [month])
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) ?? []
  const recurringExpenses = useLiveQuery(() => db.recurringExpenses.toArray(), [])

  useEffect(() => {
    if (!recurringExpenses) return undefined

    let active = true
    async function syncRecurringExpenses() {
      try {
        await addRecurringExpensesForMonth(month)
        if (active) setRecurringSyncError('')
      } catch (error) {
        console.error('Could not add this month’s recurring expenses.', error)
        if (active) {
          setRecurringSyncError('Could not add recurring expenses for this month. Please try again.')
        }
      }
    }

    syncRecurringExpenses()
    return () => {
      active = false
    }
  }, [month, recurringExpenses])

  const total = totalCents(expenses)
  const previousTotal = previousExpenses ? totalCents(previousExpenses) : null
  const comparisonMonthName = new Date(`${comparisonMonth}-01T00:00:00`).toLocaleDateString(
    'en-US',
    { month: 'long' }
  )
  const byCategory = totalsByCategory(expenses)
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0]
  const dim = daysInMonth(month)

  function loadSample() {
    db.expenses.bulkAdd(
      SAMPLE.map(([category, amountCents, note], i) => ({
        category,
        amountCents,
        note,
        date: `${month}-${pad(Math.min(dim, 1 + i * 3))}`,
      }))
    )
  }

  function handleCategoryRenamed(previousName, nextName) {
    setEditingExpense((current) =>
      current?.category === previousName ? { ...current, category: nextName } : current
    )
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 pt-5 pb-10 sm:px-[18px] sm:pt-7 sm:pb-14">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          aria-label="Go to dashboard"
          className="cursor-pointer rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        >
          <img
            src="/expense-tracker-logo.png"
            alt="Expense Tracker"
            className="h-12 w-auto max-w-[70vw] object-contain sm:h-16 sm:max-w-none"
          />
        </button>
        <AppActionsMenu
          pinEnabled={pinEnabled}
          onLock={onLock}
          onOpenPinSettings={onOpenPinSettings}
          view={view}
          onNavigate={setView}
          onOpenCategories={() => setCategoryManagerRequest((request) => request + 1)}
          onOpenRecurring={() => setRecurringExpensesRequest((request) => request + 1)}
        />
      </header>

      {view === 'analytics' ? (
        <Analytics categories={categories} />
      ) : (
      <>
      <div className="mb-4 grid w-full min-w-0 gap-2 pt-5 sm:flex sm:items-center sm:justify-between sm:pt-7">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          aria-label="Month"
          className="box-border w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 sm:w-auto"
        />
        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <CategoryManager
            categories={categories}
            onRenamed={handleCategoryRenamed}
            openRequest={categoryManagerRequest}
          />
          <RecurringExpenses
            month={month}
            categories={categories}
            recurringExpenses={recurringExpenses ?? []}
            syncError={recurringSyncError}
            openRequest={recurringExpensesRequest}
          />
        </div>
      </div>

      <section className="grid min-w-0 items-end gap-6 border-b border-[var(--line)] pt-7 pb-5 sm:gap-7 sm:pt-[34px] sm:pb-[26px] md:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted)]">Spent this month</p>
          <p className="font-display text-[clamp(44px,9vw,92px)] leading-none tracking-tight tabular-nums">
            {formatMoney(total)}
          </p>
          {previousTotal !== null && (
            <p
              className={`mt-1 text-sm ${
                previousTotal === 0 || total === previousTotal
                  ? 'text-[var(--muted)]'
                  : total > previousTotal
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--accent)]'
              }`}
            >
              {previousTotal > 0 ? (
                <>
                  {total > previousTotal ? '↑' : total < previousTotal ? '↓' : '→'}{' '}
                  {Math.round((Math.abs(total - previousTotal) / previousTotal) * 100)}%
                  {' vs '}{comparisonMonthName}
                </>
              ) : (
                `No spending to compare vs ${comparisonMonthName}`
              )}
            </p>
          )}
          <MonthlyBudget
            key={`${month}-${budget?.limitCents ?? 'unset'}`}
            month={month}
            total={total}
            budget={budget}
          />
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3.5">
          <Stat label="Per day" value={total ? formatMoney(Math.round(total / dim)) : '–'} />
          <Stat label="Entries" value={expenses.length} />
          <Stat label="Top category" value={topCategory ?? '–'} />
        </div>
      </section>

      <div className="grid min-w-0 gap-7 pt-6 sm:gap-[34px] sm:pt-7 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="grid content-start gap-4 md:sticky md:top-3">
          <ExpenseForm
            categories={categories}
            onAdded={setMonth}
            editingExpense={editingExpense}
            onEditingComplete={() => setEditingExpense(null)}
          />
        </div>

        <div>
          <div className="grid min-w-0 gap-6 border-b border-[var(--line)] pb-6 sm:gap-[26px] sm:pb-[26px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <CategoryChart totals={byCategory} categories={categories} />
            <TrendChart days={totalsByDay(expenses, month)} />
          </div>
          <ExpenseList
            expenses={expenses}
            categories={categories}
            onLoadSample={loadSample}
            onEdit={setEditingExpense}
            onDeleted={(id) => {
              if (editingExpense?.id === id) setEditingExpense(null)
            }}
          />
        </div>
      </div>
      </>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-[var(--muted)] sm:text-sm">{label}</span>
      <b className="block break-words text-[clamp(14px,4vw,19px)] font-medium tabular-nums sm:text-[19px]">{value}</b>
    </div>
  )
}

function AppActionsMenu({
  pinEnabled,
  onLock,
  onOpenPinSettings,
  view,
  onNavigate,
  onOpenCategories,
  onOpenRecurring,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function choose(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        aria-label="Open app actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="app-actions-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--muted)]"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
          <path d="M20 7H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M20 12H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <path d="M20 17H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id="app-actions-menu"
        ref={menuRef}
        role="menu"
        aria-label="App actions"
        hidden={!open}
        className="absolute right-0 z-10 mt-2 grid min-w-40 gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-lg"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => choose(() => onNavigate('dashboard'))}
          aria-current={view === 'dashboard' ? 'page' : undefined}
          className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
        >
          Dashboard
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => choose(() => onNavigate('analytics'))}
          aria-current={view === 'analytics' ? 'page' : undefined}
          className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
        >
          Analytics
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => choose(onOpenCategories)}
          className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)] sm:hidden"
        >
          Manage categories
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => choose(onOpenRecurring)}
          className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)] sm:hidden"
        >
          Recurring expenses
        </button>
        <InstallAppButton onInstallComplete={() => setOpen(false)} />
        <button
          type="button"
          role="menuitem"
          onClick={() => choose(onOpenPinSettings)}
          className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
        >
          {pinEnabled ? 'Change PIN' : 'Set PIN'}
        </button>
        {pinEnabled && (
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onLock)}
            className="cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--bg)]"
          >
            Lock now
          </button>
        )}
      </div>
    </div>
  )
}
