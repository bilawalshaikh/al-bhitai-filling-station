import { useEffect, useMemo, useRef, useState } from 'react'
import { requestPrint, toast } from '../bus.js'
import {
  blankItem,
  byId,
  formatDate,
  hasErrors,
  invoiceDocument,
  lineTotal,
  liveName,
  liveReg,
  matches,
  money,
  nextInvoice,
  nextOrder,
  num,
  tankLevel,
  todayISO,
  uid,
  validateOrder,
  validateSale,
} from '../logic.js'
import { downloadDocument } from '../pdf.js'
import { update, useDB } from '../store.js'
import { Badge, DataTable, Field, Modal, ReportView, sortBy, useSort } from '../ui.jsx'

export function SalesPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [productId, setProductId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, toggle] = useSort('date', -1)
  const [editing, setEditing] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [remove, setRemove] = useState(null)
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    if (params.get('new') === '1') {
      setEditing(emptySale(db))
      window.history.replaceState(null, '', '#/sales')
    }
  }, [db])
  const rows = useMemo(() => {
    const filtered = db.sales.filter((sale) => {
      if (from && sale.date < from) return false
      if (to && sale.date > to) return false
      if (productId && !sale.items.some((item) => item.productId === productId)) return false
      const detail = sale.items.map((item) => `${item.productName} ${item.tankName}`).join(' ')
      return matches(q, sale.invoiceNo, sale.note, detail, liveName(db.customers, sale.customerId, sale.customerName), liveReg(db.vehicles, sale.vehicleId, sale.vehicleReg))
    })
    return sortBy(filtered, sort, (sale, key) => {
      if (key === 'total') return lineTotal(sale)
      if (key === 'balance') return lineTotal(sale) - Number(sale.paid || 0)
      if (key === 'customer') return liveName(db.customers, sale.customerId, sale.customerName)
      return sale[key]
    })
  }, [db, q, productId, from, to, sort])
  const view = db.sales.find((sale) => sale.id === viewId)
  const columns = [
    { key: 'invoiceNo', label: 'Invoice' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'customer', label: 'Customer', render: (row) => liveName(db.customers, row.customerId, row.customerName) },
    { key: 'vehicle', label: 'Vehicle', render: (row) => liveReg(db.vehicles, row.vehicleId, row.vehicleReg) },
    { key: 'detail', label: 'Fuel', sort: false, render: (row) => row.items.map((item) => `${liveName(db.products, item.productId, item.productName)} ${num(item.qty)}`).join(', ') },
    { key: 'total', label: 'Total', align: 'num', render: (row) => money(lineTotal(row)) },
    { key: 'balance', label: 'Balance', align: 'num', render: (row) => money(lineTotal(row) - Number(row.paid || 0)) },
    { key: 'actions', label: '', sort: false, render: (row) => (
      <div className="row-actions">
        <button className="btn ghost small" onClick={() => setViewId(row.id)}>Invoice</button>
        <button className="btn ghost small" onClick={() => downloadDocument(invoiceDocument(db, row))}>PDF</button>
        <button className="btn ghost small" onClick={() => setEditing({ ...row, paid: row.paid, items: row.items.map((item) => ({ ...item })) })}>Edit</button>
        <button className="btn danger small" onClick={() => setRemove(row)}>Delete</button>
      </div>
    ) },
  ]
  return (
    <section className="card">
      <div className="toolbar">
        <input className="input search" value={q} placeholder="Search invoices" aria-label="Search invoices" onChange={(event) => setQ(event.target.value)} />
        <select className="input" value={productId} onChange={(event) => setProductId(event.target.value)} aria-label="Product">
          <option value="">All products</option>
          {db.products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
        <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
        <button className="btn primary" onClick={() => setEditing(emptySale(db))}>Record sale</button>
      </div>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No sales match this filter" />
      {editing && <SaleForm db={db} form={editing} onClose={() => setEditing(null)} />}
      {view && (
        <Modal title={view.invoiceNo} onClose={() => setViewId(null)} wide>
          <div className="row-actions" style={{ marginBottom: 10 }}>
            <button className="btn ghost small" onClick={() => downloadDocument(invoiceDocument(db, view))}>Download PDF</button>
            <button className="btn ghost small" onClick={() => requestPrint(invoiceDocument(db, view))}>Print</button>
          </div>
          <ReportView doc={invoiceDocument(db, view)} />
        </Modal>
      )}
      {remove && (
        <Modal title="Delete sale" onClose={() => setRemove(null)}>
          <p>Delete {remove.invoiceNo}? The fuel returns to the tank.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRemove(null)}>Cancel</button>
            <button className="btn danger" onClick={() => { update((draft) => { draft.sales = draft.sales.filter((row) => row.id !== remove.id) }); toast('Sale deleted'); setRemove(null) }}>Delete</button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function emptySale(db) {
  return { date: todayISO(), customerId: '', vehicleId: '', paid: '', note: '', items: [blankItem(db)] }
}

function SaleForm({ db, form, onClose, orderId }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const total = (draft.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0), 0)
  const vehicles = db.vehicles.filter((row) => row.customerId === draft.customerId)
  function setItem(index, patch) {
    const items = draft.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    setDraft({ ...draft, items })
  }
  function chooseProduct(index, productId) {
    const product = byId(db.products, productId)
    const tank = db.tanks.find((row) => row.productId === productId)
    setItem(index, { productId, tankId: tank?.id || '', rate: product?.salePrice ?? '' })
  }
  function save(event) {
    event.preventDefault()
    const next = validateSale(db, draft, draft.id)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = {
        id: draft.id || uid('sa'),
        invoiceNo: draft.invoiceNo || nextInvoice(store),
        date: draft.date,
        customerId: draft.customerId,
        customerName: byId(store.customers, draft.customerId)?.name || '',
        vehicleId: draft.vehicleId || '',
        vehicleReg: byId(store.vehicles, draft.vehicleId)?.regNo || '',
        paid: Number(draft.paid || 0),
        note: draft.note.trim(),
        orderId: orderId || draft.orderId || '',
        items: draft.items.map((item) => ({
          productId: item.productId,
          tankId: item.tankId,
          qty: Number(item.qty),
          rate: Number(item.rate),
          productName: byId(store.products, item.productId)?.name || '',
          tankName: byId(store.tanks, item.tankId)?.name || '',
          unit: byId(store.products, item.productId)?.unit || '',
        })),
      }
      if (draft.id) {
        const index = store.sales.findIndex((row) => row.id === draft.id)
        store.sales[index] = record
      } else store.sales.push(record)
      if (orderId) {
        const order = store.orders.find((row) => row.id === orderId)
        if (order) order.status = 'Delivered'
      }
    })
    toast(draft.id ? 'Invoice updated' : 'Sale recorded')
    onClose()
  }
  const itemErrors = errors.itemErrors || []
  return (
    <Modal title={form.invoiceNo || 'Record sale'} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Date" error={errors.date}><input className="input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Customer" error={errors.customerId}>
            <select className="input" value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value, vehicleId: '' })}>
              <option value="">Choose</option>
              {db.customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Vehicle">
            <select className="input" value={draft.vehicleId} onChange={(event) => setDraft({ ...draft, vehicleId: event.target.value })}>
              <option value="">No vehicle</option>
              {vehicles.map((row) => <option key={row.id} value={row.id}>{row.regNo}</option>)}
            </select>
          </Field>
          <Field label="Paid now" error={errors.paid}>
            <input className="input" type="number" min="0" step="0.01" value={draft.paid} onChange={(event) => setDraft({ ...draft, paid: event.target.value })} />
          </Field>
        </div>
        <div className="line-head" style={{ marginTop: 14 }}><span>Product</span><span>Tank</span><span>Quantity</span><span>Rate</span><span /></div>
        {draft.items.map((item, index) => {
          const tanks = db.tanks.filter((row) => row.productId === item.productId)
          const available = item.tankId ? tankLevel(db, item.tankId, { ignoreSaleId: form.id }) : 0
          return (
            <div key={index}>
              <div className="line">
                <Field label="" error={itemErrors[index]?.productId}>
                  <select className="input" value={item.productId} onChange={(event) => chooseProduct(index, event.target.value)} aria-label="Product">
                    {db.products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="" error={itemErrors[index]?.tankId}>
                  <select className="input" value={item.tankId} onChange={(event) => setItem(index, { tankId: event.target.value })} aria-label="Tank">
                    <option value="">Choose</option>
                    {tanks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="" error={itemErrors[index]?.qty}>
                  <input className="input" type="number" min="0" step="0.01" value={item.qty} onChange={(event) => setItem(index, { qty: event.target.value })} aria-label="Quantity" />
                </Field>
                <Field label="" error={itemErrors[index]?.rate}>
                  <input className="input" type="number" min="0" step="0.01" value={item.rate} onChange={(event) => setItem(index, { rate: event.target.value })} aria-label="Rate" />
                </Field>
                <button className="btn ghost small" type="button" onClick={() => draft.items.length > 1 && setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
              </div>
              <p className="help">Available in this tank: {num(available)}</p>
            </div>
          )
        })}
        {errors.items && <p className="help">{errors.items}</p>}
        <div className="row-actions" style={{ marginTop: 8 }}>
          <button className="btn ghost small" type="button" onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem(db)] })}>Add line</button>
          <button className="btn ghost small" type="button" onClick={() => setDraft({ ...draft, paid: String(Math.round(total * 100) / 100) })}>Collect full amount</button>
        </div>
        <Field label="Note"><textarea className="input" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></Field>
        <div className="totals">
          <div><span>Total</span><strong>{money(total)}</strong></div>
          <div><span>Balance</span><strong>{money(total - Number(draft.paid || 0))}</strong></div>
        </div>
        <div className="modal-actions"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save invoice</button></div>
      </form>
    </Modal>
  )
}

export function OrdersPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sort, toggle] = useSort('date', -1)
  const [editing, setEditing] = useState(null)
  const [fulfil, setFulfil] = useState(null)
  const [remove, setRemove] = useState(null)
  const rows = useMemo(() => {
    const filtered = db.orders.filter((row) => (!status || row.status === status) && matches(q, row.orderNo, row.note, row.status, liveName(db.customers, row.customerId, row.customerName), liveName(db.products, row.productId, row.productName)))
    return sortBy(filtered, sort, (row, key) => (key === 'customer' ? liveName(db.customers, row.customerId, row.customerName) : row[key]))
  }, [db, q, status, sort])
  const columns = [
    { key: 'orderNo', label: 'Order' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'customer', label: 'Customer', render: (row) => liveName(db.customers, row.customerId, row.customerName) },
    { key: 'product', label: 'Product', render: (row) => `${liveName(db.products, row.productId, row.productName)} · ${num(row.qty)}` },
    { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status.toLowerCase()}>{row.status}</Badge> },
    { key: 'note', label: 'Note' },
    { key: 'actions', label: '', sort: false, render: (row) => (
      <div className="row-actions">
        {row.status !== 'Delivered' && row.status !== 'Cancelled' && <button className="btn primary small" onClick={() => setFulfil(fulfilForm(db, row))}>Create sale</button>}
        <button className="btn ghost small" onClick={() => setEditing({ ...row })}>Edit</button>
        <button className="btn danger small" onClick={() => setRemove(row)}>Delete</button>
      </div>
    ) },
  ]
  return (
    <section className="card">
      <div className="toolbar">
        <input className="input search" value={q} placeholder="Search orders" aria-label="Search orders" onChange={(event) => setQ(event.target.value)} />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {['Pending', 'Confirmed', 'Delivered', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="btn primary" onClick={() => setEditing({ date: todayISO(), customerId: '', productId: db.products[0]?.id || '', qty: '', status: 'Pending', note: '' })}>Create order</button>
      </div>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No orders match this filter" />
      {editing && <OrderForm db={db} form={editing} onClose={() => setEditing(null)} />}
      {fulfil && <SaleForm db={db} form={fulfil} orderId={fulfil.orderId} onClose={() => setFulfil(null)} />}
      {remove && (
        <Modal title="Delete order" onClose={() => setRemove(null)}>
          <p>Delete {remove.orderNo}? A sale already created from it will stay in the sales history.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRemove(null)}>Cancel</button>
            <button className="btn danger" onClick={() => { update((draft) => { draft.orders = draft.orders.filter((row) => row.id !== remove.id) }); toast('Order deleted'); setRemove(null) }}>Delete</button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function fulfilForm(db, order) {
  const product = byId(db.products, order.productId)
  const tank = db.tanks.find((row) => row.productId === order.productId)
  const rate = product?.salePrice || 0
  return {
    orderId: order.id,
    date: todayISO(),
    customerId: order.customerId,
    vehicleId: '',
    paid: String(Math.round(Number(order.qty) * rate * 100) / 100),
    note: order.note || '',
    items: [{ productId: order.productId, tankId: tank?.id || '', qty: order.qty, rate }],
  }
}

function OrderForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  function save(event) {
    event.preventDefault()
    const next = validateOrder(draft)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = { ...draft, qty: Number(draft.qty), note: draft.note.trim(), customerName: byId(store.customers, draft.customerId)?.name || '', productName: byId(store.products, draft.productId)?.name || '' }
      if (draft.id) {
        const index = store.orders.findIndex((row) => row.id === draft.id)
        store.orders[index] = { ...store.orders[index], ...record }
      } else store.orders.push({ ...record, id: uid('o'), orderNo: nextOrder(store) })
    })
    toast(draft.id ? 'Order updated' : 'Order created')
    onClose()
  }
  return (
    <Modal title={form.orderNo || 'Create order'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Date" error={errors.date}><input className="input" type="date" value={draft.date} onChange={set('date')} /></Field>
        <Field label="Customer" error={errors.customerId}>
          <select className="input" value={draft.customerId} onChange={set('customerId')}><option value="">Choose</option>{db.customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Product" error={errors.productId}>
          <select className="input" value={draft.productId} onChange={set('productId')}>{db.products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Quantity" error={errors.qty}><input className="input" type="number" min="0" step="0.01" value={draft.qty} onChange={set('qty')} /></Field>
        <Field label="Status" error={errors.status}>
          <select className="input" value={draft.status} onChange={set('status')}>{['Pending', 'Confirmed', 'Delivered', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}</select>
        </Field>
        <Field label="Note"><textarea className="input" value={draft.note} onChange={set('note')} /></Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save order</button></div>
      </form>
    </Modal>
  )
}
