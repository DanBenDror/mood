import { FORMS, EMOTIONS, SCHEMA_VERSION } from './questions.js';
import * as store from './store.js';
import * as box from './crypto.js';
import { makeRemote } from './remote.js';
import { fetchWeather } from './weather.js';
import { faceSvg, ICONS, ART, LOGO } from './faces.js';
import * as reminders from './reminders.js';

// ?demo in the address runs the app with no account and no cloud backup.
// The copy published under /next/ is a preview and always runs as a demo.
const DEMO = new URLSearchParams(location.search).has('demo') || location.pathname.includes('/next/');
const app = document.getElementById('app');
const DAY_STARTS_AT = 4;   // a "day" runs 04:00 -> 04:00, so a 1am night entry counts for the day before
const NIGHT_OPENS_AT = 15; // morning entry: 04:00-15:00, night entry: 15:00-04:00

let remote = null; // cloud backup, or null (demo / offline)
let key = null;    // encryption key, held on this device only
let flow = null;   // the entry being filled in right now
let demoKind = null;   // demo only: which entry to pretend is open
let sheetOpen = null;  // 'status' | 'settings' | null: the panel showing over the home screen
let onHome = false;    // is the home screen showing?
let drawn = 0;         // counts screen changes, so a slow home refresh never replaces a newer screen
let refreshed = false; // has this visit already checked the backup for entries from other devices?

// ---------- small helpers ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}
function show(...nodes) {
  onHome = false; drawn++;
  app.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  app.style.animation = 'none'; void app.offsetWidth; app.style.animation = '';
  window.scrollTo(0, 0);
}
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function today() {
  const now = new Date();
  const logical = new Date(now.getTime() - DAY_STARTS_AT * 3600e3);
  const hr = now.getHours();
  return { day: ymd(logical), logical, open: (DEMO && demoKind) || (hr >= DAY_STARTS_AT && hr < NIGHT_OPENS_AT ? 'morning' : 'night') };
}
const entryId = (day, kind) => `${day}_${kind}`;
const svgEl = (cls, markup) => { const s = h('span', { class: cls }); s.innerHTML = markup; return s; };
const faceEl = (id) => svgEl('face', faceSvg(id));
const friendly = (e) => (e && e.message) || String(e);

// ---------- start-up ----------
async function boot() {
  await store.open(DEMO ? 'mood-demo' : 'mood');
  if (DEMO) { // a sandbox: starts empty every time, never touches the account or the backup
    await store.clearEntries();
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return home();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); // offline copy + reminders
  key = await store.getKV('key');
  if (!DEMO) {
    try { remote = await makeRemote(); } catch { remote = null; }
    if (!remote) {
      if (key) return home(); // offline but already set up: keep working, back up later
      return show(h('div', { class: 'question center' }, h('h1', null, 'No connection'),
        h('p', { class: 'muted' }, 'The first set-up needs the internet. Try again when you are online.')));
    }
    let session = null;
    try { session = await remote.session(); } catch { /* offline */ }
    if (!session) {
      if (key && !navigator.onLine) { remote = null; return home(); } // offline: keep working, back up later
      return authScreen();
    }
  }
  if (!key) return passphraseScreen();
  home();
}

// ---------- sign in ----------
function authScreen(message) {
  const email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email' });
  const password = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
  const err = h('p', { class: 'error' }, message || '');
  const go = async (mode) => {
    err.textContent = '';
    if (!email.value || password.value.length < 8) { err.textContent = 'Enter your email and a password of at least 8 characters.'; return; }
    try {
      if (mode === 'up') {
        const signedIn = await remote.signUp(email.value.trim(), password.value);
        if (!signedIn) return authScreen('Check your email and tap the confirmation link, then sign in here.');
      } else {
        await remote.signIn(email.value.trim(), password.value);
      }
      boot();
    } catch (e) { err.textContent = friendly(e); }
  };
  show(
    h('div', { class: 'question' },
      h('h1', null, 'Mood'),
      h('p', { class: 'muted', style: 'margin-bottom:28px' }, 'Sign in to back up your entries. They are encrypted before they leave this phone.'),
      email, password, err,
      h('button', { class: 'btn', onclick: () => go('in') }, 'Sign in'),
      h('button', { class: 'link', onclick: () => go('up') }, 'First time? Create account'),
    ),
  );
}

// ---------- encryption passphrase ----------
async function passphraseScreen() {
  let profile = null;
  if (remote) {
    try { profile = await remote.getProfile(); }
    catch (e) {
      return show(h('div', { class: 'question' }, h('h1', null, 'Database not ready'),
        h('p', { class: 'muted' }, 'The backup database has not been set up yet, or could not be reached.'),
        h('p', { class: 'error' }, friendly(e)),
        h('button', { class: 'btn', onclick: boot }, 'Try again')));
    }
  }
  const creating = !profile;
  const p1 = h('input', { type: 'password', placeholder: 'Passphrase', autocomplete: 'off' });
  const p2 = creating ? h('input', { type: 'password', placeholder: 'Repeat passphrase', autocomplete: 'off' }) : null;
  const err = h('p', { class: 'error' });
  const btn = h('button', { class: 'btn', onclick: submit }, creating ? 'Set passphrase' : 'Unlock');

  async function submit() {
    err.textContent = '';
    if (p1.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
    if (creating && p1.value !== p2.value) { err.textContent = 'The two passphrases do not match.'; return; }
    btn.disabled = true; btn.textContent = 'Working…';
    try {
      if (creating) {
        const salt = box.newSalt();
        const k = await box.deriveKey(p1.value, salt);
        const check = await box.encrypt(k, { check: 'ok' });
        if (remote) await remote.createProfile({ salt, check_iv: check.iv, check_ct: check.ct });
        key = k;
      } else {
        const k = await box.deriveKey(p1.value, profile.salt);
        try { await box.decrypt(k, { iv: profile.check_iv, ct: profile.check_ct }); }
        catch { throw new Error('Wrong passphrase.'); }
        key = k;
      }
      await store.setKV('key', key);
      await sync();
      home();
    } catch (e) {
      err.textContent = friendly(e); btn.disabled = false; btn.textContent = creating ? 'Set passphrase' : 'Unlock';
    }
  }

  show(
    h('div', { class: 'question' },
      h('h1', null, creating ? 'Choose a passphrase' : 'Enter your passphrase'),
      h('p', { class: 'muted', style: 'margin-bottom:28px' }, creating
        ? 'This locks your entries so only you can read them. It cannot be reset: if you forget it, the backup cannot be opened. Write it down somewhere safe.'
        : 'The passphrase you chose when you first set up the app.'),
      p1, p2, err, btn,
    ),
  );
}

// ---------- backup ----------
async function sync() {
  if (!remote) return 0;
  let changed = 0;
  const local = await store.allEntries();
  for (const e of local.filter((x) => !x.synced)) {
    await remote.pushEntry(e);
    await store.putEntry({ ...e, synced: true });
    changed++;
  }
  const have = new Set(local.map((e) => e.id));
  for (const r of await remote.pullEntries()) { // entries locked in on another device, or a new phone
    const id = entryId(r.day, r.kind);
    if (have.has(id)) continue;
    await store.putEntry({ id, day: r.day, kind: r.kind, iv: r.iv, ct: r.ct, created_at: r.created_at, synced: true });
    changed++;
  }
  return changed;
}

// ---------- home ----------
const DEFAULT_STATE = { relationship: 'single', relationship_since: null, relationship_quality: null, vacation: false };

async function home() {
  flow = null;
  const ticket = drawn;
  const entries = await store.allEntries();
  const done = new Set(entries.map((e) => e.id));
  const state = { ...DEFAULT_STATE, ...((await store.getKV('state')) || {}) };
  const t = today();
  const kind = t.open; // the home screen only ever offers the entry that is open right now

  const moon = done.has(entryId(t.day, kind))
    ? h('div', { class: 'moon off' }, h('span', null, 'Locked in'),
        h('small', null, kind === 'morning' ? `Night opens at ${NIGHT_OPENS_AT}:00` : 'Back in the morning'))
    : h('button', { class: 'moon', onclick: () => startFlow(kind, t.day) },
        h('span', null, kind === 'morning' ? 'Morning' : 'Night'), h('small', null, 'tap to begin'));

  // last 14 days: top dot = morning, bottom dot = night
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = ymd(new Date(t.logical.getTime() - i * 86400e3));
    days.push(h('div', { class: `day ${i === 0 ? 'today' : ''}` },
      h('i', { class: done.has(entryId(d, 'morning')) ? 'on' : '' }),
      h('i', { class: done.has(entryId(d, 'night')) ? 'on' : '' })));
  }

  const saveState = async (patch) => { Object.assign(state, patch); await store.setKV('state', state); home(); };
  const seg = (options, current, onPick) => h('div', { class: 'seg' },
    options.map(([id, label]) => h('button', { class: id === current ? 'on' : '', onclick: () => id !== current && onPick(id) }, label)));

  const quality = state.relationship !== 'single' && sliderEl({ lo: 'Rough', hi: 'Great' }, state.relationship_quality,
    () => {}, async (v) => { state.relationship_quality = v; await store.setKV('state', state); });

  // Reminders: a notification only when an entry has not been filled in yet.
  const rem = { on: false, morning: '09:30', night: '22:30', ...((await store.getKV('reminders')) || {}) };
  let reminderNodes = null;
  if (remote && !DEMO) {
    if (!reminders.supported()) {
      reminderNodes = [h('h3', null, 'Reminders'),
        h('p', { class: 'muted small' }, 'Reminders only work when you open Mood from its home-screen icon.')];
    } else {
      const note = h('p', { class: 'error small' });
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (rem.on && rem.tz !== zone && Notification.permission === 'granted') { // travelled: move reminders to local time
        reminders.enable()
          .then((sub) => remote.saveSubscription({ ...sub, tz: zone, morning_time: rem.morning, night_time: rem.night }))
          .then(() => store.setKV('reminders', { ...rem, tz: zone })).catch(() => {});
      }
      const saveRem = async (patch) => {
        const next = { ...rem, ...patch, tz: zone };
        note.textContent = '';
        try {
          if (next.on) {
            const sub = await reminders.enable();
            await remote.saveSubscription({ ...sub, tz: zone, morning_time: next.morning, night_time: next.night });
          } else {
            const endpoint = await reminders.disable();
            if (endpoint) await remote.deleteSubscription(endpoint);
          }
          await store.setKV('reminders', next);
          home();
        } catch (e) { note.textContent = friendly(e); }
      };
      const time = (k) => h('input', { type: 'time', value: rem[k], onchange: (ev) => ev.target.value && saveRem({ [k]: ev.target.value }) });
      const test = async () => {
        note.className = 'muted small'; note.textContent = 'Sending…';
        try {
          const res = ((await remote.testReminder()) || {}).test || [];
          const bad = res.filter((r) => r !== 'sent');
          if (!res.length) throw new Error('This phone is not registered for reminders. Switch reminders Off and On again, then retry.');
          if (bad.length) throw new Error(`The notification service refused it: ${bad.join(', ')}`);
          note.textContent = 'Sent. It should arrive within a few seconds.';
        }
        catch (e) { note.className = 'error small'; note.textContent = friendly(e); }
      };
      reminderNodes = [
        h('h3', null, 'Reminders'),
        h('div', { class: 'row', style: 'margin-top:0' }, h('span', null, 'Remind me if I haven\'t filled it in'),
          h('div', { style: 'width:130px;flex:none' }, seg([[false, 'Off'], [true, 'On']], rem.on, (id) => saveRem({ on: id })))),
        rem.on && h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Morning'), time('morning')),
        rem.on && h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Night'), time('night')),
        rem.on && h('button', { class: 'link', style: 'padding-left:0', onclick: test }, 'Send a test notification'),
        note,
      ];
    }
  }

  const unsynced = entries.filter((e) => !e.synced).length;
  const status = h('p', { class: 'muted small' }, DEMO ? 'Demo mode: nothing is backed up'
    : !remote ? 'Offline: will back up later'
    : unsynced ? `${unsynced} waiting to back up…` : `${entries.length} entries, all backed up`);
  if (remote && (unsynced || !refreshed)) {
    refreshed = true;
    sync().then((changed) => { if (changed && onHome) home(); })
      .catch(() => { if (unsynced) status.textContent = `${unsynced} waiting to back up (will retry)`; });
  }

  // The two panels that slide up over the home screen.
  const sheets = {
    status: ['Status', [
      h('h3', null, 'Relationship'),
      seg([['single', 'Single'], ['dating', 'Dating'], ['relationship', 'Relationship']], state.relationship,
        (id) => saveState({ relationship: id, relationship_since: t.day, relationship_quality: null })),
      quality && h('div', { style: 'margin-top:14px' }, h('p', { class: 'muted small', style: 'margin:0' }, 'How is it going?'), quality),
      h('div', { class: 'row' }, h('span', null, 'On vacation'),
        h('div', { style: 'width:150px' }, seg([[false, 'No'], [true, 'Yes']], state.vacation, (id) => saveState({ vacation: id })))),
    ]],
    settings: ['Settings', [
      reminderNodes || [h('h3', null, 'Reminders'), h('p', { class: 'muted small' }, DEMO ? 'Not available in the demo.' : 'Available when you are online.')],
      h('h3', null, 'Backup'), status,
      h('h3', null, 'Your data'),
      h('button', { class: 'btn ghost', onclick: exportData }, 'Export my data'),
      h('a', { class: 'link', style: 'align-self:center', href: 'legend.html' }, 'Icon key: what each drawing means'),
      remote && h('button', { class: 'link', style: 'align-self:center', onclick: signOut }, 'Sign out'),
    ]],
  };
  const closeSheet = () => { sheetOpen = null; document.querySelector('.sheet-wrap')?.remove(); };
  const drawSheet = () => {
    document.querySelector('.sheet-wrap')?.remove();
    if (!sheetOpen) return;
    const [title, nodes] = sheets[sheetOpen];
    const wrap = h('div', { class: 'sheet-wrap', onclick: (ev) => ev.target === wrap && closeSheet() },
      h('div', { class: 'sheet' },
        h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'back', onclick: closeSheet, 'aria-label': 'Close' }, '\u2715')),
        nodes));
    app.append(wrap);
  };
  const link = (id, label) => h('button', { onclick: () => { sheetOpen = id; drawSheet(); } }, label);

  if (ticket !== drawn) return; // another screen opened while this one was loading
  show(
    DEMO && h('div', { class: 'demo' }, h('span', null, 'Demo: nothing is saved'),
      seg([['morning', 'Morning'], ['night', 'Night']], kind, (id) => { demoKind = id; home(); }),
      h('button', { class: 'link', onclick: async () => { await store.clearEntries(); home(); } }, 'Reset')),
    h('div', { class: 'home' },
      h('div', { class: 'home-top' },
        svgEl('logo', LOGO),
        h('div', { class: 'script' }, 'what', h('span', { class: 'ap' }, "'"), 's the mood?'),
        moon,
        h('div', { class: 'dots' }, days)),
      h('div', { class: 'home-gap' }),
      h('div', { class: 'links' }, link('status', 'Status'), link('settings', 'Settings'))),
  );
  onHome = true;
  drawSheet();
}

async function signOut(ev) {
  const btn = ev.currentTarget; // asks for a second tap instead of a pop-up, which some phones suppress
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'Tap again to sign out (you will need your passphrase to return)'; return; }
  await remote.signOut(); await store.delKV('key'); key = null; authScreen();
}

async function exportData() {
  const entries = [];
  for (const e of (await store.allEntries()).sort((a, b) => a.id.localeCompare(b.id))) entries.push(await box.decrypt(key, e));
  const text = JSON.stringify({ exported_at: new Date().toISOString(), schema: SCHEMA_VERSION, entries }, null, 2);
  const file = new File([text], `mood-export-${today().day}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch { return; }
  }
  const a = h('a', { href: URL.createObjectURL(file), download: file.name });
  document.body.append(a); a.click(); a.remove();
}

// ---------- widgets ----------
// onInput fires while dragging, onCommit when the finger lifts.
function sliderEl(q, value, onInput, onCommit) {
  const untouched = value == null && !q.from0;
  const input = h('input', { type: 'range', min: 0, max: 100, step: 1, class: `slider ${untouched ? 'untouched' : ''}`, 'aria-label': q.title || '' });
  input.value = value != null ? value : q.from0 ? 0 : 50;
  const paint = () => input.style.setProperty('--v', `${input.value}%`);
  const touch = () => { input.classList.remove('untouched'); paint(); onInput(+input.value); };
  paint();
  input.addEventListener('input', touch);
  input.addEventListener('pointerdown', () => setTimeout(touch, 0)); // a tap without dragging also counts
  // Letting go of the slider commits the answer (also covers a tap without dragging, and keyboard use).
  const commit = () => onCommit && onCommit(+input.value);
  input.addEventListener('change', commit);
  input.addEventListener('pointerup', () => setTimeout(commit, 0));
  input.addEventListener('touchend', () => setTimeout(commit, 0));
  return h('div', { class: 'slider-wrap' }, input, h('div', { class: 'ends' }, h('span', null, q.lo), h('span', null, q.hi)));
}

// ---------- filling in an entry ----------
function startFlow(kind, day) {
  sheetOpen = null;
  flow = { kind, day, i: 0, answers: {}, started_at: new Date().toISOString(), toReview: false, weather: null };
  fetchWeather().then((w) => { if (flow) flow.weather = w; });
  // scales that start at "nothing" are pre-answered with 0
  for (const q of FORMS[kind]) if (q.type === 'slider' && q.from0) flow.answers[q.id] = 0;
  question();
}

function question() {
  const qs = FORMS[flow.kind];
  const q = qs[flow.i];
  const set = (v) => { flow.answers[q.id] = v; };

  let leaving = false;
  function forward() {
    if (flow.toReview || flow.i === qs.length - 1) return review();
    flow.i++; question();
  }
  function back() {
    if (flow.toReview) return review();
    if (flow.i === 0) return home(); // leaving on the first question drops the unfinished entry
    flow.i--; question();
  }

  let body;
  if (q.type === 'slider') {
    // No Next button: releasing the slider moves on. A short pause lets the choice register visually.
    body = sliderEl(q, flow.answers[q.id], set, (v) => { if (leaving) return; leaving = true; set(v); setTimeout(forward, 260); });
  } else {
    const options = q.type === 'faces' ? EMOTIONS : q.options;
    const drawn_ = q.type !== 'choice'; // drawings carry no caption
    const buttons = options.map((o) => h('button', { class: flow.answers[q.id] === o.id ? 'on' : '', 'aria-label': drawn_ ? o.label : null, onclick: (ev) => {
      if (leaving) return;
      leaving = true; // tapping an answer moves straight on
      buttons.forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); set(o.id);
      setTimeout(forward, 220);
    } }, q.type === 'faces' ? faceEl(o.id) : q.type === 'icons' ? svgEl('face', ART[o.art]) : h('span', null, o.label)));
    // drawings sit in centred rows: four of them make a 2x2 block, otherwise three per row
    body = h('div', { class: q.type === 'faces' ? 'faces' : q.type === 'icons' ? 'icons' : 'choices', style: `--per:${options.length === 4 ? 2 : 3}` }, buttons);
  }

  show(
    h('div', { class: 'top' },
      h('button', { class: 'back', onclick: back, 'aria-label': 'Back' }, flow.i === 0 && !flow.toReview ? '✕' : '←'),
      h('div', { class: 'progress' }, h('i', { style: `width:${((flow.i + 1) / (qs.length + 1)) * 100}%` }))),
    h('div', { class: 'question' }, h('h1', { class: 'ask' }, q.title), body),
  );
}

function answerView(q, v) {
  if (q.type === 'slider') return h('span', { class: 'bar' }, h('i', { style: `width:${v}%` }));
  if (q.type === 'faces') return h('span', { class: 'facepair' }, faceEl(v));
  const o = q.options.find((x) => x.id === v);
  return q.type === 'icons' ? h('span', { class: 'facepair' }, svgEl('face', ART[o.art])) : o.label;
}

function review() {
  flow.toReview = true;
  const qs = FORMS[flow.kind];
  const err = h('p', { class: 'error center' });
  const send = h('button', { class: 'btn', onclick: () => lockIn(send, err) }, 'Lock it in');
  show(
    h('div', { class: 'top' },
      h('button', { class: 'back', 'aria-label': 'Back', onclick: () => { flow.toReview = false; flow.i = qs.length - 1; question(); } }, '←'),
      h('div', { class: 'progress' }, h('i', { style: 'width:100%' }))),
    h('h1', { class: 'rev' }, 'Everything right?'),
    h('p', { class: 'muted small rev-note' }, 'Tap an answer to change it.'),
    // rows shrink to fit, so the whole list and the button stay on one screen
    h('ul', { class: 'review', style: `--rows:${qs.length}` }, qs.map((q, i) => h('li', null, h('button', { onclick: () => { flow.i = i; question(); } },
      h('span', { class: 'q' }, q.short || q.title), h('span', { class: 'a' }, answerView(q, flow.answers[q.id])))))),
    err, send,
  );
}

async function lockIn(btn, err) {
  btn.disabled = true; btn.textContent = 'Locking…';
  try {
    const { relationship, relationship_since, relationship_quality, vacation } = { ...DEFAULT_STATE, ...((await store.getKV('state')) || {}) };
    const payload = {
      v: SCHEMA_VERSION, kind: flow.kind, day: flow.day,
      started_at: flow.started_at, submitted_at: new Date().toISOString(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      answers: flow.answers,
      state: { relationship, relationship_since, relationship_quality, vacation },
      weather: flow.weather,
    };
    const sealed = await box.encrypt(key, payload);
    await store.addEntry({ id: entryId(flow.day, flow.kind), day: flow.day, kind: flow.kind, ...sealed, created_at: payload.submitted_at, synced: false });
  } catch (e) {
    err.textContent = e && e.name === 'ConstraintError' ? 'This entry was already locked in.' : friendly(e);
    btn.disabled = false; btn.textContent = 'Lock it in';
    return;
  }
  const kind = flow.kind; flow = null;
  sync().catch(() => {}); // backup failures are retried from the home screen
  show(h('div', { class: 'question center' }, svgEl('big', ICONS.lock), h('h1', null, 'Locked in'),
    h('p', { class: 'muted' }, kind === 'morning' ? 'Have a good day.' : 'Sleep well.')),
  );
  // No button: the confirmation stays for a moment, then the home screen returns by itself.
  const ticket = drawn;
  setTimeout(() => { if (drawn === ticket) home(); }, 1300);
}

// Coming back to the app (e.g. the next morning): redraw for the current time and re-check the backup.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && onHome) { refreshed = false; home(); }
});

(function sky() {
  let n = 7; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(r() * 860).toFixed(1)}" r="${[0.7, 0.9, 0.9, 1.3][Math.floor(r() * 4)]}"/>`;
  document.getElementById('sky').innerHTML = `<svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice"><g fill="var(--accent)" fill-opacity="0.2">${stars}</g>` +
    '<path d="M450 730a230 230 0 1 1-292-222a184 184 0 0 0 292 222z" fill="var(--accent)" fill-opacity="0.045"/></svg>';
})();

boot().catch((e) => show(h('div', { class: 'question' }, h('h1', null, 'Something went wrong'), h('p', { class: 'error' }, friendly(e)))));
