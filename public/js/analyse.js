// ============================================================
// ANALYSE.JS — handles form, API call, rendering, Supabase save
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Char counter
const descEl = document.getElementById('biz-description');
descEl.addEventListener('input', () => {
  const n = descEl.value.length;
  document.getElementById('char-num').textContent = n;
  if (n > 2000) descEl.value = descEl.value.slice(0, 2000);
});

function showState(name) {
  ['input','loading','results','error'].forEach(s => {
    document.getElementById('state-' + s).classList.toggle('hidden', s !== name);
  });
}

function resetForm() { showState('input'); }

// Loading step animation
let stepTimers = [];
function startStepAnimation() {
  const steps = ['lstep-1','lstep-2','lstep-3','lstep-4','lstep-5'];
  const delays = [0, 5000, 11000, 18000, 24000];
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'lstep';
  });
  stepTimers = steps.map((id, i) => setTimeout(() => {
    steps.slice(0, i).forEach(prev => {
      const el = document.getElementById(prev);
      if (el) el.className = 'lstep done';
    });
    const el = document.getElementById(id);
    if (el) el.className = 'lstep active';
  }, delays[i]));
}
function clearStepTimers() { stepTimers.forEach(clearTimeout); }

async function startAnalysis() {
  const desc = descEl.value.trim();
  const errEl = document.getElementById('analyse-error');
  errEl.classList.add('hidden');

  if (desc.length < 30) {
    errEl.textContent = 'Please describe your business in a bit more detail (at least 30 characters).';
    errEl.classList.remove('hidden');
    return;
  }

  const bizName = document.getElementById('biz-name').value.trim();
  const industry = document.getElementById('biz-industry').value;
  const size = document.getElementById('biz-size').value;
  const age = document.getElementById('biz-age').value;
  const goal = document.getElementById('biz-goal').value;
  const challenge = document.getElementById('biz-challenge').value.trim();

  showState('loading');
  startStepAnimation();

  try {
    const resp = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desc, bizName, industry, size, age, goal, challenge })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Server error. Please try again.');
    }

    const result = await resp.json();
    clearStepTimers();

    // Save to Supabase if logged in
    const { data: sessionData } = await sb.auth.getSession();
    if (sessionData.session) {
      await sb.from('analyses').insert({
        user_id: sessionData.session.user.id,
        business_name: result.businessName,
        industry,
        result_json: result,
        created_at: new Date().toISOString()
      });
    }

    renderResults(result);
    showState('results');
  } catch (err) {
    clearStepTimers();
    document.getElementById('error-message').textContent = err.message || 'Something went wrong. Please try again.';
    showState('error');
  }
}

// ---- RENDER RESULTS ----
function statusBadge(v) {
  const map = { gap: 'badge-gap', weak: 'badge-weak', ok: 'badge-ok' };
  return `<span class="badge ${map[v] || 'badge-gap'}">${v}</span>`;
}
function priorityBadge(v) {
  const map = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  return `<span class="badge ${map[v] || 'badge-medium'}">${v}</span>`;
}
function urgencyBadge(v) {
  const labels = { 'hire now': ['badge-now','hire now'], 'delegate': ['badge-delegate','delegate'], 'future': ['badge-future','future'] };
  const [cls, lbl] = labels[v] || ['badge-delegate', v];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function renderResults(r) {
  const scalColor = r.scalabilityScore >= 70 ? 'var(--green)' : r.scalabilityScore >= 40 ? 'var(--amber)' : 'var(--red)';
  const sysColor = r.systemScore >= 70 ? 'var(--green)' : r.systemScore >= 40 ? 'var(--amber)' : 'var(--red)';

  const html = `
    <div class="results-header">
      <h2 class="results-biz-name">${escHtml(r.businessName)}</h2>
      <p class="results-tagline">${escHtml(r.tagline)}</p>
    </div>

    <div class="scores-row">
      <div class="score-card">
        <div class="score-card-val" style="color:${scalColor}">${r.scalabilityScore}<span class="denom">/100</span></div>
        <div class="score-card-label">Scalability score</div>
      </div>
      <div class="score-card">
        <div class="score-card-val" style="color:${sysColor}">${r.systemScore}<span class="denom">/100</span></div>
        <div class="score-card-label">Systems score</div>
      </div>
    </div>

    <div class="bottleneck-card">
      <div class="bottleneck-label">⚠ Your biggest bottleneck</div>
      <p class="bottleneck-text">${escHtml(r.bottleneck)}</p>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--accent)"></span>Core business functions</h3>
      <div class="results-list">
        ${(r.coreFunctions || []).map(f => `
          <div class="result-item">
            <div class="result-item-header">
              <span class="result-item-name">${escHtml(f.name)}</span>
              ${statusBadge(f.status)}
            </div>
            <p class="result-item-desc">${escHtml(f.description)}</p>
          </div>`).join('')}
      </div>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--amber)"></span>Key processes to systemise</h3>
      <div class="results-list">
        ${(r.keyProcesses || []).map(p => `
          <div class="result-item">
            <div class="result-item-header">
              <span class="result-item-name">${escHtml(p.name)}</span>
              ${priorityBadge(p.priority)}
            </div>
            <p class="result-item-desc">${escHtml(p.description)}</p>
          </div>`).join('')}
      </div>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--text-2)"></span>Roles & responsibilities</h3>
      <div class="results-list">
        ${(r.roles || []).map(role => `
          <div class="result-item">
            <div class="result-item-header">
              <span class="result-item-name">${escHtml(role.title)}</span>
              ${urgencyBadge(role.urgency)}
            </div>
            <p class="result-item-desc">${escHtml(role.responsibility)}</p>
          </div>`).join('')}
      </div>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--green)"></span>Scaling levers</h3>
      <div class="results-list">
        ${(r.scalingLevers || []).map(l => `
          <div class="result-item">
            <div class="result-item-header">
              <span class="result-item-name">${escHtml(l.lever)}</span>
            </div>
            <p class="result-item-desc">${escHtml(l.action)}</p>
          </div>`).join('')}
      </div>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--accent)"></span>Quick wins — start this week</h3>
      <div class="results-list">
        ${(r.quickWins || []).map(w => `
          <div class="quickwin-item">
            <span class="quickwin-icon">✓</span>
            <span>${escHtml(w)}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="results-section">
      <h3 class="results-section-title"><span class="dot" style="background:var(--accent)"></span>Your 90-day roadmap</h3>
      <div class="results-list">
        ${(r.roadmap || []).map((item, i) => `
          <div class="result-item">
            <div class="result-item-header">
              <span class="result-item-name">Month ${i + 1}: ${escHtml(item.milestone)}</span>
            </div>
            <p class="result-item-desc">${escHtml(item.actions)}</p>
          </div>`).join('')}
      </div>
    </div>
  `;

  document.getElementById('results-output').innerHTML = html;
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
