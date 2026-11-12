import { FORMS, EMOTIONS, SCHEMA_VERSION } from './questions.js';
import * as store from './store.js';
import * as box from './crypto.js';
import { makeRemote } from './remote.js';
import { fetchWeather } from './weather.js';
import { faceSvg, ICONS } from './faces.js';

// ?demo in the address runs the app with no account and no cloud backup.
const DEMO = new URLSearchParams(location.search).has('demo');
const app = document.getElementById('app');
const DAY_STARTS_AT = 4;   // a "day" runs 04:00 -> 04:00, so a 1am night entry counts for the day before
const NIGHT_OPENS_AT = 15; // morning entry: 04:00-15:00, night entry: 15:00-04:00

let remote = null; // cloud backup, or null (demo / offline)
let key = null;    // encryption key, held on this device only
let flow = null;   // the entry being filled in right now

// ---------- small helpers ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}
function show(...nodes) {
  app.replaceChildren(...nodes.flat().filter(Boolean));
  app.style.animation = 'none'; void app.offsetWidth; app.style.animation = '';
  window.scrollTo(0, 0);
}
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function today() {
  const now = new Date();
  const logical = new Date(now.getTime() - DAY_STARTS_AT * 3600e3);
  const hr = now.getHours();
  return { day: ymd(logical), logical, open: hr >= DAY_STARTS_AT && hr < NIGHT_OPENS_AT ? 'morning' : 'night' };
}
const entryId = (day, kind) => `${day}_${kind}`;
const svgEl = (cls, markup) => { const s = h('span', { class: cls }); s.innerHTML = markup; return s; };
const faceEl = (id) => svgEl('face', faceSvg(id));
const friendly = (e) => (e && e.message) || String(e);

// ---------- start-up ----------
async function boot() {
  await store.open(DEMO ? 'mood-demo' : 'mood');
  key = await store.getKV('key');
  if (!DEMO) {
    try { remote = await makeRemote(); } catch { remote = null; }
    if (!remote) {
      if (key) return home(); // offline but already set up: keep working, back up later
      return show(h('div', { class: 'question center' }, h('h1', null, 'No connection'),
        h('p', { class: 'muted' }, 'The first set-up needs the internet. Try again when you are online.')));
    }
    if (!(await remote.session())) return authScreen();
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
  if (!remote) return;
  const local = await store.allEntries();
  for (const e of local.filter((x) => !x.synced)) {
    await remote.pushEntry(e);
    await store.putEntry({ ...e, synced: true });
  }
  const have = new Set(local.map((e) => e.id));
  for (const r of await remote.pullEntries()) { // restores entries on a new phone
    const id = entryId(r.day, r.kind);
    if (!have.has(id)) await store.putEntry({ id, day: r.day, kind: r.kind, iv: r.iv, ct: r.ct, created_at: r.created_at, synced: true });
  }
}

// ---------- home ----------
const DEFAULT_STATE = { relationship: 'single', relationship_since: null, relationship_quality: null, vacation: false };

async function home() {
  flow = null;
  const entries = await store.allEntries();
  const done = new Set(entries.map((e) => e.id));
  const state = { ...DEFAULT_STATE, ...((await store.getKV('state')) || {}) };
  const t = today();

  const card = (kind, title) => {
    const isDone = done.has(entryId(t.day, kind));
    const isOpen = !isDone && t.open === kind;
    const sub = isDone ? 'Locked in ✓' : isOpen ? 'Ready when you are'
      : kind === 'night' ? `Opens at ${NIGHT_OPENS_AT}:00` : 'Missed today';
    return h('button', { class: `card ${isDone ? 'done' : isOpen ? 'open' : ''}`, disabled: !isOpen, onclick: () => startFlow(kind, t.day) },
      svgEl('icon', ICONS[kind]), h('span', null, h('div', { class: 'title' }, title), h('div', { class: 'sub' }, sub)));
  };

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

  const unsynced = entries.filter((e) => !e.synced).length;
  const status = h('p', { class: 'muted small' }, DEMO ? 'Demo mode: nothing is backed up'
    : !remote ? 'Offline: will back up later'
    : unsynced ? `${unsynced} waiting to back up…` : `${entries.length} entries, all backed up`);
  if (remote && unsynced) sync().then(home).catch(() => { status.textContent = `${unsynced} waiting to back up (will retry)`; });

  show(
    h('h1', null, t.open === 'morning' ? 'Good morning' : 'Good evening'),
    h('p', { class: 'muted', style: 'margin-bottom:22px' }, t.logical.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })),
    card('morning', 'Morning'),
    card('night', 'Night'),
    h('h2', null, 'Last 14 days'),
    h('div', { class: 'dots' }, days),
    h('h2', null, 'Right now in life'),
    seg([['single', 'Single'], ['dating', 'Dating'], ['relationship', 'Relationship']], state.relationship,
      (id) => saveState({ relationship: id, relationship_since: t.day, relationship_quality: null })),
    quality && h('div', { style: 'margin-top:14px' }, h('p', { class: 'muted small', style: 'margin:0' }, 'How is it going?'), quality),
    h('div', { class: 'row' }, h('span', null, 'On vacation'),
      h('div', { style: 'width:150px' }, seg([[false, 'No'], [true, 'Yes']], state.vacation, (id) => saveState({ vacation: id })))),
    h('div', { class: 'grow' }),
    h('div', { class: 'footer' }, status,
      h('button', { class: 'link', onclick: exportData }, 'Export my data'),
      remote && h('button', { class: 'link', onclick: signOut }, 'Sign out')),
  );
}

async function signOut() {
  if (!confirm('Sign out? Your entries stay on this phone and in the backup. You will need your passphrase to sign back in.')) return;
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
  input.addEventListener('change', () => onCommit && onCommit(+input.value));
  return h('div', { class: 'slider-wrap' }, input, h('div', { class: 'ends' }, h('span', null, q.lo), h('span', null, q.hi)));
}

// ---------- filling in an entry ----------
function startFlow(kind, day) {
  flow = { kind, day, i: 0, answers: {}, started_at: new Date().toISOString(), toReview: false, weather: null };
  fetchWeather().then((w) => { if (flow) flow.weather = w; });
  // scales that start at "nothing" are pre-answered with 0
  for (const q of FORMS[kind]) if (q.type === 'slider' && q.from0) flow.answers[q.id] = 0;
  question();
}

function question() {
  const qs = FORMS[flow.kind];
  const q = qs[flow.i];
  const next = h('button', { class: 'btn', disabled: flow.answers[q.id] == null, onclick: forward }, flow.toReview ? 'Done' : 'Next');
  const set = (v) => { flow.answers[q.id] = v; next.disabled = false; };

  let leaving = false;
  function forward() {
    if (flow.toReview || flow.i === qs.length - 1) return review();
    flow.i++; question();
  }
  function back() {
    if (flow.toReview) return review();
    if (flow.i === 0) { if (confirm('Leave without saving this entry?')) home(); return; }
    flow.i--; question();
  }

  let body;
  if (q.type === 'slider') {
    body = sliderEl(q, flow.answers[q.id], set);
  } else {
    const options = q.type === 'faces' ? EMOTIONS : q.options;
    const buttons = options.map((o) => h('button', { class: flow.answers[q.id] === o.id ? 'on' : '', onclick: (ev) => {
      if (leaving) return;
      leaving = true; // tapping an answer moves straight on; only sliders need Next
      buttons.forEach((b) => b.classList.remove('on')); ev.currentTarget.classList.add('on'); set(o.id);
      setTimeout(forward, 220);
    } }, q.type === 'faces' && faceEl(o.id), o.label));
    body = h('div', { class: q.type === 'faces' ? 'faces' : 'choices' }, buttons);
  }

  show(
    h('div', { class: 'top' },
      h('button', { class: 'back', onclick: back, 'aria-label': 'Back' }, flow.i === 0 && !flow.toReview ? '✕' : '←'),
      h('div', { class: 'progress' }, h('i', { style: `width:${((flow.i + 1) / (qs.length + 1)) * 100}%` }))),
    h('div', { class: 'question' }, h('h1', null, q.title), body),
    q.type === 'slider' && next,
  );
}

function answerView(q, v) {
  if (q.type === 'slider') return h('span', { class: 'bar' }, h('i', { style: `width:${v}%` }));
  if (q.type === 'faces') return h('span', { class: 'facepair' }, faceEl(v), EMOTIONS.find((x) => x.id === v).label);
  return q.options.find((o) => o.id === v).label;
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
    h('h1', null, 'Everything right?'),
    h('p', { class: 'muted' }, 'Tap an answer to change it. Once you lock it in, it cannot be changed.'),
    h('ul', { class: 'review' }, qs.map((q, i) => h('li', null, h('button', { onclick: () => { flow.i = i; question(); } },
      h('span', { class: 'q' }, q.title), h('span', { class: 'a' }, answerView(q, flow.answers[q.id])))))),
    h('div', { class: 'grow' }), err, send,
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
    h('button', { class: 'btn ghost', onclick: home }, 'Done'));
}

boot().catch((e) => show(h('div', { class: 'question' }, h('h1', null, 'Something went wrong'), h('p', { class: 'error' }, friendly(e)))));
