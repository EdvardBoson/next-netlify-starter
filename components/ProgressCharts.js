import { useEffect, useMemo, useRef, useState } from 'react'
import { exerciseHistory, exerciseNames, weeklyVolume } from '@lib/workouts'

const METRICS = {
  oneRm: { label: 'Uppskattat 1RM', unit: 'kg' },
  maxWeight: { label: 'Tyngsta vikt', unit: 'kg' },
  volume: { label: 'Volym', unit: 'kg' },
}

const MARGIN = { top: 12, right: 16, bottom: 28, left: 44 }
const HEIGHT = 220

function formatNumber(n) {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 1 })
}

function formatShortDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function niceTicks(min, max, count = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / count
  const power = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)
  const start = Math.floor(min / step) * step
  const ticks = []
  for (let v = start; ticks.length === 0 || ticks[ticks.length - 1] < max; v += step) {
    ticks.push(Math.round(v * 1000) / 1000)
  }
  return ticks
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function Tooltip({ x, y, width, children }) {
  const flip = x > width / 2
  return (
    <div
      className="chart-tooltip"
      style={{ left: x, top: y, transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)` }}
    >
      {children}
    </div>
  )
}

function YAxis({ ticks, y, width }) {
  return ticks.map((t) => (
    <g key={t}>
      <line className="chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} />
      <text className="chart-tick" x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
        {formatNumber(t)}
      </text>
    </g>
  ))
}

function LineChart({ points, metric }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState(null)
  const values = points.map((p) => p[metric])
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const yMin = ticks[0]
  const yMax = ticks[ticks.length - 1]
  const times = points.map((p) => new Date(p.date + 'T12:00:00').getTime())
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom

  const x = (t) => (tMax === tMin ? MARGIN.left + innerW / 2 : MARGIN.left + ((t - tMin) / (tMax - tMin)) * innerW)
  const y = (v) => MARGIN.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const coords = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p[metric]) }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.cx},${c.cy}`).join(' ')
  const area = `${path} L${coords[coords.length - 1].cx},${y(yMin)} L${coords[0].cx},${y(yMin)} Z`

  // Högst fyra datumetiketter, jämnt fördelade bland punkterna
  const labelCount = Math.min(points.length, width < 400 ? 3 : 4)
  const labelIdx =
    labelCount === 1
      ? [0]
      : [...new Set(Array.from({ length: labelCount }, (_, i) => Math.round((i * (points.length - 1)) / (labelCount - 1))))]

  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - rect.left
    let nearest = 0
    coords.forEach((c, i) => {
      if (Math.abs(c.cx - mx) < Math.abs(coords[nearest].cx - mx)) nearest = i
    })
    setActive(nearest)
  }

  const a = active !== null ? coords[active] : null

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${METRICS[metric].label} över tid`}
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setActive(null)}
        >
          <YAxis ticks={ticks} y={y} width={width} />
          {labelIdx.map((i) => (
            <text
              key={i}
              className="chart-tick"
              x={coords[i].cx}
              y={HEIGHT - 8}
              textAnchor={labelIdx.length > 1 && i === 0 ? 'start' : i === points.length - 1 && labelIdx.length > 1 ? 'end' : 'middle'}
            >
              {formatShortDate(coords[i].date)}
            </text>
          ))}
          {coords.length > 1 && <path className="chart-area" d={area} />}
          {coords.length > 1 && <path className="chart-line" d={path} />}
          {a && <line className="chart-crosshair" x1={a.cx} x2={a.cx} y1={MARGIN.top} y2={MARGIN.top + innerH} />}
          {coords.map((c, i) => (
            <circle
              key={c.date + i}
              className="chart-dot"
              cx={c.cx}
              cy={c.cy}
              r={i === active ? 6 : coords.length > 20 ? 0 : 4}
            />
          ))}
          {coords.length > 20 && active === null && (
            <circle className="chart-dot" cx={coords[coords.length - 1].cx} cy={coords[coords.length - 1].cy} r={4} />
          )}
          <rect x={MARGIN.left} y={0} width={innerW} height={HEIGHT} fill="transparent" />
        </svg>
      )}
      {a && (
        <Tooltip x={a.cx} y={a.cy} width={width}>
          <div className="muted small">{formatShortDate(a.date)}</div>
          <strong>
            {formatNumber(a[metric])} {METRICS[metric].unit}
          </strong>
        </Tooltip>
      )}
    </div>
  )
}

function BarChart({ weeks }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState(null)
  const ticks = niceTicks(0, Math.max(1, ...weeks.map((w) => w.volume)))
  const yMax = ticks[ticks.length - 1]
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
  const band = innerW / weeks.length
  const barW = Math.min(24, band - 4)
  const y = (v) => MARGIN.top + innerH - (v / yMax) * innerH
  const baseline = y(0)

  function barPath(cx, top) {
    const h = baseline - top
    if (h <= 0) return ''
    const r = Math.min(4, h, barW / 2)
    const l = cx - barW / 2
    const rr = cx + barW / 2
    return `M${l},${baseline} V${top + r} Q${l},${top} ${l + r},${top} H${rr - r} Q${rr},${top} ${rr},${top + r} V${baseline} Z`
  }

  const a = active !== null ? weeks[active] : null

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Total volym per vecka" onPointerLeave={() => setActive(null)}>
          <YAxis ticks={ticks} y={y} width={width} />
          {weeks.map((w, i) => {
            const cx = MARGIN.left + band * i + band / 2
            const showLabel = i === 0 || i === weeks.length - 1 || (width >= 400 && i % 4 === 0 && i < weeks.length - 2)
            return (
              <g key={w.week}>
                <path className={`chart-bar${active === i ? ' active' : ''}`} d={barPath(cx, y(w.volume))} />
                {showLabel && (
                  <text
                    className="chart-tick"
                    x={cx}
                    y={HEIGHT - 8}
                    textAnchor={i === 0 ? 'start' : i === weeks.length - 1 ? 'end' : 'middle'}
                    dx={i === 0 ? -barW / 2 : i === weeks.length - 1 ? barW / 2 : 0}
                  >
                    {formatShortDate(w.week)}
                  </text>
                )}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {a && (
        <Tooltip x={MARGIN.left + band * active + band / 2} y={Math.min(y(a.volume), baseline - 20)} width={width}>
          <div className="muted small">Vecka från {formatShortDate(a.week)}</div>
          <strong>{formatNumber(a.volume)} kg</strong>
          <div className="muted small">
            {a.sessions} {a.sessions === 1 ? 'pass' : 'pass'}
          </div>
        </Tooltip>
      )}
    </div>
  )
}

export default function ProgressCharts({ workouts }) {
  const names = useMemo(() => exerciseNames(workouts), [workouts])
  const [exercise, setExercise] = useState('')
  const [metric, setMetric] = useState('oneRm')
  const selected = names.includes(exercise) ? exercise : names[0] || ''
  const points = useMemo(() => (selected ? exerciseHistory(workouts, selected) : []), [workouts, selected])
  const weeks = useMemo(() => weeklyVolume(workouts), [workouts])

  if (workouts.length === 0) {
    return <p className="empty">Graferna visas här när du har loggat några pass.</p>
  }

  const first = points[0]?.[metric] ?? 0
  const latest = points[points.length - 1]?.[metric] ?? 0
  const change = first ? ((latest - first) / first) * 100 : 0

  return (
    <div className="progress">
      <div className="card">
        <div className="chart-controls">
          <label className="field grow">
            <span>Övning</span>
            <select value={selected} onChange={(e) => setExercise(e.target.value)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mått</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.entries(METRICS).map(([key, m]) => (
                <option key={key} value={key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stat-row">
          <div className="stat">
            <span className="muted small">Senaste</span>
            <strong>{formatNumber(latest)} kg</strong>
          </div>
          <div className="stat">
            <span className="muted small">Bästa</span>
            <strong>{formatNumber(Math.max(...points.map((p) => p[metric])))} kg</strong>
          </div>
          {points.length > 1 && (
            <div className="stat">
              <span className="muted small">Sedan första passet</span>
              <strong>
                {change >= 0 ? '+' : '−'}
                {formatNumber(Math.abs(change))} %
              </strong>
            </div>
          )}
        </div>

        <h3 className="chart-title">
          {METRICS[metric].label}, {selected} (kg)
        </h3>
        <LineChart points={points} metric={metric} />
        {points.length === 1 && <p className="muted small">Logga fler pass med {selected} för att se en trend.</p>}

        <details className="table-toggle">
          <summary>Visa som tabell</summary>
          <table className="records">
            <thead>
              <tr>
                <th>Datum</th>
                {Object.entries(METRICS).map(([key, m]) => (
                  <th key={key}>{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p, i) => (
                <tr key={p.date + i}>
                  <td>{p.date}</td>
                  <td>{formatNumber(p.oneRm)} kg</td>
                  <td>{formatNumber(p.maxWeight)} kg</td>
                  <td>{formatNumber(p.volume)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="card">
        <h3 className="chart-title">Total volym per vecka, senaste 12 veckorna (kg)</h3>
        <BarChart weeks={weeks} />
        <details className="table-toggle">
          <summary>Visa som tabell</summary>
          <table className="records">
            <thead>
              <tr>
                <th>Vecka från</th>
                <th>Pass</th>
                <th>Volym</th>
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => (
                <tr key={w.week}>
                  <td>{w.week}</td>
                  <td>{w.sessions}</td>
                  <td>{formatNumber(w.volume)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}
