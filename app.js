const $ = (s) => document.querySelector(s);
const fmt = (n) => (n ?? n === 0) ? n : '';

const state = {
  userLocation: null,
  sortMode: 'default',
};

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function enrichDistance(row) {
  if (!state.userLocation || row.lat == null || row.lon == null) {
    return { ...row, distanceFromUserKm: null };
  }
  return {
    ...row,
    distanceFromUserKm: haversineKm(
      state.userLocation.lat,
      state.userLocation.lon,
      Number(row.lat),
      Number(row.lon),
    ),
  };
}

function updateLocationUi() {
  const status = $('#location-status');
  const button = $('#location-button');
  const sort = $('#sort');

  if (state.userLocation) {
    status.textContent = 'Location on · closest sorting available';
    button.textContent = 'Refresh location';
    sort.disabled = false;
    if (state.sortMode === 'default') {
      state.sortMode = 'closest';
      sort.value = 'closest';
    }
  } else {
    status.textContent = 'Location off';
    button.textContent = 'Use my location';
    if (sort.value === 'closest') {
      sort.value = 'default';
      state.sortMode = 'default';
    }
    sort.disabled = true;
  }
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
    const sort = $('#sort').value;

    let filtered = experiences.filter(x => {
      if (cat && x.category_primary !== cat) return false;
      if (area && x.area_base !== area) return false;
      if (!q) return true;
      const hay = [x.title, x.summary, x.why_text, x.categories, x.area_base, x.contact_email, x.contact_phone, x.contact_whatsapp]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).map(enrichDistance);

    if (sort === 'closest' && state.userLocation) {
      filtered.sort((a, b) => {
        const ad = a.distanceFromUserKm ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceFromUserKm ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return (b.score ?? 0) - (a.score ?? 0);
      });
    } else if (sort === 'score') {
      filtered.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    $('#count').textContent = `${filtered.length} shown`;
    $('#grid').innerHTML = filtered.map(x => {
      const tags = (x.categories || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      const hasContact = x.contact_whatsapp || x.contact_phone || x.contact_email;
      const distanceBadge = x.distanceFromUserKm != null
        ? `<span class="pill distance">${x.distanceFromUserKm.toFixed(1)} km from you</span>`
        : '';
      return `
      <article class="card ${hasContact ? 'has-contact' : ''}">
        <div class="meta">
          <span class="pill category">${escapeHtml(x.category_primary || 'place')}</span>
          <span class="pill score">score ${fmt(x.score)}</span>
          ${distanceBadge}
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

  $('#location-button').addEventListener('click', () => {
    if (!navigator.geolocation) {
      $('#location-status').textContent = 'Location unavailable in this browser';
      return;
    }
    $('#location-status').textContent = 'Requesting location…';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        updateLocationUi();
        render();
      },
      () => {
        $('#location-status').textContent = 'Location permission denied or unavailable';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });

  ['input', 'change'].forEach(evt => {
    $('#search').addEventListener(evt, render);
    $('#category').addEventListener(evt, render);
    $('#area').addEventListener(evt, render);
  });
  $('#sort').addEventListener('change', (e) => {
    state.sortMode = e.target.value;
    render();
  });

  updateLocationUi();
  render();
}
load();
