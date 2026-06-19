// Bare layout — no site header/footer so the popup overlay fills the whole tab
export default function CouponRevealLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, padding: 0, minHeight: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
