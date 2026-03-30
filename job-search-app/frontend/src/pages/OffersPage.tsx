import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Star, StarOff, ArrowUpDown, Filter } from 'lucide-react'
import { jobOffersService } from '@/services'
import { useOffersStore } from '@/stores'
import { Button, OfferStatusBadge, ScoreBadge, RemoteBadge, OfferTypeBadge, FullPageSpinner } from '@/components/ui'
import type { OfferStatus, OfferType, RemoteType } from '@/types'
import { OFFER_STATUS_LABELS, OFFER_TYPE_LABELS, REMOTE_TYPE_LABELS } from '@/types'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUSES: OfferStatus[]    = ['NEW', 'ANALYZED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'ARCHIVED']
const TYPES:    OfferType[]      = ['FREELANCE', 'CDI', 'CDD']
const REMOTES:  RemoteType[]     = ['FULL_REMOTE', 'HYBRID', 'ON_SITE']

export default function OffersPage() {
  const { filters, setFilter, resetFilters } = useOffersStore()
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['offers', filters, search],
    queryFn: () => jobOffersService.list({ ...filters, search: search || undefined }),
  })

  const favMutation = useMutation({
    mutationFn: (id: string) => jobOffersService.toggleFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobOffersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['offers-stats'] })
      toast.success('Offre supprimée')
    },
  })

  const offers = data?.items ?? []

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-display font-bold text-ink">Offres</h1>
            <span className="text-xs text-ink-muted font-mono">{data?.total ?? 0} offre(s)</span>
          </div>
        </div>
        <Link to="/offers/new">
          <Button variant="primary" size="sm">
            <Plus size={14} /> Nouvelle offre
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-8 h-8 text-xs"
            placeholder="Rechercher titre, entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input h-8 text-xs w-auto"
          value={filters.status ?? ''}
          onChange={(e) => setFilter({ status: (e.target.value as OfferStatus) || undefined })}
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABELS[s]}</option>)}
        </select>
        <select
          className="input h-8 text-xs w-auto"
          value={filters.type ?? ''}
          onChange={(e) => setFilter({ type: e.target.value || undefined })}
        >
          <option value="">Type contrat</option>
          {TYPES.map((t) => <option key={t} value={t}>{OFFER_TYPE_LABELS[t]}</option>)}
        </select>
        <select
          className="input h-8 text-xs w-auto"
          value={filters.remote_type ?? ''}
          onChange={(e) => setFilter({ remote_type: e.target.value || undefined })}
        >
          <option value="">Remote</option>
          {REMOTES.map((r) => <option key={r} value={r}>{REMOTE_TYPE_LABELS[r]}</option>)}
        </select>
        <select
          className="input h-8 text-xs w-auto"
          value={filters.order_by ?? 'created_at'}
          onChange={(e) => setFilter({ order_by: e.target.value })}
        >
          <option value="created_at">Plus récentes</option>
          <option value="compatibility_score">Score IA</option>
          <option value="company">Entreprise</option>
        </select>
        {(filters.status || filters.type || filters.remote_type || search) && (
          <button
            onClick={() => { resetFilters(); setSearch('') }}
            className="text-xs text-ink-muted hover:text-ink font-mono transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <FullPageSpinner text="Chargement des offres…" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 border-b border-outline">
              <tr>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted w-6"></th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Poste / Entreprise</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Type</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Remote</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">TJM</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Score</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Statut</th>
                <th className="px-4 py-3 text-left font-mono font-medium text-ink-muted">Ajoutée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-surface-2 transition-colors group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => favMutation.mutate(offer.id)}
                      className={clsx(
                        'transition-colors',
                        offer.is_favorite ? 'text-yellow-400' : 'text-ink-faint hover:text-yellow-400'
                      )}
                    >
                      <Star size={13} fill={offer.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/offers/${offer.id}`} className="font-medium text-ink hover:text-accent transition-colors">
                      {offer.title}
                    </Link>
                    <p className="text-ink-muted font-mono mt-0.5">{offer.company}</p>
                  </td>
                  <td className="px-4 py-3">
                    <OfferTypeBadge type={offer.type} />
                  </td>
                  <td className="px-4 py-3">
                    <RemoteBadge remote_type={offer.remote_type} />
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-muted">
                    {offer.tjm_min != null
                      ? `${offer.tjm_min}${offer.tjm_max ? `–${offer.tjm_max}` : '+'}€`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={offer.compatibility_score} />
                  </td>
                  <td className="px-4 py-3">
                    <OfferStatusBadge status={offer.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-faint">
                    {format(parseISO(offer.created_at), 'dd/MM/yy')}
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-ink-muted font-mono">
                    Aucune offre.{' '}
                    <Link to="/offers/new" className="text-accent hover:text-accent-light">
                      Ajouter la première →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="px-4 py-3 border-t border-outline flex items-center justify-between">
              <span className="text-xs text-ink-muted font-mono">
                Page {data.page} / {data.pages} — {data.total} offres
              </span>
              <div className="flex gap-2">
                <Button size="xs" disabled={data.page <= 1} onClick={() => setFilter({ page: data.page - 1 })}>
                  ← Préc.
                </Button>
                <Button size="xs" disabled={data.page >= data.pages} onClick={() => setFilter({ page: data.page + 1 })}>
                  Suiv. →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
