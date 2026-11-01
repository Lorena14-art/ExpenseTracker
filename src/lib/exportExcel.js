import ExcelJS from 'exceljs'
import {
  filterExpensesByDateRange,
  previousDateRange,
  totalCents,
  totalsByCategory,
} from './calculations'

const HEADER_COLOR = 'FF0F766E'
const TOTAL_COLOR = 'FFE0F2EF'
const MONEY_FORMAT = '"₱"#,##0.00;[Red]-"₱"#,##0.00'
const DATE_FORMAT = 'mmm d, yyyy'
const DAY_MS = 86400000

function utcDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateString(date) {
  return date.toISOString().slice(0, 10)
}

function pesos(cents) {
  return cents / 100
}

function formatPesos(cents) {
  return `₱${(Math.abs(cents) / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function styleSheet(worksheet, totalRow) {
  worksheet.views = worksheet.views.length
    ? worksheet.views.map((view) => ({ ...view, showGridLines: false }))
    : [{ showGridLines: false }]
  worksheet.properties.defaultRowHeight = 20
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Arial', size: 10 }
      cell.alignment = { vertical: 'middle', ...cell.alignment }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8E6' } },
      }
      if (rowNumber === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } }
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (rowNumber === totalRow) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_COLOR } }
        cell.font = { name: 'Arial', size: 10, bold: true }
        cell.border = {
          top: { style: 'thin', color: { argb: HEADER_COLOR } },
          bottom: { style: 'thin', color: { argb: HEADER_COLOR } },
        }
      } else if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8F7' } }
      }
    })
  })
}

function setMoneyFormat(worksheet, column, firstRow, lastRow) {
  for (let row = firstRow; row <= lastRow; row += 1) {
    worksheet.getCell(row, column).numFmt = MONEY_FORMAT
  }
}

function addSubtotalRow(worksheet, { entriesColumn, moneyColumn, totalCentsValue, entries }) {
  if (worksheet.rowCount === 1) worksheet.addRow([])
  const firstDataRow = 2
  const lastDataRow = worksheet.rowCount
  const totalRow = worksheet.addRow([])
  totalRow.getCell(1).value = 'Total'
  if (entriesColumn) {
    totalRow.getCell(entriesColumn).value = {
      formula: `SUBTOTAL(9,${worksheet.getColumn(entriesColumn).letter}${firstDataRow}:${worksheet.getColumn(entriesColumn).letter}${lastDataRow})`,
      result: entries,
    }
  }
  totalRow.getCell(moneyColumn).value = {
    formula: `SUBTOTAL(9,${worksheet.getColumn(moneyColumn).letter}${firstDataRow}:${worksheet.getColumn(moneyColumn).letter}${lastDataRow})`,
    result: pesos(totalCentsValue),
  }
  setMoneyFormat(worksheet, moneyColumn, firstDataRow, totalRow.number)
  return totalRow.number
}

function weekStart(date) {
  const monday = utcDate(date)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  return dateString(monday)
}

function groupedRows(expenses, keyForExpense, labelForKey) {
  const groups = new Map()
  for (const expense of expenses) {
    const key = keyForExpense(expense)
    const group = groups.get(key) ?? { entries: 0, cents: 0 }
    group.entries += 1
    group.cents += expense.amountCents
    groups.set(key, group)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => [labelForKey(key), group.entries, pesos(group.cents)])
}

function addSummarySheet(workbook, expenses, startDate, endDate, budgetCents) {
  const sheet = workbook.addWorksheet('Summary')
  const previous = previousDateRange(startDate, endDate)
  const currentExpenses = filterExpensesByDateRange(expenses, startDate, endDate)
  const previousExpenses = filterExpensesByDateRange(expenses, previous.startDate, previous.endDate)
  const total = totalCents(currentExpenses)
  const priorTotal = totalCents(previousExpenses)
  const days = (utcDate(endDate).getTime() - utcDate(startDate).getTime()) / DAY_MS + 1
  const averageCents = Math.round(total / days)
  const categoryTotals = totalsByCategory(currentExpenses)
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const largestExpense = currentExpenses.reduce(
    (largest, expense) => expense.amountCents > (largest?.amountCents ?? -1) ? expense : largest,
    null
  )
  const difference = total - priorTotal
  const change = priorTotal === 0
    ? 'No prior spending'
    : `${difference > 0 ? '+' : difference < 0 ? '-' : ''}${formatPesos(difference)} (${Math.round(Math.abs(difference) * 100 / priorTotal)}%)`

  sheet.columns = [{ width: 30 }, { width: 34 }]
  sheet.views = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', showGridLines: false }]
  sheet.addRow(['Metric', 'Value'])
  sheet.addRow(['Date range', `${startDate} to ${endDate}`])
  sheet.addRow(['Total spent', pesos(total)])
  sheet.addRow(['Entries', currentExpenses.length])
  sheet.addRow(['Average per day', pesos(averageCents)])
  sheet.addRow(['Top category', topCategory?.[0] ?? '—'])
  sheet.addRow(['Largest expense', largestExpense ? pesos(largestExpense.amountCents) : 0])
  sheet.addRow([
    'Largest expense details',
    largestExpense ? `${largestExpense.date} · ${largestExpense.category}${largestExpense.note ? ` · ${largestExpense.note}` : ''}` : 'No expenses',
  ])
  sheet.addRow(['Change vs previous period', change])
  sheet.addRow(['Monthly budget', budgetCents > 0 ? pesos(budgetCents) : 'Not set'])
  for (const row of [3, 5, 7, 10]) {
    if (row === 10 && budgetCents <= 0) continue
    sheet.getCell(row, 2).numFmt = MONEY_FORMAT
  }
  styleSheet(sheet)
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    sheet.getCell(row, 1).font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF334155' },
    }
    sheet.getCell(row, 2).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }
  sheet.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_COLOR } }
    cell.font = { name: 'Arial', size: 10, bold: true }
    cell.border = {
      top: { style: 'thin', color: { argb: HEADER_COLOR } },
      bottom: { style: 'thin', color: { argb: HEADER_COLOR } },
    }
  })
}

function addTransactionsSheet(workbook, expenses, startDate, endDate) {
  const sheet = workbook.addWorksheet('Transactions')
  sheet.columns = [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Note', key: 'note', width: 40 },
    { header: 'Amount', key: 'amount', width: 18 },
  ]
  sheet.views = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', showGridLines: false }]
  const rows = filterExpensesByDateRange(expenses, startDate, endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const expense of rows) {
    const row = sheet.addRow({
      date: utcDate(expense.date),
      category: expense.category,
      note: expense.note ?? '',
      amount: pesos(expense.amountCents),
    })
    row.getCell(1).numFmt = DATE_FORMAT
    row.getCell(4).numFmt = MONEY_FORMAT
  }
  const lastTransactionRow = rows.length ? rows.length + 1 : 2
  if (!rows.length) sheet.addRow([])
  const totalRow = sheet.addRow([])
  totalRow.getCell(3).value = 'Total'
  totalRow.getCell(4).value = {
    formula: `SUBTOTAL(9,D2:D${lastTransactionRow})`,
    result: pesos(totalCents(rows)),
  }
  totalRow.getCell(4).numFmt = MONEY_FORMAT
  sheet.autoFilter = { from: 'A1', to: `D${rows.length ? lastTransactionRow : 1}` }
  styleSheet(sheet, totalRow.number)
}

function addCategorySheet(workbook, expenses) {
  const sheet = workbook.addWorksheet('By Category')
  sheet.columns = [
    { header: 'Category', key: 'category', width: 24 },
    { header: 'Entries', key: 'entries', width: 14 },
    { header: 'Total', key: 'total', width: 18 },
    { header: '% of total', key: 'share', width: 16 },
  ]
  const totals = totalsByCategory(expenses)
  const total = totalCents(expenses)
  const entries = new Map()
  for (const expense of expenses) entries.set(expense.category, (entries.get(expense.category) ?? 0) + 1)
  const categories = Object.entries(totals).sort((a, b) => b[1] - a[1])
  for (const [category, cents] of categories) {
    const row = sheet.addRow([category, entries.get(category), pesos(cents), total ? cents / total : 0])
    row.getCell(3).numFmt = MONEY_FORMAT
    row.getCell(4).numFmt = '0.00%'
  }
  if (!categories.length) sheet.addRow([])
  const totalRow = sheet.addRow([])
  totalRow.getCell(1).value = 'Total'
  const lastDataRow = totalRow.number - 1
  totalRow.getCell(2).value = {
    formula: `SUBTOTAL(9,B2:B${lastDataRow})`,
    result: expenses.length,
  }
  totalRow.getCell(3).value = {
    formula: `SUBTOTAL(9,C2:C${lastDataRow})`,
    result: pesos(total),
  }
  totalRow.getCell(4).value = { formula: `IF(C${totalRow.number}=0,0,1)`, result: total ? 1 : 0 }
  totalRow.getCell(3).numFmt = MONEY_FORMAT
  totalRow.getCell(4).numFmt = '0.00%'
  styleSheet(sheet, totalRow.number)
}

function addGroupedSheet(workbook, title, headers, rows, totalCentsValue, totalEntries, dateFormat = DATE_FORMAT) {
  const sheet = workbook.addWorksheet(title)
  sheet.columns = headers
  for (const row of rows) {
    const added = sheet.addRow(row)
    added.getCell(1).numFmt = dateFormat
    added.getCell(3).numFmt = MONEY_FORMAT
  }
  const totalRow = addSubtotalRow(sheet, {
    entriesColumn: 2,
    moneyColumn: 3,
    totalCentsValue,
    entries: totalEntries,
  })
  styleSheet(sheet, totalRow)
}

export async function exportExcel(expenses, startDate, endDate, budgetCents = 0) {
  if (!startDate || !endDate || startDate > endDate) {
    throw new RangeError('The export start date must be on or before the end date.')
  }

  const currentExpenses = filterExpensesByDateRange(expenses, startDate, endDate)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Expense Tracker'
  workbook.created = new Date()
  addSummarySheet(workbook, expenses, startDate, endDate, budgetCents)
  addTransactionsSheet(workbook, expenses, startDate, endDate)
  addCategorySheet(workbook, currentExpenses)

  const weeklyRows = groupedRows(
    currentExpenses,
    (expense) => weekStart(expense.date),
    (key) => utcDate(key)
  )
  addGroupedSheet(
    workbook,
    'By Week',
    [{ header: 'Week starting (Monday)', key: 'week', width: 26 },
      { header: 'Entries', key: 'entries', width: 14 },
      { header: 'Total', key: 'total', width: 18 }],
    weeklyRows,
    totalCents(currentExpenses),
    currentExpenses.length,
    DATE_FORMAT
  )

  const monthlyRows = groupedRows(
    currentExpenses,
    (expense) => expense.date.slice(0, 7),
    (key) => utcDate(`${key}-01`)
  )
  addGroupedSheet(
    workbook,
    'By Month',
    [{ header: 'Month', key: 'month', width: 20 },
      { header: 'Entries', key: 'entries', width: 14 },
      { header: 'Total', key: 'total', width: 18 }],
    monthlyRows,
    totalCents(currentExpenses),
    currentExpenses.length,
    'mmmm yyyy'
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `expenses-${startDate}_to_${endDate}.xlsx`,
  })
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
