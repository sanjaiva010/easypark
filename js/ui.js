/* ==========================================================================
   EasyPark — Smart Parking Reservation & Management System
   2nd Year Engineering Clinics Project
   --------------------------------------------------------------------------
   ui.js — Shared UI components used by every page
   --------------------------------------------------------------------------
   * Portal navigation bar (injected into #nav-slot)
   * Toasts, modals, form helpers
   * Live parking lot renderer (CSS-3D "isometric" view)
   * Small dependency-free SVG charts (donut / bars / line)
   * Authentication guards (admin)
   ========================================================================== */

(function () {
  'use strict';

  const EP = window.EasyPark;

  /* ------------------------------------------------------------------
     1. Small DOM helpers
  ------------------------------------------------------------------ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------
     1b. SVG icon set (stroke icons — replaces all emoji on the site)
  ------------------------------------------------------------------ */

  const ICONS = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    chart: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M3 13h18v6a1 1 0 0 1-1 1h-1"/><path d="M5 13h14l-1-4H6z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>'
  };

  function icon(name, size) {
    const p = ICONS[name] || ICONS.info;
    return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* Isometric 3D toy-car (sits flat on the CSS-3D lot floor) */
  /* Parked-car illustration (plan view, extruded for a 3D look).
     Sits flat on the CSS-3D lot floor like a top-down camera view. */
  /* Proper top-down car (Material "directions_car" glyph, restyled).
     Plain sliver of a real car image: silhouette from the free Material
     icon set, recolored, with glass canopy + tires overlays. */
  function car3D() {
    return '<svg class="car3d" viewBox="0 -960 960 960" width="150" height="150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<filter id="carShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>' +
      '<linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a66e0"/><stop offset="0.5" stop-color="#1b2c98"/><stop offset="1" stop-color="#081244"/></linearGradient>' +
      '<linearGradient id="carSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="carGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef5ff"/><stop offset="0.5" stop-color="#a3c0ff"/><stop offset="1" stop-color="#6a88ef"/></linearGradient>' +
      '<linearGradient id="carRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6edff"/><stop offset="1" stop-color="#93b1ff"/></linearGradient>' +
      '<mask id="carMask" maskUnits="userSpaceOnUse" x="0" y="-960" width="960" height="960"><path d="M200-204v54q0 12.75-8.62 21.37Q182.75-120 170-120h-20q-12.75 0-21.37-8.63Q120-137.25 120-150v-324l85-256q5-14 16.5-22t26.5-8h464q15 0 26.5 8t16.5 22l85 256v324q0 12.75-8.62 21.37Q822.75-120 810-120h-21q-13 0-21-8.63-8-8.62-8-21.37v-54H200Zm3-330h554l-55-166H258l-55 166Zm-23 60v210-210Zm105.76 160q23.24 0 38.74-15.75Q340-345.5 340-368q0-23.33-15.75-39.67Q308.5-424 286-424q-23.33 0-39.67 16.26Q230-391.47 230-368.24q0 23.24 16.26 38.74 16.27 15.5 39.5 15.5ZM675-314q23.33 0 39.67-15.75Q731-345.5 731-368q0-23.33-16.26-39.67Q698.47-424 675.24-424q-23.24 0-38.74 16.26-15.5 16.27-15.5 39.5 0 23.24 15.75 38.74Q652.5-314 675-314Zm-495 50h600v-210H180v210Z" fill="#fff"/></mask>' +
      '</defs>' +
      '<ellipse cx="480" cy="-70" rx="400" ry="104" fill="#02103f" opacity="0.3" filter="url(#carShadow)"/>' +
      '<g>' +
      '<rect x="90" y="-830" width="800" height="850" fill="url(#carBody)" mask="url(#carMask)"/>' +
      '<rect x="90" y="-830" width="800" height="850" fill="url(#carSheen)" mask="url(#carMask)"/>' +
      '<path d="M203 -480 L757 -480 L702 -646 L258 -646 Z" fill="url(#carGlass)" stroke="#071050" stroke-width="6" stroke-linejoin="round"/>' +
      '<rect x="256" y="-590" width="448" height="62" rx="16" fill="url(#carRoof)" stroke="#071050" stroke-width="5"/>' +
      '<rect x="230" y="-424" width="110" height="110" rx="22" fill="#0c1330" stroke="#27409f" stroke-width="6"/>' +
      '<rect x="636" y="-424" width="110" height="110" rx="22" fill="#0c1330" stroke="#27409f" stroke-width="6"/>' +
      '<rect x="252" y="-402" width="66" height="66" rx="16" fill="#5a6bb0"/>' +
      '<rect x="658" y="-402" width="66" height="66" rx="16" fill="#5a6bb0"/>' +
      '<rect x="228" y="-760" width="56" height="18" rx="5" fill="#9fd0ff"/>' +
      '<rect x="676" y="-760" width="56" height="18" rx="5" fill="#9fd0ff"/>' +
      '<rect x="228" y="-128" width="56" height="18" rx="5" fill="#ff5a5a"/>' +
      '<rect x="676" y="-128" width="56" height="18" rx="5" fill="#ff5a5a"/>' +
      '</g>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------
     2. Toasts
  ------------------------------------------------------------------ */

  function toast(msg, type) {
    let box = qs('#toast-container');
    if (!box) {
      box = el('div', 'toast-container');
      box.id = 'toast-container';
      document.body.appendChild(box);
    }
    const icons = { success: 'check', error: 'x', warning: 'alert', info: 'info' };
    const t = el('div', 'toast ' + (type || 'info'));
    t.innerHTML =
      '<span class="toast-icon">' + icon(icons[type] || 'info') + '</span>' +
      '<span class="toast-message">' + esc(msg) + '</span>' +
      '<button class="toast-close" aria-label="Dismiss">×</button>';
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const kill = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); };
    qs('.toast-close', t).onclick = kill;
    setTimeout(kill, 3600);
  }

  /* ------------------------------------------------------------------
     3. Modal
  ------------------------------------------------------------------ */

  function openModal(title, bodyHTML, footerHTML) {
    const overlay = el('div', 'modal-overlay');
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-header"><h3>' + esc(title) + '</h3>' +
          '<button class="modal-close" aria-label="Close">×</button></div>' +
        '<div class="modal-body">' + bodyHTML + '</div>' +
        (footerHTML ? '<div class="modal-footer">' + footerHTML + '</div>' : '') +
      '</div>';
    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 300); };
    qs('.modal-close', overlay).onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    return { overlay, close, body: qs('.modal-body', overlay) };
  }

  function confirmModal(message, onYes, opts) {
    const m = openModal((opts && opts.title) || 'Please confirm', '<p>' + esc(message) + '</p>',
      '<button class="btn btn-secondary btn-sm" data-no>Keep</button>' +
      '<button class="btn btn-danger btn-sm" data-yes>Yes, continue</button>');
    qs('[data-no]', m.overlay).onclick = m.close;
    qs('[data-yes]', m.overlay).onclick = () => { m.close(); onYes(); };
  }

  /* ------------------------------------------------------------------
     4. Portal navigation bar
  ------------------------------------------------------------------ */

  /* The landing page (index.html) shows ONLY the two portal options.
     Once a portal is entered, its navigation (the rest of the options)
     is injected here. */
  function injectNav() {
    const slot = qs('#nav-slot');
    if (!slot) return;
    const portal = document.body.getAttribute('data-portal'); // 'user' | 'admin'
    if (!portal) return;

    const page = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    const links = portal === 'admin'
      ? [['dashboard.html', 'Control Room'], ['reservations.html', 'Reservations'],
         ['maintenance.html', 'Maintenance'], ['analytics.html', 'Analytics']]
      : [['dashboard.html', 'Dashboard'], ['reserve.html', 'Reserve a Spot'], ['history.html', 'My Reservations']];

    const header = el('header', 'app-nav');
    header.innerHTML =
      '<div class="app-nav-inner">' +
        '<a class="brand" href="' + (portal === 'admin' ? 'dashboard.html' : 'dashboard.html') + '">' +
          '<span class="brand-mark">EP</span>' +
          '<span class="brand-name script-text">EasyPark</span>' +
          '<span class="brand-tag">' + (portal === 'admin' ? 'Management Console' : 'Parking Portal') + '</span>' +
        '</a>' +
        '<nav class="app-nav-links" role="navigation">' +
          links.map(l =>
            '<a href="' + l[0] + '" class="' + (page === l[0] ? 'active' : '') + '">' + l[1] + '</a>'
          ).join('') +
        '</nav>' +
        '<div class="app-nav-actions">' + (portal === 'user' ? USER_ACTIONS() : ADMIN_ACTIONS()) + '</div>' +
        '<button class="nav-burger" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '</div>' +
      '<nav class="app-nav-mobile"></nav>';

    slot.appendChild(header);

    // Burger toggle for small screens.
    qs('.nav-burger', header).addEventListener('click', () => {
      const m = qs('.app-nav-mobile', header);
      m.innerHTML = links.map(l =>
        '<a href="' + l[0] + '" class="' + (page === l[0] ? 'active' : '') + '">' + l[1] + '</a>'
      ).join('');
      m.classList.toggle('open');
    });

    // User account chip / sign-in modal wiring.
    if (portal === 'user') {
      const chip = qs('#user-chip', header);
      const render = () => {
        const s = EP.getUserSession();
        if (chip) chip.innerHTML = s
          ? '<span class="user-avatar">' + esc(s.name.charAt(0).toUpperCase()) + '</span>' +
            '<span class="user-name">Hi, ' + esc(s.name.split(' ')[0]) + '</span>' +
            '<button class="btn btn-ghost btn-sm" id="logout-btn" title="Sign out">Sign out</button>'
          : '<button class="btn btn-secondary btn-sm" id="signin-btn">Sign in / Register</button>';
        const lo = qs('#logout-btn', header);
        if (lo) lo.onclick = () => { EP.userLogout(); toast('Signed out'); render(); };
        const si = qs('#signin-btn', header);
        if (si) si.onclick = openAuthModal;
      };
      render();
    } else {
      const lo = qs('#admin-logout', header);
      if (lo) lo.onclick = () => { EP.adminLogout(); location.href = 'login.html'; };
    }
  }

  function USER_ACTIONS() { return '<div id="user-chip"></div>'; }
  function ADMIN_ACTIONS() {
    return '<a class="btn btn-outline btn-sm" href="../../index.html" title="Back to portal selection">Portals</a>' +
           '<button class="btn btn-danger btn-sm" id="admin-logout">Logout</button>';
  }

  /* ------------------------------------------------------------------
     5. Sign in / Register modal (User portal)
  ------------------------------------------------------------------ */

  function openAuthModal() {
    const m = openModal('Welcome to EasyPark', '');
    m.body.innerHTML =
      '<div class="auth-tabs">' +
        '<button class="auth-tab active" data-tab="login">Sign In</button>' +
        '<button class="auth-tab" data-tab="signup">Create Account</button>' +
      '</div><div class="auth-pane" id="auth-login">' +
        '<div class="form-group"><label class="form-label">Phone number</label>' +
          '<input class="form-input" id="login-phone" placeholder="e.g. 98200 11223"></div>' +
        '<div class="form-group"><label class="form-label">Password</label>' +
          '<input class="form-input" type="password" id="login-pass" placeholder="••••••••"></div>' +
        '<button class="btn btn-primary w-full" id="login-go">Sign In</button>' +
      '</div><div class="auth-pane" id="auth-signup" hidden>' +
        '<div class="form-group"><label class="form-label">Full name</label>' +
          '<input class="form-input" id="su-name" placeholder="e.g. Alex Morgan"></div>' +
        '<div class="form-group"><label class="form-label">Phone number</label>' +
          '<input class="form-input" id="su-phone" placeholder="e.g. 98200 11223"></div>' +
        '<div class="form-group"><label class="form-label">Email (optional)</label>' +
          '<input class="form-input" id="su-email" placeholder="you@example.com"></div>' +
        '<button class="btn btn-primary w-full" id="su-go">Create Account</button>' +
      '</div>' +
      '<p class="text-muted mt-4" style="font-size:.8rem">Demo account: phone <b>98200 11223</b> · password <b>user123</b></p>';

    qsa('.auth-tab', m.overlay).forEach(tab => tab.addEventListener('click', () => {
      qsa('.auth-tab', m.overlay).forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
      m.body.querySelectorAll('.auth-pane').forEach(p => p.hidden = true);
      m.body.querySelector('#auth-' + tab.dataset.tab).hidden = false;
    }));

    const login = qs('#login-go', m.overlay), su = qs('#su-go', m.overlay);
    login.onclick = () => {
      const r = EP.userLogin(qs('#login-phone', m.overlay).value.trim(),
                             qs('#login-pass', m.overlay).value);
      if (r.ok) { toast('Welcome back!'); m.close(); refreshNavUser(); }
      else toast(r.message, 'error');
    };
    su.onclick = () => {
      const r = EP.signup({
        name: qs('#su-name', m.overlay).value.trim(),
        phone: qs('#su-phone', m.overlay).value.trim(),
        email: qs('#su-email', m.overlay).value.trim()
      });
      if (r.ok) { toast('Account created — welcome to EasyPark!'); m.close(); refreshNavUser(); }
      else toast(r.message, 'error');
    };
  }

  /* Re-render only the user chip after auth changes. */
  function refreshNavUser() {
    const header = qs('.app-nav');
    if (!header) return;
    const chip = qs('#user-chip', header);
    const s = EP.getUserSession();
    if (s && chip) {
      chip.innerHTML = '<span class="user-avatar">' + esc(s.name.charAt(0).toUpperCase()) + '</span>' +
        '<span class="user-name">Hi, ' + esc(s.name.split(' ')[0]) + '</span>' +
        '<button class="btn btn-ghost btn-sm" id="logout-btn">Sign out</button>';
      qs('#logout-btn', header).onclick = () => { EP.userLogout(); toast('Signed out'); refreshNavUser(); };
    }
  }

  /* ------------------------------------------------------------------
     6. Admin auth guard
  ------------------------------------------------------------------ */

  function requireAdmin() {
    if (!EP.isAdmin()) {
      location.href = 'login.html';
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------
     7. Live parking lot renderer (CSS-3D isometric look)
  ------------------------------------------------------------------ */

  /* Renders one floor's spots into `container`.
     opts: { floor, onSlot(id, slot, btn), mini }                        */
  function renderFloor(container, floor, opts) {
    const slots = EP.getSlots(floor);
    const o = opts || {};
    container.innerHTML = '';

    const scene = el('div', 'lot-scene');
    const floorEl = el('div', 'lot-floor');
    scene.appendChild(floorEl);

    // Direction lane (visual only).
    const lane = el('div', 'lot-lane');
    lane.innerHTML = '<span class="lane-arrow">' + icon('arrowUp') + '</span><span class="lane-label">IN</span>';
    floorEl.appendChild(lane);

    slots.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'spot spot-' + s.status;
      btn.dataset.id = s.id;
      btn.setAttribute('aria-label', 'Spot ' + s.id + ' — ' + EP.SLOT_STATUSES[s.status].label);

      let inner = '<span class="spot-id">' + s.id + '</span>' +
                  '<span class="spot-label">' + EP.SLOT_STATUSES[s.status].label + '</span>';

      if (s.status === 'occupied') {
        inner += '<span class="spot-car">' + car3D() + '</span>';
      } else if (s.status === 'reserved') {
        inner += '<span class="spot-flag">' +
          (s.reservation ? esc(s.reservation.name.split(' ')[0]) + ' · ' + EP.fmtTime(s.reservation.start)
                         : 'Reserved') + '</span>';
      } else if (s.status === 'maintenance') {
        inner += '<span class="spot-wrench">' + icon('gear') + '</span>';
      }

      btn.innerHTML = inner;
      btn.addEventListener('click', () => {
        if (o.onSlot) o.onSlot(s.id, s, btn);
      });
      floorEl.appendChild(btn);
    });

    container.appendChild(scene);
    return scene;
  }

  /* ------------------------------------------------------------------
     8. Status legend
  ------------------------------------------------------------------ */

  function renderLegend(container) {
    const items = Object.keys(EP.SLOT_STATUSES).map(k =>
      '<span class="legend-item"><i class="dot dot-' + k + '"></i>' + EP.SLOT_STATUSES[k].label + '</span>');
    container.innerHTML = '<div class="legend">' + items.join('') + '</div>';
  }

  /* ------------------------------------------------------------------
     9. Dependency-free SVG charts
  ------------------------------------------------------------------ */

  function _svg(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  }

  /* Donut chart. segments: [{label, value, color}] */
  function donut(host, segments, opts) {
    host.innerHTML = '';
    const size = opts.size || 190, cx = size / 2, cy = size / 2;
    const r = size / 2 - 16, C = 2 * Math.PI * r;
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    const svg = _svg('svg', { viewBox: '0 0 ' + size + ' ' + size, width: '100%' });
    let offset = 0;
    segments.forEach(seg => {
      const frac = seg.value / total;
      const arc = _svg('circle', {
        cx, cy, r, fill: 'none', stroke: seg.color, 'stroke-width': 18,
        'stroke-dasharray': (frac * C) + ' ' + (C - frac * C),
        'stroke-dashoffset': -offset, 'transform': 'rotate(-90 ' + cx + ' ' + cy + ')'
      });
      svg.appendChild(arc);
      offset += frac * C;
    });
    const inner = _svg('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'font-size': '26', 'font-weight': '800', fill: '#021F94' });
    inner.textContent = opts.center || Math.round((total ? (opts.centerValue / total) : 0) * 100) + '%';
    const inner2 = _svg('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', 'font-size': '11', fill: '#6B7A9E' });
    inner2.textContent = opts.sub || '';
    svg.appendChild(inner); svg.appendChild(inner2);
    host.appendChild(svg);

    const legend = el('div', 'chart-legend');
    segments.forEach(s => {
      legend.innerHTML +=
        '<span class="chart-legend-item"><i style="background:' + s.color + '"></i>' +
        esc(s.label) + ' <b>' + s.value + '</b></span>';
    });
    host.appendChild(legend);
  }

  /* Vertical bar chart. data: [{label, value}] */
  function bars(host, data, opts) {
    host.innerHTML = '';
    const o = opts || {};
    const W = o.width || 620, H = o.height || 260;
    const padL = o.padL || 8, padB = o.padB || 34, padT = 18, padR = 8;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = Math.max.apply(null, data.map(d => d.value).concat([1]));
    const n = data.length;
    const bw = iw / n;
    const barW = Math.min(46, bw * 0.55);

    const svg = _svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%' });
    // grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + ih - (ih * i / 4);
      svg.appendChild(_svg('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: '#E7E4EA', 'stroke-width': 1 }));
      const lbl = _svg('text', { x: W - padR - 4, y: y + 4, 'text-anchor': 'end', 'font-size': '10', fill: '#9AA3B5' });
      lbl.textContent = Math.round(max * i / 4);
      svg.appendChild(lbl);
    }
    data.forEach((d, i) => {
      const h = (d.value / max) * ih;
      const x = padL + i * bw + (bw - barW) / 2;
      const y = padT + ih - h;
      const rect = _svg('rect', {
        x, y, width: barW, height: Math.max(h, 2),
        rx: 6, fill: (o.color || '#021F94'), opacity: d.highlight ? 1 : 0.82
      });
      svg.appendChild(rect);
      const val = _svg('text', { x: x + barW / 2, y: y - 6, 'text-anchor': 'middle', 'font-size': '11', 'font-weight': '700', fill: '#021F94' });
      val.textContent = d.value;
      svg.appendChild(val);
      const lbl = _svg('text', {
        x: x + barW / 2, y: H - padB + 16, 'text-anchor': 'middle',
        'font-size': '11', fill: '#6B7A9E'
      });
      lbl.textContent = d.label;
      svg.appendChild(lbl);
    });
    host.appendChild(svg);
  }

  /* Horizontal bar chart (for slot ranking). data: [{label, value}] */
  function hbars(host, data, opts) {
    host.innerHTML = '';
    const o = opts || {};
    const max = Math.max.apply(null, data.map(d => d.value).concat([1]));
    data.forEach((d, i) => {
      const row = el('div', 'hbar-row');
      row.innerHTML =
        '<span class="hbar-label">' + esc(d.label) + '</span>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' +
          Math.round((d.value / max) * 100) + '%;background:' + (o.color || '#021F94') +
          '" data-count="' + d.value + '"></div></div>' +
        '<span class="hbar-value">' + d.value + '</span>';
      host.appendChild(row);
    });
  }

  /* Line / area chart. data: [{label, value}] */
  function lineChart(host, data, opts) {
    host.innerHTML = '';
    const o = opts || {};
    const W = o.width || 620, H = o.height || 260;
    const padL = 40, padR = 12, padT = 18, padB = 30;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = Math.max.apply(null, data.map(d => d.value).concat([10]));
    const step = iw / Math.max(data.length - 1, 1);
    const pts = data.map((d, i) => [
      padL + i * step,
      padT + ih - (d.value / max) * ih
    ]);
    const svg = _svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%' });

    // area fill
    const areaPts = [[padL, padT + ih]].concat(pts.map(p => p.join(',')).join(' '), ' ' + (padL + iw) + ',' + (padT + ih)).join(' ');
    svg.appendChild(_svg('polygon', { points: areaPts, fill: 'rgba(2,31,148,.08)' }));

    // grid
    for (let i = 0; i <= 4; i++) {
      const y = padT + ih - (ih * i / 4);
      svg.appendChild(_svg('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: '#E7E4EA' }));
      const lbl = _svg('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', 'font-size': '10', fill: '#9AA3B5' });
      lbl.textContent = Math.round(max * i / 4) + '%';
      svg.appendChild(lbl);
    }
    // line
    svg.appendChild(_svg('polyline', {
      points: pts.map(p => p.join(',')).join(' '),
      fill: 'none', stroke: o.color || '#021F94', 'stroke-width': 3,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    // dots + labels
    pts.forEach((p, i) => {
      svg.appendChild(_svg('circle', { cx: p[0], cy: p[1], r: 4.5, fill: '#fff', stroke: o.color || '#021F94', 'stroke-width': 2.5 }));
      const lbl = _svg('text', { x: p[0], y: H - padB + 16, 'text-anchor': 'middle', 'font-size': '11', fill: '#6B7A9E' });
      lbl.textContent = data[i].label;
      svg.appendChild(lbl);
    });
    host.appendChild(svg);
  }

  /* ------------------------------------------------------------------
     10. Stat card builder
  ------------------------------------------------------------------ */

  function statCard(label, value, iconName, tone, hint) {
    return el('div', 'stat-card tone-' + (tone || 'blue'),
      '<div class="stat-icon">' + icon(iconName || 'grid', 26) + '</div>' +
      '<div class="stat-meta"><span class="stat-value">' + value + '</span>' +
      '<span class="stat-label">' + label + '</span>' +
      (hint ? '<span class="stat-hint">' + hint + '</span>' : '') + '</div>');
  }

  /* ------------------------------------------------------------------
     11. Init — runs on every page
  ------------------------------------------------------------------ */

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  function boot() {
    injectNav();

    // Footer year.
    qsa('[data-year]').forEach(e => { e.textContent = new Date().getFullYear(); });

    // Live cross-tab sync: any change in another tab re-runs the page refresh.
    window.addEventListener('storage', () => {
      if (window.EasyParkLiveRefresh) window.EasyParkLiveRefresh();
    });
    window.dispatchEvent(new CustomEvent('easypark:ready'));
  }

  // Register for "storage"-event driven refresh.
  window.EasyParkLiveRefresh = null;

  window.UI = {
    esc, el, qs, qsa, icon, toast, openModal, confirmModal,
    injectNav, requireAdmin, renderFloor, renderLegend,
    donut, bars, hbars, lineChart, statCard, refreshNavUser
  };

  init();
})();
