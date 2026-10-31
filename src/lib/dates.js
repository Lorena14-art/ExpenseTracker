const pad = (n) => String(n).padStart(2, '0')

// Local date as YYYY-MM-DD (not UTC)
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const currentMonth = () => today().slice(0, 7)

export function previousMonth(month) {
  const date = new Date(`${month}-01T00:00:00`)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

// month = "2026-10"
export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export { pad }
