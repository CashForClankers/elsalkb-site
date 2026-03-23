const $ = (s) => document.querySelector(s);
const fmt = (n) => (n ?? n === 0) ? n : '';

async function load() {
  const [meta, experiences] = await Promise.all([
    fetch('./data/meta.json').then(r => r.json()),
    fetch('./data/experiences.json').then(r => r.json()),
  ]);

  $('#trip').textContent = meta.trip;
  $('#stat-experiences').textContent = meta.experienceCount.toLocaleString();
  $('#stat-featured').textContent = meta.featuredCount.toLocaleString();
  $('#stat-areas').textContent = meta.areaCount.toLocaleString();
  $('#stat-contacts').textContent = meta.contactCoverage.toLocaleString();

  const cats = [...new Set(experiences.map(x => x.category_primary).filter(Boolean))].sort();
  const areas = [...new Set(experiences.map(x => x.area_base).filter(Boolean))].sort();
  for (const c of cats) $('#category').insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
  for (const a of areas) $('#area').insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`);

  const render = () => {
    const q = $('#search').value.trim().toLowerCase();
    const cat = $('#category').value;
    const area = $('#area').value;
    const filtered = experiences.filter(x => {
      if (cat && x.category_primary !== cat) return false;
      if (area && x.area_base !== area) return false;
      if (!q) return true;
      const hay = [x.title, x.summary, x.why_text, x.categories, x.area_base].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    $('#count').textContent = `${filtered.length} shown`;
    $('#grid').innerHTML = filtered.map(x => {
      const contact = x.contact_whatsapp || x.contact_phone || x.contact_email;
      const tags = (x.categories || '').split(',').map(s => s.trim()).filter(Boolean).slice(0,4);
      return `
      <article class="card">
        <div class="meta">
          <span class="pill">${x.category_primary || 'place'}</span>
          <span class="pill">score ${fmt(x.score)}</span>
          ${x.drive_minutes ? `<span class="pill">${x.drive_minutes} min drive</span>` : ''}
          ${x.area_base ? `<span class="pill">${x.area_base}</span>` : ''}
        </div>
        <h3>${x.title}</h3>
        <div class="summary">${x.summary || ''}</div>
        ${x.why_text ? `<div class="why"><strong>Why:</strong> ${x.why_text}</div>` : ''}
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="pill">${t}</span>`).join('')}</div>` : ''}
        <div class="links">
          ${x.source_url ? `<a class="button" href="${x.source_url}" target="_blank" rel="noreferrer">Source</a>` : ''}
          ${contact ? `<span class="pill">contact: ${contact}</span>` : ''}
        </div>
      </article>`;
    }).join('');
  };

  ['input', 'change'].forEach(evt => {
    $('#search').addEventListener(evt, render);
    $('#category').addEventListener(evt, render);
    $('#area').addEventListener(evt, render);
  });
  render();
}
load();
