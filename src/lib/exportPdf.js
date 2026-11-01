import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  filterExpensesByDateRange,
  previousDateRange,
  totalCents,
  totalsByCategory,
} from './calculations'

const DAY_MS = 86400000
const MINT = [15, 118, 110]
const LIGHT_MINT = [224, 242, 239]
const PAGE_MARGIN = 14

function utcDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function money(cents) {
  const whole = Math.floor(Math.abs(cents) / 100)
  const remainder = Math.abs(cents) % 100
  const formatted = `${whole.toLocaleString('en-PH')}.${String(remainder).padStart(2, '0')}`
  return `${cents < 0 ? '-' : ''}PHP ${formatted}`
}

function dateLabel(dateString) {
  return utcDate(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function periodLabel(startDate, endDate) {
  return `${dateLabel(startDate)} - ${dateLabel(endDate)}`
}

function dateDifferenceDays(startDate, endDate) {
  return (utcDate(endDate).getTime() - utcDate(startDate).getTime()) / DAY_MS + 1
}

function percentage(part, whole) {
  return whole === 0 ? '0.00%' : `${(part * 100 / whole).toFixed(2)}%`
}

function chartValue(cents) {
  const pesos = cents / 100
  if (pesos >= 1000000) return `${(pesos / 1000000).toFixed(1)}m`
  if (pesos >= 10000) return `${Math.round(pesos / 1000)}k`
  if (pesos >= 1000) return `${(pesos / 1000).toFixed(1)}k`
  return String(Math.round(pesos))
}

function changeLabel(currentTotal, previousTotal) {
  if (previousTotal === 0) return 'No prior spending'
  const difference = currentTotal - previousTotal
  const percent = Math.round(Math.abs(difference) * 100 / previousTotal)
  const direction = difference > 0 ? '+' : difference < 0 ? '-' : ''
  return `${direction}${money(Math.abs(difference))} (${percent}%)`
}

function barData(expenses, startDate, endDate) {
  const start = utcDate(startDate)
  const end = utcDate(endDate)
  const isFullYear = start.getUTCMonth() === 0 &&
    start.getUTCDate() === 1 &&
    end.getUTCMonth() === 11 &&
    end.getUTCDate() === 31 &&
    start.getUTCFullYear() === end.getUTCFullYear()
  const bucketByMonth = isFullYear
  const totals = new Map()

  for (const expense of expenses) {
    const key = bucketByMonth ? expense.date.slice(0, 7) : expense.date
    totals.set(key, (totals.get(key) ?? 0) + expense.amountCents)
  }

  const count = bucketByMonth ? 12 : dateDifferenceDays(startDate, endDate)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    if (bucketByMonth) date.setUTCMonth(index, 1)
    else date.setUTCDate(date.getUTCDate() + index)
    const key = bucketByMonth
      ? date.toISOString().slice(0, 7)
      : date.toISOString().slice(0, 10)
    const label = bucketByMonth
      ? date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
      : date.toLocaleDateString('en-US', {
          month: count > 14 ? 'numeric' : 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
    return { label, cents: totals.get(key) ?? 0 }
  })
}

function drawBarChart(doc, expenses, startDate, endDate, startY) {
  const data = barData(expenses, startDate, endDate)
  if (startY + 68 > doc.internal.pageSize.getHeight() - PAGE_MARGIN) {
    doc.addPage()
    startY = PAGE_MARGIN
  }

  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  doc.text(data.length === 12 ? 'Spending per month' : 'Spending per day', PAGE_MARGIN, startY + 5)

  const chartX = PAGE_MARGIN
  const chartY = startY + 13
  const chartWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2
  const chartHeight = 42
  const maxValue = Math.max(...data.map((item) => item.cents), 0)
  const gap = data.length > 20 ? 0.6 : 2
  const barWidth = Math.max(0.5, (chartWidth - gap * (data.length - 1)) / data.length)
  const valueFontSize = data.length > 20 ? 4.5 : data.length > 12 ? 5.5 : 7

  doc.setDrawColor(220, 228, 225)
  doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight)
  for (const [index, item] of data.entries()) {
    const height = maxValue ? (item.cents / maxValue) * chartHeight : 0
    const x = chartX + index * (barWidth + gap)
    if (height > 0) {
      doc.setFillColor(...MINT)
      doc.rect(x, chartY + chartHeight - height, barWidth, height, 'F')
    }

    doc.setFontSize(valueFontSize)
    doc.setTextColor(71, 85, 105)
    doc.text(chartValue(item.cents), x + barWidth / 2, chartY + chartHeight - height - 1.5, {
      align: 'center',
      baseline: 'bottom',
    })

    const labelInterval = data.length <= 14 ? 1 : Math.ceil(data.length / 10)
    if (index % labelInterval === 0 || index === data.length - 1) {
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(item.label, x + barWidth / 2, chartY + chartHeight + 5, { align: 'center' })
    }
  }
}

function applyTableStyles(doc, options) {
  autoTable(doc, {
    theme: 'grid',
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
      lineColor: [226, 232, 230],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: MINT,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [245, 248, 247] },
    ...options,
  })
}

export function exportPdf(expenses, startDate, endDate, budgetCents = 0) {
  if (!startDate || !endDate || startDate > endDate) {
    throw new RangeError('The export start date must be on or before the end date.')
  }

  const currentExpenses = filterExpensesByDateRange(expenses, startDate, endDate)
  const priorRange = previousDateRange(startDate, endDate)
  const previousExpenses = filterExpensesByDateRange(
    expenses,
    priorRange.startDate,
    priorRange.endDate
  )
  const total = totalCents(currentExpenses)
  const priorTotal = totalCents(previousExpenses)
  const categoryTotals = totalsByCategory(currentExpenses)
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  const average = Math.round(total / dateDifferenceDays(startDate, endDate))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...MINT)
  doc.text('Expense Tracker Report', PAGE_MARGIN, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`Period: ${periodLabel(startDate, endDate)}`, PAGE_MARGIN, 28)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-PH')}`, PAGE_MARGIN, 34)

  if (!currentExpenses.length) {
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.text('No expenses in this period', PAGE_MARGIN, 48)
  } else {
    let y = 42
    applyTableStyles(doc, {
      startY: y,
      head: [['Summary', 'Value']],
      body: [
        ['Total spent', money(total)],
        ['Entries', String(currentExpenses.length)],
        ['Average per day', money(average)],
        ['Top category', topCategory],
        ['Change vs previous period', changeLabel(total, priorTotal)],
        ...(budgetCents > 0 ? [['Monthly budget', money(budgetCents)]] : []),
      ],
      columnStyles: {
        0: { cellWidth: 75, fontStyle: 'bold' },
        1: { halign: 'center' },
      },
    })
    y = doc.lastAutoTable.finalY + 8

    const categories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, cents]) => {
        const entries = currentExpenses.filter((expense) => expense.category === category).length
        return [category, String(entries), money(cents), percentage(cents, total)]
      })
    applyTableStyles(doc, {
      startY: y,
      head: [['Category', 'Entries', 'Total', '% of total']],
      body: categories,
      foot: [['Total', String(currentExpenses.length), money(total), '100.00%']],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      footStyles: {
        fillColor: LIGHT_MINT,
        textColor: [31, 41, 55],
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 28 },
      },
    })
    y = doc.lastAutoTable.finalY + 8

    const transactions = [...currentExpenses]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((expense) => [
        dateLabel(expense.date),
        expense.category,
        expense.note ?? '',
        money(expense.amountCents),
      ])
    applyTableStyles(doc, {
      startY: y,
      head: [['Date', 'Category', 'Note', 'Amount']],
      body: transactions,
      foot: [['', '', 'Total', money(total)]],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      footStyles: {
        fillColor: LIGHT_MINT,
        textColor: [31, 41, 55],
        fontStyle: 'bold',
      },
      styles: { overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 32 },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 34 },
      },
    })
    y = doc.lastAutoTable.finalY + 10
    drawBarChart(doc, currentExpenses, startDate, endDate, y)
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 8, {
      align: 'right',
    })
  }

  doc.save(`expenses-${startDate}_to_${endDate}.pdf`)
}
