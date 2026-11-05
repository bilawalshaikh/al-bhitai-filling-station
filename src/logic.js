export const STATION = {
  name: 'Al Bhitai Filling Station',
  line: 'Main National Highway, Bhit Shah Road',
  city: 'Matiari, Sindh',
  phone: '022-276-4100',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function todayISO() {
  return toISO(new Date())
}

export function toISO(dt) {
  const z = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`
}

export function shiftISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return toISO(dt)
}

export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

export function weekStart(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = (dt.getDay() + 6) % 7
  dt.setDate(dt.getDate() - day)
  return toISO(dt)
}

export function money(n) {
  const v = Number(n) || 0
  return `Rs ${v.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

export function num(n) {
  return Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function byId(list, id) {
  return (list || []).find((row) => row.id === id)
}

export function liveName(list, id, snapshot) {
  return byId(list, id)?.name || snapshot || '—'
}

export function liveReg(list, id, snapshot) {
  return byId(list, id)?.regNo || snapshot || '—'
}

export function inRange(date, from, to) {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function matches(query, ...parts) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return parts.some((part) => String(part || '').toLowerCase().includes(q))
}

export function lineTotal(sale) {
  return (sale.items || []).reduce((sum, item) => sum + Number(item.qty) * Number(item.rate), 0)
}

export function purchaseTotal(row) {
  return Number(row.qty) * Number(row.rate)
}

export function tankLevel(db, tankId, opts = {}) {
  let level = 0
  for (const row of db.purchases) {
    if (row.tankId === tankId && row.id !== opts.ignorePurchaseId) level += Number(row.qty)
  }
  for (const sale of db.sales) {
    if (sale.id === opts.ignoreSaleId) continue
    for (const item of sale.items || []) {
      if (item.tankId === tankId) level -= Number(item.qty)
    }
  }
  for (const row of db.adjustments) {
    if (row.tankId === tankId && row.id !== opts.ignoreAdjId) level += Number(row.qty)
  }
  return level
}

export function productStock(db, productId, opts = {}) {
  let level = 0
  for (const row of db.purchases) {
    if (row.productId === productId && row.id !== opts.ignorePurchaseId) level += Number(row.qty)
  }
  for (const sale of db.sales) {
    if (sale.id === opts.ignoreSaleId) continue
    for (const item of sale.items || []) {
      if (item.productId === productId) level -= Number(item.qty)
    }
  }
  for (const row of db.adjustments) {
    if (row.productId === productId && row.id !== opts.ignoreAdjId) level += Number(row.qty)
  }
  return level
}

export function avgCost(db, productId) {
  const rows = db.purchases.filter((row) => row.productId === productId)
  const qty = rows.reduce((sum, row) => sum + Number(row.qty), 0)
  const amount = rows.reduce((sum, row) => sum + purchaseTotal(row), 0)
  return qty ? amount / qty : 0
}

export function productStats(db, productId) {
  let purchased = 0
  let purchaseAmt = 0
  let sold = 0
  let revenue = 0
  for (const row of db.purchases) {
    if (row.productId !== productId) continue
    purchased += Number(row.qty)
    purchaseAmt += purchaseTotal(row)
  }
  for (const sale of db.sales) {
    for (const item of sale.items || []) {
      if (item.productId !== productId) continue
      sold += Number(item.qty)
      revenue += Number(item.qty) * Number(item.rate)
    }
  }
  let adjusted = 0
  for (const row of db.adjustments) {
    if (row.productId === productId) adjusted += Number(row.qty)
  }
  const cost = sold * (purchased ? purchaseAmt / purchased : 0)
  return {
    purchased,
    sold,
    adjusted,
    onHand: purchased + adjusted - sold,
    revenue,
    cost,
    profit: revenue - cost,
  }
}

export function customerBalance(db, id) {
  let due = 0
  for (const sale of db.sales) {
    if (sale.customerId !== id) continue
    due += lineTotal(sale) - (Number(sale.paid) || 0)
  }
  for (const row of db.payments) {
    if (row.partyType === 'customer' && row.partyId === id) due -= Number(row.amount)
  }
  return due
}

export function supplierBalance(db, id) {
  let due = 0
  for (const row of db.purchases) {
    if (row.supplierId !== id) continue
    due += purchaseTotal(row) - (Number(row.paid) || 0)
  }
  for (const row of db.payments) {
    if (row.partyType === 'supplier' && row.partyId === id) due -= Number(row.amount)
  }
  return due
}

export function customerSpend(db, id) {
  return db.sales.filter((sale) => sale.customerId === id).reduce((sum, sale) => sum + lineTotal(sale), 0)
}

export function supplierSpend(db, id) {
  return db.purchases.filter((row) => row.supplierId === id).reduce((sum, row) => sum + purchaseTotal(row), 0)
}

export function kpis(db) {
  const purchaseValue = db.purchases.reduce((sum, row) => sum + purchaseTotal(row), 0)
  let salesTotal = 0
  let cost = 0
  for (const sale of db.sales) {
    for (const item of sale.items || []) {
      const amount = Number(item.qty) * Number(item.rate)
      salesTotal += amount
      cost += Number(item.qty) * avgCost(db, item.productId)
    }
  }
  const pending = db.customers.reduce((sum, row) => sum + Math.max(0, customerBalance(db, row.id)), 0)
  return {
    purchaseValue,
    salesTotal,
    profit: salesTotal - cost,
    fuelStock: productStock(db, 'p-petrol') + productStock(db, 'p-diesel'),
    oilStock: productStock(db, 'p-oil'),
    gasStock: productStock(db, 'p-gas'),
    customers: db.customers.length,
    suppliers: db.suppliers.length,
    pending,
  }
}

export function lowTanks(db) {
  return db.tanks.filter((tank) => tankLevel(db, tank.id) <= Number(tank.reorderLevel))
}

export function chartSeries(db, mode) {
  const today = todayISO()
  const keys = []
  if (mode === 'weekly') {
    for (let i = 7; i >= 0; i -= 1) {
      const key = weekStart(shiftISO(today, -i * 7))
      if (!keys.includes(key)) keys.push(key)
    }
  } else if (mode === 'monthly') {
    const [y, m] = today.split('-').map(Number)
    for (let i = 5; i >= 0; i -= 1) {
      const dt = new Date(y, m - 1 - i, 1)
      keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
    }
  } else {
    for (let i = 13; i >= 0; i -= 1) keys.push(shiftISO(today, -i))
  }
  const map = new Map(keys.map((key) => [key, { key, sales: 0, purchases: 0, cost: 0 }]))
  const keyOf = (date) => (mode === 'weekly' ? weekStart(date) : mode === 'monthly' ? date.slice(0, 7) : date)
  for (const sale of db.sales) {
    const bucket = map.get(keyOf(sale.date))
    if (!bucket) continue
    for (const item of sale.items || []) {
      bucket.sales += Number(item.qty) * Number(item.rate)
      bucket.cost += Number(item.qty) * avgCost(db, item.productId)
    }
  }
  for (const row of db.purchases) {
    const bucket = map.get(keyOf(row.date))
    if (!bucket) continue
    bucket.purchases += purchaseTotal(row)
  }
  return keys.map((key) => {
    const bucket = map.get(key)
    return {
      ...bucket,
      label: mode === 'monthly' ? monthLabel(key) : shortDate(key),
      profit: bucket.sales - bucket.cost,
    }
  })
}

export function stockSlices(db) {
  const colors = ['#e0a11a', '#1f7a4d', '#c2410c', '#2457a6']
  return db.products.map((product, index) => ({
    label: product.name,
    value: Math.max(0, productStock(db, product.id)),
    unit: product.unit,
    color: colors[index % colors.length],
  }))
}

export function recentActivity(db) {
  const rows = []
  for (const sale of db.sales) {
    rows.push({
      id: sale.id,
      date: sale.date,
      kind: 'Sale',
      ref: sale.invoiceNo,
      party: liveName(db.customers, sale.customerId, sale.customerName),
      detail: (sale.items || [])
        .map((item) => `${liveName(db.products, item.productId, item.productName)} ${num(item.qty)}`)
        .join(', '),
      amount: lineTotal(sale),
    })
  }
  for (const row of db.purchases) {
    rows.push({
      id: row.id,
      date: row.date,
      kind: 'Purchase',
      ref: row.purchaseNo,
      party: liveName(db.suppliers, row.supplierId, row.supplierName),
      detail: `${liveName(db.products, row.productId, row.productName)} ${num(row.qty)}`,
      amount: purchaseTotal(row),
    })
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || String(b.ref).localeCompare(String(a.ref))).slice(0, 8)
}

export function vehicleConsumption(db, vehicleId) {
  const map = new Map()
  for (const sale of db.sales) {
    if (sale.vehicleId !== vehicleId) continue
    for (const item of sale.items || []) {
      const key = item.productId
      const current = map.get(key) || {
        productId: key,
        name: liveName(db.products, key, item.productName),
        unit: byId(db.products, key)?.unit || item.unit || '',
        qty: 0,
        amount: 0,
      }
      current.qty += Number(item.qty)
      current.amount += Number(item.qty) * Number(item.rate)
      map.set(key, current)
    }
  }
  return [...map.values()]
}

export function nextInvoice(db) {
  const nums = db.sales.map((sale) => Number(String(sale.invoiceNo).replace(/\D/g, ''))).filter((n) => !Number.isNaN(n))
  return `INV-${Math.max(2400, ...nums) + 1}`
}

export function nextPurchase(db) {
  const nums = db.purchases.map((row) => Number(String(row.purchaseNo).replace(/\D/g, ''))).filter((n) => !Number.isNaN(n))
  return `PUR-${Math.max(3100, ...nums) + 1}`
}

export function nextOrder(db) {
  const nums = db.orders.map((row) => Number(String(row.orderNo).replace(/\D/g, ''))).filter((n) => !Number.isNaN(n))
  return `ORD-${Math.max(500, ...nums) + 1}`
}

export function blankItem(db, productId) {
  const product = byId(db.products, productId) || db.products[0]
  const tank = db.tanks.find((row) => row.productId === product?.id)
  return {
    productId: product?.id || '',
    tankId: tank?.id || '',
    qty: '',
    rate: product?.salePrice ?? '',
  }
}

export function hasErrors(errors) {
  if (!errors) return false
  return Object.entries(errors).some(([key, value]) => {
    if (key === 'itemErrors') return (value || []).some((row) => row && Object.keys(row).length)
    return Boolean(value)
  })
}

export function validateParty(form) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Name is required'
  if (!form.phone?.trim()) errors.phone = 'Phone is required'
  else if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email'
  return errors
}

export function validateCustomer(form) {
  const errors = validateParty(form)
  if (!form.type) errors.type = 'Choose cash or credit'
  return errors
}

export function validateVehicle(db, form, ignoreId) {
  const errors = {}
  if (!form.regNo?.trim()) errors.regNo = 'Registration number is required'
  else if (db.vehicles.some((row) => row.id !== ignoreId && row.regNo.trim().toLowerCase() === form.regNo.trim().toLowerCase())) {
    errors.regNo = 'This registration is already on file'
  }
  if (!form.customerId) errors.customerId = 'Choose a customer'
  if (!form.make?.trim()) errors.make = 'Make is required'
  if (!form.fuelType?.trim()) errors.fuelType = 'Fuel type is required'
  return errors
}

export function validateProduct(db, form, ignoreId) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Name is required'
  else if (db.products.some((row) => row.id !== ignoreId && row.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
    errors.name = 'A product with this name already exists'
  }
  if (!form.unit?.trim()) errors.unit = 'Unit is required'
  if (!(Number(form.salePrice) > 0)) errors.salePrice = 'Enter a sale price greater than zero'
  if (!form.category?.trim()) errors.category = 'Category is required'
  return errors
}

export function validateTank(db, form, ignoreId) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Name is required'
  if (!form.productId) errors.productId = 'Choose a product'
  const capacity = Number(form.capacity)
  const reorder = Number(form.reorderLevel)
  if (!(capacity > 0)) errors.capacity = 'Capacity must be greater than zero'
  if (Number.isNaN(reorder) || reorder < 0) errors.reorderLevel = 'Reorder level cannot be negative'
  else if (capacity > 0 && reorder >= capacity) errors.reorderLevel = 'Reorder level must be below capacity'
  if (ignoreId) {
    const existing = byId(db.tanks, ignoreId)
    const level = tankLevel(db, ignoreId)
    const moved = db.purchases.some((row) => row.tankId === ignoreId) || db.sales.some((sale) => (sale.items || []).some((item) => item.tankId === ignoreId))
    if (existing && moved && existing.productId !== form.productId) {
      errors.productId = 'This tank already holds a product. Add a new tank instead.'
    }
    if (capacity > 0 && level - capacity > 1e-9) errors.capacity = 'Capacity cannot be less than the fuel already in this tank'
  }
  return errors
}

export function validatePurchase(db, form, ignoreId) {
  const errors = {}
  if (!form.date) errors.date = 'Date is required'
  if (!form.supplierId) errors.supplierId = 'Choose a supplier'
  if (!form.productId) errors.productId = 'Choose a product'
  if (!form.tankId) errors.tankId = 'Choose a tank'
  const tank = byId(db.tanks, form.tankId)
  if (tank && form.productId && tank.productId !== form.productId) errors.tankId = 'This tank holds a different product'
  const qty = Number(form.qty)
  const rate = Number(form.rate)
  if (!(qty > 0)) errors.qty = 'Enter a quantity greater than zero'
  if (!(rate > 0)) errors.rate = 'Enter a rate greater than zero'
  if (tank && qty > 0 && tank.productId === form.productId) {
    const current = tankLevel(db, tank.id, { ignorePurchaseId: ignoreId })
    if (current + qty > tank.capacity + 1e-9) errors.qty = `Only ${num(Math.max(0, tank.capacity - current))} free space remains in this tank`
  }
  const total = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rate) ? rate : 0)
  const paid = form.paid === '' || form.paid == null ? 0 : Number(form.paid)
  if (!(paid >= 0) || Number.isNaN(paid)) errors.paid = 'Paid amount cannot be negative'
  else if (paid - total > 0.001) errors.paid = 'Paid amount cannot exceed the total'
  return errors
}

export function validateSale(db, form, ignoreSaleId) {
  const errors = {}
  if (!form.date) errors.date = 'Date is required'
  if (!form.customerId) errors.customerId = 'Choose a customer'
  if (!form.items?.length) errors.items = 'Add at least one line'
  const itemErrors = (form.items || []).map(() => ({}))
  const tankQty = {}
  ;(form.items || []).forEach((item, index) => {
    const qty = Number(item.qty)
    const rate = Number(item.rate)
    if (!item.productId) itemErrors[index].productId = 'Choose a product'
    if (!item.tankId) itemErrors[index].tankId = 'Choose a tank'
    if (!(qty > 0)) itemErrors[index].qty = 'Enter a quantity greater than zero'
    if (!(rate > 0)) itemErrors[index].rate = 'Enter a rate greater than zero'
    const tank = byId(db.tanks, item.tankId)
    if (tank && item.productId && tank.productId !== item.productId) itemErrors[index].tankId = 'This tank holds a different product'
    if (qty > 0 && item.tankId) tankQty[item.tankId] = (tankQty[item.tankId] || 0) + qty
  })
  for (const [tankId, qty] of Object.entries(tankQty)) {
    const available = tankLevel(db, tankId, { ignoreSaleId })
    if (qty > available + 1e-9) {
      form.items.forEach((item, index) => {
        if (item.tankId === tankId) itemErrors[index].qty = `Only ${num(Math.max(0, available))} available in this tank`
      })
    }
  }
  if (itemErrors.some((row) => Object.keys(row).length)) errors.itemErrors = itemErrors
  const total = (form.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0), 0)
  const paid = form.paid === '' || form.paid == null ? 0 : Number(form.paid)
  if (!(paid >= 0) || Number.isNaN(paid)) errors.paid = 'Paid amount cannot be negative'
  else if (paid - total > 0.001) errors.paid = 'Paid amount cannot exceed the total'
  return errors
}

export function validateOrder(form) {
  const errors = {}
  if (!form.date) errors.date = 'Date is required'
  if (!form.customerId) errors.customerId = 'Choose a customer'
  if (!form.productId) errors.productId = 'Choose a product'
  if (!(Number(form.qty) > 0)) errors.qty = 'Enter a quantity greater than zero'
  if (!['Pending', 'Confirmed', 'Delivered', 'Cancelled'].includes(form.status)) errors.status = 'Choose a status'
  return errors
}

export function validateAdjustment(db, form) {
  const errors = {}
  if (!form.date) errors.date = 'Date is required'
  if (!form.tankId) errors.tankId = 'Choose a tank'
  const qty = Number(form.qty)
  if (!qty) errors.qty = 'Enter a quantity to add or deduct'
  const tank = byId(db.tanks, form.tankId)
  if (tank && qty) {
    const next = tankLevel(db, tank.id) + qty
    if (next < -1e-9) errors.qty = 'This deduction is larger than the fuel in the tank'
    if (next - Number(tank.capacity) > 1e-9) errors.qty = 'This addition would exceed tank capacity'
  }
  if (!form.reason?.trim()) errors.reason = 'A reason is required'
  return errors
}

export function validatePayment(form) {
  const errors = {}
  if (!form.date) errors.date = 'Date is required'
  if (!(Number(form.amount) > 0)) errors.amount = 'Enter an amount greater than zero'
  return errors
}

function saleRows(db, sales) {
  return sales.map((sale) => {
    const total = lineTotal(sale)
    const paid = Number(sale.paid) || 0
    const detail = (sale.items || [])
      .map((item) => {
        const product = byId(db.products, item.productId)
        const unit = product?.unit || item.unit || ''
        return `${product?.name || item.productName} ${num(item.qty)} ${unit}`.trim()
      })
      .join(', ')
    return [
      sale.invoiceNo,
      formatDate(sale.date),
      liveName(db.customers, sale.customerId, sale.customerName),
      liveReg(db.vehicles, sale.vehicleId, sale.vehicleReg),
      detail || '—',
      money(total),
      money(paid),
      money(total - paid),
    ]
  })
}

function productSummary(db, sales) {
  return db.products.map((product) => {
    let qty = 0
    let revenue = 0
    for (const sale of sales) {
      for (const item of sale.items || []) {
        if (item.productId !== product.id) continue
        qty += Number(item.qty)
        revenue += Number(item.qty) * Number(item.rate)
      }
    }
    return [product.name, `${num(qty)} ${product.unit}`, money(revenue)]
  })
}

export function invoiceDocument(db, sale) {
  const total = lineTotal(sale)
  const paid = Number(sale.paid) || 0
  const customer = liveName(db.customers, sale.customerId, sale.customerName)
  const vehicle = liveReg(db.vehicles, sale.vehicleId, sale.vehicleReg)
  const rows = (sale.items || []).map((item) => {
    const product = byId(db.products, item.productId)
    const unit = product?.unit || item.unit || ''
    return [
      product?.name || item.productName,
      `${num(item.qty)} ${unit}`.trim(),
      money(item.rate),
      money(Number(item.qty) * Number(item.rate)),
    ]
  })
  return {
    title: `Invoice ${sale.invoiceNo}`,
    fileName: sale.invoiceNo,
    subtitle: `${formatDate(sale.date)} · ${customer}${vehicle && vehicle !== '—' ? ` · ${vehicle}` : ''}`,
    note: sale.note || '',
    sections: [{ title: 'Fuel supplied', headers: ['Product', 'Quantity', 'Rate', 'Amount'], rows }],
    totals: [
      { label: 'Total', value: money(total) },
      { label: 'Paid', value: money(paid) },
      { label: 'Balance', value: money(total - paid) },
    ],
  }
}

export function buildReport(db, kind, filters = {}) {
  if (kind === 'daily') return salesListReport(db, 'Daily sales report', formatDate(filters.date), db.sales.filter((sale) => sale.date === filters.date))
  if (kind === 'monthly') {
    const month = filters.month || todayISO().slice(0, 7)
    return salesListReport(db, 'Monthly sales report', monthLabel(month), db.sales.filter((sale) => sale.date.startsWith(month)))
  }
  if (kind === 'purchases') return purchaseReport(db, filters.from, filters.to)
  if (kind === 'pnl') return pnlReport(db, filters.from, filters.to)
  if (kind === 'inventory') return inventoryReport(db)
  if (kind === 'customer') return partyStatement(db, 'customer', filters.customerId)
  if (kind === 'supplier') return partyStatement(db, 'supplier', filters.supplierId)
  return { title: 'Report', subtitle: '', sections: [], totals: [] }
}

function salesListReport(db, title, subtitle, sales) {
  const ordered = [...sales].sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo))
  const total = ordered.reduce((sum, sale) => sum + lineTotal(sale), 0)
  const paid = ordered.reduce((sum, sale) => sum + (Number(sale.paid) || 0), 0)
  return {
    title,
    fileName: title,
    subtitle,
    sections: [
      {
        title: 'Invoices',
        headers: ['Invoice', 'Date', 'Customer', 'Vehicle', 'Detail', 'Total', 'Paid', 'Balance'],
        rows: saleRows(db, ordered),
      },
      {
        title: 'Product summary',
        headers: ['Product', 'Quantity', 'Revenue'],
        rows: productSummary(db, ordered),
      },
    ],
    totals: [
      { label: 'Sales', value: money(total) },
      { label: 'Collected', value: money(paid) },
      { label: 'Outstanding on these invoices', value: money(total - paid) },
    ],
  }
}

function purchaseReport(db, from, to) {
  const rows = db.purchases
    .filter((row) => inRange(row.date, from, to))
    .sort((a, b) => a.date.localeCompare(b.date))
  const amount = rows.reduce((sum, row) => sum + purchaseTotal(row), 0)
  const paid = rows.reduce((sum, row) => sum + (Number(row.paid) || 0), 0)
  return {
    title: 'Purchase report',
    fileName: 'Purchase report',
    subtitle: `${from ? formatDate(from) : 'Start'} – ${to ? formatDate(to) : 'Today'}`,
    sections: [
      {
        title: 'Fuel received',
        headers: ['Purchase', 'Date', 'Supplier', 'Product', 'Tank', 'Qty', 'Rate', 'Amount', 'Paid', 'Due'],
        rows: rows.map((row) => {
          const product = byId(db.products, row.productId)
          const total = purchaseTotal(row)
          const paidRow = Number(row.paid) || 0
          return [
            row.purchaseNo,
            formatDate(row.date),
            liveName(db.suppliers, row.supplierId, row.supplierName),
            product?.name || row.productName,
            liveName(db.tanks, row.tankId, row.tankName),
            `${num(row.qty)} ${product?.unit || row.unit || ''}`.trim(),
            money(row.rate),
            money(total),
            money(paidRow),
            money(total - paidRow),
          ]
        }),
      },
    ],
    totals: [
      { label: 'Purchases', value: money(amount) },
      { label: 'Paid on these bills', value: money(paid) },
      { label: 'Still due on these bills', value: money(amount - paid) },
    ],
  }
}

function pnlReport(db, from, to) {
  const rows = db.products.map((product) => {
    let qty = 0
    let revenue = 0
    for (const sale of db.sales) {
      if (!inRange(sale.date, from, to)) continue
      for (const item of sale.items || []) {
        if (item.productId !== product.id) continue
        qty += Number(item.qty)
        revenue += Number(item.qty) * Number(item.rate)
      }
    }
    const cost = qty * avgCost(db, product.id)
    const profit = revenue - cost
    return {
      cells: [
        product.name,
        `${num(qty)} ${product.unit}`,
        money(revenue),
        money(cost),
        money(profit),
        revenue ? `${((profit / revenue) * 100).toFixed(1)}%` : '—',
      ],
      revenue,
      cost,
      profit,
    }
  })
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const cost = rows.reduce((sum, row) => sum + row.cost, 0)
  return {
    title: 'Profit and loss',
    fileName: 'Profit and loss',
    subtitle: `${from ? formatDate(from) : 'Start'} – ${to ? formatDate(to) : 'Today'}`,
    sections: [
      {
        title: 'Product profitability',
        headers: ['Product', 'Qty sold', 'Revenue', 'Cost', 'Profit', 'Margin'],
        rows: rows.map((row) => row.cells),
      },
    ],
    totals: [
      { label: 'Revenue', value: money(revenue) },
      { label: 'Cost of fuel sold', value: money(cost) },
      { label: 'Net profit', value: money(revenue - cost) },
    ],
  }
}

function inventoryReport(db) {
  return {
    title: 'Inventory report',
    fileName: 'Inventory report',
    subtitle: formatDate(todayISO()),
    sections: [
      {
        title: 'Tanks',
        headers: ['Tank', 'Product', 'Capacity', 'On hand', 'Reorder', 'Fill', 'Status'],
        rows: db.tanks.map((tank) => {
          const product = byId(db.products, tank.productId)
          const level = tankLevel(db, tank.id)
          const fill = tank.capacity ? `${Math.round((level / tank.capacity) * 100)}%` : '—'
          return [
            tank.name,
            product?.name || '—',
            `${num(tank.capacity)} ${product?.unit || ''}`,
            `${num(level)} ${product?.unit || ''}`,
            num(tank.reorderLevel),
            fill,
            level <= Number(tank.reorderLevel) ? 'Low stock' : 'Healthy',
          ]
        }),
      },
      {
        title: 'Products',
        headers: ['Product', 'Purchased', 'Sold', 'On hand', 'Revenue', 'Profit'],
        rows: db.products.map((product) => {
          const stats = productStats(db, product.id)
          return [
            product.name,
            `${num(stats.purchased)} ${product.unit}`,
            `${num(stats.sold)} ${product.unit}`,
            `${num(stats.onHand)} ${product.unit}`,
            money(stats.revenue),
            money(stats.profit),
          ]
        }),
      },
    ],
    totals: [],
  }
}

function partyStatement(db, kind, id) {
  const isCustomer = kind === 'customer'
  const title = isCustomer ? 'Customer statement' : 'Supplier statement'
  const party = byId(isCustomer ? db.customers : db.suppliers, id)
  if (!party) {
    return { title, subtitle: `Choose a ${isCustomer ? 'customer' : 'supplier'} to view the statement.`, sections: [], totals: [] }
  }
  const lines = []
  if (isCustomer) {
    for (const sale of db.sales) {
      if (sale.customerId !== id) continue
      lines.push({
        date: sale.date,
        desc: `Invoice ${sale.invoiceNo}`,
        debit: lineTotal(sale),
        credit: Number(sale.paid) || 0,
      })
    }
  } else {
    for (const row of db.purchases) {
      if (row.supplierId !== id) continue
      lines.push({
        date: row.date,
        desc: `Purchase ${row.purchaseNo}`,
        debit: purchaseTotal(row),
        credit: Number(row.paid) || 0,
      })
    }
  }
  for (const row of db.payments) {
    if (row.partyType !== kind || row.partyId !== id) continue
    lines.push({
      date: row.date,
      desc: `Payment ${row.ref || ''} ${row.note || ''}`.trim(),
      debit: 0,
      credit: Number(row.amount),
    })
  }
  lines.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit)
  let balance = 0
  const rows = lines.map((line) => {
    balance += line.debit - line.credit
    return [formatDate(line.date), line.desc, money(line.debit), money(line.credit), money(balance)]
  })
  const billed = lines.reduce((sum, line) => sum + line.debit, 0)
  const received = lines.reduce((sum, line) => sum + line.credit, 0)
  return {
    title,
    fileName: `${title} ${party.name}`,
    subtitle: party.name,
    sections: [{ title: 'Account movement', headers: ['Date', 'Description', 'Debit', 'Credit', 'Balance'], rows }],
    totals: [
      { label: isCustomer ? 'Billed' : 'Billed to us', value: money(billed) },
      { label: isCustomer ? 'Received' : 'Paid', value: money(received) },
      { label: 'Balance', value: money(billed - received) },
    ],
  }
}

function mulberry32(seedValue) {
  let a = seedValue
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seed() {
  const today = todayISO()
  const products = [
    { id: 'p-petrol', name: 'Petrol', unit: 'L', salePrice: 272, category: 'Fuel' },
    { id: 'p-diesel', name: 'Diesel', unit: 'L', salePrice: 268, category: 'Fuel' },
    { id: 'p-oil', name: 'Engine Oil', unit: 'L', salePrice: 1450, category: 'Lubricant' },
    { id: 'p-gas', name: 'CNG Gas', unit: 'kg', salePrice: 290, category: 'Gas' },
  ]
  const tanks = [
    { id: 't-petrol', name: 'Petrol Tank 1', productId: 'p-petrol', capacity: 25000, reorderLevel: 4000 },
    { id: 't-diesel', name: 'Diesel Tank 1', productId: 'p-diesel', capacity: 20000, reorderLevel: 3500 },
    { id: 't-oil', name: 'Oil Store', productId: 'p-oil', capacity: 800, reorderLevel: 80 },
    { id: 't-gas', name: 'Gas Cascade', productId: 'p-gas', capacity: 5000, reorderLevel: 800 },
  ]
  const suppliers = [
    { id: 's1', name: 'Pakistan State Oil', phone: '021-111-111-767', email: 'karachi@pso.example', address: 'Karachi Terminal, Port Qasim', company: 'PSO' },
    { id: 's2', name: 'Attock Petroleum', phone: '021-356-4400', email: 'supply@apl.example', address: 'Keamari, Karachi', company: 'APL' },
    { id: 's3', name: 'Shell Pakistan', phone: '021-111-024-024', email: 'fuels@shell.example', address: 'Clifton, Karachi', company: 'Shell' },
    { id: 's4', name: 'Total Parco Lubricants', phone: '042-357-8900', email: 'lubes@total.example', address: 'Lahore Depot', company: 'Total Parco' },
  ]
  const customers = [
    { id: 'c1', name: 'Karachi Logistics', phone: '0300-1112233', email: 'accounts@klog.example', address: 'SITE, Karachi', type: 'Credit' },
    { id: 'c2', name: 'Bilal Transport', phone: '0321-5550192', email: 'bilal@bt.example', address: 'Mauripur Road', type: 'Credit' },
    { id: 'c3', name: 'Hira Motors', phone: '0333-4201188', email: 'workshop@hira.example', address: 'F.B. Area', type: 'Cash' },
    { id: 'c4', name: 'Walk-in Counter', phone: '022-276-4100', email: '', address: 'Station forecourt', type: 'Cash' },
    { id: 'c5', name: 'Ahmed Traders', phone: '0301-7788456', email: 'ahmed@traders.example', address: 'Hyderabad Road', type: 'Credit' },
    { id: 'c6', name: 'City Cab Co', phone: '0345-2200199', email: 'fleet@citycab.example', address: 'Saddar', type: 'Credit' },
    { id: 'c7', name: 'North Nazimabad Fleet', phone: '0312-9090444', email: 'ops@nnfleet.example', address: 'Block H, North Nazimabad', type: 'Credit' },
    { id: 'c8', name: 'Rosabel Catering', phone: '021-363-2210', email: 'accounts@rosabel.example', address: 'F.B. Area, Karachi', type: 'Cash' },
  ]
  const vehicles = [
    { id: 'v1', customerId: 'c1', regNo: 'KHI-4821', make: 'Hino', model: '500', fuelType: 'Diesel' },
    { id: 'v2', customerId: 'c1', regNo: 'KHI-7730', make: 'Isuzu', model: 'NPR', fuelType: 'Diesel' },
    { id: 'v3', customerId: 'c2', regNo: 'LEA-1092', make: 'Toyota', model: 'Hiace', fuelType: 'Petrol' },
    { id: 'v4', customerId: 'c5', regNo: 'HYD-3341', make: 'Suzuki', model: 'Bolan', fuelType: 'CNG Gas' },
    { id: 'v5', customerId: 'c6', regNo: 'KHI-2208', make: 'Toyota', model: 'Corolla', fuelType: 'Petrol' },
    { id: 'v6', customerId: 'c6', regNo: 'KHI-2209', make: 'Suzuki', model: 'Alto', fuelType: 'Petrol' },
    { id: 'v7', customerId: 'c7', regNo: 'KHI-9012', make: 'Hino', model: 'Bus', fuelType: 'Diesel' },
    { id: 'v8', customerId: 'c3', regNo: 'KHI-1188', make: 'Honda', model: 'Civic', fuelType: 'Petrol' },
  ]
  const purchases = [
    { id: 'pu1', purchaseNo: 'PUR-3101', date: shiftISO(today, -40), supplierId: 's1', productId: 'p-petrol', tankId: 't-petrol', qty: 9000, rate: 250, paid: 2250000, note: 'Terminal load' },
    { id: 'pu2', purchaseNo: 'PUR-3102', date: shiftISO(today, -22), supplierId: 's2', productId: 'p-petrol', tankId: 't-petrol', qty: 7500, rate: 252, paid: 1890000, note: 'Second lift' },
    { id: 'pu3', purchaseNo: 'PUR-3103', date: shiftISO(today, -6), supplierId: 's1', productId: 'p-petrol', tankId: 't-petrol', qty: 8000, rate: 254, paid: 1016000, note: 'Partial payment agreed' },
    { id: 'pu4', purchaseNo: 'PUR-3104', date: shiftISO(today, -36), supplierId: 's3', productId: 'p-diesel', tankId: 't-diesel', qty: 8000, rate: 246, paid: 1968000, note: 'Diesel lift' },
    { id: 'pu5', purchaseNo: 'PUR-3105', date: shiftISO(today, -12), supplierId: 's2', productId: 'p-diesel', tankId: 't-diesel', qty: 7000, rate: 248, paid: 1215200, note: 'Balance pending' },
    { id: 'pu6', purchaseNo: 'PUR-3106', date: shiftISO(today, -28), supplierId: 's4', productId: 'p-oil', tankId: 't-oil', qty: 400, rate: 1100, paid: 440000, note: 'Engine oil drums' },
    { id: 'pu7', purchaseNo: 'PUR-3107', date: shiftISO(today, -18), supplierId: 's3', productId: 'p-gas', tankId: 't-gas', qty: 2800, rate: 240, paid: 672000, note: 'CNG cascade fill' },
  ]
  const rates = { 'p-petrol': 272, 'p-diesel': 268, 'p-oil': 1450, 'p-gas': 290 }
  const tankOf = { 'p-petrol': 't-petrol', 'p-diesel': 't-diesel', 'p-oil': 't-oil', 'p-gas': 't-gas' }
  const targets = { 'p-petrol': 18000, 'p-diesel': 12000, 'p-oil': 280, 'p-gas': 2100 }
  const budgets = { ...targets }
  const sales = []
  let inv = 2401
  const rand = mulberry32(20261105)
  const pushSale = (partial) => {
    const total = partial.items.reduce((sum, item) => sum + item.qty * item.rate, 0)
    sales.push({
      id: `sa${inv}`,
      invoiceNo: `INV-${inv}`,
      date: partial.date,
      customerId: partial.customerId,
      vehicleId: partial.vehicleId || '',
      paid: partial.paid == null ? total : partial.paid,
      note: partial.note || '',
      items: partial.items,
    })
    inv += 1
  }
  for (let day = 27; day >= 0; day -= 1) {
    const date = shiftISO(today, -day)
    if (day % 7 === 0 && budgets['p-petrol'] >= 200 && budgets['p-oil'] >= 5) {
      budgets['p-petrol'] -= 200
      budgets['p-oil'] -= 5
      pushSale({
        date,
        customerId: 'c4',
        note: 'Petrol and engine oil',
        items: [
          { productId: 'p-petrol', tankId: 't-petrol', qty: 200, rate: 272 },
          { productId: 'p-oil', tankId: 't-oil', qty: 5, rate: 1450 },
        ],
      })
    }
    const count = 2 + Math.floor(rand() * 3)
    for (let k = 0; k < count; k += 1) {
      const roll = rand()
      const productId = roll < 0.42 ? 'p-petrol' : roll < 0.72 ? 'p-diesel' : roll < 0.88 ? 'p-gas' : 'p-oil'
      if (budgets[productId] < (productId === 'p-oil' ? 4 : 20)) continue
      let qty
      if (productId === 'p-oil') qty = Math.min(budgets[productId], 8 + Math.floor(rand() * 17))
      else if (productId === 'p-gas') qty = Math.min(budgets[productId], 80 + Math.floor(rand() * 101))
      else if (productId === 'p-diesel') qty = Math.min(budgets[productId], 350 + Math.floor(rand() * 551))
      else qty = Math.min(budgets[productId], 400 + Math.floor(rand() * 701))
      budgets[productId] -= qty
      const customer = customers[Math.floor(rand() * customers.length)]
      const product = products.find((row) => row.id === productId)
      const owned = vehicles.filter((row) => row.customerId === customer.id && row.fuelType === product.name)
      const vehicle = owned.length && rand() > 0.35 ? owned[Math.floor(rand() * owned.length)] : null
      const total = qty * rates[productId]
      const paid = customer.type === 'Cash' || rand() > 0.55 ? total : Math.round(total * (0.25 + rand() * 0.5))
      pushSale({
        date,
        customerId: customer.id,
        vehicleId: vehicle?.id || '',
        paid,
        items: [{ productId, tankId: tankOf[productId], qty, rate: rates[productId] }],
      })
    }
  }
  for (const productId of Object.keys(targets)) {
    const sold = sales.reduce((sum, sale) => sum + sale.items.filter((item) => item.productId === productId).reduce((inner, item) => inner + item.qty, 0), 0)
    const remain = targets[productId] - sold
    if (remain <= 0) continue
    const bulk = remain > 1500
    const total = remain * rates[productId]
    pushSale({
      date: today,
      customerId: bulk ? 'c1' : 'c4',
      paid: bulk ? 0 : total,
      note: bulk ? 'Contracted fleet supply' : 'Counter sale',
      items: [{ productId, tankId: tankOf[productId], qty: remain, rate: rates[productId] }],
    })
  }
  const creditSales = sales.filter((sale) => sale.customerId === 'c1')
  if (creditSales.length) {
    const biggest = [...creditSales].sort((a, b) => lineTotal(b) - lineTotal(a))[0]
    biggest.paid = 0
    biggest.note = biggest.note || 'On account'
  }
  const orders = [
    { id: 'o1', orderNo: 'ORD-501', date: shiftISO(today, -2), customerId: 'c1', productId: 'p-diesel', qty: 800, status: 'Pending', note: 'Night delivery for the port run' },
    { id: 'o2', orderNo: 'ORD-502', date: shiftISO(today, -1), customerId: 'c6', productId: 'p-petrol', qty: 400, status: 'Confirmed', note: 'Fleet top-up on Friday' },
    { id: 'o3', orderNo: 'ORD-503', date: shiftISO(today, -5), customerId: 'c5', productId: 'p-gas', qty: 120, status: 'Delivered', note: 'Completed at the cascade' },
    { id: 'o4', orderNo: 'ORD-504', date: shiftISO(today, -3), customerId: 'c7', productId: 'p-diesel', qty: 1500, status: 'Confirmed', note: 'Hold until the dip confirms space' },
    { id: 'o5', orderNo: 'ORD-505', date: today, customerId: 'c8', productId: 'p-petrol', qty: 80, status: 'Pending', note: 'Event vans' },
    { id: 'o6', orderNo: 'ORD-506', date: shiftISO(today, -8), customerId: 'c2', productId: 'p-oil', qty: 20, status: 'Cancelled', note: 'Customer postponed the service' },
  ]
  const payments = [
    { id: 'py1', date: shiftISO(today, -4), partyType: 'customer', partyId: 'c1', amount: 25000, note: 'Cheque against open invoices', ref: 'CHQ-4412' },
    { id: 'py2', date: shiftISO(today, -9), partyType: 'customer', partyId: 'c5', amount: 15000, note: 'Cash received at the counter', ref: 'CSH-19' },
    { id: 'py3', date: shiftISO(today, -3), partyType: 'supplier', partyId: 's1', amount: 400000, note: 'Part payment for the petrol lift', ref: 'TRF-88' },
    { id: 'py4', date: shiftISO(today, -7), partyType: 'supplier', partyId: 's2', amount: 250000, note: 'Diesel balance', ref: 'TRF-91' },
  ]
  const adjustments = [
    { id: 'ad1', date: shiftISO(today, -2), tankId: 't-petrol', productId: 'p-petrol', qty: -50, reason: 'Dip correction after calibration' },
    { id: 'ad2', date: shiftISO(today, -1), tankId: 't-diesel', productId: 'p-diesel', qty: 20, reason: 'Meter gain on delivery' },
  ]
  const db = { products, tanks, suppliers, customers, vehicles, purchases, sales, orders, payments, adjustments }
  for (const row of db.purchases) {
    row.supplierName = liveName(db.suppliers, row.supplierId)
    row.productName = liveName(db.products, row.productId)
    row.tankName = liveName(db.tanks, row.tankId)
    row.unit = byId(db.products, row.productId)?.unit || ''
  }
  for (const sale of db.sales) {
    sale.customerName = liveName(db.customers, sale.customerId)
    sale.vehicleReg = sale.vehicleId ? liveReg(db.vehicles, sale.vehicleId) : ''
    for (const item of sale.items) {
      item.productName = liveName(db.products, item.productId)
      item.tankName = liveName(db.tanks, item.tankId)
      item.unit = byId(db.products, item.productId)?.unit || ''
    }
  }
  for (const row of db.orders) {
    row.customerName = liveName(db.customers, row.customerId)
    row.productName = liveName(db.products, row.productId)
  }
  for (const row of db.payments) {
    const list = row.partyType === 'customer' ? db.customers : db.suppliers
    row.partyName = liveName(list, row.partyId)
  }
  for (const row of db.vehicles) row.customerName = liveName(db.customers, row.customerId)
  return db
}
