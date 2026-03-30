import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Sparkles, Send, Search } from 'lucide-react'
import { jobOffersService, aiService } from '@/services'
import { Button, OfferStatusBadge, ScoreBadge, RemoteBadge } from '@/components/ui'
import type { OfferStatus } from '@/types'
import { OFFER_STATUS_LABELS } from '@/types'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

type SortField = 'created_at' | 'compatibility_score' | 'company' | 'title'

const STATUSES: OfferStatus[] = ['NEW', 'ANALYZED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED']

function SortIcon({ field, sortBy, sortDesc }: { field: SortField; sortBy: SortField; sortDesc: boolean }) {
  if (sortBy !== field) return <ArrowUpDown size={11} className="text-ink-faint" />
  return sortDesc
    ? <ArrowDown size={11} className="text-accent" />
    : <ArrowUp size={11} className="text-accent" />
}

export function OffersTable() {
  const queryClient = useQueryClient()
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState<OfferStatus | ''>('')
  const [sortBy,   setSortBy]   = useState<SortField>('created_at')
  const [sortDesc, setSortDesc] = useState(true)
  const [page,     setPage]     = useState(1)
  const [busy,     setBusy]     = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['offers-table', search, status, sortBy, sortDesc, page],
    queryFn: () =>
      jobOffersService.list({
        search:     search || undefined,
        status:     (status as OfferStatus) || undefined,
        order_by:   sortBy,
        order_desc: sortDesc,
        page,
        page_size:  8,
      }),
    placeholderData: (prev) => prev,
  })

  const setLoading = (id: string, on: boolean) =>
    setBusy((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => aiService.analyze(id),
    onMutate:   (id) => setLoading(id, true),
    onSettled:  (_, __, id) => setLoading(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers-table'] })
      queryClient.invalidateQueries({ queryKey: ['offers-stats'] })
      queryClient.invalidateQueries({ queryKey: ['offers-pipeline'] })
      toast.success('Analyse terminée')
    },
  })

  const applyMutation = useMutation({
    mutationFn: (id: string) => jobOffersService.updateStatus(id, 'APPLIED'),
    onMutate:   (id) => setLoading(id, true),
    onSettled:  (_, __, id) => setLoading(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers-table'] })
      queryClient.invalidateQueries({ queryKey: ['offers-stats'] })
      queryClient.invalidateQueries({ queryKey: ['offers-pipeline'] })
      toast.success('Statut → Postulée')
    },
  })

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDesc((d) => !d)
    else { setSortBy(field); setSortDesc(true) }
    setPage(1)
  }

  const offers = data?.items ?? []

  return (
    <div className="card flex flex-col overflow-hidden h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-outline flex-shrink-0">
        <p className="text-xs font-mono text-ink-muted uppercase tracking-widest">Offres</p>
        <div className="flex-1" />
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            className="input h-7 pl-7 pr-3 text-xs w-40"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="input h-7 text-xs w-auto"
          value={status}
          onChange={(e) => { setStatus(e.target.value as OfferStatus | ''); setPage(1) }}
        >
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-2 border-b border-outline z-10">
            <tr>
              {(
                [
                  { label: 'Titre',      field: 'title'               as SortField },
                  { label: 'Entreprise', field: 'company'             as SortField },
                ] as const
              ).map(({ label, field }) => (
                <th key={field} className="px-4 py-2.5 text-left">
                  <button
                    onClick={() => handleSort(field)}
                    className="flex items-center gap-1 font-mono font-medium text-ink-muted hover:text-ink transition-colors"
                  >
                    {label} <SortIcon field={field} sortBy={sortBy} sortDesc={sortDesc} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left font-mono font-medium text-ink-muted">TJM</th>
              <th className="px-4 py-2.5 text-left font-mono font-medium text-ink-muted">Remote</th>
              <th className="px-4 py-2.5 text-left">
                <button
                  onClick={() => handleSort('compatibility_score')}
                  className="flex items-center gap-1 font-mono font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  Score <SortIcon field="compatibility_score" sortBy={sortBy} sortDesc={sortDesc} />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left font-mono font-medium text-ink-muted">Statut</th>
              <th className="px-4 py-2.5 text-left">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center gap-1 font-mono font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  Date <SortIcon field="created_at" sortBy={sortBy} sortDesc={sortDesc} />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left font-mono font-medium text-ink-muted">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-surface-3 rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              offers.map((offer) => {
                const isBusy   = busy.has(offer.id)
                const canApply = !['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED'].includes(offer.status)

                return (
                  <tr key={offer.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 max-w-[180px]">
                      <Link
                        to={`/offers/${offer.id}`}
                        className="font-medium text-ink hover:text-accent transition-colors block truncate"
                      >
                        {offer.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted font-mono max-w-[120px] truncate">
                      {offer.company}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-muted whitespace-nowrap">
                      {offer.tjm_min != null
                        ? `${offer.tjm_min}${offer.tjm_max ? `–${offer.tjm_max}` : '+'}€`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <RemoteBadge remote_type={offer.remote_type} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={offer.compatibility_score} />
                    </td>
                    <td className="px-4 py-3">
                      <OfferStatusBadge status={offer.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-faint whitespace-nowrap">
                      {format(parseISO(offer.created_at), 'dd/MM/yy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <Link to={`/offers/${offer.id}`}>
                          <Button variant="ghost" size="xs" title="Voir">
                            <Eye size={12} />
                          </Button>
                        </Link>
                        {offer.compatibility_score == null && (
                          <Button
                            variant="ghost"
                            size="xs"
                            title="Analyser avec Claude"
                            loading={isBusy}
                            onClick={() => analyzeMutation.mutate(offer.id)}
                          >
                            <Sparkles size={12} className="text-accent" />
                          </Button>
                        )}
                        {canApply && (
                          <Button
                            variant="ghost"
                            size="xs"
                            title="Postuler"
                            loading={isBusy}
                            onClick={() => applyMutation.mutate(offer.id)}
                          >
                            <Send size={12} className="text-info" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

            {!isLoading && offers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-ink-muted font-mono">
                  Aucune offre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="px-4 py-2.5 border-t border-outline flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-ink-muted font-mono">
            {data.total} offres · p.{data.page}/{data.pages}
          </span>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1}         onClick={() => setPage((p) => p - 1)}>←</Button>
            <Button size="xs" variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>→</Button>
          </div>
        </div>
      )}
    </div>
  )
}
