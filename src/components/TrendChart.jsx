import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../lib/money'

export default function TrendChart({ days }) {
  const ticks = days.filter((d) => d.day === 1 || d.day % 5 === 0).map((d) => d.day)

  return (
    <div>
      <h2 className="mb-2.5 text-base font-semibold">By day</h2>
      <div className="h-[170px]" role="img" aria-label="Spending per day">
        <ResponsiveContainer>
          <BarChart data={days}>
            <XAxis
              dataKey="day"
              ticks={ticks}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              formatter={(v) => formatMoney(v)}
              labelFormatter={(d) => `Day ${d}`}
              contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6 }}
            />
            <Bar dataKey="cents" name="Spent" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
