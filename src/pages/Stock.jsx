import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '../bus.js'
import {
  byId,
  formatDate,
  hasErrors,
  liveName,
  matches,
  money,
  nextPurchase,
  num,
  productStats,
  purchaseTotal,
  supplierBalance,
  tankLevel,
  todayISO,
  uid,
  validateAdjustment,
  validateProduct,
  validatePurchase,
  validateTank,
} from '../logic.js'
import { update, useDB } from '../store.js'
import { Badge, DataTable, Field, Modal, sortBy, useSort } from '../ui.jsx'

export function ProductsPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [sort, toggle] = useSort('name')
  const [editing, setEditing] = useState(null)
  const rows = useMemo(() => {
    const filtered = db.products.filter((row) => matches(q, row.name, row.category, row.unit))
    return sortBy(filtered, sort, (row, key) => {
      const stats = productStats(db, row.id)
      if (key === 'onHand') return stats.onHand
      if (key === 'profit') return stats.profit
      if (key === 'revenue') return stats.revenue
      return row[key] ?? stats[key]
    })
  }, [db, q, sort])
  const columns = [
    { key: 'name', label: 'Product', render: (row) => <strong>{row.name}</strong> },
    { key: 'category', label: 'Category' },
    { key: 'salePrice', label: 'Sale price', align: 'num', render: (row) => `${money(row.salePrice)} / ${row.unit}` },
    { key: 'purchased', label: 'Purchased', align: 'num', render: (row) => num(productStats(db, row.id).purchased) },
    { key: 'sold', label: 'Sold', align: 'num', render: (row) => num(productStats(db, row.id).sold) },
    { key: 'onHand', label: 'On hand', align: 'num', render: (row) => num(productStats(db, row.id).onHand) },
    { key: 'profit', label: 'Profit', align: 'num', render: (row) => money(productStats(db, row.id).profit) },
    { key: 'actions', label: '', sort: false, render: (row) => (
      <div className="row-actions">
        <button className="btn ghost small" onClick={() => setEditing({ ...row })}>Edit</button>
        <button className="btn danger small" onClick={() => remove(row)}>Delete</button>
      </div>
    ) },
  ]
  function remove(row) {
    const used = db.tanks.some((tank) => tank.productId === row.id) || db.purchases.some((item) => item.productId === row.id) || db.sales.some((sale) => sale.items.some((item) => item.productId === row.id)) || db.orders.some((item) => item.productId === row.id)
    if (used) { toast('This product is used by tanks or transactions. Edit the price instead of deleting it.'); return }
    update((draft) => { draft.products = draft.products.filter((item) => item.id !== row.id) })
    toast('Product deleted')
  }
  return (
    <section className="card">
      <div className="toolbar">
        <input className="input search" value={q} placeholder="Search products" aria-label="Search products" onChange={(event) => setQ(event.target.value)} />
        <button className="btn primary" onClick={() => setEditing({ name: '', unit: 'L', salePrice: '', category: 'Fuel' })}>Add product</button>
      </div>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} />
      {editing && <ProductForm db={db} form={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function ProductForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  function save(event) {
    event.preventDefault()
    const next = validateProduct(db, draft, draft.id)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = { ...draft, name: draft.name.trim(), unit: draft.unit.trim(), category: draft.category.trim(), salePrice: Number(draft.salePrice) }
      if (draft.id) {
        const index = store.products.findIndex((row) => row.id === draft.id)
        store.products[index] = { ...store.products[index], ...record }
      } else store.products.push({ ...record, id: uid('p') })
    })
    toast(draft.id ? 'Product updated' : 'Product added')
    onClose()
  }
  return (
    <Modal title={form.id ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Name" error={errors.name}><input className="input" value={draft.name} onChange={set('name')} /></Field>
        <Field label="Category" error={errors.category}><input className="input" value={draft.category} onChange={set('category')} /></Field>
        <Field label="Unit" error={errors.unit}><input className="input" value={draft.unit} onChange={set('unit')} /></Field>
        <Field label="Sale price" error={errors.salePrice}><input className="input" type="number" min="0" step="0.01" value={draft.salePrice} onChange={set('salePrice')} /></Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save product</button></div>
      </form>
    </Modal>
  )
}

export function TanksPage() {
  const db = useDB()
  const [editing, setEditing] = useState(null)
  const [adjust, setAdjust] = useState(null)
  const [tankId, setTankId] = useState('')
  const movements = useMemo(() => {
    const rows = []
    for (const row of db.purchases) rows.push({ id: row.id, date: row.date, tankId: row.tankId, type: 'Purchase', qty: Number(row.qty), detail: row.purchaseNo })
    db.sales.forEach((sale) => sale.items.forEach((item, index) => rows.push({ id: `${sale.id}-${index}`, date: sale.date, tankId: item.tankId, type: 'Sale', qty: -Number(item.qty), detail: sale.invoiceNo })))
    for (const row of db.adjustments) rows.push({ id: row.id, date: row.date, tankId: row.tankId, type: 'Adjustment', qty: Number(row.qty), detail: row.reason })
    return rows.filter((row) => !tankId || row.tankId === tankId).sort((a, b) => b.date.localeCompare(a.date))
  }, [db, tankId])
  function remove(tank) {
    const used = db.purchases.some((row) => row.tankId === tank.id) || db.sales.some((sale) => sale.items.some((item) => item.tankId === tank.id)) || db.adjustments.some((row) => row.tankId === tank.id)
    if (used) { toast('This tank has stock movements. Keep it so the dip history stays accurate.'); return }
    update((draft) => { draft.tanks = draft.tanks.filter((row) => row.id !== tank.id) })
    toast('Tank deleted')
  }
  return (
    <div>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setEditing({ name: '', productId: db.products[0]?.id || '', capacity: '', reorderLevel: '' })}>Add tank</button>
        <button className="btn ghost" onClick={() => setAdjust({ date: todayISO(), tankId: db.tanks[0]?.id || '', qty: '', reason: '' })}>Adjust stock</button>
      </div>
      <div className="tank-grid">
        {db.tanks.map((tank) => {
          const level = tankLevel(db, tank.id)
          const product = byId(db.products, tank.productId)
          const low = level <= Number(tank.reorderLevel)
          const pct = tank.capacity ? Math.max(0, Math.min(100, (level / tank.capacity) * 100)) : 0
          return (
            <article className="card" key={tank.id}>
              <div className="card-head"><h3>{tank.name}</h3>{low ? <Badge tone="low">Low</Badge> : <Badge tone="ok">Healthy</Badge>}</div>
              <p className="help">{product?.name} · {num(level)} / {num(tank.capacity)} {product?.unit}</p>
              <div className={`meter${low ? ' low' : ''}`}><span style={{ width: `${pct}%` }} /></div>
              <p className="help">Reorder at {num(tank.reorderLevel)} {product?.unit}</p>
              <div className="row-actions">
                <button className="btn ghost small" onClick={() => setEditing({ ...tank })}>Edit</button>
                <button className="btn danger small" onClick={() => remove(tank)}>Delete</button>
              </div>
            </article>
          )
        })}
      </div>
      <section className="card">
        <div className="toolbar">
          <select className="input" value={tankId} onChange={(event) => setTankId(event.target.value)} aria-label="Filter movements">
            <option value="">All tanks</option>
            {db.tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.name}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Tank</th><th>Type</th><th>Quantity</th><th>Detail</th></tr></thead>
            <tbody>
              {movements.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{liveName(db.tanks, row.tankId)}</td>
                  <td>{row.type}</td>
                  <td>{row.qty > 0 ? `+${num(row.qty)}` : num(row.qty)}</td>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editing && <TankForm db={db} form={editing} onClose={() => setEditing(null)} />}
      {adjust && <AdjustForm db={db} form={adjust} onClose={() => setAdjust(null)} />}
    </div>
  )
}

function TankForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  function save(event) {
    event.preventDefault()
    const next = validateTank(db, draft, draft.id)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = { ...draft, name: draft.name.trim(), capacity: Number(draft.capacity), reorderLevel: Number(draft.reorderLevel) }
      if (draft.id) {
        const index = store.tanks.findIndex((row) => row.id === draft.id)
        store.tanks[index] = { ...store.tanks[index], ...record }
      } else store.tanks.push({ ...record, id: uid('t') })
    })
    toast(draft.id ? 'Tank updated' : 'Tank added')
    onClose()
  }
  return (
    <Modal title={form.id ? 'Edit tank' : 'Add tank'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Name" error={errors.name}><input className="input" value={draft.name} onChange={set('name')} /></Field>
        <Field label="Product" error={errors.productId}>
          <select className="input" value={draft.productId} onChange={set('productId')}>{db.products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Capacity" error={errors.capacity}><input className="input" type="number" min="0" step="0.01" value={draft.capacity} onChange={set('capacity')} /></Field>
        <Field label="Reorder level" error={errors.reorderLevel}><input className="input" type="number" min="0" step="0.01" value={draft.reorderLevel} onChange={set('reorderLevel')} /></Field>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save tank</button></div>
      </form>
    </Modal>
  )
}

function AdjustForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })
  function save(event) {
    event.preventDefault()
    const next = validateAdjustment(db, draft)
    if (hasErrors(next)) { setErrors(next); return }
    const tank = byId(db.tanks, draft.tankId)
    update((store) => {
      store.adjustments.push({ id: uid('ad'), date: draft.date, tankId: draft.tankId, productId: tank.productId, qty: Number(draft.qty), reason: draft.reason.trim() })
    })
    toast('Stock adjustment recorded')
    onClose()
  }
  return (
    <Modal title="Stock adjustment" onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Date" error={errors.date}><input className="input" type="date" value={draft.date} onChange={set('date')} /></Field>
        <Field label="Tank" error={errors.tankId}>
          <select className="input" value={draft.tankId} onChange={set('tankId')}>{db.tanks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Quantity" error={errors.qty}><input className="input" type="number" step="0.01" value={draft.qty} onChange={set('qty')} placeholder="Use a minus to deduct" /></Field>
        <Field label="Reason" error={errors.reason}><input className="input" value={draft.reason} onChange={set('reason')} /></Field>
        <p className="help wide">Positive quantities add fuel. Negative quantities deduct it. The tank cannot go below zero or above capacity.</p>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save adjustment</button></div>
      </form>
    </Modal>
  )
}

export function PurchasesPage() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [sort, toggle] = useSort('date', -1)
  const [editing, setEditing] = useState(null)
  const [remove, setRemove] = useState(null)
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    if (params.get('new') === '1') {
      setEditing(emptyPurchase(db))
      window.history.replaceState(null, '', '#/purchases')
    }
  }, [db])
  const rows = useMemo(() => {
    const filtered = db.purchases.filter((row) => (!supplierId || row.supplierId === supplierId) && matches(q, row.purchaseNo, row.note, liveName(db.suppliers, row.supplierId, row.supplierName), liveName(db.products, row.productId, row.productName)))
    return sortBy(filtered, sort, (row, key) => (key === 'amount' ? purchaseTotal(row) : key === 'supplier' ? liveName(db.suppliers, row.supplierId, row.supplierName) : row[key]))
  }, [db, q, supplierId, sort])
  const columns = [
    { key: 'purchaseNo', label: 'Purchase' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'supplier', label: 'Supplier', render: (row) => liveName(db.suppliers, row.supplierId, row.supplierName) },
    { key: 'productId', label: 'Product', render: (row) => `${liveName(db.products, row.productId, row.productName)} · ${num(row.qty)}` },
    { key: 'amount', label: 'Amount', align: 'num', render: (row) => money(purchaseTotal(row)) },
    { key: 'paid', label: 'Paid', align: 'num', render: (row) => money(row.paid) },
    { key: 'due', label: 'Due', align: 'num', render: (row) => money(purchaseTotal(row) - Number(row.paid || 0)) },
    { key: 'actions', label: '', sort: false, render: (row) => (
      <div className="row-actions">
        <button className="btn ghost small" onClick={() => setEditing({ ...row })}>Edit</button>
        <button className="btn danger small" onClick={() => setRemove(row)}>Delete</button>
      </div>
    ) },
  ]
  function confirmRemove() {
    const nextLevel = tankLevel(db, remove.tankId, { ignorePurchaseId: remove.id })
    if (nextLevel < -1e-9) { toast('This delivery has already been sold. Edit the related sales before deleting it.'); setRemove(null); return }
    update((draft) => { draft.purchases = draft.purchases.filter((row) => row.id !== remove.id) })
    toast('Purchase deleted')
    setRemove(null)
  }
  return (
    <section className="card">
      <div className="toolbar">
        <input className="input search" value={q} placeholder="Search purchases" aria-label="Search purchases" onChange={(event) => setQ(event.target.value)} />
        <select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} aria-label="Supplier">
          <option value="">All suppliers</option>
          {db.suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <button className="btn primary" onClick={() => setEditing(emptyPurchase(db))}>Record purchase</button>
      </div>
      <DataTable columns={columns} rows={rows} sort={sort} onSort={toggle} empty="No purchases match this filter" />
      {editing && <PurchaseForm db={db} form={editing} onClose={() => setEditing(null)} />}
      {remove && (
        <Modal title="Delete purchase" onClose={() => setRemove(null)}>
          <p>Delete {remove.purchaseNo}? Stock for that delivery will be removed.</p>
          <p className="help">Current supplier balance: {money(supplierBalance(db, remove.supplierId))}</p>
          <div className="modal-actions"><button className="btn ghost" onClick={() => setRemove(null)}>Cancel</button><button className="btn danger" onClick={confirmRemove}>Delete</button></div>
        </Modal>
      )}
    </section>
  )
}

function emptyPurchase(db) {
  const product = db.products[0]
  const tank = db.tanks.find((row) => row.productId === product?.id)
  return { date: todayISO(), supplierId: '', productId: product?.id || '', tankId: tank?.id || '', qty: '', rate: '', paid: '', note: '' }
}

function PurchaseForm({ db, form, onClose }) {
  const [draft, setDraft] = useState(form)
  const [errors, setErrors] = useState({})
  const total = (Number(draft.qty) || 0) * (Number(draft.rate) || 0)
  const tanks = db.tanks.filter((row) => row.productId === draft.productId)
  function setProduct(productId) {
    const tank = db.tanks.find((row) => row.productId === productId)
    const last = [...db.purchases].reverse().find((row) => row.productId === productId)
    setDraft({ ...draft, productId, tankId: tank?.id || '', rate: last?.rate ?? '' })
  }
  function save(event) {
    event.preventDefault()
    const next = validatePurchase(db, draft, draft.id)
    if (hasErrors(next)) { setErrors(next); return }
    update((store) => {
      const record = {
        ...draft,
        qty: Number(draft.qty),
        rate: Number(draft.rate),
        paid: Number(draft.paid || 0),
        note: draft.note.trim(),
        supplierName: byId(store.suppliers, draft.supplierId)?.name || '',
        productName: byId(store.products, draft.productId)?.name || '',
        tankName: byId(store.tanks, draft.tankId)?.name || '',
        unit: byId(store.products, draft.productId)?.unit || '',
      }
      if (draft.id) {
        const index = store.purchases.findIndex((row) => row.id === draft.id)
        store.purchases[index] = { ...store.purchases[index], ...record }
      } else store.purchases.push({ ...record, id: uid('pu'), purchaseNo: nextPurchase(store) })
    })
    toast(draft.id ? 'Purchase updated' : 'Purchase recorded')
    onClose()
  }
  return (
    <Modal title={form.id ? 'Edit purchase' : 'Record purchase'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Date" error={errors.date}><input className="input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
        <Field label="Supplier" error={errors.supplierId}>
          <select className="input" value={draft.supplierId} onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}><option value="">Choose</option>{db.suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Product" error={errors.productId}>
          <select className="input" value={draft.productId} onChange={(event) => setProduct(event.target.value)}>{db.products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Tank" error={errors.tankId}>
          <select className="input" value={draft.tankId} onChange={(event) => setDraft({ ...draft, tankId: event.target.value })}><option value="">Choose</option>{tanks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        </Field>
        <Field label="Quantity" error={errors.qty}><input className="input" type="number" min="0" step="0.01" value={draft.qty} onChange={(event) => setDraft({ ...draft, qty: event.target.value })} /></Field>
        <Field label="Rate" error={errors.rate}><input className="input" type="number" min="0" step="0.01" value={draft.rate} onChange={(event) => setDraft({ ...draft, rate: event.target.value })} /></Field>
        <Field label="Paid now" error={errors.paid}><input className="input" type="number" min="0" step="0.01" value={draft.paid} onChange={(event) => setDraft({ ...draft, paid: event.target.value })} /></Field>
        <Field label="Note"><input className="input" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></Field>
        <p className="help wide">Total {money(total)} · Due {money(total - Number(draft.paid || 0))}</p>
        <div className="modal-actions wide"><button className="btn ghost" type="button" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">Save purchase</button></div>
      </form>
    </Modal>
  )
}
