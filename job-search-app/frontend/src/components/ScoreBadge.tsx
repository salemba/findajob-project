import clsx from 'clsx'

interface ScoreBadgeProps {
  score: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getScoreConfig(score: number) {
  if (score >= 80) return { color: 'text-green-700 bg-green-100', label: 'Excellent' }
  if (score >= 65) return { color: 'text-blue-700 bg-blue-100', label: 'Bon' }
  if (score >= 50) return { color: 'text-yellow-700 bg-yellow-100', label: 'Moyen' }
  return { color: 'text-red-700 bg-red-100', label: 'Faible' }
}

export default function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return <span className="badge badge-gray text-gray-400">—</span>
  }

  const config = getScoreConfig(score)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2.5 py-1'

  return (
    <span className={clsx('badge font-semibold', config.color, sizeClass)}>
      {score.toFixed(0)}{showLabel && ` — ${config.label}`}
    </span>
  )
}
