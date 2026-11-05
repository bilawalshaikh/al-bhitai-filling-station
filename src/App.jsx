import { useEffect, useState } from 'react'
import { DashboardPage } from './pages/Dashboard.jsx'
import { CustomersPage, SuppliersPage, VehiclesPage } from './pages/Parties.jsx'
import { ReportsPage } from './pages/Reports.jsx'
import { ProductsPage, PurchasesPage, TanksPage } from './pages/Stock.jsx'
import { OrdersPage, SalesPage } from './pages/Trade.jsx'
import { lowTanks } from './logic.js'
import { resetData, useDB } from './store.js'
import { Modal, PrintSheet } from './ui.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview', icon: 'dashboard' },
  { id: 'sales', label: 'Sales & Invoices', group: 'Operations', icon: 'sales' },
  { id: 'purchases', label: 'Fuel Purchases', group: 'Operations', icon: 'purchase' },
  { id: 'orders', label: 'Orders', group: 'Operations', icon: 'orders' },
  { id: 'customers', label: 'Customers', group: 'Directory', icon: 'people' },
  { id: 'vehicles', label: 'Vehicles', group: 'Directory', icon: 'vehicle' },
  { id: 'suppliers', label: 'Suppliers', group: 'Directory', icon: 'supplier' },
  { id: 'tanks', label: 'Tanks & Inventory', group: 'Stock', icon: 'tank' },
  { id: 'products', label: 'Products', group: 'Stock', icon: 'product' },
  { id: 'reports', label: 'Reports', group: 'Accounts', icon: 'report' },
]

const COPY = {
  dashboard: ['Dashboard', 'Purchases, sales, profit, stock, and the latest forecourt activity.'],
  sales: ['Sales & Invoices', 'Record nozzle sales, calculate the total, and print or download the invoice.'],
  purchases: ['Fuel Purchases', 'Receive petrol, diesel, oil, and gas against a supplier and a tank.'],
  orders: ['Orders', 'Track requested fuel, notes, and status, then turn a confirmed order into a sale.'],
  customers: ['Customers', 'Accounts, outstanding balances, payments, and statements.'],
  vehicles: ['Vehicles', 'Registration numbers and the fuel each vehicle has taken.'],
  suppliers: ['Suppliers', 'Vendor contacts, purchase totals, and amounts still payable.'],
  tanks: ['Tanks & Inventory', 'Capacities, dips, low-stock alerts, and stock adjustments.'],
  products: ['Products', 'Prices, quantities, and profit for every fuel and lubricant.'],
  reports: ['Reports', 'Daily and monthly sales, purchases, profit, inventory, and statements.'],
}

function readPage() {
  const id = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return NAV.some((item) => item.id === id) ? id : 'dashboard'
}

export default function App() {
  const db = useDB()
  const [page, setPage] = useState(readPage)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [printDoc, setPrintDoc] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const alerts = lowTanks(db).length

  useEffect(() => {
    const onHash = () => setPage(readPage())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/dashboard'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onToast = (event) => {
      setMessage(event.detail)
      window.clearTimeout(onToast._timer)
      onToast._timer = window.setTimeout(() => setMessage(''), 2800)
    }
    window.addEventListener('albhitai-toast', onToast)
    return () => window.removeEventListener('albhitai-toast', onToast)
  }, [])

  useEffect(() => {
    if (!printDoc) return undefined
    document.body.classList.add('printing')
    const timer = window.setTimeout(() => window.print(), 80)
    const done = () => {
      document.body.classList.remove('printing')
      setPrintDoc(null)
    }
    window.addEventListener('afterprint', done, { once: true })
    return () => window.clearTimeout(timer)
  }, [printDoc])

  useEffect(() => {
    const onPrint = (event) => setPrintDoc(event.detail)
    window.addEventListener('albhitai-print', onPrint)
    return () => window.removeEventListener('albhitai-print', onPrint)
  }, [])

  const go = (id, query) => {
    window.location.hash = query ? `#/${id}?${query}` : `#/${id}`
    setPage(id)
    setOpen(false)
  }
  const [title, description] = COPY[page]
  document.title = `${title} · Al Bhitai Filling Station`
  let groups = []
  const screen = {
    dashboard: <DashboardPage go={go} />,
    sales: <SalesPage />,
    purchases: <PurchasesPage />,
    orders: <OrdersPage />,
    customers: <CustomersPage />,
    vehicles: <VehiclesPage />,
    suppliers: <SuppliersPage />,
    tanks: <TanksPage />,
    products: <ProductsPage />,
    reports: <ReportsPage />,
  }[page]

  return (
    <>
      <div className="app">
        {open && <button className="backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
        <aside className={`sidebar${open ? ' open' : ''}`}>
          <div className="brand">
            <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">
              <rect width="48" height="48" rx="14" fill="#e0a11a" />
              <path d="M24 8c-6.2 8-10 13-10 19.2a10 10 0 0 0 20 0C34 21 30.2 16 24 8z" fill="#10261c" />
              <path d="M24 22.5v10" stroke="#f4c56a" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div>
              <strong>Al Bhitai</strong>
              <span>Filling Station</span>
            </div>
          </div>
          <nav className="nav">
            {NAV.map((item) => {
              const showGroup = !groups.includes(item.group)
              if (showGroup) groups.push(item.group)
              return (
                <div key={item.id}>
                  {showGroup && <div className="nav-label">{item.group}</div>}
                  <button className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}>
                    <Icon name={item.icon} />
                    {item.label}
                    {item.id === 'tanks' && alerts > 0 && <em className="pill">{alerts}</em>}
                  </button>
                </div>
              )
            })}
          </nav>
          <div className="side-foot">
            <span>Records stay in this browser.</span>
            <button className="btn ghost" onClick={() => setResetOpen(true)}>Reset sample data</button>
          </div>
        </aside>
        <main className="main">
          <div className="shell">
            <header className="topbar">
              <div>
                <button className="btn ghost menu-btn" onClick={() => setOpen(true)}>Menu</button>
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
            </header>
            {screen}
          </div>
        </main>
      </div>
      {message && <div className="toast" role="status">{message}</div>}
      {resetOpen && (
        <Modal title="Reset sample data" onClose={() => setResetOpen(false)}>
          <p>This replaces the current station records with the original sample day.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setResetOpen(false)}>Cancel</button>
            <button className="btn danger" onClick={() => { resetData(); setResetOpen(false) }}>Reset</button>
          </div>
        </Modal>
      )}
      <PrintSheet doc={printDoc} />
    </>
  )
}

function Icon({ name }) {
  const paths = {
    dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    sales: 'M6 3h9l3 3v15H6zM9 11h6M9 15h6',
    purchase: 'M4 7h16v12H4zM8 7V5h8v2',
    orders: 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h4',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 19c1-3 8-3 9 0M16 11a2.5 2.5 0 1 0 0-5M16 19c1.2-1.6 2.8-2.4 4.5-2.4',
    vehicle: 'M4 15h16v4H4zM6 15l2-5h8l2 5M7 19v2M17 19v2',
    supplier: 'M4 10h16v9H4zM8 10V7h8v3',
    tank: 'M8 4h8v16H8zM8 9h8M8 14h8',
    product: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z',
    report: 'M6 3h8l4 4v14H6zM9 12h6M9 16h6',
  }
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
