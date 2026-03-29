import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullPage?: boolean
}

export default function LoadingSpinner({ size = 'md', text, fullPage = false }: LoadingSpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 40 }
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={sizeMap[size]} className="animate-spin text-primary-600" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    )
  }
  return spinner
}
