/**
 * Generates PWA icons using sharp (bundled with Next.js).
 * Run: node generate-icons.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'

// Brand colours matching the site
const BG_DARK = '#040612'
const ACCENT  = '#38bdf8'
const WHITE   = '#ffffff'

/**
 * Build an SVG icon at the requested size.
 * maskable=true adds extra padding so the logo is always visible
 * inside any mask shape (circle, squircle, etc.)
 */
function buildSVG(size, maskable = false, accent = ACCENT) {
  const pad  = maskable ? size * 0.15 : size * 0.08
  const inner = size - pad * 2
  const r    = size * 0.22  // corner radius
  const cx   = size / 2
  const cy   = size / 2

  // Font sizes relative to icon size
  const fs1 = Math.round(inner * 0.46)
  const fs2 = Math.round(inner * 0.20)
  const y1  = cy - inner * 0.04
  const y2  = cy + inner * 0.36

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04111f"/>
      <stop offset="100%" stop-color="#060c1e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <!-- Subtle grid pattern -->
  <rect width="${size}" height="${size}" rx="${r}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.08"/>
  <!-- Accent ring -->
  <circle cx="${cx}" cy="${cy * 0.72}" r="${inner * 0.32}" fill="none" stroke="url(#accent)" stroke-width="${size * 0.025}" opacity="0.25"/>
  <!-- CP letters -->
  <text x="${cx}" y="${y1}" text-anchor="middle" dominant-baseline="middle"
    font-family="'Arial Black', 'Arial', sans-serif" font-weight="900" font-size="${fs1}"
    fill="url(#accent)" letter-spacing="-2">CP</text>
  <!-- Tagline -->
  <text x="${cx}" y="${y2}" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, sans-serif" font-weight="700" font-size="${fs2}"
    fill="${WHITE}" opacity="0.65" letter-spacing="1">PROMO</text>
</svg>`
}

function buildShortcutSVG(size, emoji, label) {
  const cx = size / 2, cy = size / 2
  const fs = Math.round(size * 0.42)
  const fy = cy - size * 0.05
  const ly = cy + size * 0.38
  const lf = Math.round(size * 0.13)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0d1e35"/>
  <text x="${cx}" y="${fy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}">${emoji}</text>
  <text x="${cx}" y="${ly}" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, sans-serif" font-weight="700" font-size="${lf}" fill="#38bdf8">${label}</text>
</svg>`
}

async function svgToPng(svgStr, outPath) {
  const buf = Buffer.from(svgStr)
  await sharp(buf).png().toFile(outPath)
  console.log('  ✓', outPath)
}

// Main
const base = 'public/icons'

console.log('Generating PWA icons...')

await svgToPng(buildSVG(192),            `${base}/icon-192.png`)
await svgToPng(buildSVG(192, true),      `${base}/icon-192-maskable.png`)
await svgToPng(buildSVG(384),            `${base}/icon-384.png`)
await svgToPng(buildSVG(512),            `${base}/icon-512.png`)
await svgToPng(buildSVG(512, true),      `${base}/icon-512-maskable.png`)
await svgToPng(buildSVG(180),            `${base}/apple-touch-icon.png`)
await svgToPng(buildSVG(72),             `${base}/badge-72.png`)

// Shortcut icons
await svgToPng(buildShortcutSVG(96, '🏪', 'Boutiques'), `${base}/shortcut-stores.png`)
await svgToPng(buildShortcutSVG(96, '🔥', 'Jour'),      `${base}/shortcut-daily.png`)

// Placeholder screenshot (solid colour — replace with real screenshot later)
const screenshotSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#040612"/>
  <text x="195" y="422" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="#38bdf8">CodePromoReduc</text>
</svg>`
await svgToPng(screenshotSVG, `${base}/screenshot-mobile.png`)

console.log('All icons generated.')
