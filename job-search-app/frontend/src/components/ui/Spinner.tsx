import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full border-ink-faint border-t-accent animate-spin',
        sizes[size],
        className
      )}
      aria-label="Chargement"
    />
  )
}

export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
      <Spinner size="lg" />
      {text && <p className="text-sm text-ink-muted font-mono">{text}</p>}
    </div>
  )
}
