import fs from 'node:fs'
import path from 'node:path'

const tmp = process.env.FURPS_XLSX_DIR || path.join(process.env.TEMP || '/tmp', 'furps-xlsx')

const decodeShared = (xml) => {
  const strings = []
  const parts = xml.split(/<si>/)
  for (let i = 1; i < parts.length; i += 1) {
    const block = parts[i].split('</si>')[0]
    const texts = [...block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1])
    strings.push(texts.join(''))
  }
  return strings
}

const colLetterToNum = (letters) => {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

const cellValue = (cellXml, strings) => {
  const ref = (cellXml.match(/r="([A-Z]+)(\d+)"/) || [])
  const t = (cellXml.match(/t="([^"]+)"/) || [])[1]
  const v = (cellXml.match(/<v>([^<]*)<\/v>/) || [])[1]
  let val = ''
  if (t === 's' && v != null) val = strings[Number(v)] ?? ''
  else if (v != null) val = v
  else val = (cellXml.match(/<t[^>]*>([^<]*)<\/t>/) || [])[1] ?? ''
  const col = ref[1] ? colLetterToNum(ref[1]) : 0
  const row = ref[2] ? Number(ref[2]) : 0
  return { col, row, val: String(val).trim() }
}

const shared = decodeShared(fs.readFileSync(path.join(tmp, 'xl/sharedStrings.xml'), 'utf8'))
const sheetFiles = fs
  .readdirSync(path.join(tmp, 'xl/worksheets'))
  .filter((f) => f.startsWith('sheet') && f.endsWith('.xml'))
  .sort()

for (const sheetFile of sheetFiles) {
  console.log('\n### ' + sheetFile + ' ###\n')
  const sheet = fs.readFileSync(path.join(tmp, 'xl/worksheets', sheetFile), 'utf8')
  const rowBlocks = [...sheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)]
  for (const [, rowNum, rowXml] of rowBlocks) {
    const cells = [...rowXml.matchAll(/<c[^>]*>[\s\S]*?<\/c>/g)]
      .map((m) => cellValue(m[0], shared))
      .filter((c) => c.val)
      .sort((a, b) => a.col - b.col)
    if (!cells.length) continue
    const line = cells.map((c) => c.val).join('\t')
    console.log(`${rowNum}\t${line}`)
  }
}
