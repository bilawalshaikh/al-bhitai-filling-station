import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { STATION } from './logic.js'

function paintHeader(doc, title, subtitle) {
  doc.setFillColor(16, 38, 28)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(243, 193, 91)
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.text(STATION.name, 14, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(232, 236, 230)
  doc.text(`${STATION.line}, ${STATION.city}   ·   ${STATION.phone}`, 14, 21)
  doc.setTextColor(28, 25, 21)
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.text(title, 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  const lines = doc.splitTextToSize(subtitle || '', 180)
  doc.text(lines, 14, 51)
  return 56 + lines.length * 5
}

export function downloadDocument(docModel) {
  const doc = new jsPDF()
  let cursor = paintHeader(doc, docModel.title, docModel.subtitle)
  for (const section of docModel.sections || []) {
    if (section.title) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(16, 38, 28)
      doc.text(section.title, 14, cursor)
      cursor += 4
    }
    const body = section.rows?.length ? section.rows : [section.headers.map((_, index) => (index === 0 ? 'No records' : ''))]
    autoTable(doc, {
      startY: cursor,
      head: [section.headers],
      body,
      styles: { fontSize: 8, textColor: [28, 25, 21], cellPadding: 2 },
      headStyles: { fillColor: [16, 38, 28], textColor: 255 },
      margin: { left: 14, right: 14 },
    })
    cursor = doc.lastAutoTable.finalY + 10
  }
  if (docModel.totals?.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(28, 25, 21)
    for (const total of docModel.totals) {
      doc.text(`${total.label}: ${total.value}`, 14, cursor)
      cursor += 6
    }
  }
  if (docModel.note) {
    cursor += 2
    doc.setFontSize(10)
    doc.text(`Note: ${docModel.note}`, 14, cursor)
  }
  const name = (docModel.fileName || docModel.title || 'report').replace(/[^\w.-]+/g, '_')
  doc.save(`${name}.pdf`)
}
