// Brand logo kit — Codepromoreduc
// Colors: #080e1a (navy), #1a2d47 (icon bg), #00d4ff (cyan accent)

interface LogoProps {
  variant?: 'nav' | 'full' | 'icon' | 'footer'
  className?: string
}

// Icon mark only (for admin sidebar, favicon context)
export function LogoIcon({ size = 48 }: { size?: number }) {
  const r = size * (9 / 48)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={size} height={size}>
      <rect x="0" y="0" width="48" height="48" rx={r} fill="#1a2d47"/>
      <rect x="0" y="0" width="48" height="48" rx={r} fill="none" stroke="#00d4ff" strokeWidth="0.7" opacity="0.45"/>
      <path d="M 6,13 L 31,13 L 42,24 L 31,35 L 6,35 Z" fill="#00d4ff"/>
      <circle cx="36" cy="24" r="3.8" fill="#1a2d47"/>
    </svg>
  )
}

// Nav bar logo (icon + wordmark, compact)
export function LogoNav({ width = 220 }: { width?: number }) {
  const scale = width / 220
  const h = Math.round(36 * scale)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 36" width={width} height={h}>
      <rect x="0" y="0" width="36" height="36" rx="7" fill="#1a2d47"/>
      <rect x="0" y="0" width="36" height="36" rx="7" fill="none" stroke="#00d4ff" strokeWidth="0.6" opacity="0.4"/>
      <path d="M 4,10 L 23,10 L 32,18 L 23,26 L 4,26 Z" fill="#00d4ff"/>
      <circle cx="27" cy="18" r="3" fill="#1a2d47"/>
      <text x="44" y="24"
        fontFamily="'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif"
        fontWeight="700" fontSize="16" letterSpacing="-0.3">
        <tspan fill="#ffffff">Codepromo</tspan><tspan fill="#00d4ff">reduc</tspan>
      </text>
    </svg>
  )
}

// Full horizontal logo (for hero / large contexts)
export function LogoFull({ width = 400 }: { width?: number }) {
  const h = Math.round(72 * (width / 400))
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 72" width={width} height={h}>
      <rect x="0" y="0" width="72" height="72" rx="13" fill="#1a2d47"/>
      <rect x="0" y="0" width="72" height="72" rx="13" fill="none" stroke="#00d4ff" strokeWidth="0.8" opacity="0.45"/>
      <path d="M 9,19 L 47,19 L 63,36 L 47,53 L 9,53 Z" fill="#00d4ff"/>
      <circle cx="54" cy="36" r="5.5" fill="#1a2d47"/>
      <text x="88" y="48"
        fontFamily="'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif"
        fontWeight="700" fontSize="30" letterSpacing="-0.6">
        <tspan fill="#ffffff">Codepromo</tspan><tspan fill="#00d4ff">reduc</tspan>
      </text>
    </svg>
  )
}

// Wordmark only (no icon — footer text line)
export function LogoWordmark({ fontSize = 18 }: { fontSize?: number }) {
  return (
    <span style={{ fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif", fontWeight:700, fontSize, letterSpacing:'-0.02em', lineHeight:1 }}>
      <span style={{ color:'#fff' }}>Codepromo</span><span style={{ color:'#00d4ff' }}>reduc</span>
    </span>
  )
}

export function Logo({ variant = 'nav', className }: LogoProps) {
  if (variant === 'icon')   return <LogoIcon />
  if (variant === 'full')   return <LogoFull />
  if (variant === 'footer') return <LogoWordmark />
  return <LogoNav />
}
