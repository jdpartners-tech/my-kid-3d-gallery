import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { extname } from 'path'

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MANIFEST_PATH = 'manifest.json'

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))

const kidDirs = ['artwork/Kayden', 'artwork/Kaylie']

kidDirs.forEach((dir, i) => {
  const existing = new Set(manifest.kids[i].artworks.map(a => a.file))
  let files
  try {
    files = readdirSync(dir)
  } catch {
    return
  }
  files
    .filter(f => SUPPORTED.has(extname(f).toLowerCase()) && f !== '.gitkeep')
    .forEach(f => {
      const file = `${dir}/${f}`
      if (!existing.has(file)) {
        manifest.kids[i].artworks.push({ file, title: '', date: '', age: '' })
        console.log(`+ added: ${file}`)
      }
    })
})

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
console.log('manifest.json updated.')
