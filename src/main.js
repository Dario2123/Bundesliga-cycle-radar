import './style.css'
import {
  Chart, ScatterController, LinearScale, PointElement, Tooltip, Legend
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import rawData from './data/clubs_raw.json'

Chart.register(ScatterController, LinearScale, PointElement, Tooltip, Legend, ChartDataLabels)

// ── Short names ───────────────────────────────────────────────────────────────
const SHORT = {
  27: 'Bayern',     16: 'Dortmund',  23826: 'Leipzig',    79: 'Stuttgart',
  533: 'Hoffenheim', 15: 'Leverkusen', 24: 'Frankfurt',   60: 'Freiburg',
  89: 'Union',       3: 'Köln',       18: 'Gladbach',     82: 'Wolfsburg',
  86: 'Bremen',     41: 'Hamburg',   167: 'Augsburg',    2036: 'Heidenheim',
  39: 'Mainz',      35: 'St. Pauli',
}

const PHASE_COLOR = {
  prime: '#22c55e', transition: '#f59e0b', rebuild: '#ef4444', stable: '#3b82f6',
}
const PHASE_LABEL = {
  prime: 'Prime', transition: 'Transition', rebuild: 'Rebuild', stable: 'Stabil',
}

// ── Data processing ───────────────────────────────────────────────────────────
function topAvgRating(club) {
  const rated = club.top_players.filter(p => p.rating).slice(0, 8)
  return rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : null
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const processed = rawData.map(c => ({
  ...c,
  short: SHORT[c.tm_id] || c.name,
  avgRating: topAvgRating(c),
}))

const medAge    = median(processed.map(c => c.avg_age))
const medRating = median(processed.map(c => c.avgRating ?? 6.5))

function classifyPhase(avgAge, avgRating) {
  const young = avgAge <= medAge
  const good  = avgRating >= medRating
  if (young && good)  return 'prime'
  if (!young && good) return 'transition'
  if (young && !good) return 'rebuild'
  return 'stable'
}

const allClubs = processed.map(c => ({
  ...c,
  phase: classifyPhase(c.avg_age, c.avgRating ?? 6.5),
}))

// ── Theme ─────────────────────────────────────────────────────────────────────
const dark       = window.matchMedia('(prefers-color-scheme: dark)').matches
const textColor  = dark ? '#a09f9a' : '#6b6a66'
const gridColor  = dark ? '#333330' : '#e5e3dc'
const quadColor  = dark ? '#4a4a46' : '#c8c5bc'
const tipBg      = dark ? '#242422' : '#ffffff'
const tipBorder  = dark ? '#4a4a46' : '#e5e3dc'
const tipText    = dark ? '#f0ede8' : '#1a1a18'

// ── Quadrant lines plugin ─────────────────────────────────────────────────────
const quadrantPlugin = {
  id: 'quadrant',
  beforeDraw({ ctx, chartArea: { left, right, top, bottom }, scales }) {
    const xM = scales.x.getPixelForValue(medAge)
    const yM = scales.y.getPixelForValue(medRating)

    ctx.save()
    ctx.strokeStyle = quadColor
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(xM, top);  ctx.lineTo(xM, bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(left, yM); ctx.lineTo(right, yM);  ctx.stroke()

    // Quadrant labels
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    ctx.globalAlpha = 0.4
    const p = 10
    ctx.fillStyle = PHASE_COLOR.rebuild;    ctx.fillText('REBUILD',    left + p,  bottom - p)
    ctx.fillStyle = PHASE_COLOR.prime;      ctx.fillText('PRIME',      left + p,  top + p + 13)
    ctx.fillStyle = PHASE_COLOR.stable;     ctx.fillText('STABIL',     xM + p,    bottom - p)
    ctx.fillStyle = PHASE_COLOR.transition; ctx.fillText('TRANSITION', xM + p,    top + p + 13)
    ctx.restore()
  },
}

// ── Chart ─────────────────────────────────────────────────────────────────────
let activePhase = 'all'
let chart

function buildDatasets() {
  const visible = activePhase === 'all' ? allClubs : allClubs.filter(c => c.phase === activePhase)
  const dimmed  = activePhase !== 'all' ? allClubs.filter(c => c.phase !== activePhase) : []
  const sets = []

  if (dimmed.length) {
    sets.push({
      label: '__dimmed__',
      data: dimmed.map(c => ({ x: c.avg_age, y: c.avgRating, club: c })),
      backgroundColor: (dark ? '#ffffff' : '#000000') + '08',
      borderColor:     (dark ? '#ffffff' : '#000000') + '18',
      borderWidth: 1.5,
      pointRadius: 8,
      pointHoverRadius: 9,
    })
  }

  const phases = [...new Set(visible.map(c => c.phase))]
  phases.forEach(phase => {
    sets.push({
      label: PHASE_LABEL[phase],
      data: visible.filter(c => c.phase === phase).map(c => ({ x: c.avg_age, y: c.avgRating, club: c })),
      backgroundColor: PHASE_COLOR[phase] + '28',
      borderColor:     PHASE_COLOR[phase],
      borderWidth: 2,
      pointRadius: 9,
      pointHoverRadius: 11,
    })
  })
  return sets
}

function initChart() {
  const canvas = document.getElementById('scatter-chart')

  chart = new Chart(canvas, {
    type: 'scatter',
    data: { datasets: buildDatasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      scales: {
        x: {
          title: { display: true, text: 'Ø Alter', color: textColor, font: { size: 12, weight: '500' } },
          min: 22.5, max: 29,
          grid: { color: gridColor },
          ticks: { color: textColor, stepSize: 0.5 },
        },
        y: {
          title: { display: true, text: 'Ø Sofascore Note (Top 8 Spieler)', color: textColor, font: { size: 12, weight: '500' } },
          min: 6.4, max: 7.7,
          grid: { color: gridColor },
          ticks: { color: textColor, callback: v => v.toFixed(1) },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: textColor,
            font: { size: 12 },
            filter: i => i.text !== '__dimmed__',
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            title: ctx => ctx[0]?.raw?.club?.name ?? '',
            label: ctx => {
              const c = ctx.raw.club
              if (!c) return ''
              const top3 = c.top_players.slice(0, 3)
                .map(p => `${p.name.split(' ').pop()}  ${p.rating?.toFixed(2) ?? '—'}`)
                .join('   ')
              return [`Ø Alter ${c.avg_age}  ·  Ø Note ${c.avgRating?.toFixed(2) ?? '—'}`, top3]
            },
          },
          backgroundColor: tipBg,
          borderColor: tipBorder,
          borderWidth: 1,
          titleColor: tipText,
          bodyColor: textColor,
          padding: 12,
          titleFont: { size: 13, weight: '600' },
        },
        datalabels: {
          display: ctx => ctx.dataset.label !== '__dimmed__',
          formatter: val => val.club?.short ?? '',
          color: ctx => PHASE_COLOR[ctx.raw.club?.phase] ?? textColor,
          font: { size: 11, weight: '600' },
          anchor: 'end',
          align: 'top',
          offset: 4,
        },
      },
    },
    plugins: [ChartDataLabels, quadrantPlugin],
  })

  canvas.addEventListener('click', e => {
    const pts = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false)
    if (!pts.length) return
    const { datasetIndex, index } = pts[0]
    const club = chart.data.datasets[datasetIndex].data[index]?.club
    if (club) openModal(club)
  })
}

// ── Filters ───────────────────────────────────────────────────────────────────
function renderFilters() {
  const counts = { all: allClubs.length }
  allClubs.forEach(c => { counts[c.phase] = (counts[c.phase] || 0) + 1 })
  const order = ['all', 'prime', 'transition', 'rebuild', 'stable']
  const labels = { all: 'Alle', ...PHASE_LABEL }
  document.getElementById('filters').innerHTML = order
    .filter(p => counts[p])
    .map(p => `<button class="filter-btn${p === activePhase ? ' active' : ''}" data-phase="${p}">${labels[p]} (${counts[p]})</button>`)
    .join('')
}

document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn')
  if (!btn) return
  activePhase = btn.dataset.phase
  renderFilters()
  chart.data.datasets = buildDatasets()
  chart.update()
})

// ── Modal ─────────────────────────────────────────────────────────────────────
function fmt(r)    { return r != null ? r.toFixed(2) : '—' }
function fmtMin(m) { return m ? (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + 'k' : m + "'") : '—' }
function rCls(r)   { return !r ? 'r-none' : r >= 7.5 ? 'r-great' : r >= 7.0 ? 'r-good' : r >= 6.5 ? 'r-avg' : 'r-low' }

function openModal(club) {
  const rows = club.top_players.slice(0, 8).map(p => `
    <div class="player-row">
      <span class="rating-badge ${rCls(p.rating)}">${fmt(p.rating)}</span>
      <div class="player-info">
        <span class="player-name">${p.name}</span>
        <span class="player-meta">${p.position || '—'} · ${p.age || '—'} J. · ${fmtMin(p.minutes)} Min.</span>
      </div>
      <span class="player-mv">${p.market_value || '—'}</span>
    </div>`).join('')

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-club-header">
      <h2>${club.name}</h2>
      <span class="badge badge-${club.phase}">${PHASE_LABEL[club.phase]}</span>
    </div>
    <div class="modal-stats">
      <div class="stat-item"><div class="stat-val">${club.avg_age}</div><div class="stat-label">Ø Alter</div></div>
      <div class="stat-item"><div class="stat-val">${fmt(club.avgRating)}</div><div class="stat-label">Ø Note Top 8</div></div>
      <div class="stat-item"><div class="stat-val">${club.top_players.filter(p => p.rating).length}</div><div class="stat-label">Spieler benotet</div></div>
    </div>
    <div class="modal-section-title">Schlüsselspieler nach Wichtigkeit</div>
    ${rows}`

  document.getElementById('modal-overlay').classList.add('open')
}

document.getElementById('modal-close').addEventListener('click', () =>
  document.getElementById('modal-overlay').classList.remove('open'))
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('modal-overlay').classList.remove('open')
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('modal-overlay').classList.remove('open')
})

// ── Init ──────────────────────────────────────────────────────────────────────
renderFilters()
initChart()
