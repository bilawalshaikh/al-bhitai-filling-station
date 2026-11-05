import { useMemo, useState } from 'react'
import { requestPrint } from '../bus.js'
import { buildReport, shiftISO, todayISO } from '../logic.js'
import { downloadDocument } from '../pdf.js'
import { useDB } from '../store.js'
import { ReportView } from '../ui.jsx'

const TABS = [
  ['daily', 'Daily sales'],
  ['monthly', 'Monthly sales'],
  ['purchases', 'Purchases'],
  ['pnl', 'Profit and loss'],
  ['inventory', 'Inventory'],
  ['customer', 'Customer statement'],
  ['supplier', 'Supplier statement'],
]

export function ReportsPage() {
  const db = useDB()
  const today = todayISO()
  const [tab, setTab] = useState('daily')
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [from, setFrom] = useState(shiftISO(today, -30))
  const [to, setTo] = useState(today)
  const [customerId, setCustomerId] = useState(db.customers[0]?.id || '')
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || '')
  const doc = useMemo(() => buildReport(db, tab, { date, month, from, to, customerId, supplierId }), [db, tab, date, month, from, to, customerId, supplierId])
  return (
    <div>
      <div className="toolbar">
        <div className="seg">
          {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          {tab === 'daily' && <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Report date" />}
          {tab === 'monthly' && <input className="input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Report month" />}
          {(tab === 'purchases' || tab === 'pnl') && (
            <>
              <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
              <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
            </>
          )}
          {tab === 'customer' && (
            <select className="input" value={customerId} onChange={(event) => setCustomerId(event.target.value)} aria-label="Customer">
              {db.customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          )}
          {tab === 'supplier' && (
            <select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} aria-label="Supplier">
              {db.suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          )}
          <button className="btn ghost" onClick={() => downloadDocument(doc)}>Download PDF</button>
          <button className="btn primary" onClick={() => requestPrint(doc)}>Print</button>
        </div>
        <ReportView doc={doc} />
      </section>
    </div>
  )
}
