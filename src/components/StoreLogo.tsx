import Image from 'next/image'

interface Props {
  src: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 48, md: 80, lg: 120 }
const containers = {
  sm: 'w-14 h-14',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
}

export function StoreLogo({ src, name, size = 'md' }: Props) {
  const px = sizes[size]
  return (
    <div className={`${containers[size]} bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2 shrink-0 overflow-hidden`}>
      {src ? (
        <Image
          src={src}
          alt={`Logo ${name}`}
          width={px}
          height={px}
          className="object-contain w-full h-full"
          unoptimized
        />
      ) : (
        <span className="text-navy font-bold text-center text-xs leading-tight line-clamp-2 px-1">
          {name}
        </span>
      )}
    </div>
  )
}
