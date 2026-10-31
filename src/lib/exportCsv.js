export function exportCSV(expenses) {
  const rows = [
    ['date', 'category', 'amount', 'note'],
    ...expenses.map((e) => [e.date, e.category, (e.amountCents / 100).toFixed(2), e.note]),
  ]
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'expenses.csv' })
  a.click()
  URL.revokeObjectURL(url)
}
