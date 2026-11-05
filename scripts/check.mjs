import {
  seed,
  productStock,
  tankLevel,
  kpis,
  customerBalance,
  supplierBalance,
  chartSeries,
  buildReport,
  invoiceDocument,
  validateSale,
  hasErrors,
  todayISO,
} from '../src/logic.js'

const db = seed()
let failed = 0
const expect = (cond, msg) => {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  }
}

expect(productStock(db, 'p-petrol') === 6450, `petrol ${productStock(db, 'p-petrol')}`)
expect(productStock(db, 'p-diesel') === 3020, `diesel ${productStock(db, 'p-diesel')}`)
expect(productStock(db, 'p-oil') === 120, `oil ${productStock(db, 'p-oil')}`)
expect(productStock(db, 'p-gas') === 700, `gas ${productStock(db, 'p-gas')}`)
expect(tankLevel(db, 't-petrol') === 6450, 'petrol tank')
expect(tankLevel(db, 't-diesel') === 3020, 'diesel tank')
expect(kpis(db).profit > 0, 'profit')
expect(kpis(db).pending > 0, 'pending')
expect(db.customers.some((row) => customerBalance(db, row.id) > 0), 'customer due')
expect(supplierBalance(db, 's1') > 0, `supplier ${supplierBalance(db, 's1')}`)
expect(chartSeries(db, 'daily').some((row) => row.sales > 0), 'daily chart')
expect(chartSeries(db, 'weekly').length >= 8, 'weekly chart')
expect(chartSeries(db, 'monthly').some((row) => row.sales > 0), 'monthly chart')
const sample = db.sales.find((sale) => sale.items.length > 1)
expect(Boolean(sample), 'multi-line invoice')
const daily = buildReport(db, 'daily', { date: db.sales.at(-1).date })
expect(daily.sections[0].rows.length > 0, 'daily report')
const invoice = invoiceDocument(db, sample || db.sales[0])
expect(invoice.totals.length === 3, 'invoice totals')
const blocked = validateSale(db, {
  date: todayISO(),
  customerId: 'c4',
  paid: 0,
  items: [{ productId: 'p-petrol', tankId: 't-petrol', qty: 999999, rate: 272 }],
})
expect(hasErrors(blocked), 'oversell blocked')
const ok = validateSale(db, {
  date: todayISO(),
  customerId: 'c4',
  paid: 2720,
  items: [{ productId: 'p-petrol', tankId: 't-petrol', qty: 10, rate: 272 }],
})
expect(!hasErrors(ok), `valid sale ${JSON.stringify(ok)}`)

if (failed) {
  console.error(`${failed} checks failed`)
  process.exit(1)
}
console.log('logic ok', kpis(db))
