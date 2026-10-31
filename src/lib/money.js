export function toCents(input) {
  return Math.round(Number(input) * 100)
}

export function formatMoney(cents, currency = 'PHP', locale = 'en-PH') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    cents / 100
  )
}
