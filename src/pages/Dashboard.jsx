import { useState } from 'react'
import { useDB } from '../store.js'
import { chartSeries, formatDate, kpis, lowTanks, money, num, recentActivity, stockSlices, todayISO } from '../logic.js'
import { BarChart, Badge, Donut, LineChart } from '../ui.jsx'

export function DashboardPage({ go }) {
  const db = useDB()
  const [period, setPeriod] = useState('daily')
  const figures = kpis(db)
  const series = chartSeries(db, period)
  const alerts = lowTanks(db)
  const latest = recentActivity(db)[0]
  const cards = [
    ['Total fuel purchases', money(figures.purchaseValue), 'Supplier invoices on record'],
    ['Total sales', money(figures.salesTotal), 'Fuel and product invoices'],
    ['Net profit', money(figures.profit), 'Sales minus average purchase cost'],
    ['Available fuel stock', `${num(figures.fuelStock)} L`, `Oil ${num(figures.oilStock)} L · Gas ${num(figures.gasStock)} kg`],
    ['Total customers', figures.customers, 'Cash and credit accounts'],
    ['Total suppliers', figures.suppliers, 'Fuel and lubricant vendors'],
    ['Pending payments', money(figures.pending), 'Customer balances still open'],
    ['Recent transactions', latest ? money(latest.amount) : '—', latest ? `${latest.kind} · ${latest.party}` : 'No transactions yet'],
  ]
  return (
    <div>
      <div className="page-head">
        <p className="help">{formatDate(todayISO())} · Forecourt, tanks, and accounts</p>
        <div className="row-actions">
          <button className="btn primary" onClick={() => go('sales', 'new=1')}>Record a sale</button>
          <button className="btn ghost" onClick={() => go('purchases', 'new=1')}>Record a purchase</button>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="alert">
          Low stock: {alerts.map((tank) => tank.name).join(', ')}. Review tanks before the next delivery.
        </div>
      )}
      <section className="stats">
        {cards.map(([label, value, note]) => (
          <article className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{note}</em>
          </article>
        ))}
      </section>
      <div className="page-head" style={{ marginTop: 16 }}>
        <h3>Performance</h3>
        <div className="seg">
          {[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([id, label]) => (
            <button key={id} className={period === id ? 'on' : ''} onClick={() => setPeriod(id)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="grid-charts">
        <section className="card">
          <h3>Sales</h3>
          <BarChart rows={series} series={[{ key: 'sales', label: 'Sales', color: '#e0a11a' }]} />
        </section>
        <section className="card">
          <h3>Fuel stock</h3>
          <Donut slices={stockSlices(db)} />
        </section>
      </div>
      <div className="grid-2 even">
        <section className="card">
          <h3>Fuel purchases</h3>
          <LineChart rows={series} valueKey="purchases" color="#1f7a4d" />
        </section>
        <section className="card">
          <h3>Profit and loss</h3>
          <BarChart
            rows={series}
            series={[
              { key: 'sales', label: 'Revenue', color: '#e0a11a' },
              { key: 'cost', label: 'Cost', color: '#2457a6' },
              { key: 'profit', label: 'Profit', color: '#1f7a4d' },
            ]}
          />
        </section>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <h3>Recent transactions</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Reference</th><th>Party</th><th>Detail</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity(db).map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td><Badge tone={row.kind === 'Sale' ? 'sale' : 'purchase'}>{row.kind}</Badge></td>
                  <td>{row.ref}</td>
                  <td>{row.party}</td>
                  <td>{row.detail}</td>
                  <td>{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
