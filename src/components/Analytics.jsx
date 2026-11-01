import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { totalCents, totalsByCategory } from '../lib/calculations'
import { daysInMonth, today } from '../lib/dates'
import { formatMoney } from '../lib/money'
import CategoryChart from './CategoryChart'
import TrendChart from './TrendChart'
import Pagination from './Pagination'

const periods = ['week', 'month', 'year', 'custom']
const EMPTY_EXPENSES = []
const TRANSACTION_PAGE_SIZE = 10

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function periodRange(period, date) {
  const start = new Date(`${date}T00:00:00`)
  let end

  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    end = new Date(start)
    end.setDate(end.getDate() + 6)
  } else if (period === 'month') {
    start.setDate(1)
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  } else {
    start.setMonth(0, 1)
    end = new Date(start.getFullYear(), 11, 31)
  }

  return { start, end, startKey: dateKey(start), endKey: dateKey(end) }
}

function dateRange(startKey, endKey) {
  const start = new Date(`${startKey}T00:00:00`)
  const end = new Date(`${endKey}T00:00:00`)
  return { start, end, startKey, endKey }
}

function shiftPeriodDate(period, date, direction) {
  const shifted = new Date(`${date}T00:00:00`)
  if (period === 'week') {
    shifted.setDate(shifted.getDate() + direction * 7)
  } else if (period === 'month') {
    shifted.setDate(1)
    shifted.setMonth(shifted.getMonth() + direction)
  } else {
    shifted.setMonth(0, 1)
    shifted.setFullYear(shifted.getFullYear() + direction)
  }
  return dateKey(shifted)
}

function periodLabel(period, start, end) {
  if (period === 'year') return String(start.getFullYear())
  if (period === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(start.getFullYear() !== end.getFullYear() ? { year: 'numeric' } : {}),
  })
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

function chartDataForPeriod(expenses, period, start, end = start) {
  const sums = new Map()
  for (const expense of expenses) {
    const key = period === 'year' ? expense.date.slice(0, 7) : expense.date
    sums.set(key, (sums.get(key) ?? 0) + expense.amountCents)
  }

  if (period === 'year') {
    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(start.getFullYear(), index, 1)
      const key = dateKey(month).slice(0, 7)
      return {
        label: month.toLocaleDateString('en-US', { month: 'short' }),
        cents: sums.get(key) ?? 0,
      }
    })
  }

  const days = period === 'week'
    ? 7
    : period === 'custom'
      ? (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
          Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1
      : daysInMonth(dateKey(start).slice(0, 7))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = dateKey(date)
    return {
      label: period === 'week'
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : period === 'custom'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : String(date.getDate()),
      cents: sums.get(key) ?? 0,
    }
  })
}

function Stat({ label, value, description }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
      <span className="text-xs text-[var(--muted)] sm:text-sm">{label}</span>
      <b className="mt-1 block break-words text-lg font-semibold tabular-nums sm:text-xl">{value}</b>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
    </div>
  )
}

export default function Analytics({ categories }) {
  const [period, setPeriod] = useState('month')
  const [transactionPage, setTransactionPage] = useState({ range: '', page: 1 })
  const [exportError, setExportError] = useState('')
  const [pdfExportError, setPdfExportError] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [customStart, setCustomStart] = useState(() => `${today().slice(0, 7)}-01`)
  const [customEnd, setCustomEnd] = useState(today)
  const range = period === 'custom'
    ? dateRange(customStart, customEnd)
    : periodRange(period, selectedDate)
  const { start, end, startKey, endKey } = range
  const rangeLength = (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1
  const previousRange = period === 'custom'
    ? dateRange(
        dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() - rangeLength)),
        dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1))
      )
    : periodRange(period, shiftPeriodDate(period, selectedDate, -1))
  const validRange = Boolean(startKey && endKey && startKey <= endKey)
  const expenses = useLiveQuery(
    () => validRange
      ? db.expenses
          .where('date')
          .between(previousRange.startKey, endKey, true, true)
          .toArray()
      : Promise.resolve(EMPTY_EXPENSES),
    [previousRange.startKey, endKey, validRange]
  ) ?? EMPTY_EXPENSES
  const periodExpenses = useMemo(
    () => validRange
      ? expenses.filter((expense) => expense.date >= startKey && expense.date <= endKey)
      : [],
    [expenses, startKey, endKey, validRange]
  )
  const previousExpenses = useMemo(
    () => validRange
      ? expenses.filter(
          (expense) => expense.date >= previousRange.startKey && expense.date <= previousRange.endKey
        )
      : [],
    [expenses, previousRange.startKey, previousRange.endKey, validRange]
  )
  const total = totalCents(periodExpenses)
  const previousTotal = totalCents(previousExpenses)
  const comparisonLabel = period === 'custom' ? 'vs previous range' : `vs last ${period}`
  const comparisonDifference = total - previousTotal
  const comparisonDescription = previousTotal === 0
    ? total === 0
      ? `No change ${comparisonLabel}.`
      : `↑ ${formatMoney(total)} ${comparisonLabel}.`
    : comparisonDifference === 0
      ? `No change ${comparisonLabel}.`
      : `${comparisonDifference > 0 ? '↑' : '↓'} ${Math.round(
          (Math.abs(comparisonDifference) / previousTotal) * 100
        )}% (${formatMoney(Math.abs(comparisonDifference))}) ${comparisonLabel}.`
  const categoryTotals = totalsByCategory(periodExpenses)
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0]
  const chartData = chartDataForPeriod(periodExpenses, period, start, end)
  const daysInPeriod = (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1
  const dailyAverage = periodExpenses.length
    ? Math.round(total / daysInPeriod)
    : 0
  const activeDays = chartData.filter((item) => item.cents > 0).length
  const peak = chartData.reduce(
    (highest, item) => item.cents > highest.cents ? item : highest,
    { label: '', cents: 0 }
  )
  const topCategoryTotal = topCategory ? categoryTotals[topCategory] : 0
  const topCategoryShare = total ? Math.round((topCategoryTotal / total) * 100) : 0
  const categoryColors = new Map(categories.map((category) => [category.name, category.color]))
  const orderedExpenses = [...periodExpenses].sort((a, b) => b.date.localeCompare(a.date))
  const transactionPageCount = Math.max(1, Math.ceil(orderedExpenses.length / TRANSACTION_PAGE_SIZE))
  const rangeKey = `${startKey}:${endKey}`
  const currentTransactionPage = Math.min(
    transactionPage.range === rangeKey ? transactionPage.page : 1,
    transactionPageCount
  )
  const pageTransactions = orderedExpenses.slice(
    (currentTransactionPage - 1) * TRANSACTION_PAGE_SIZE,
    currentTransactionPage * TRANSACTION_PAGE_SIZE
  )
  const customRangeLabel = validRange
    ? `${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
      })} – ${end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : ''

  async function handleExportExcel() {
    setExportError('')
    try {
      const allExpenses = await db.expenses.toArray()
      const budgetCents = period === 'month'
        ? (await db.budgets.get(startKey.slice(0, 7)))?.limitCents ?? 0
        : 0
      const { exportExcel } = await import('../lib/exportExcel')
      await exportExcel(allExpenses, startKey, endKey, budgetCents)
    } catch (error) {
      console.error('Could not export analytics to Excel.', error)
      setExportError('Could not export the selected period. Please try again.')
    }
  }

  async function handleDownloadPdf() {
    setPdfExportError('')
    try {
      const { exportPdf } = await import('../lib/exportPdf')
      const budgetCents = period === 'month'
        ? (await db.budgets.get(startKey.slice(0, 7)))?.limitCents ?? 0
        : 0
      exportPdf(expenses, startKey, endKey, budgetCents)
    } catch (error) {
      console.error('Could not create the analytics PDF.', error)
      setPdfExportError('Could not create the PDF. Please try again.')
    }
  }

  function changePeriod(direction) {
    if (period === 'custom') {
      setCustomStart(dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + direction * rangeLength)))
      setCustomEnd(dateKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() + direction * rangeLength)))
      return
    }
    setSelectedDate(shiftPeriodDate(period, selectedDate, direction))
  }

  return (
    <main className="grid min-w-0 gap-6 pt-6 sm:gap-7 sm:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Explore totals, category breakdowns, and transaction activity by time period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!validRange}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold hover:border-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 shrink-0">
              <polyline points="17 3 21 3 21 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <line x1="11" y1="13" x2="21" y2="3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M19 13.89V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6.11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Excel
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!validRange}
            className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold hover:border-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-[var(--danger)]">{exportError}</p>}
      {pdfExportError && <p role="alert" className="text-sm text-[var(--danger)]">{pdfExportError}</p>}

      <div className="flex justify-center">
        <div
          className="flex rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1"
          role="group"
          aria-label="Analytics period"
        >
          {periods.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm capitalize ${
                period === option
                  ? 'bg-[var(--accent)] font-semibold text-[var(--onaccent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:grid-cols-2 sm:p-4">
          <div className="grid gap-1">
            <label htmlFor="analytics-from" className="text-sm text-[var(--muted)]">From</label>
            <input
              id="analytics-from"
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(event) => setCustomStart(event.target.value)}
              className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2"
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="analytics-to" className="text-sm text-[var(--muted)]">To</label>
            <input
              id="analytics-to"
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changePeriod(-1)}
          aria-label={`Previous ${period}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-lg hover:border-[var(--muted)]"
        >
          ‹
        </button>
        <h2 className="min-w-0 text-center text-base font-semibold sm:text-lg">
          {period === 'custom'
            ? validRange ? `${customRangeLabel} · Custom range` : 'Choose a valid date range'
            : periodLabel(period, start, end)}
        </h2>
        <button
          type="button"
          onClick={() => changePeriod(1)}
          aria-label={`Next ${period}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-lg hover:border-[var(--muted)]"
        >
          ›
        </button>
      </div>

      <p className="text-center text-xs text-[var(--muted)]">
        {validRange
          ? `Showing expenses dated ${startKey} through ${endKey}.`
          : 'The start date must be on or before the end date.'}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <Stat
          label="Total spent"
          value={formatMoney(total)}
          description={comparisonDescription}
        />
        <Stat
          label="Transactions"
          value={periodExpenses.length}
          description="Number of expenses recorded in this period."
        />
        <Stat
          label="Daily average"
          value={formatMoney(dailyAverage)}
          description="Total divided by every calendar day in the period."
        />
        <Stat
          label="Top category"
          value={topCategory ?? '–'}
          description={topCategory
            ? `${formatMoney(topCategoryTotal)} · ${topCategoryShare}% of spending.`
            : 'No categories to rank yet.'}
        />
      </div>

      <section
        aria-live="polite"
        className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5"
      >
        <h2 className="text-base font-semibold">Period summary</h2>
        {periodExpenses.length ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            You recorded {periodExpenses.length} {periodExpenses.length === 1 ? 'expense' : 'expenses'} totaling{' '}
            <strong className="font-semibold text-[var(--text)]">{formatMoney(total)}</strong> across{' '}
            {activeDays} {activeDays === 1 ? 'day' : 'days'}.
            {topCategory && (
              <>
                {' '}<strong className="font-semibold text-[var(--text)]">{topCategory}</strong> was your
                largest category at {formatMoney(topCategoryTotal)} ({topCategoryShare}%).
              </>
            )}
            {peak.cents > 0 && (
              <> Your highest-spending {period === 'year' ? 'month' : 'day'} was {peak.label}, with {formatMoney(peak.cents)}.</>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            No expenses were recorded in this period. Choose another period or add an expense from the dashboard.
          </p>
        )}
      </section>

      <div className="grid min-w-0 gap-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5 md:grid-cols-2">
        <CategoryChart
          totals={categoryTotals}
          categories={categories}
          showAmounts
          title="Spending by category"
          description="Category totals and each category’s share of spending in this period."
        />
        <TrendChart
          days={chartData}
          title={period === 'year' ? 'Spending by month' : 'Spending by day'}
          description={`Expense totals for each ${period === 'year' ? 'month' : 'day'} in the selected ${period}.`}
          xAxisKey="label"
          height={220}
          labelFormatter={(value) => period === 'month' ? `Day ${value}` : value}
          ticks={period === 'month'
            ? chartData.filter((_, index) => index === 0 || (index + 1) % 5 === 0).map((item) => item.label)
            : period === 'custom'
              ? chartData.filter((_, index) => (
                  index === 0 ||
                  index === chartData.length - 1 ||
                  index % Math.ceil(chartData.length / 6) === 0
                )).map((item) => item.label)
              : chartData.map((item) => item.label)}
        />
      </div>

      <section>
        <h2 className="mb-2.5 text-base font-semibold">Transactions</h2>
        {orderedExpenses.length ? (
          <ul className="divide-y divide-[var(--line)]">
            {pageTransactions.map((expense) => (
              <li key={expense.id} className="flex min-w-0 items-center gap-3 py-3">
                <span
                  className="size-[9px] shrink-0 rounded-full"
                  style={{ background: categoryColors.get(expense.category) ?? '#6b7280' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{expense.category}</span>
                  <small className="block truncate text-[var(--muted)]">
                    {expense.date}{expense.note ? ` · ${expense.note}` : ''}
                  </small>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(expense.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-[var(--muted)]">No expenses for this period.</p>
        )}
        {orderedExpenses.length > 0 && (
          <Pagination
            page={currentTransactionPage}
            pageSize={TRANSACTION_PAGE_SIZE}
            total={orderedExpenses.length}
            onPageChange={(page) => setTransactionPage({ range: rangeKey, page })}
          />
        )}
      </section>
    </main>
  )
}
