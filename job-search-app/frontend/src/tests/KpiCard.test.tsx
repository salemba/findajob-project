import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '@/components/dashboard/KpiCard'

// ─── Basic rendering ──────────────────────────────────────────────────────────

describe('KpiCard', () => {
  it('renders the title', () => {
    render(<KpiCard title="Total Offres" value={42} />)
    expect(screen.getByText('Total Offres')).toBeInTheDocument()
  })

  it('renders a numeric value', () => {
    render(<KpiCard title="Score" value={87} />)
    expect(screen.getByText('87')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<KpiCard title="Statut" value="Actif" />)
    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    render(<KpiCard title="Offres" value={10} subtitle="ce mois-ci" />)
    expect(screen.getByText('ce mois-ci')).toBeInTheDocument()
  })

  it('does not render a subtitle node when omitted', () => {
    const { container } = render(<KpiCard title="Offres" value={10} />)
    // subtitle paragraph has class font-mono mt-0.5 — shouldn't exist
    expect(container.querySelectorAll('p').length).toBe(1) // only title p
  })

  // ─── Trend ─────────────────────────────────────────────────────────────────

  it('shows positive percentage for positive trend', () => {
    render(<KpiCard title="Offres" value={10} trend={12} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('shows absolute value for negative trend', () => {
    render(<KpiCard title="Offres" value={10} trend={-8} />)
    // Math.abs(-8) = 8
    expect(screen.getByText('8%')).toBeInTheDocument()
  })

  it('renders trendLabel alongside the percentage', () => {
    render(<KpiCard title="Offres" value={10} trend={5} trendLabel="vs mois préc." />)
    expect(screen.getByText('vs mois préc.')).toBeInTheDocument()
  })

  it('does not render trend section when trend is undefined', () => {
    const { container } = render(<KpiCard title="Offres" value={10} />)
    // No percentage sign should appear
    expect(container.querySelector('.text-ok')).toBeNull()
    expect(container.querySelector('.text-fail')).toBeNull()
  })

  it('does not render trend section when trend is null', () => {
    const { container } = render(<KpiCard title="Offres" value={10} trend={null} />)
    expect(container.querySelector('.text-ok')).toBeNull()
  })

  // ─── Accent variant ────────────────────────────────────────────────────────

  it('applies accent border class when accent=true', () => {
    const { container } = render(<KpiCard title="Offres" value={10} accent />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-accent/30')
  })

  it('does not apply accent border class by default', () => {
    const { container } = render(<KpiCard title="Offres" value={10} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('border-accent/30')
  })

  it('applies text-accent to value when accent=true', () => {
    render(<KpiCard title="Score" value={85} accent />)
    const valueEl = screen.getByText('85')
    expect(valueEl.className).toContain('text-accent')
  })

  // ─── Children ──────────────────────────────────────────────────────────────

  it('renders children inside the card', () => {
    render(
      <KpiCard title="Offres" value={10}>
        <span data-testid="child-node">contenu enfant</span>
      </KpiCard>
    )
    expect(screen.getByTestId('child-node')).toBeInTheDocument()
    expect(screen.getByText('contenu enfant')).toBeInTheDocument()
  })

  it('does not render a children wrapper when no children provided', () => {
    const { container } = render(<KpiCard title="Offres" value={10} />)
    // The mt-1 wrapper div should not exist
    const wrappers = container.querySelectorAll('.mt-1')
    expect(wrappers.length).toBe(0)
  })

  // ─── Icon ──────────────────────────────────────────────────────────────────

  it('renders an icon node when provided', () => {
    render(
      <KpiCard
        title="Offres"
        value={10}
        icon={<svg data-testid="icon" />}
      />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
