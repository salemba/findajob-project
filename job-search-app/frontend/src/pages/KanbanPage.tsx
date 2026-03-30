import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Search, SlidersHorizontal, MoreVertical,
  ExternalLink, Archive, ArrowRightCircle,
} from 'lucide-react'
import { jobOffersService } from '@/services'
import { FullPageSpinner, RemoteBadge } from '@/components/ui'
import type { JobOffer, OfferStatus, OfferType } from '@/types'
import { OFFER_STATUS_LABELS } from '@/types'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ── Column definitions ────────────────────────────────────────────────────────

type ColId = 'new' | 'analyzed' | 'applied' | 'interview' | 'offer' | 'archived'

interface KanbanColDef {
  id: ColId
  label: string
  emoji: string
  statuses: OfferStatus[]
  dropStatus: OfferStatus
  borderColor: string
}

const COLUMNS: KanbanColDef[] = [
  { id: 'new',       label: 'Nouvelles',   emoji: '📥', statuses: ['NEW'],                dropStatus: 'NEW',       borderColor: 'border-info'      },
  { id: 'analyzed',  label: 'Analysées',   emoji: '🔍', statuses: ['ANALYZED'],           dropStatus: 'ANALYZED',  borderColor: 'border-blue-400'  },
  { id: 'applied',   label: 'Postulées',   emoji: '📤', statuses: ['APPLIED'],            dropStatus: 'APPLIED',   borderColor: 'border-warn'      },
  { id: 'interview', label: 'Entretien',   emoji: '📅', statuses: ['INTERVIEW'],          dropStatus: 'INTERVIEW', borderColor: 'border-accent'    },
  { id: 'offer',     label: 'Offre reçue', emoji: '🤝', statuses: ['OFFER'],              dropStatus: 'OFFER',     borderColor: 'border-ok'        },
  { id: 'archived',  label: 'Archivées',   emoji: '🗄️',  statuses: ['REJECTED','ARCHIVED'], dropStatus: 'ARCHIVED',  borderColor: 'border-ink-faint' },
]

const ALL_STATUSES: OfferStatus[] = ['NEW', 'ANALYZED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(company: string): string {
  return company
    .split(/[\s\-&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const AVATAR_PALETTE = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-green-500/20 text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-pink-500/20 text-pink-300',
  'bg-teal-500/20 text-teal-300',
  'bg-yellow-500/20 text-yellow-300',
  'bg-red-500/20 text-red-300',
]

function getAvatarColor(company: string): string {
  let h = 0
  for (const c of company) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function ScoreCircle({ score }: { score: number | null }) {
  if (score == null)
    return (
      <span className="w-6 h-6 rounded-full bg-surface-3 flex items-center justify-center text-[9px] font-mono text-ink-faint">
        ?
      </span>
    )
  const cls =
    score >= 75 ? 'bg-ok/20 text-ok' : score >= 55 ? 'bg-warn/20 text-warn' : 'bg-fail/20 text-fail'
  return (
    <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono', cls)}>
      {score}
    </span>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

function CardContextMenu({
  offer,
  onMove,
  onView,
  onArchive,
}: {
  offer: JobOffer
  onMove: (id: string, status: OfferStatus) => void
  onView: (id: string) => void
  onArchive: (id: string) => void
}) {
  const otherStatuses = ALL_STATUSES.filter((s) => s !== offer.status)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-3 text-ink-muted hover:text-ink transition-all flex-shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreVertical size={13} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-surface-2 border border-outline rounded-lg shadow-xl py-1 z-[100] min-w-[190px] animate-fade-in"
          sideOffset={4}
          align="end"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-surface-3 cursor-pointer outline-none"
            onSelect={() => onView(offer.id)}
          >
            <ExternalLink size={11} className="flex-shrink-0" /> Voir le détail
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-outline mx-1 my-1" />
          <DropdownMenu.Label className="px-3 py-1 text-[10px] font-mono text-ink-faint uppercase tracking-wider">
            Changer statut
          </DropdownMenu.Label>

          {otherStatuses.map((s) => (
            <DropdownMenu.Item
              key={s}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-surface-3 cursor-pointer outline-none"
              onSelect={() => onMove(offer.id, s)}
            >
              <ArrowRightCircle size={11} className="flex-shrink-0" />
              {OFFER_STATUS_LABELS[s]}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="h-px bg-outline mx-1 my-1" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-fail hover:bg-surface-3 cursor-pointer outline-none"
            onSelect={() => onArchive(offer.id)}
          >
            <Archive size={11} className="flex-shrink-0" /> Archiver
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Card visual (shared with DragOverlay) ─────────────────────────────────────

function KanbanCardInner({
  offer,
  isDragging = false,
  onMove,
  onView,
  onArchive,
}: {
  offer: JobOffer
  isDragging?: boolean
  onMove?: (id: string, status: OfferStatus) => void
  onView?: (id: string) => void
  onArchive?: (id: string) => void
}) {
  return (
    <div
      className={clsx(
        'bg-surface-2 border border-outline rounded-lg p-3 group',
        'cursor-grab active:cursor-grabbing select-none',
        'hover:border-outline-bold hover:shadow-lg hover:shadow-black/30 transition-all duration-150',
        isDragging && 'shadow-2xl border-outline-bold rotate-[1.5deg]',
      )}
    >
      {/* Header: avatar + title + menu */}
      <div className="flex items-start gap-2">
        <div
          className={clsx(
            'w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
            getAvatarColor(offer.company),
          )}
        >
          {getInitials(offer.company)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink group-hover:text-accent transition-colors leading-tight line-clamp-2">
            {offer.title}
          </p>
          <p className="text-[10px] text-ink-muted font-mono truncate mt-0.5">{offer.company}</p>
        </div>
        {!isDragging && onView && onMove && onArchive && (
          <CardContextMenu offer={offer} onMove={onMove} onView={onView} onArchive={onArchive} />
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        <RemoteBadge remote_type={offer.remote_type} />
        {offer.type === 'FREELANCE' && offer.tjm_min != null ? (
          <span className="badge badge-purple text-[9px] font-mono py-0">
            {offer.tjm_min}{offer.tjm_max ? `–${offer.tjm_max}` : '+'}€/j
          </span>
        ) : offer.salary_min != null ? (
          <span className="badge badge-purple text-[9px] font-mono py-0">
            {Math.round(offer.salary_min / 1000)}k€
          </span>
        ) : null}
      </div>

      {/* Footer: date + score */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-outline/60">
        <span className="text-[10px] text-ink-faint font-mono leading-none">
          {formatDistanceToNow(parseISO(offer.updated_at), { addSuffix: true, locale: fr })}
        </span>
        <ScoreCircle score={offer.compatibility_score} />
      </div>
    </div>
  )
}

// ── Draggable wrapper ─────────────────────────────────────────────────────────

function DraggableCard(props: {
  offer: JobOffer
  onMove: (id: string, status: OfferStatus) => void
  onView: (id: string) => void
  onArchive: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.offer.id,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCardInner {...props} isDragging={isDragging} />
    </div>
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  offers,
  onMove,
  onView,
  onArchive,
}: {
  col: KanbanColDef
  offers: JobOffer[]
  onMove: (id: string, status: OfferStatus) => void
  onView: (id: string) => void
  onArchive: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className="flex flex-col w-60 flex-shrink-0 h-full">
      {/* Column header */}
      <div className={clsx('flex-shrink-0 rounded-t-xl border-t-[3px] px-3 py-2.5 bg-surface-1', col.borderColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{col.emoji}</span>
            <span className="text-[11px] font-mono font-bold text-ink">{col.label}</span>
          </div>
          <span
            className={clsx(
              'min-w-5 h-5 rounded-full flex items-center justify-center px-1.5 text-[10px] font-bold font-mono',
              offers.length > 0 ? 'bg-surface-3 text-ink-muted' : 'bg-surface-2 text-ink-faint',
            )}
          >
            {offers.length}
          </span>
        </div>
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 rounded-b-xl border border-t-0 p-2 overflow-y-auto scrollbar-thin transition-colors min-h-[80px]',
          isOver
            ? 'bg-surface-2 border-outline-bold ring-1 ring-inset ring-outline-bold'
            : 'bg-surface-1 border-outline',
        )}
      >
        <div className="space-y-2">
          {offers.map((offer) => (
            <DraggableCard
              key={offer.id}
              offer={offer}
              onMove={onMove}
              onView={onView}
              onArchive={onArchive}
            />
          ))}
          <div
            className={clsx(
              'flex items-center justify-center rounded-lg border-2 border-dashed text-[10px] font-mono transition-all',
              offers.length === 0 ? 'py-8' : 'py-2',
              isOver ? 'border-accent/50 text-accent bg-accent/5' : 'border-outline text-ink-faint',
            )}
          >
            {isOver ? '↓ Déposer ici' : offers.length === 0 ? 'Vide' : '+ Déposer'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const [search,       setSearch]       = useState('')
  const [filterSrc,    setFilterSrc]    = useState('ALL')
  const [filterType,   setFilterType]   = useState<OfferType | 'ALL'>('ALL')
  const [filterScore,  setFilterScore]  = useState(0)
  const [activeId,     setActiveId]     = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const { data, isLoading } = useQuery({
    queryKey: ['offers-kanban'],
    queryFn:  () => jobOffersService.list({ page_size: 500, order_by: 'updated_at', order_desc: true }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OfferStatus }) =>
      jobOffersService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers-kanban'] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  })

  const allOffers = data?.items ?? []

  const sources = useMemo(
    () => Array.from(new Set(allOffers.map((o) => o.source).filter(Boolean))).sort(),
    [allOffers],
  )

  const filtered = useMemo(
    () =>
      allOffers.filter((o) => {
        if (filterSrc !== 'ALL' && o.source !== filterSrc) return false
        if (filterType !== 'ALL' && o.type !== filterType) return false
        if (filterScore > 0 && (o.compatibility_score == null || o.compatibility_score < filterScore)) return false
        if (search) {
          const q = search.toLowerCase()
          if (!o.title.toLowerCase().includes(q) && !o.company.toLowerCase().includes(q)) return false
        }
        return true
      }),
    [allOffers, filterSrc, filterType, filterScore, search],
  )

  const colOffers = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as JobOffer[]])) as Record<ColId, JobOffer[]>
    filtered.forEach((o) => {
      const col = COLUMNS.find((c) => c.statuses.includes(o.status))
      if (col) map[col.id].push(o)
    })
    return map
  }, [filtered])

  const activeOffer = activeId ? allOffers.find((o) => o.id === activeId) ?? null : null

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(active.id as string)

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const col = COLUMNS.find((c) => c.id === (over.id as string))
    if (!col) return
    const offer = allOffers.find((o) => o.id === (active.id as string))
    if (!offer || col.statuses.includes(offer.status)) return
    statusMutation.mutate({ id: offer.id, status: col.dropStatus })
    toast.success(`→ ${col.label}`)
  }

  const handleMove    = (id: string, status: OfferStatus) => statusMutation.mutate({ id, status })
  const handleArchive = (id: string) => statusMutation.mutate({ id, status: 'ARCHIVED' })
  const handleView    = (id: string) => navigate(`/offers/${id}`)
  const hasFilter     = !!(search || filterSrc !== 'ALL' || filterType !== 'ALL' || filterScore > 0)

  if (isLoading) return <FullPageSpinner text="Chargement du pipeline…" />

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-outline bg-surface">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-display font-bold text-ink">Pipeline</h1>
            <p className="text-xs text-ink-muted font-mono">
              {filtered.length} offre{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== allOffers.length && ` sur ${allOffers.length}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative min-w-48 flex-1 max-w-72">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              className="input w-full pl-7 h-8 text-xs"
              placeholder="Titre, entreprise…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Source */}
          <select
            className="input h-8 text-xs w-40"
            value={filterSrc}
            onChange={(e) => setFilterSrc(e.target.value)}
          >
            <option value="ALL">Toutes sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Type */}
          <select
            className="input h-8 text-xs w-36"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as OfferType | 'ALL')}
          >
            <option value="ALL">Tous types</option>
            <option value="FREELANCE">Freelance</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
          </select>

          {/* Score min */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={12} className="text-ink-muted flex-shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filterScore}
              onChange={(e) => setFilterScore(Number(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="text-[11px] font-mono text-ink-muted w-10 tabular-nums">
              {filterScore > 0 ? `≥ ${filterScore}` : 'Tous'}
            </span>
          </div>

          {/* Reset */}
          {hasFilter && (
            <button
              className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
              onClick={() => { setSearch(''); setFilterSrc('ALL'); setFilterType('ALL'); setFilterScore(0) }}
            >
              Réinitialiser ×
            </button>
          )}
        </div>
      </div>

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="flex gap-3 p-5 h-full"
            style={{ minWidth: `${COLUMNS.length * 252 + (COLUMNS.length - 1) * 12 + 40}px` }}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                offers={colOffers[col.id]}
                onMove={handleMove}
                onView={handleView}
                onArchive={handleArchive}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
            {activeOffer && (
              <div className="w-60">
                <KanbanCardInner offer={activeOffer} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
