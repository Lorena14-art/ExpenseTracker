import { PieChart, Pie, Cell } from 'recharts'
import { percent } from '../lib/calculations'
import { formatMoney } from '../lib/money'

export default function CategoryChart({
  totals,
  categories,
  showAmounts = false,
  title = 'By category',
  description,
}) {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const sum = entries.reduce((s, [, c]) => s + c, 0)
  const data = entries.map(([name, value]) => ({ name, value }))
  const colors = new Map(categories.map((category) => [category.name, category.color]))

  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 mb-2.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
      <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:items-center">
        <PieChart width={130} height={130} role="img" aria-label="Spending by category">
          {data.length === 0 ? (
            <Pie data={[{ value: 1 }]} dataKey="value" innerRadius={40} outerRadius={62} stroke="none" isAnimationActive={false}>
              <Cell fill="var(--line)" />
            </Pie>
          ) : (
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={colors.get(d.name) ?? '#6b7280'} />
              ))}
            </Pie>
          )}
        </PieChart>

        <ul className="grid w-full min-w-0 gap-1.5 text-sm sm:min-w-[130px] sm:flex-1">
          {data.length === 0 && <li className="text-[var(--muted)]">No spending yet</li>}
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className="size-[9px] rounded-full" style={{ background: colors.get(d.name) ?? '#6b7280' }} />
              <span className="flex-1">{d.name}</span>
              {showAmounts ? (
                <span className="text-right text-xs tabular-nums">
                  <em className="block not-italic">{formatMoney(d.value)}</em>
                  <em className="block not-italic text-[var(--muted)]">{percent(d.value, sum)}%</em>
                </span>
              ) : (
                <em className="not-italic text-[var(--muted)] tabular-nums">{percent(d.value, sum)}%</em>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
