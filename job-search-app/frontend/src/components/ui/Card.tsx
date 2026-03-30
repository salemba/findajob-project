import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ children, className, padding = false, hover = false, ...props }: CardProps) {
  const padClass =
    padding === true || padding === 'md' ? 'p-5' :
    padding === 'sm'                     ? 'p-4' :
    padding === 'lg'                     ? 'p-6' : ''

  return (
    <div
      className={clsx(
        'bg-surface-1 rounded-xl border border-outline',
        hover && 'hover:border-outline-bold hover:bg-surface-2 transition-colors duration-150 cursor-pointer',
        padClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 py-4 border-b border-outline flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={clsx('font-display font-semibold text-ink text-sm', className)}>{children}</h2>
  )
}
