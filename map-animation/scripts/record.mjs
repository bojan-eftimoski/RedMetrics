import { chromium } from 'playwright'
import { mkdirSync, readdirSync, statSync, unlinkSync, existsSync, renameSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const URL = process.env.RECORD_URL ?? 'http://localhost:5175'
const VIEWPORT = { width: 1920, height: 1080 }
const PRELOAD_MS = 4000   // wait for map style.load + first paint
const SEQUENCE_MS = 33000 // one full sequence (32s) + a small tail
const OUT_DIR = 'videos'
const FINAL_MP4 = join(OUT_DIR, 'demo.mp4')
const FINAL_WEBM = join(OUT_DIR, 'demo.webm')

mkdirSync(OUT_DIR, { recursive: true })

console.log('[record] launching chromium…')
const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--enable-accelerated-2d-canvas',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
})

const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: OUT_DIR, size: VIEWPORT },
  deviceScaleFactor: 1,
})
const page = await context.newPage()

console.log(`[record] navigating to ${URL}`)
await page.goto(URL, { waitUntil: 'load', timeout: 30000 })

console.log('[record] waiting for .mapboxgl-canvas…')
await page.waitForSelector('.mapboxgl-canvas', { timeout: 30000 })

console.log(`[record] preload ${PRELOAD_MS}ms (map load + initial frames)`)
await page.waitForTimeout(PRELOAD_MS)

console.log(`[record] recording animation for ${SEQUENCE_MS}ms`)
await page.waitForTimeout(SEQUENCE_MS)

console.log('[record] closing context to finalise video…')
await page.close()
await context.close()
await browser.close()

const webms = readdirSync(OUT_DIR).filter(
  (f) => f.endsWith('.webm') && f !== 'demo.webm',
)
if (webms.length === 0) {
  throw new Error('No webm produced by Playwright')
}
const newest = webms
  .map((f) => ({ f, m: statSync(join(OUT_DIR, f)).mtimeMs }))
  .sort((a, b) => b.m - a.m)[0].f
const rawWebm = join(OUT_DIR, newest)
console.log('[record] raw webm:', rawWebm)

if (existsSync(FINAL_MP4)) unlinkSync(FINAL_MP4)
if (existsSync(FINAL_WEBM)) unlinkSync(FINAL_WEBM)

console.log('[record] trimming preload + transcoding to mp4 (h264)…')
const trimSec = PRELOAD_MS / 1000
const durSec = SEQUENCE_MS / 1000
execSync(
  `ffmpeg -y -ss ${trimSec} -i "${rawWebm}" -t ${durSec} ` +
    `-c:v libx264 -crf 22 -preset medium -pix_fmt yuv420p -movflags +faststart ` +
    `"${FINAL_MP4}"`,
  { stdio: 'inherit' },
)

// Keep a webm copy too — modern browsers play it inline without H264 licensing.
renameSync(rawWebm, FINAL_WEBM)

console.log('[record] done')
console.log(`  ${FINAL_MP4} (${(statSync(FINAL_MP4).size / 1024 / 1024).toFixed(2)} MB)`)
console.log(`  ${FINAL_WEBM} (${(statSync(FINAL_WEBM).size / 1024 / 1024).toFixed(2)} MB)`)
