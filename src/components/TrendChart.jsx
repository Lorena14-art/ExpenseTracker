import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../lib/money'

export default function TrendChart({
  days,
  title = 'By day',
  description,
  xAxisKey = 'day',
  labelFormatter = (day) => `Day ${day}`,
  ticks = days.filter((d) => d.day === 1 || d.day % 5 === 0).map((d) => d.day),
  height = 170,
}) {
  return (
    <div>
      <h2 className="mb-2.5 text-base font-semibold">{title}</h2>
      {description && <p className="mt-[-6px] mb-2.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
      <div className="h-[170px]" style={{ height }} role="img" aria-label={title}>
        <ResponsiveContainer>
          <BarChart data={days}>
            <XAxis
              dataKey={xAxisKey}
              ticks={ticks}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              formatter={(v) => formatMoney(v)}
              labelFormatter={labelFormatter}
              contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6 }}
            />
            <Bar dataKey="cents" name="Spent" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
