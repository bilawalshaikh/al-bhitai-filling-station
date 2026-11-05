import { useEffect, useState } from 'react'
import { money, num } from './logic.js'

export function useSort(key, dir = 1) {
  const [sort, setSort] = useState({ key, dir })
  const toggle = (next) => setSort((current) => (current.key === next ? { key: next, dir: current.dir * -1 } : { key: next, dir: 1 }))
  return [sort, toggle]
}

export function sortBy(rows, sort, get) {
  if (!sort?.key) return rows
  const dir = sort.dir
  return [...rows].sort((a, b) => {
    const av = get(a, sort.key)
    const bv = get(b, sort.key)
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true }) * dir
  })
}

export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function DataTable({ columns, rows, sort, onSort, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align || ''} onClick={column.sort === false ? undefined : () => onSort?.(column.key)}>
                {column.label}
                {sort?.key === column.key ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="empty" colSpan={columns.length}>
                {empty || 'No records found'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align || ''}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ReportView({ doc }) {
  if (!doc) return null
  return (
    <div className="report">
      {doc.subtitle ? <p className="help">{doc.subtitle}</p> : null}
      {(doc.sections || []).map((section) => (
        <section key={section.title || section.headers.join()} className="card">
          {section.title ? <h3>{section.title}</h3> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {section.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows?.length ? (
                  section.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty" colSpan={section.headers.length}>
                      No records for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {doc.totals?.length ? (
        <div className="totals">
          {doc.totals.map((total) => (
            <div key={total.label}>
              <span>{total.label}</span>
              <strong>{total.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {doc.note ? <p className="note">Note: {doc.note}</p> : null}
    </div>
  )
}

export function PrintSheet({ doc }) {
  if (!doc) return null
  return (
    <div className="print-root">
      <p className="print-brand">Al Bhitai Filling Station</p>
      <p className="print-address">Main National Highway, Bhit Shah Road, Matiari, Sindh · 022-276-4100</p>
      <h1>{doc.title}</h1>
      {doc.subtitle ? <p>{doc.subtitle}</p> : null}
      {(doc.sections || []).map((section) => (
        <section key={section.title || section.headers.join()}>
          {section.title ? <h2>{section.title}</h2> : null}
          <table>
            <thead>
              <tr>
                {section.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(section.rows?.length ? section.rows : [['No records']]).map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {doc.totals?.length ? (
        <ul className="print-totals">
          {doc.totals.map((total) => (
            <li key={total.label}>
              <span>{total.label}</span>
              <strong>{total.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {doc.note ? <p>Note: {doc.note}</p> : null}
    </div>
  )
}

export function Badge({ tone, children }) {
  return <span className={`badge ${tone || ''}`}>{children}</span>
}

export function BarChart({ rows, series }) {
  const width = 720
  const height = 230
  const padB = 32
  const max = Math.max(1, ...rows.flatMap((row) => series.map((item) => Math.max(0, Number(row[item.key]) || 0))))
  const groupW = (width - 12) / Math.max(rows.length, 1)
  const barW = Math.max(4, Math.min(16, (groupW - 10) / series.length))
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {rows.map((row, index) => {
          const x0 = 8 + index * groupW
          return (
            <g key={row.key}>
              {series.map((item, seriesIndex) => {
                const value = Math.max(0, Number(row[item.key]) || 0)
                const h = (value / max) * (height - padB - 12)
                const x = x0 + seriesIndex * (barW + 2)
                const y = height - padB - h
                return <rect key={item.key} x={x} y={y} width={barW} height={h} rx="3" fill={item.color} />
              })}
              <text x={x0 + groupW / 2} y={height - 10} textAnchor="middle" className="chart-label">
                {row.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function LineChart({ rows, valueKey, color }) {
  const width = 720
  const height = 220
  const pad = 24
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0))
  const step = rows.length > 1 ? (width - pad * 2) / (rows.length - 1) : 0
  const points = rows.map((row, index) => {
    const x = pad + index * step
    const y = height - pad - ((Number(row[valueKey]) || 0) / max) * (height - pad * 2)
    return [x, y]
  })
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point[0]},${point[1]}`).join(' ')
  const area = `${line} L${points.at(-1)?.[0] || pad},${height - pad} L${pad},${height - pad} Z`
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <path d={area} fill={color} opacity="0.15" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" />
        {points.map((point, index) => (
          <g key={rows[index].key}>
            <circle cx={point[0]} cy={point[1]} r="3" fill={color} />
            <text x={point[0]} y={height - 6} textAnchor="middle" className="chart-label">
              {rows[index].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function Donut({ slices }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = 64
  const circ = 2 * Math.PI * radius
  let offset = 0
  const arcs = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const len = total ? (slice.value / total) * circ : 0
      const arc = { ...slice, len, offset }
      offset += len
      return arc
    })
  return (
    <div className="donut">
      <svg viewBox="0 0 180 180" role="img">
        <g transform="translate(90 90) rotate(-90)">
          <circle r={radius} fill="none" stroke="#efe8d8" strokeWidth="22" />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="22"
              strokeDasharray={`${arc.len} ${circ - arc.len}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </g>
      </svg>
      <ul className="legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>
              {num(slice.value)} {slice.unit}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Money({ value }) {
  return <span className="num">{money(value)}</span>
}
