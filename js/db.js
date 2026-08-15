/* ==========================================================================
   EasyPark — Smart Parking Reservation & Management System
   2nd Year Engineering Clinics Project
   --------------------------------------------------------------------------
   db.js  —  Mock backend ("data store")
   --------------------------------------------------------------------------
   Simulates a real database + API using browser localStorage so the frontend
   can be swapped later for a genuine REST API / database without touching the
   UI layer. Everything a page needs to read or mutate is exposed through the
   window.EasyPark namespace below.

   Future integration notes:
   - Every mutation ends by persisting to localStorage and broadcasting a
     "storage" event, so multiple open tabs (e.g. user + admin) stay in sync
     like a real WebSocket/live feed.
   - To move to ESP32 sensor data, replace togglePresence()/computeSlots()
     with reads from the sensor controller (IR sensor via MQTT/serial).
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Constants
  ------------------------------------------------------------------ */

  const STORAGE_KEY = 'easypark_app_v1';
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'park2026';

  /* The prototype model. Each demo spot is identified by a number, e.g. 101
     (Ground floor) and 201 (First floor). This is intentionally small — the
     real deployment scales to an entire facility. */
  const SLOT_META = [
    { id: '101', floor: 'ground', level: 'Ground Floor' },
    { id: '102', floor: 'ground', level: 'Ground Floor' },
    { id: '103', floor: 'ground', level: 'Ground Floor' },
    { id: '104', floor: 'ground', level: 'Ground Floor' },
    { id: '201', floor: 'first', level: 'First Floor' },
    { id: '202', floor: 'first', level: 'First Floor' },
    { id: '203', floor: 'first', level: 'First Floor' },
    { id: '204', floor: 'first', level: 'First Floor' }
  ];

  /* Hardware components attached to every demo spot (mirrors the physical
     model: ESP32 + TCRT5000 IR sensor + QR label + LED strip). */
  const COMPONENTS = [
    { key: 'ir',    name: 'IR Sensor',  defaultFault: 'IR sensor not responding', badge: 'sensor_fault' },
    { key: 'qr',    name: 'QR Tag',     defaultFault: 'QR code damaged',          badge: 'inspection_pending' },
    { key: 'led',   name: 'LED Strip',  defaultFault: 'LED strip malfunction',    badge: 'electrical_fault' },
    { key: 'esp32', name: 'ESP32',      defaultFault: 'ESP32 communication lost', badge: 'electrical_fault' }
  ];

  /* Maintenance states an admin can assign to a spot / component. */
  const MAINT_STATES = [
    { key: 'operational',        label: 'Operational' },
    { key: 'under_maintenance',  label: 'Under Maintenance' },
    { key: 'sensor_fault',       label: 'Sensor Fault' },
    { key: 'electrical_fault',   label: 'Electrical Fault' },
    { key: 'inspection_pending', label: 'Inspection Pending' }
  ];

  /* Reservation lifecycle states. */
  const RES_STATUSES = ['pending', 'approved', 'cancelled', 'completed'];

  /* Slot display states (color coded on every dashboard). */
  const SLOT_STATUSES = {
    available:   { label: 'Available',        cls: 'available' },
    occupied:    { label: 'Occupied',         cls: 'occupied' },
    reserved:    { label: 'Reserved',         cls: 'reserved' },
    maintenance: { label: 'Under Maintenance', cls: 'maintenance' }
  };

  /* ------------------------------------------------------------------
     2. Date helpers
  ------------------------------------------------------------------ */

  function iso(d) { return d.toISOString().slice(0, 10); }

  function todayISO() { return iso(new Date()); }

  function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  function fmtDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtTime(t) {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  /* Wraps negative indices to [0, len). */
  function modIndex(i, len) { return ((i % len) + len) % len; }

  /* ------------------------------------------------------------------
     3. Storage layer (localStorage)
  ------------------------------------------------------------------ */

  let state = null;

  function defaultState() {
    return {
      version: 1,
      reservations: [],
      issues: [],          // maintenance / fault queue
      health: {},          // slotId -> { ir:'ok'|'fault', qr:.., led:.., esp32:.. }
      presence: {},        // slotId -> true (simulated IR sensor reading)
      notifications: [],
      users: [],           // registered user accounts
      session: null,       // current user session  { name, phone, email }
      adminSession: false
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? Object.assign(defaultState(), JSON.parse(raw)) : null;
    } catch (e) {
      state = null;
    }
    if (!state) {
      state = defaultState();
      seed();
      persist();
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Broadcast so other open tabs (user + admin) refresh live.
    const evt = new CustomEvent('easypark:update');
    window.dispatchEvent(evt);
  }

  /* ------------------------------------------------------------------
     4. Demo seed data (relative dates -> demo always looks "live")
  ------------------------------------------------------------------ */

  function seed() {
    const t = todayISO();

    // Simulated IR-sensor presence (vehicles currently parked).
    state.presence = { '103': true, '202': true };

    // Component health per spot.
    const ok = () => ({ ir: 'ok', qr: 'ok', led: 'ok', esp32: 'ok' });
    const health = {};
    SLOT_META.forEach(s => { health[s.id] = ok(); });
    health['104'].qr = 'fault';     // QR label damaged
    health['103'].ir = 'fault';     // IR sensor not responding
    health['203'].esp32 = 'fault';  // ESP32 heartbeat lost
    state.health = health;

    // Open maintenance / fault tickets.
    state.issues = [
      {
        id: 'MNT-501', slotId: '103', component: 'ir',
        issue: 'TCRT5000 IR sensor not responding — output stuck high',
        status: 'sensor_fault', open: true, createdAt: daysFromNow(-1),
        log: [
          { date: daysFromNow(-1), technician: 'R. Shah',
            issue: 'Sensor output stuck high; suspected loose wiring',
            resolutionStatus: 'Pending inspection' }
        ]
      },
      {
        id: 'MNT-502', slotId: '104', component: 'qr',
        issue: 'QR label partially peeled and unreadable',
        status: 'under_maintenance', open: true, createdAt: daysFromNow(-2),
        log: [
          { date: daysFromNow(-2), technician: 'P. Iyer',
            issue: 'Label peeling at edges; scanner cannot read',
            resolutionStatus: 'Replacement label ordered' }
        ]
      },
      {
        id: 'MNT-503', slotId: '203', component: 'esp32',
        issue: 'ESP32 heartbeat missed — 3 consecutive ping timeouts',
        status: 'inspection_pending', open: true, createdAt: daysFromNow(0),
        log: [
          { date: daysFromNow(0), technician: '—',
            issue: 'Communications module not responding to ping',
            resolutionStatus: 'Inspection scheduled' }
        ]
      }
    ];

    // Reservations across today, tomorrow and the past week (for analytics).
    const R = (code, name, vehicle, phone, floor, slot, date, start, duration, status) => ({
      id: code, name, vehicle, phone, floor, slot,
      date, start, duration, status, createdAt: iso(new Date())
    });

    state.reservations = [
      R('RES-2041', 'Alex Morgan', 'MH 12 AB 3456', '98200 11223', 'ground', '101', t, '10:00', 2, 'approved'),
      R('RES-2043', 'Ravi Kumar', 'MH 02 EF 9102', '98111 44556', 'ground', '102', t, '13:00', 1, 'pending'),
      R('RES-2046', 'Nina D Souza', 'MH 48 KL 7788', '97654 33221', 'first', '201', t, '15:00', 2, 'approved'),
      R('RES-2047', 'Omar Farooq', 'DL 03 MN 1022', '90011 22004', 'ground', '104', t, '12:00', 1, 'cancelled'),
      R('RES-2042', 'Sarah Lee', 'MH 14 CD 7821', '98200 55667', 'first', '204', daysFromNow(1), '09:30', 3, 'approved'),
      R('RES-2045', 'Tom White', 'KA 01 IJ 2334', '98807 66772', 'ground', '103', daysFromNow(1), '16:00', 2, 'pending'),
      R('RES-2048', 'Elena Petrova', 'MH 20 PQ 3345', '91673 55678', 'ground', '102', daysFromNow(2), '10:30', 4, 'approved'),
      R('RES-2031', 'John Carter', 'MH 03 XY 7711', '98765 43210', 'ground', '101', daysFromNow(-1), '09:00', 2, 'completed'),
      R('RES-2032', 'Maria Gomez', 'GJ 05 RT 9012', '99221 33445', 'first', '202', daysFromNow(-2), '11:00', 2, 'completed'),
      R('RES-2033', 'Liam Wong', 'MH 12 YZ 4521', '98100 11223', 'ground', '104', daysFromNow(-3), '14:00', 1, 'completed'),
      R('RES-2034', 'Aisha Khan', 'MH 06 GH 5510', '98330 44556', 'first', '201', daysFromNow(-4), '10:00', 3, 'completed'),
      R('RES-2035', 'Diego Ruiz', 'KA 51 KK 6688', '97400 99887', 'ground', '103', daysFromNow(-5), '16:30', 2, 'completed')
    ];

    // A little extra historical volume so analytics charts look populated.
    const names = [['Priya Nair', 'MH 01 AA 1101'], ['Sam Vora', 'MH 45 BB 2233'],
                   ['Ivy Chen', 'KA 03 CC 3344'], ['Arun Das', 'MH 15 DD 4455'],
                   ['Mia Lopez', 'GJ 12 EE 5566'], ['Dev Patel', 'MH 09 FF 6677'],
                   ['Zoey Hall', 'DL 08 GG 7788'], ['Ken Ito', 'MH 22 HH 8899']];
    const slotsById = SLOT_META.map(s => s.id);
    for (let d = -6; d >= -12; d--) {
      const n = 2 + (d % 3); // 2..4 reservations per day
      for (let i = 0; i < n; i++) {
        const nm = names[modIndex(d + i, names.length)];
        const slot = slotsById[modIndex(d * 2 + i * 3, slotsById.length)];
        const meta = SLOT_META.find(s => s.id === slot);
        const start = 9 + ((d * 3 + i) % 9);
        state.reservations.push(R(
          'RES-' + (1000 + (d * 10 + i)),
          nm[0], nm[1], '9' + String(100000000 + Math.abs(d * 7000 + i * 911)),
          meta.floor, meta.slot, daysFromNow(d), String(start).padStart(2, '0') + ':00', 1 + ((d + i) % 3), 'completed'
        ));
      }
    }

    // Notification panel (mixed faults + reservation alerts).
    state.notifications = [
      { id: 'NTF-1', type: 'fault', message: 'IR sensor at Spot 103 not responding', time: daysFromNow(0), read: false },
      { id: 'NTF-2', type: 'fault', message: 'QR label at Spot 104 reported damaged', time: daysFromNow(-1), read: false },
      { id: 'NTF-3', type: 'reservation', message: 'New reservation RES-2043 awaiting approval (Spot 102)', time: daysFromNow(0), read: false },
      { id: 'NTF-4', type: 'reservation', message: 'RES-2041 approved — Spot 101, today 10:00', time: daysFromNow(0), read: false }
    ];

    state.users = [
      { name: 'Alex Morgan', phone: '98200 11223', email: 'alex@demo.in', password: 'user123' }
    ];
    state.session = null;
    state.adminSession = false;
  }

  /* ------------------------------------------------------------------
     5. Derived slot state (this is the "live" computation the UI reads)
  ------------------------------------------------------------------ */

  /* Determine today's reserved spots: any approved reservation dated today. */
  function reservedToday() {
    const t = todayISO();
    return state.reservations.filter(r => r.status === 'approved' && r.date === t)
                             .map(r => r.slot);
  }

  /* Spots that are out of service because a component is faulty. */
  function outOfService() {
    const set = {};
    state.issues.filter(i => i.open).forEach(i => { set[i.slotId] = true; });
    SLOT_META.forEach(s => {
      const h = state.health[s.id] || {};
      if (Object.values(h).some(v => v === 'fault')) set[s.id] = true;
    });
    return set;
  }

  function computeSlots() {
    const reserved = reservedToday();
    const oos = outOfService();
    return SLOT_META.map(meta => {
      let status = 'available';
      if (oos[meta.id]) status = 'maintenance';
      else if (reserved.indexOf(meta.id) >= 0) status = 'reserved';
      else if (state.presence[meta.id]) status = 'occupied';

      // Attach today's reservation (if any) for context in the UI.
      const res = state.reservations.find(r => r.slot === meta.id &&
        r.status === 'approved' && r.date === todayISO());

      return Object.assign({}, meta, { status, reservation: res || null });
    });
  }

  function getSlots(floor) {
    return computeSlots().filter(s => s.floor === floor);
  }

  function getSlot(id) {
    return computeSlots().find(s => s.id === id) || null;
  }

  function getStats() {
    const slots = computeSlots();
    const count = s => slots.filter(x => x.status === s).length;
    return {
      total: slots.length,
      available: count('available'),
      occupied: count('occupied'),
      reserved: count('reserved'),
      maintenance: count('maintenance')
    };
  }

  /* ------------------------------------------------------------------
     6. Admin actions — sensor / maintenance simulation
  ------------------------------------------------------------------ */

  /* Simulate an IR sensor pulse: toggles a vehicle in/out of a spot.
     In the real system this is driven by the ESP32 + TCRT5000. */
  function togglePresence(slotId) {
    const s = getSlot(slotId);
    if (!s) return null;
    if (s.status === 'maintenance') {
      addNotification('fault', 'Cannot change presence — Spot ' + slotId + ' is under maintenance');
      return null;
    }
    state.presence[slotId] = !state.presence[slotId];
    persist();
    return getSlot(slotId);
  }

  /* Toggle a component's health (ok <-> fault). Opening a fault auto-creates
     a maintenance ticket; restoring health auto-resolves open tickets for
     that spot/component. */
  function setComponentHealth(slotId, compKey, healthy) {
    if (!state.health[slotId]) state.health[slotId] = { ir: 'ok', qr: 'ok', led: 'ok', esp32: 'ok' };
    const h = state.health[slotId];
    const comp = COMPONENTS.find(c => c.key === compKey);

    if (healthy) {
      h[compKey] = 'ok';
      // Resolve any open ticket for this spot+component.
      state.issues.filter(i => i.slotId === slotId && i.component === compKey && i.open)
        .forEach(i => {
          i.open = false;
          i.status = 'operational';
          i.log.push({ date: todayISO(), technician: 'Admin Console', issue: 'Component restored', resolutionStatus: 'Resolved' });
        });
      addNotification('fault', 'Spot ' + slotId + ' — ' + comp.name + ' back to operational');
    } else {
      h[compKey] = 'fault';
      const issueId = 'MNT-' + String(600 + state.issues.length + 1);
      state.issues.push({
        id: issueId, slotId, component: compKey,
        issue: comp.name + ' — ' + comp.defaultFault,
        status: comp.badge, open: true, createdAt: todayISO(),
        log: [{ date: todayISO(), technician: 'Auto-detected', issue: comp.defaultFault, resolutionStatus: 'Pending' }]
      });
      addNotification('fault', 'Fault detected at Spot ' + slotId + ' — ' + comp.name);
    }
    persist();
    return state.health[slotId];
  }

  /* Change the maintenance status of an open fault ticket. */
  function setIssueStatus(issueId, status) {
    const issue = state.issues.find(i => i.id === issueId);
    if (!issue) return null;
    issue.status = status;
    // Closing a ticket back to operational also clears the component fault.
    if (status === 'operational') {
      issue.open = false;
      const h = state.health[issue.slotId] || {};
      h[issue.component] = 'ok';
      issue.log.push({ date: todayISO(), technician: 'Admin Console', issue: 'Marked operational', resolutionStatus: 'Resolved' });
    } else {
      issue.open = true;
      const h = state.health[issue.slotId] || {};
      h[issue.component] = 'fault';
    }
    persist();
    return issue;
  }

  function addIssueLog(issueId, entry) {
    const issue = state.issues.find(i => i.id === issueId);
    if (!issue) return null;
    issue.log.push(entry);
    persist();
    return issue;
  }

  /* Manually raise a fault ticket (used by the maintenance console). */
  function reportIssue(slotId, component, issue, technician) {
    const h = state.health[slotId] || (state.health[slotId] = { ir: 'ok', qr: 'ok', led: 'ok', esp32: 'ok' });
    h[component] = 'fault';
    const comp = COMPONENTS.find(c => c.key === component);
    const issueId = 'MNT-' + String(600 + state.issues.length + 1);
    state.issues.push({
      id: issueId, slotId, component,
      issue: issue || (comp ? comp.defaultFault : 'Hardware issue reported'),
      status: comp ? comp.badge : 'inspection_pending', open: true, createdAt: todayISO(),
      log: [{
        date: todayISO(), technician: technician || '—',
        issue: issue || (comp ? comp.defaultFault : 'Hardware issue reported'),
        resolutionStatus: 'Pending'
      }]
    });
    addNotification('fault', 'Fault reported at Spot ' + slotId + ' — ' + (comp ? comp.name : component));
    persist();
    return issueId;
  }

  function getIssues() {
    return state.issues.slice().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  /* ------------------------------------------------------------------
     7. Reservation management
  ------------------------------------------------------------------ */

  function _overlaps(a, b) {
    if (a.slot !== b.slot || a.date !== b.date) return false;
    const aStart = parseInt(a.start.replace(':', ''), 10);
    const aEnd = aStart + a.duration * 100;
    const bStart = parseInt(b.start.replace(':', ''), 10);
    const bEnd = bStart + b.duration * 100;
    return aStart < bEnd && bStart < aEnd;
  }

  function createReservation(data) {
    const slot = getSlot(data.slot);
    if (!slot) return { ok: false, message: 'Spot not found' };
    if (slot.status !== 'available') {
      return { ok: false, message: 'Spot ' + data.slot + ' is ' + slot.status + ' and cannot be reserved' };
    }
    // Basic conflict check against other active reservations on same spot/day.
    const clash = state.reservations.some(r =>
      r.status !== 'cancelled' && r.status !== 'completed' && _overlaps(r, data));
    if (clash) return { ok: false, message: 'That spot is already booked for the chosen time' };

    const id = 'RES-' + (Math.floor(1000 + Math.random() * 9000));
    const rec = Object.assign({ id, status: 'pending', createdAt: iso(new Date()) }, data);
    state.reservations.unshift(rec);
    addNotification('reservation', 'New reservation ' + id + ' — Spot ' + data.slot + ' awaiting approval');
    persist();
    return { ok: true, reservation: rec };
  }

  function _findRes(id) { return state.reservations.find(r => r.id === id); }

  function approveReservation(id) {
    const r = _findRes(id);
    if (!r || r.status !== 'pending') return null;
    const slot = getSlot(r.slot);
    if (slot.status === 'maintenance') return { error: 'Spot is under maintenance — cannot approve' };
    r.status = 'approved';
    addNotification('reservation', r.id + ' approved — Spot ' + r.slot + ', ' + fmtDate(r.date) + ' ' + fmtTime(r.start));
    persist();
    return r;
  }

  function cancelReservation(id, actor) {
    const r = _findRes(id);
    if (!r || r.status === 'completed' || r.status === 'cancelled') return null;
    r.status = 'cancelled';
    addNotification('reservation', r.id + ' cancelled' + (actor === 'admin' ? ' by administrator' : ' by user') +
      ' — Spot ' + r.slot);
    persist();
    return r;
  }

  function completeReservation(id) {
    const r = _findRes(id);
    if (!r || r.status === 'completed' || r.status === 'cancelled') return null;
    r.status = 'completed';
    addNotification('reservation', r.id + ' completed — Spot ' + r.slot);
    persist();
    return r;
  }

  function updateReservation(id, patch) {
    const r = _findRes(id);
    if (!r || r.status === 'completed' || r.status === 'cancelled') return null;
    // If the spot/time changed, check conflicts again.
    const candidate = Object.assign({}, r, patch);
    const clash = state.reservations.some(x =>
      x.id !== id && x.status !== 'cancelled' && x.status !== 'completed' && _overlaps(x, candidate));
    if (clash) return { error: 'Conflicts with another reservation on that spot/time' };
    Object.assign(r, patch);
    persist();
    return r;
  }

  function getReservations(filter) {
    let list = state.reservations.slice().sort((a, b) => b.date > a.date ? 1 : -1);
    if (!filter) return list;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      list = list.filter(r => [r.id, r.name, r.vehicle, r.phone, r.slot]
        .join(' ').toLowerCase().includes(q));
    }
    if (filter.slot) list = list.filter(r => r.slot === filter.slot);
    if (filter.date) list = list.filter(r => r.date === filter.date);
    if (filter.status) list = list.filter(r => r.status === filter.status);
    if (filter.floor) list = list.filter(r => r.floor === filter.floor);
    return list;
  }

  function getUserReservations(phone) {
    if (!phone) return [];
    return state.reservations.filter(r =>
      r.phone === phone || (state.session && r.phone === state.session.phone))
      .sort((a, b) => b.date > a.date ? 1 : -1);
  }

  /* Can this reservation still be cancelled by the user? (before start time) */
  function canUserCancel(r) {
    if (!r || r.status !== 'pending' && r.status !== 'approved') return false;
    const now = new Date();
    const start = new Date(r.date + 'T' + r.start + ':00');
    return now < start;
  }

  /* ------------------------------------------------------------------
     8. Notifications
  ------------------------------------------------------------------ */

  function addNotification(type, message) {
    state.notifications.unshift({
      id: 'NTF-' + Date.now(), type, message, time: todayISO(), read: false
    });
    state.notifications = state.notifications.slice(0, 30);
  }

  function getNotifications() {
    return state.notifications.slice();
  }

  function markNotificationsRead() {
    state.notifications.forEach(n => { n.read = true; });
    persist();
  }

  /* ------------------------------------------------------------------
     9. Accounts & sessions (UI-only authentication for the prototype)
  ------------------------------------------------------------------ */

  function signup(data) {
    if (state.users.some(u => u.phone === data.phone)) {
      return { ok: false, message: 'An account with this phone number already exists' };
    }
    state.users.push(Object.assign({ password: 'user123' }, data));
    state.session = { name: data.name, phone: data.phone, email: data.email || '' };
    persist();
    return { ok: true };
  }

  function userLogin(phone, password) {
    const u = state.users.find(x => x.phone === phone && x.password === password);
    if (!u) return { ok: false, message: 'Invalid credentials' };
    state.session = { name: u.name, phone: u.phone, email: u.email || '' };
    persist();
    return { ok: true };
  }

  function getUserSession() { return state.session; }
  function setGuestSession(name, phone) {
    state.session = { name, phone, email: '' };
    persist();
  }
  function userLogout() { state.session = null; persist(); }

  function adminLogin(user, pass) {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      state.adminSession = true;
      persist();
      return { ok: true };
    }
    return { ok: false, message: 'Invalid administrator credentials' };
  }

  function isAdmin() { return !!state.adminSession; }
  function adminLogout() { state.adminSession = false; persist(); }

  /* ------------------------------------------------------------------
     10. Analytics
  ------------------------------------------------------------------ */

  function reservationsPerDay(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = daysFromNow(-i);
      out.push({ date: d, count: state.reservations.filter(r => r.date === d).length });
    }
    return out;
  }

  function mostReservedSlots(limit) {
    const counts = {};
    state.reservations
      .filter(r => r.status === 'approved' || r.status === 'completed')
      .forEach(r => { counts[r.slot] = (counts[r.slot] || 0) + 1; });
    return SLOT_META.map(s => ({ slot: s.id, count: counts[s.id] || 0 }))
      .sort((a, b) => b.count - a.count).slice(0, limit || 8);
  }

  function maintenanceFrequency() {
    const counts = {};
    state.issues.forEach(i => {
      const comp = COMPONENTS.find(c => c.key === i.component);
      const key = comp ? comp.name : i.component;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ label: k, count: counts[k] }));
  }

  function occupancySeries(days) {
    // Simulated historical occupancy percentage per day.
    return reservationsPerDay(days).map(d => ({
      date: d.date,
      pct: Math.min(96, Math.round(30 + d.count * 8 + Math.abs(parseInt(d.date.slice(8, 10), 10)) % 15))
    }));
  }

  /* ------------------------------------------------------------------
     11. Reset / helpers
  ------------------------------------------------------------------ */

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    seed();
    persist();
  }

  function raw() { return state; }

  /* ------------------------------------------------------------------
     12. Public API
  ------------------------------------------------------------------ */

  window.EasyPark = {
    SLOT_META, COMPONENTS, MAINT_STATES, RES_STATUSES, SLOT_STATUSES,
    // dates
    todayISO, daysFromNow, fmtDate, fmtTime,
    // slots & stats
    computeSlots, getSlots, getSlot, getStats, togglePresence,
    // maintenance
    setComponentHealth, setIssueStatus, addIssueLog, getIssues, reportIssue,
    // reservations
    createReservation, approveReservation, cancelReservation, completeReservation,
    updateReservation, getReservations, getUserReservations, canUserCancel,
    // notifications
    getNotifications, markNotificationsRead,
    // accounts
    signup, userLogin, getUserSession, setGuestSession, userLogout,
    adminLogin, isAdmin, adminLogout,
    // analytics
    reservationsPerDay, mostReservedSlots, maintenanceFrequency, occupancySeries,
    // misc
    resetDemo, raw
  };

  // Load immediately.
  load();
})();
