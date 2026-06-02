// ============================================================
// DASHBOARD.JS
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

async function init() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    document.getElementById('state-noauth').classList.remove('hidden');
    return;
  }

  document.getElementById('state-auth').classList.remove('hidden');
  const name = session.user.user_metadata?.full_name || session.user.email;
  document.getElementById('dash-welcome').textContent = `Welcome back, ${name}`;

  // Load analyses
  const { data, error } = await sb
    .from('analyses')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  document.getElementById('dash-loading').classList.add('hidden');

  if (error || !data || data.length === 0) {
    document.getElementById('dash-empty').classList.remove('hidden');
    return;
  }

  const grid = document.getElementById('dash-grid');
  grid.classList.remove('hidden');
  grid.innerHTML = data.map(row => {
    const r = row.result_json;
    const date = new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <div class="dash-card" onclick="openModal(${JSON.stringify(JSON.stringify(row))})">
        <div class="dash-card-title">${escHtml(r.businessName || row.business_name)}</div>
        <div class="dash-card-date">${date} · ${escHtml(row.industry || '')}</div>
        <div class="dash-card-scores">
          <div class="dash-score">
            <span class="dash-score-val">${r.scalabilityScore}</span>
            <span class="dash-score-lbl">Scalability</span>
          </div>
          <div class="dash-score">
            <span class="dash-score-val">${r.systemScore}</span>
            <span class="dash-score-lbl">Systems</span>
          </div>
        </div>
        <div class="dash-card-summary">${escHtml(r.bottleneck || r.tagline || '')}</div>
      </div>`;
  }).join('');
}

function openModal(rowJson) {
  const row = JSON.parse(rowJson);
  const r = row.result_json;
  const date = new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const scalColor = r.scalabilityScore >= 70 ? 'var(--green)' : r.scalabilityScore >= 40 ? 'var(--amber)' : 'var(--red)';
  const sysColor = r.systemScore >= 70 ? 'var(--green)' : r.systemScore >= 40 ? 'var(--amber)' : 'var(--red)';

  function badge(v, map) {
    const cls = map[v] || Object.values(map)[0];
    return `<span class="badge ${cls}">${v}</span>`;
  }

  const content = `
    <div class="results-header" style="margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);">
      <div style="font-size:0.75rem;color:var(--text-3);margin-bottom:0.4rem;">${date} · ${escHtml(row.industry || '')}</div>
      <h2 class="results-biz-name">${escHtml(r.businessName)}</h2>
      <p class="results-tagline">${escHtml(r.tagline)}</p>
    </div>

    <div class="scores-row" style="margin-bottom:1.5rem;">
      <div class="score-card">
        <div class="score-card-val" style="color:${scalColor}">${r.scalabilityScore}<span class="denom">/100</span></div>
        <div class="score-card-label">Scalability</div>
      </div>
      <div class="score-card">
        <div class="score-card-val" style="color:${sysColor}">${r.systemScore}<span class="denom">/100</span></div>
        <div class="score-card-label">Systems</div>
      </div>
    </div>

    <div class="bottleneck-card" style="margin-bottom:1.5rem;">
      <div class="bottleneck-label">⚠ Biggest bottleneck</div>
      <p class="bottleneck-text">${escHtml(r.bottleneck)}</p>
    </div>

    ${section('Core functions', r.coreFunctions, f => `
      <div class="result-item">
        <div class="result-item-header"><span class="result-item-name">${escHtml(f.name)}</span>${badge(f.status, {gap:'badge-gap',weak:'badge-weak',ok:'badge-ok'})}</div>
        <p class="result-item-desc">${escHtml(f.description)}</p>
      </div>`)}

    ${section('Key processes', r.keyProcesses, p => `
      <div class="result-item">
        <div class="result-item-header"><span class="result-item-name">${escHtml(p.name)}</span>${badge(p.priority, {high:'badge-high',medium:'badge-medium',low:'badge-low'})}</div>
        <p class="result-item-desc">${escHtml(p.description)}</p>
      </div>`)}

    ${section('Quick wins', r.quickWins, w => `
      <div class="quickwin-item"><span class="quickwin-icon">✓</span><span>${escHtml(w)}</span></div>`)}

    ${section('90-day roadmap', r.roadmap, (item, i) => `
      <div class="result-item">
        <div class="result-item-header"><span class="result-item-name">Month ${i + 1}: ${escHtml(item.milestone)}</span></div>
        <p class="result-item-desc">${escHtml(item.actions)}</p>
      </div>`)}
  `;

  document.getElementById('modal-content').innerHTML = content;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function section(title, items, renderFn) {
  if (!items || items.length === 0) return '';
  return `
    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--accent)"></span>${title}</h3>
      <div class="results-list">${items.map((item, i) => renderFn(item, i)).join('')}</div>
    </div>`;
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay') && !e.target.classList.contains('modal-close')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
