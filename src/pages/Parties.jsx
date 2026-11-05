import { useMemo, useState } from 'react'
import { toast } from '../bus.js'
import { requestPrint } from '../bus.js'
import {
  buildReport,
  byId,
  customerBalance,
  customerSpend,
  formatDate,
  hasErrors,
  liveName,
  matches,
  money,
  num,
  supplierBalance,
  supplierSpend,
  todayISO,
  uid,
  validateCustomer,
  validateParty,
  validatePayment,
  validateVehicle,
  vehicleConsumption,
} from '../logic.js'
import { downloadDocument } from '../pdf.js'
import { update, useDB } from '../store.js'
import { Badge, DataTable, Field, Modal, ReportView, sortBy, useSort } from '../ui.jsx'

function snapshotParty(list, id) {
  return byId(list, id)?.name || ''
}

export function SuppliersPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [sort, toggle] = useSort('name')
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState(null)
  const [remove, setRemove] = useState(null)
  const rows = useMemo(() => {
    const filtered = db.suppliers.filter((row) => matches(q, row.name, row.company, row.phone, row.email, row.address))
    return sortBy(filtered, sort, (row, key) => (key === 'purchases' ? supplierSpend(db, row.id) : key === 'balance' ? supplierBalance(db, row.id) : row[key]))
  }, [db, q, sort])
  const columns = [
    { key: 'name', label: 'Supplier', render: (row) => <strong>{row.name}</strong> },
    { key: 'company', label: 'Company' },
    { key: 'phone', label: 'Phone' },
    { key: 'purchases', label: 'Purchases', align: 'num', render: (row) => money(supplierSpend(db, row.id)) },
    { key: 'balance', label: 'Balance due', align: 'num', render: (row) => money(supplierBalance(db, row.id)) },
    { key: 'actions', label: '', sort: false, render: (row) => <RowActions row={row} onView={setView} onEdit={setEditing} onDelete={askDelete} /> },
  ]
  function askDelete(row) {
    if (db.purchases.some((item) => item.supplierId === row.id) || db.payments.some((item) => item.partyType === 'supplier' && item.partyId === row.id)) {
      toast('This supplier has purchase or payment history. Keep the record so the statements stay intact.')
      return
    }
    setRemove(row)
  }
  return (
    <section className="card">
      <Toolbar q={q} setQ={setQ} placeholder="Search suppliers" action="Add supplier" onAction={() => setEditing({ name: '', phone: '', email: '', address: '', company: '' })} />
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No suppliers match this search" />
      {editing && <PartyForm title={editing.id ? 'Edit supplier' : 'Add supplier'} form={editing} onClose={() => setEditing(null)} onSave={save} />}
      {view && <PartyDetail db={db} kind="supplier" id={view} onClose={() => setView(null)} />}
      {remove && <Confirm label={remove.name} onClose={() => setRemove(null)} onYes={() => { update((draft) => { draft.suppliers = draft.suppliers.filter((row) => row.id !== remove.id) }); toast('Supplier deleted'); setRemove(null) }} />}
    </section>
  )
  function save(form) {
    const errors = validateParty(form)
    if (hasErrors(errors)) return errors
    update((draft) => {
      const record = { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), company: form.company.trim() }
      if (form.id) {
        const index = draft.suppliers.findIndex((row) => row.id === form.id)
        draft.suppliers[index] = { ...draft.suppliers[index], ...record }
      } else draft.suppliers.push({ ...record, id: uid('s') })
    })
    toast(form.id ? 'Supplier updated' : 'Supplier added')
    setEditing(null)
    return {}
  }
}

export function CustomersPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [sort, toggle] = useSort('name')
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState(null)
  const [remove, setRemove] = useState(null)
  const rows = useMemo(() => {
    const filtered = db.customers.filter((row) => (!type || row.type === type) && matches(q, row.name, row.phone, row.email, row.address, row.type))
    return sortBy(filtered, sort, (row, key) => (key === 'spend' ? customerSpend(db, row.id) : key === 'balance' ? customerBalance(db, row.id) : row[key]))
  }, [db, q, type, sort])
  const columns = [
    { key: 'name', label: 'Customer', render: (row) => <strong>{row.name}</strong> },
    { key: 'phone', label: 'Phone' },
    { key: 'type', label: 'Type', render: (row) => <Badge tone={row.type === 'Cash' ? 'cash' : 'credit'}>{row.type}</Badge> },
    { key: 'spend', label: 'Purchases', align: 'num', render: (row) => money(customerSpend(db, row.id)) },
    { key: 'balance', label: 'Outstanding', align: 'num', render: (row) => money(customerBalance(db, row.id)) },
    { key: 'actions', label: '', sort: false, render: (row) => <RowActions row={row} onView={setView} onEdit={setEditing} onDelete={askDelete} /> },
  ]
  function askDelete(row) {
    if (db.sales.some((item) => item.customerId === row.id) || db.payments.some((item) => item.partyType === 'customer' && item.partyId === row.id) || db.vehicles.some((item) => item.customerId === row.id)) {
      toast('This customer has vehicles, sales, or payments. Keep the account so the statement stays correct.')
      return
    }
    setRemove(row)
  }
  return (
    <section className="card">
      <Toolbar q={q} setQ={setQ} placeholder="Search customers" action="Add customer" onAction={() => setEditing({ name: '', phone: '', email: '', address: '', type: 'Credit' })}>
        <select className="input" value={type} onChange={(event) => setType(event.target.value)} aria-label="Account type">
          <option value="">All accounts</option>
          <option>Cash</option>
          <option>Credit</option>
        </select>
      </Toolbar>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No customers match this search" />
      {editing && <CustomerForm form={editing} onClose={() => setEditing(null)} onSave={save} />}
      {view && <PartyDetail db={db} kind="customer" id={view} onClose={() => setView(null)} />}
      {remove && <Confirm label={remove.name} onClose={() => setRemove(null)} onYes={() => { update((draft) => { draft.customers = draft.customers.filter((row) => row.id !== remove.id) }); toast('Customer deleted'); setRemove(null) }} />}
    </section>
  )
  function save(form) {
    const errors = validateCustomer(form)
    if (hasErrors(errors)) return errors
    update((draft) => {
      const record = { ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim() }
      if (form.id) {
        const index = draft.customers.findIndex((row) => row.id === form.id)
        draft.customers[index] = { ...draft.customers[index], ...record }
      } else draft.customers.push({ ...record, id: uid('c') })
    })
    toast(form.id ? 'Customer updated' : 'Customer added')
    setEditing(null)
    return {}
  }
}

export function VehiclesPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [fuel, setFuel] = useState('')
  const [sort, toggle] = useSort('regNo')
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState(null)
  const [remove, setRemove] = useState(null)
  const rows = useMemo(() => {
    const filtered = db.vehicles.filter((row) => (!fuel || row.fuelType === fuel) && matches(q, row.regNo, row.make, row.model, row.fuelType, liveName(db.customers, row.customerId, row.customerName)))
    return sortBy(filtered, sort, (row, key) => (key === 'customer' ? liveName(db.customers, row.customerId, row.customerName) : key === 'used' ? vehicleConsumption(db, row.id).reduce((sum, item) => sum + item.qty, 0) : row[key]))
  }, [db, q, fuel, sort])
  const columns = [
    { key: 'regNo', label: 'Registration', render: (row) => <strong>{row.regNo}</strong> },
    { key: 'customer', label: 'Customer', render: (row) => liveName(db.customers, row.customerId, row.customerName) },
    { key: 'make', label: 'Vehicle', render: (row) => `${row.make} ${row.model || ''}`.trim() },
    { key: 'fuelType', label: 'Fuel' },
    { key: 'used', label: 'Consumed', render: (row) => vehicleConsumption(db, row.id).map((item) => `${num(item.qty)} ${item.unit} ${item.name}`).join(', ') || '—' },
    { key: 'actions', label: '', sort: false, render: (row) => <RowActions row={row} onView={setView} onEdit={() => setEditing({ ...row })} onDelete={askDelete} /> },
  ]
  function askDelete(row) {
    if (db.sales.some((sale) => sale.vehicleId === row.id)) {
      toast('This vehicle has fuel sales. Keep it so the consumption history stays attached.')
      return
    }
    setRemove(row)
  }
  return (
    <section className="card">
      <Toolbar q={q} setQ={setQ} placeholder="Search registration or owner" action="Add vehicle" onAction={() => setEditing({ regNo: '', customerId: '', make: '', model: '', fuelType: 'Petrol' })}>
        <select className="input" value={fuel} onChange={(event) => setFuel(event.target.value)} aria-label="Fuel type">
          <option value="">All fuels</option>
          {db.products.map((product) => <option key={product.id}>{product.name}</option>)}
        </select>
      </Toolbar>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No vehicles match this search" />
      {editing && <VehicleForm db={db} form={editing} onClose={() => setEditing(null)} />}
      {view && <VehicleDetail db={db} id={view} onClose={() => setView(null)} />}
      {remove && <Confirm label={remove.regNo} onClose={() => setRemove(null)} onYes={() => { update((draft) => { draft.vehicles = draft.vehicles.filter((row) => row.id !== remove.id) }); toast('Vehicle deleted'); setRemove(null) }} />}
    </section>
  )
}

function Toolbar({ q, setQ, placeholder, action, onAction, children }) {
  return (
    <div className="toolbar">
      <input className="input search" value={q} placeholder={placeholder} onChange={(event) => setQ(event.target.value)} aria-label={placeholder} />
      {children}
      <button className="btn primary" onClick={onAction}>{action}</button>
    </div>
  )
}

function RowActions({ row, onView, onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="btn ghost small" onClick={() => onView(row.id)}>View</button>
      <button className="btn ghost small" onClick={() => onEdit(row)}>Edit</button>
      <button className="btn danger small" onClick={() => onDelete(row)}>Delete</button>
    </div>
  )
}

function Confirm({ label, onClose, onYes }) {
  return (
    <Modal title="Delete record" onClose={onClose}>
      <p>Delete {label}? This only removes the directory record.</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn danger" onClick={onYes}>Delete</button>
      </div>
    </Modal>
  )
}

function PartyForm({ title, form, onClose, onSave }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  return (
    <Modal title={title} onClose={onClose}>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setErrors(onSave(draft) || {}) }}>
        <Field label="Name" error={errors.name}><input className="input" value={draft.name} onChange={set('name')} /></Field>
        <Field label="Phone" error={errors.phone}><input className="input" value={draft.phone} onChange={set('phone')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" value={draft.email} onChange={set('email')} /></Field>
        <Field label="Company" error={errors.company}><input className="input" value={draft.company} onChange={set('company')} /></Field>
        <Field label="Address" error={errors.address}><input className="input" value={draft.address} onChange={set('address')} /></Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save supplier</button></div>
      </form>
    </Modal>
  )
}

function CustomerForm({ form, onClose, onSave }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  return (
    <Modal title={form.id ? 'Edit customer' : 'Add customer'} onClose={onClose}>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setErrors(onSave(draft) || {}) }}>
        <Field label="Name" error={errors.name}><input className="input" value={draft.name} onChange={set('name')} /></Field>
        <Field label="Phone" error={errors.phone}><input className="input" value={draft.phone} onChange={set('phone')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" value={draft.email} onChange={set('email')} /></Field>
        <Field label="Account" error={errors.type}>
          <select className="input" value={draft.type} onChange={set('type')}><option>Cash</option><option>Credit</option></select>
        </Field>
        <Field label="Address" error={errors.address}><input className="input" value={draft.address} onChange={set('address')} /></Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save customer</button></div>
      </form>
    </Modal>
  )
}

function VehicleForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  function save(event) {
    event.preventDefault()
    const next = validateVehicle(db, draft, draft.id)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = { ...draft, regNo: draft.regNo.trim().toUpperCase(), make: draft.make.trim(), model: draft.model.trim(), customerName: snapshotParty(store.customers, draft.customerId) }
      if (draft.id) {
        const index = store.vehicles.findIndex((row) => row.id === draft.id)
        store.vehicles[index] = { ...store.vehicles[index], ...record }
      } else store.vehicles.push({ ...record, id: uid('v') })
    })
    toast(draft.id ? 'Vehicle updated' : 'Vehicle registered')
    onClose()
  }
  return (
    <Modal title={form.id ? 'Edit vehicle' : 'Register vehicle'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Registration" error={errors.regNo}><input className="input" value={draft.regNo} onChange={set('regNo')} /></Field>
        <Field label="Customer" error={errors.customerId}>
          <select className="input" value={draft.customerId} onChange={set('customerId')}><option value="">Choose</option>{db.customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Make" error={errors.make}><input className="input" value={draft.make} onChange={set('make')} /></Field>
        <Field label="Model"><input className="input" value={draft.model} onChange={set('model')} /></Field>
        <Field label="Fuel" error={errors.fuelType}>
          <select className="input" value={draft.fuelType} onChange={set('fuelType')}>{db.products.map((row) => <option key={row.id}>{row.name}</option>)}</select>
        </Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save vehicle</button></div>
      </form>
    </Modal>
  )
}

function PartyDetail({ db, kind, id, onClose }) {
  const list = kind === 'customer' ? db.customers : db.suppliers
  const party = byId(list, id)
  const doc = buildReport(db, kind, kind === 'customer' ? { customerId: id } : { supplierId: id })
  const [pay, setPay] = useState({ date: todayISO(), amount: '', ref: '', note: '' })
  const [errors, setErrors] = useState({})
  if (!party) return null
  function savePayment(event) {
    event.preventDefault()
    const next = validatePayment(pay)
    if (hasErrors(next)) { setErrors(next); return }
    update((draft) => {
      draft.payments.push({ id: uid('py'), date: pay.date, partyType: kind, partyId: id, partyName: party.name, amount: Number(pay.amount), ref: pay.ref.trim(), note: pay.note.trim() })
    })
    toast('Payment recorded')
    setPay({ date: todayISO(), amount: '', ref: '', note: '' })
  }
  return (
    <Modal title={party.name} onClose={onClose} wide>
      <p className="help">{party.phone}{party.address ? ` · ${party.address}` : ''}</p>
      <div className="row-actions" style={{ margin: '10px 0' }}>
        <button className="btn ghost small" onClick={() => downloadDocument(doc)}>Download PDF</button>
        <button className="btn ghost small" onClick={() => requestPrint(doc)}>Print</button>
      </div>
      <ReportView doc={doc} />
      <h3 style={{ marginTop: 14 }}>Record payment</h3>
      <form className="form-grid" onSubmit={savePayment}>
        <Field label="Date" error={errors.date}><input className="input" type="date" value={pay.date} onChange={(event) => setPay({ ...pay, date: event.target.value })} /></Field>
        <Field label="Amount" error={errors.amount}><input className="input" type="number" min="0" step="0.01" value={pay.amount} onChange={(event) => setPay({ ...pay, amount: event.target.value })} /></Field>
        <Field label="Reference"><input className="input" value={pay.ref} onChange={(event) => setPay({ ...pay, ref: event.target.value })} /></Field>
        <Field label="Note"><input className="input" value={pay.note} onChange={(event) => setPay({ ...pay, note: event.target.value })} /></Field>
        <div className="modal-actions wide"><button className="btn primary" type="submit">Save payment</button></div>
      </form>
    </Modal>
  )
}

function VehicleDetail({ db, id, onClose }) {
  const vehicle = byId(db.vehicles, id)
  if (!vehicle) return null
  const sales = db.sales.filter((sale) => sale.vehicleId === id)
  const usage = vehicleConsumption(db, id)
  return (
    <Modal title={vehicle.regNo} onClose={onClose} wide>
      <p className="help">{vehicle.make} {vehicle.model} · {vehicle.fuelType} · {liveName(db.customers, vehicle.customerId, vehicle.customerName)}</p>
      <div className="totals">
        {usage.map((item) => <div key={item.productId}><span>{item.name}</span><strong>{num(item.qty)} {item.unit}</strong></div>)}
        {usage.length === 0 && <div><span>Consumption</span><strong>No fuel recorded</strong></div>}
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Detail</th><th>Amount</th></tr></thead>
          <tbody>
            {sales.length === 0 ? <tr><td className="empty" colSpan="4">No transactions for this vehicle</td></tr> : sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.date)}</td>
                <td>{sale.invoiceNo}</td>
                <td>{sale.items.map((item) => `${item.productName} ${num(item.qty)}`).join(', ')}</td>
                <td>{money(sale.items.reduce((sum, item) => sum + item.qty * item.rate, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
