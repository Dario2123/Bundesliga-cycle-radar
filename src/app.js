let allClubs = [];
let activePhase = 'all';

const phaseLabel = { prime: 'Prime', transition: 'Transition', rebuild: 'Rebuild', stable: 'Stabil' };
const riskClass = { risk: 'dot-risk', ok: 'dot-ok', watch: 'dot-watch' };

async function loadData() {
  const res = await fetch('../src/data/clubs.json');
  allClubs = await res.json();
  render();
}

function render() {
  const clubs = activePhase === 'all' ? allClubs : allClubs.filter(c => c.phase === activePhase);
  const grid = document.getElementById('club-grid');
  grid.innerHTML = clubs.map(cardHtml).join('');
  grid.querySelectorAll('.card').forEach((card, i) => {
    card.addEventListener('click', () => openModal(clubs[i]));
  });
}

function cardHtml(club) {
  const total = club.expiring26 + club.expiring27 + club.expiring28;
  const w26 = Math.round((club.expiring26 / total) * 100);
  const w27 = Math.round((club.expiring27 / total) * 100);
  const w28 = 100 - w26 - w27;

  const kpTags = club.keyPlayers.slice(0, 4).map(p =>
    `<span class="kp-tag"><span class="kp-dot ${riskClass[p.risk]}"></span>${p.name}</span>`
  ).join('');

  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="club-name">${club.name}</div>
          <div class="club-meta">${club.pos} &middot; Ø ${club.age} Jahre</div>
        </div>
        <span class="badge badge-${club.phase}">${phaseLabel[club.phase]}</span>
      </div>
      <div class="bar-label">
        Vertragsenden: ${club.expiring26}× 2026 &middot; ${club.expiring27}× 2027 &middot; ${club.expiring28}× 2028+
      </div>
      <div class="bar-track">
        <div class="bar-seg seg-2026" style="width:${w26}%"></div>
        <div class="bar-seg seg-2027" style="width:${w27}%"></div>
        <div class="bar-seg seg-2028" style="width:${w28}%"></div>
      </div>
      <div class="kp-section">
        <div class="kp-label">Schlüsselspieler</div>
        <div class="kp-list">${kpTags}</div>
      </div>
      <div class="card-footer">${club.future}</div>
    </div>`;
}

function openModal(club) {
  const content = document.getElementById('modal-content');
  const playerRows = club.keyPlayers.map(p => `
    <div class="player-row">
      <span class="kp-dot ${riskClass[p.risk]}" style="margin-top:4px"></span>
      <span class="player-name">${p.name}</span>
      <span class="player-note">${p.note}</span>
    </div>`).join('');

  content.innerHTML = `
    <h2>${club.name}</h2>
    <p class="modal-pos">${club.pos} &middot; Ø ${club.age} Jahre &middot; <span class="badge badge-${club.phase}">${phaseLabel[club.phase]}</span></p>
    <div class="modal-section-title">Schlüsselspieler & Risikobewertung</div>
    ${playerRows}
    <div class="modal-section-title">Analyse</div>
    <p class="modal-outlook">${club.outlook}</p>
    <p class="modal-future">${club.future}</p>`;

  document.getElementById('modal-overlay').classList.add('open');
}

// Filter buttons
document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activePhase = btn.dataset.phase;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
});

// Close modal
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('open');
});
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('modal-overlay').classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('modal-overlay').classList.remove('open');
});

loadData();
