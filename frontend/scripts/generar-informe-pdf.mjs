import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mdPath = path.resolve(__dirname, '../../docs/Informe_Unidad_II_Sistema_Tech.md')
const outPath = path.resolve(__dirname, '../../docs/Informe_Unidad_II_Sistema_Tech.pdf')

const markdown = fs.readFileSync(mdPath, 'utf8')
const lines = markdown.split(/\r?\n/)

const doc = new jsPDF({ unit: 'mm', format: 'a4' })
const pageWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()
const marginX = 15
const marginTop = 15
const marginBottom = 15
const maxWidth = pageWidth - marginX * 2
let y = marginTop

const addPageIfNeeded = (nextHeight = 6) => {
  if (y + nextHeight > pageHeight - marginBottom) {
    doc.addPage()
    y = marginTop
  }
}

for (const rawLine of lines) {
  const line = rawLine.trim()

  if (!line) {
    y += 3
    addPageIfNeeded()
    continue
  }

  let fontSize = 11
  let text = line

  if (line.startsWith('# ')) {
    fontSize = 16
    text = line.slice(2).trim()
  } else if (line.startsWith('## ')) {
    fontSize = 14
    text = line.slice(3).trim()
  } else if (line.startsWith('### ')) {
    fontSize = 12
    text = line.slice(4).trim()
  } else if (line.startsWith('- ')) {
    text = `• ${line.slice(2).trim()}`
  } else if (line.startsWith('|') && line.endsWith('|')) {
    text = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())
      .join(' | ')
  } else if (line.startsWith('---')) {
    y += 2
    continue
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  const wrapped = doc.splitTextToSize(text, maxWidth)
  const lineHeight = fontSize <= 11 ? 5 : 6

  addPageIfNeeded(wrapped.length * lineHeight + 2)
  doc.text(wrapped, marginX, y)
  y += wrapped.length * lineHeight + 1.5
}

doc.save(outPath)
console.log(`PDF generado: ${outPath}`)

