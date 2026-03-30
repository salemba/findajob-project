import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { CompatibilityGauge } from '@/components/dashboard/CompatibilityGauge'

// Use fake timers so the 60 ms animation setTimeout is under our control.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the progress <circle> (second circle in the SVG). */
function getProgressCircle(container: HTMLElement) {
  const circles = container.querySelectorAll('circle')
  // First circle = track, second = progress
  expect(circles.length).toBe(2)
  return circles[1] as SVGCircleElement
}

/** Fire the 60 ms timeout so `animated` becomes true. */
async function triggerAnimation() {
  await act(async () => {
    vi.advanceTimersByTime(100)
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompatibilityGauge', () => {

  // ─── Null score ────────────────────────────────────────────────────────────

  it('renders an SVG when score is null', () => {
    const { container } = render(<CompatibilityGauge score={null} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('displays "–" dash when score is null', () => {
    const { getByText } = render(<CompatibilityGauge score={null} />)
    expect(getByText('–')).toBeInTheDocument()
  })

  it('does not render "/100" label when score is null', () => {
    const { queryByText } = render(<CompatibilityGauge score={null} />)
    expect(queryByText('/100')).toBeNull()
  })

  // ─── With score ────────────────────────────────────────────────────────────

  it('displays the score number', () => {
    const { getByText } = render(<CompatibilityGauge score={75} />)
    expect(getByText('75')).toBeInTheDocument()
  })

  it('renders "/100" label when score is provided', () => {
    const { getByText } = render(<CompatibilityGauge score={75} />)
    expect(getByText('/100')).toBeInTheDocument()
  })

  // ─── Color thresholds ──────────────────────────────────────────────────────

  it('uses green (#22c55e) for score >= 80', () => {
    const { container } = render(<CompatibilityGauge score={80} />)
    const circle = getProgressCircle(container)
    expect(circle.getAttribute('stroke')).toBe('#22c55e')
  })

  it('uses green for score = 100', () => {
    const { container } = render(<CompatibilityGauge score={100} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#22c55e')
  })

  it('uses yellow (#f59e0b) for score in [60, 79]', () => {
    const { container } = render(<CompatibilityGauge score={60} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#f59e0b')
  })

  it('uses yellow for score = 79', () => {
    const { container } = render(<CompatibilityGauge score={79} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#f59e0b')
  })

  it('uses red (#ef4444) for score in (0, 59]', () => {
    const { container } = render(<CompatibilityGauge score={50} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#ef4444')
  })

  it('uses red for score = 1', () => {
    const { container } = render(<CompatibilityGauge score={1} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#ef4444')
  })

  it('uses dark (#404040) for score = 0', () => {
    const { container } = render(<CompatibilityGauge score={0} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#404040')
  })

  it('uses dark (#404040) for score = null (pct defaults to 0)', () => {
    const { container } = render(<CompatibilityGauge score={null} />)
    expect(getProgressCircle(container).getAttribute('stroke')).toBe('#404040')
  })

  // ─── Animation ────────────────────────────────────────────────────────────

  it('progress circle starts fully collapsed (offset = CIRCUMFERENCE ≈ 251)', async () => {
    const CIRCUMFERENCE = 2 * Math.PI * 40 // ≈ 251.33
    const { container } = render(<CompatibilityGauge score={75} />)
    const circle = getProgressCircle(container)
    // Before animation fires the offset should equal CIRCUMFERENCE (hidden)
    const offset = parseFloat(circle.getAttribute('stroke-dashoffset') ?? '0')
    expect(offset).toBeCloseTo(CIRCUMFERENCE, 0)
  })

  it('progress circle offset updates after animation timeout', async () => {
    const CIRCUMFERENCE = 2 * Math.PI * 40
    const { container } = render(<CompatibilityGauge score={75} />)
    await triggerAnimation()
    const circle = getProgressCircle(container)
    const offset = parseFloat(circle.getAttribute('stroke-dashoffset') ?? '0')
    // Expected: CIRCUMFERENCE * (1 - 75/100) ≈ 62.83
    expect(offset).toBeCloseTo(CIRCUMFERENCE * (1 - 75 / 100), 0)
  })

  // ─── Size prop ─────────────────────────────────────────────────────────────

  it('applies the size prop to the wrapping div', () => {
    const { container } = render(<CompatibilityGauge score={50} size={128} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('128px')
    expect(wrapper.style.height).toBe('128px')
  })

  it('defaults to 96px when size is not provided', () => {
    const { container } = render(<CompatibilityGauge score={50} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('96px')
    expect(wrapper.style.height).toBe('96px')
  })
})
