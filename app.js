const $ = (s) => document.querySelector(s);
const fmt = (n) => (n ?? n === 0) ? n : '';

function normalizePhone(raw) {
  if (!raw) return '';
  return String(raw).replace(/[^\d+]/g, '');
}

function whatsappHref(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function telHref(raw) {
  const phone = normalizePhone(raw);
  return phone ? `tel:${phone}` : '';
}

function mailHref(raw) {
  return raw ? `mailto:${raw}` : '';
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function contactButtons(x) {
  const bits = [];
  if (x.contact_whatsapp) {
    bits.push(`<a class="button contact wa" href="${whatsappHref(x.contact_whatsapp)}" target="_blank" rel="noreferrer">WhatsApp</a>`);
  }
  if (x.contact_phone) {
    bits.push(`<a class="button contact call" href="${telHref(x.contact_phone)}">Call</a>`);
  }
  if (x.contact_email) {
    bits.push(`<a class="button contact email" href="${mailHref(x.contact_email)}">Email</a>`);
  }
  return bits.join('');
}

function contactSummary(x) {
  const items = [];
  if (x.contact_whatsapp) items.push(`WA: ${escapeHtml(x.contact_whatsapp)}`);
  if (x.contact_phone) items.push(`Tel: ${escapeHtml(x.contact_phone)}`);
  if (x.contact_email) items.push(`Email: ${escapeHtml(x.contact_email)}`);
  return items.length ? `<div class="contact-line">${items.join(' · ')}</div>` : '';
}

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
      const hay = [x.title, x.summary, x.why_text, x.categories, x.area_base, x.contact_email, x.contact_phone, x.contact_whatsapp]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    $('#count').textContent = `${filtered.length} shown`;
    $('#grid').innerHTML = filtered.map(x => {
      const tags = (x.categories || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      const hasContact = x.contact_whatsapp || x.contact_phone || x.contact_email;
      return `
      <article class="card ${hasContact ? 'has-contact' : ''}">
        <div class="meta">
          <span class="pill category">${escapeHtml(x.category_primary || 'place')}</span>
          <span class="pill score">score ${fmt(x.score)}</span>
          ${x.drive_minutes ? `<span class="pill">${x.drive_minutes} min drive</span>` : ''}
          ${x.area_base ? `<span class="pill area">${escapeHtml(x.area_base)}</span>` : ''}
        </div>
        <h3>${escapeHtml(x.title)}</h3>
        <div class="summary">${escapeHtml(x.summary || '')}</div>
        ${x.why_text ? `<div class="why"><strong>Why:</strong> ${escapeHtml(x.why_text)}</div>` : ''}
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${contactSummary(x)}
        <div class="links">
          ${contactButtons(x)}
          ${x.source_url ? `<a class="button subtle-button" href="${x.source_url}" target="_blank" rel="noreferrer">Source</a>` : ''}
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
