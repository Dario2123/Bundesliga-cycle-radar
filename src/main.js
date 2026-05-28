import './style.css'
import rawData from './data/clubs_raw.json'

// ── Phase classification ──────────────────────────────────────────────────────
function classifyPhase(club) {
  const avgAge = club.avg_age || 25
  const rated = club.top_players.filter(p => p.rating).slice(0, 8)
  const avgRating = rated.length
    ? rated.reduce((s, p) => s + p.rating, 0) / rated.length
    : 6.5

  if (avgRating >= 7.1 && avgAge <= 27.0) return 'prime'
  if (avgAge >= 27.5) return 'transition'
  if (avgRating < 6.7) return 'rebuild'
  return 'stable'
}

function topAvgRating(club) {
  const rated = club.top_players.filter(p => p.rating).slice(0, 8)
  if (!rated.length) return null
  return rated.reduce((s, p) => s + p.rating, 0) / rated.length
}

// ── Process data ──────────────────────────────────────────────────────────────
const allClubs = rawData.map(club => ({
  ...club,
  phase: classifyPhase(club),
  avgRating: topAvgRating(club),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHASE_LABEL = { prime: 'Prime', transition: 'Transition', rebuild: 'Rebuild', stable: 'Stabil' }

function ratingClass(r) {
  if (!r) return 'r-none'
  if (r >= 7.5) return 'r-great'
  if (r >= 7.0) return 'r-good'
  if (r >= 6.5) return 'r-avg'
  return 'r-low'
}

function fmt(r) {
  return r != null ? r.toFixed(2) : '—'
}

function fmtMin(m) {
  if (!m) return '—'
  return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + 'k' : m + "'"
}

// ── Card HTML ─────────────────────────────────────────────────────────────────
function cardHtml(club) {
  const top4 = club.top_players.slice(0, 4)
  const playerTags = top4.map(p => `
    <span class="kp-tag">
      <span class="rating-dot ${ratingClass(p.rating)}"></span>
      <span class="kp-name">${p.name.split(' ').pop()}</span>
      <span class="kp-rating">${fmt(p.rating)}</span>
    </span>`).join('')

  const avgR = club.avgRating
  return `
    <div class="card" data-id="${club.tm_id}">
      <div class="card-header">
        <div>
          <div class="club-name">${club.name}</div>
          <div class="club-meta">Ø ${club.avg_age} Jahre &middot; Ø Note ${fmt(avgR)}</div>
        </div>
        <span class="badge badge-${club.phase}">${PHASE_LABEL[club.phase]}</span>
      </div>
      <div class="kp-section">
        <div class="kp-label">Top-Spieler (Sofascore)</div>
        <div class="kp-list">${playerTags}</div>
      </div>
    </div>`
}

// ── Modal HTML ────────────────────────────────────────────────────────────────
function modalHtml(club) {
  const rows = club.top_players.slice(0, 8).map(p => `
    <div class="player-row">
      <span class="rating-badge ${ratingClass(p.rating)}">${fmt(p.rating)}</span>
      <div class="player-info">
        <span class="player-name">${p.name}</span>
        <span class="player-meta">${p.position || '—'} &middot; ${p.age || '—'} J. &middot; ${fmtMin(p.minutes)} Min.</span>
      </div>
      <span class="player-mv">${p.market_value || '—'}</span>
    </div>`).join('')

  return `
    <div class="modal-club-header">
      <h2>${club.name}</h2>
      <span class="badge badge-${club.phase}">${PHASE_LABEL[club.phase]}</span>
    </div>
    <div class="modal-stats">
      <div class="stat-item"><div class="stat-val">${club.avg_age}</div><div class="stat-label">Ø Alter</div></div>
      <div class="stat-item"><div class="stat-val">${fmt(club.avgRating)}</div><div class="stat-label">Ø Note (Top 8)</div></div>
      <div class="stat-item"><div class="stat-val">${club.top_players.filter(p => p.rating).length}</div><div class="stat-label">Spieler benotet</div></div>
    </div>
    <div class="modal-section-title">Schlüsselspieler nach Wichtigkeit</div>
    ${rows}`
}

// ── Render ────────────────────────────────────────────────────────────────────
let activePhase = 'all'

function render() {
  const clubs = activePhase === 'all' ? allClubs : allClubs.filter(c => c.phase === activePhase)
  const grid = document.getElementById('club-grid')
  grid.innerHTML = clubs.map(cardHtml).join('')
  grid.querySelectorAll('.card').forEach(card => {
    const id = Number(card.dataset.id)
    card.addEventListener('click', () => openModal(allClubs.find(c => c.tm_id === id)))
  })
}

function renderFilters() {
  const counts = { all: allClubs.length }
  allClubs.forEach(c => { counts[c.phase] = (counts[c.phase] || 0) + 1 })
  const phases = ['all', 'prime', 'transition', 'rebuild', 'stable']
  const labels = { all: 'Alle', ...PHASE_LABEL }
  document.getElementById('filters').innerHTML = phases
    .filter(p => counts[p])
    .map(p => `<button class="filter-btn${p === activePhase ? ' active' : ''}" data-phase="${p}">${labels[p]} (${counts[p]})</button>`)
    .join('')
}

function openModal(club) {
  document.getElementById('modal-content').innerHTML = modalHtml(club)
  document.getElementById('modal-overlay').classList.add('open')
}

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn')
  if (!btn) return
  activePhase = btn.dataset.phase
  renderFilters()
  render()
})

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('open')
})
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('modal-overlay').classList.remove('open')
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('modal-overlay').classList.remove('open')
})

// ── Init ──────────────────────────────────────────────────────────────────────
renderFilters()
render()
