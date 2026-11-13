// Hand-drawn line faces, one per emotion id. All share a 48x48 canvas and use
// the surrounding text colour, so they restyle with the app.
const wrap = (inner) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="21"/>${inner}</svg>`;
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="1.9" fill="currentColor" stroke="none"/>`;
const heart = (x, y) =>
  `<path d="M${x} ${y + 3.6}l-3.9-3.9a2.4 2.4 0 0 1 3.9-2.8a2.4 2.4 0 0 1 3.9 2.8z" fill="currentColor" stroke-width="1"/>`;

const FACES = {
  happy: dot(17, 20) + dot(31, 20) + '<path d="M15 28q9 9 18 0"/>',
  excited: '<path d="M13.5 21q3.5-5 7 0M27.5 21q3.5-5 7 0"/><path d="M15 27.5h18q-1 9.5-9 9.5t-9-9.5z" fill="currentColor"/>',
  calm: '<path d="M13.5 20q3.5 3.5 7 0M27.5 20q3.5 3.5 7 0"/><path d="M18 30q6 4 12 0"/>',
  loving: heart(17, 18.5) + heart(31, 18.5) + '<path d="M16 29q8 8 16 0"/>',
  tired: '<path d="M13.5 21h7M27.5 21h7"/><path d="M13 17.500l7-1.500M35 17.500l-7-1.500" stroke-width="1.800"/><ellipse cx="24" cy="32" rx="3" ry="4"/>',
  bored: dot(17, 21.5) + dot(31, 21.5) + '<path d="M13.5 18h7M27.5 18h7"/><path d="M17 32h14"/>',
  sad: dot(17, 21) + dot(31, 21) + '<path d="M13 17.5l6.5-2.5M35 17.5l-6.5-2.5"/><path d="M16 34q8-7 16 0"/><path d="M33 25q2.6 3.6 0 5q-2.600-1.400 0-5z" fill="currentColor" stroke-width="1"/>',
  anxious: '<circle cx="17" cy="21" r="3"/><circle cx="31" cy="21" r="3"/><path d="M13 15l6-1.500M35 15l-6-1.500"/><path d="M15 32q2.250-3.500 4.500 0t4.500 0t4.500 0t4.500 0"/>',
  stressed: '<path d="M14 17.500l6 3.500l-6 3.500M34 17.500l-6 3.500l6 3.500"/><rect x="15.500" y="28.500" width="17" height="6.500" rx="2"/><path d="M20 28.500v6.500M24 28.500v6.500M28 28.500v6.500" stroke-width="1.600"/>',
  angry: dot(17, 23) + dot(31, 23) + '<path d="M12.500 15.500l8 4M35.500 15.500l-8 4"/><path d="M16.500 34q7.500-6 15 0"/>',
};

export const faceSvg = (id) => wrap(FACES[id] || '');

const icon = (inner) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
export const ICONS = {
  morning: icon('<circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.300 11.300l3.500 3.500M33.200 33.200l3.500 3.500M11.300 36.700l3.500-3.500M33.200 14.800l3.500-3.500"/>'),
  night: icon('<path d="M39 28.500A16.500 16.500 0 1 1 19.500 9a13 13 0 0 0 19.500 19.500z"/>'),
  lock: icon('<rect x="11" y="21" width="26" height="19" rx="4"/><path d="M16.500 21v-5.500a7.500 7.500 0 0 1 15 0V21"/>'),
};

// Drawings for `icons` questions. Beds are seen from above: headboard at the top,
// heads on the pillow, blanket below.
const bed = (inner) => icon('<rect x="8" y="5" width="32" height="38" rx="5"/><path d="M8 23h32"/>' + inner);
const head = (x) => `<circle cx="${x}" cy="14.5" r="4.200"/>`;
export const ART = {
  bed_one: bed(head(24)),
  bed_two: bed(head(17) + head(31)),
  bed_heart: bed(head(17) + head(31) + '<path d="M24 38.500l-5.800-5.800a3.600 3.600 0 0 1 5.800-4.200a3.600 3.600 0 0 1 5.800 4.200z" fill="currentColor" stroke-width="1"/>'),
  health_sick: wrap('<path d="M13.500 19q3.500 3.500 7 0M27.500 19q3.500 3.500 7 0"/><path d="M13 14.500l6-1.500M35 14.500l-6-1.500" stroke-width="1.800"/><path d="M18.500 28h11v7.500a5.500 5.500 0 0 1-11 0z" fill="currentColor" stroke-width="1"/>'),
  health_dizzy: wrap('<path d="M14 17.500l6 6M20 17.500l-6 6M28 17.500l6 6M34 17.500l-6 6"/><path d="M15 33q2.250-3.500 4.500 0t4.500 0t4.500 0t4.500 0"/>'),
  health_good: wrap(dot(17, 20) + dot(31, 20) + '<path d="M14 27q10 11 20 0"/>'),
};

export const LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="var(--moon-dim)"/><path d="M24 4a20 20 0 0 1 0 40z" fill="var(--accent)"/></svg>';
