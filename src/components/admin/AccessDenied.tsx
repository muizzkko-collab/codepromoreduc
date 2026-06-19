import { ShieldAlert } from 'lucide-react'

export function AccessDenied({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <ShieldAlert className="h-12 w-12 text-red-300 mb-4" />
      <h1 className="text-xl font-bold text-navy mb-2">{title}</h1>
      <p className="text-sm text-gray-500 max-w-sm">{desc}</p>
    </div>
  )
}
