import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorMessage({ message = 'Une erreur est survenue.', onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-600" />
      </div>
      <div>
        <p className="font-medium text-gray-900">Erreur</p>
        <p className="text-sm text-gray-500 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          <RefreshCw size={16} />
          Réessayer
        </button>
      )}
    </div>
  )
}
