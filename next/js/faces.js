// All drawings in the app. They are drawn loosely on purpose (outlines that
// overshoot, open eyes, uneven strokes) and a shared "sketch" filter in
// index.html adds a hand-drawn wobble. Everything is on a 48x48 canvas and
// takes the surrounding text colour.
const svg = (inner) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

// A face outline drawn in one pass that doesn't quite meet where it started.
const HEAD = '<path d="M22 3.800C34.500 2.500 44.800 12 44.300 24.500C43.800 36.500 34.500 44.800 23 44.200C11.500 43.600 3.200 34.500 3.800 23C4.300 12.500 12.500 4.200 26.500 4.800"/>';
const wrap = (inner) => svg(HEAD + inner);
const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2.300" ry="2.800" stroke-width="2"/>`;
const heart = (x, y, s = 1) =>
  `<path d="M${x} ${y + 3.6 * s}l${-3.9 * s} ${-3.9 * s}a${2.4 * s} ${2.4 * s} 0 0 1 ${3.9 * s} ${-2.8 * s}a${2.4 * s} ${2.4 * s} 0 0 1 ${3.9 * s} ${2.8 * s}z" fill="currentColor" stroke-width="1"/>`;

const FACES = {
  happy: eye(17, 19.500) + eye(31, 19) + '<path d="M14.500 28q9.500 10 19.500-.500"/>',
  excited: '<path d="M13 21q3.500-5.500 7.500-.500M27.500 20.500q3.500-5 7.500.500"/><path d="M14.500 27.500l19-.500q-1 10-9.500 10t-9.500-9.500z" fill="currentColor"/>',
  calm: '<path d="M13 19.500q3.500 4 7.500 .500M27.500 20q3.500 3.500 7.500-.500"/><path d="M18 30.500q6 4 12.500-.500"/>',
  loving: heart(17, 18.500, 1.150) + heart(31, 18, 1.150) + '<path d="M16 29.500q8 8 16.500-.500"/>',
  tired: '<path d="M13 21.500l7.500-.500M27.500 21l7.500.500"/><path d="M12.500 17.500l7.500-2M35.500 17.500l-7.500-2" stroke-width="1.800"/><ellipse cx="24" cy="32.500" rx="3" ry="4.200"/>',
  bored: eye(17, 22) + eye(31, 22) + '<path d="M13 17.500l8 .500M27 18l8-.500"/><path d="M17 32.500l14-.500"/>',
  sad: eye(17, 21.500) + eye(31, 21) + '<path d="M12.500 17.500l7-3M35.500 17l-7-2.500"/><path d="M16 34.500q8-7.500 16.500-.500"/><path d="M34 26q3 4 .200 5.500q-3-1.500-.200-5.500z" fill="currentColor" stroke-width="1"/>',
  anxious: '<circle cx="17" cy="21" r="3.200"/><circle cx="31" cy="21" r="3.200"/><path d="M12.500 15l6.500-2M35.500 15l-6.500-2"/><path d="M14.500 32.500q2.300-3.800 4.700 0t4.700 0t4.700 0t4.700 0"/>',
  stressed: '<path d="M13.500 17.500l6.500 3.500l-6.500 3.500M34.500 17l-6.500 4l6.500 3.500"/><path d="M15.500 29l17-.500l.500 6.500l-17.500.500z"/><path d="M20 29v6.500M24 28.800v6.700M28 28.700v6.500" stroke-width="1.600"/>',
  angry: eye(17, 23.500) + eye(31, 23.500) + '<path d="M12 15l8.500 4.500M36 15l-8.500 4.500"/><path d="M16.500 35q7.500-6.500 15.500-.500"/>',
};

export const faceSvg = (id) => wrap(FACES[id] || '');

export const ICONS = {
  lock: svg('<path d="M11 21.500l26-.500l.500 19l-27 .500z"/><path d="M16.500 21v-5.500q.500-7.500 7.500-7.500t7.500 7.500V21"/>'),
};

// Beds are seen from above: headboard at the top, sleepers on their pillows,
// blanket below. The heart is drawn on the blanket.
const bed = (inner) => svg('<path d="M6 12.500l.500-5.500l35-.500l.500 6"/><path d="M8 12.500l-.500 31.500l33 .500l-.500-32"/><path d="M7.800 28.500q16 2 32.500-.500"/>' + inner);
const sleeper = (x) => `<circle cx="${x}" cy="20.500" r="4.300"/><path d="M${x - 5.5} 27.500q5.500-4.500 11 0" stroke-width="2"/>`;

// Drinks count up in bottles; the last one has a bottle knocked over.
const g = (inner, t) => `<g transform="${t}">${inner}</g>`;
const NONE = '<path d="M23 6C34 5 42.500 13.500 42 24.500C41.500 35 33.500 42.500 23.500 42C13.500 41.500 5.500 33.500 6 23.500C6.500 14 13.500 6.500 26 7"/><path d="M11.500 36.500l25.500-25"/>';
const bottle = (x, w = 6) => `<path d="M${x - 2} 5.500l4-.300l.300 9.500q${w - 2} 3 ${w - 2} 9l-.300 17.500q-${w} 2.500-${2 * w} 0l-.300-17.500q0-6 ${w - 2}-9z"/><path d="M${x - w} 29.500q${w} 3 ${2 * w}-.500" stroke-width="1.600"/>`;
const THREE = bottle(9, 5) + bottle(24, 5) + bottle(39, 5);

// Drugs: a cannabis leaf, a pill for anything else, or both.
const leaflet = (deg, len) => `<path d="M24 37c-${len * 0.16}-${len * 0.3}-${len * 0.16}-${len * 0.75} 0-${len}c${len * 0.16} ${len * 0.25} ${len * 0.16} ${len * 0.7} 0 ${len}z" transform="rotate(${deg} 24 37)"/>`;
const LEAF = leaflet(0, 31) + leaflet(-38, 25) + leaflet(38, 25) + leaflet(-74, 17) + leaflet(74, 17) + '<path d="M24 37l.500 8"/>';
const PILL = g('<rect x="6" y="17" width="36" height="14" rx="7"/><path d="M24 17.500v13.500"/>', 'rotate(-38 24 24)');

export const ART = {
  bed_one: bed(sleeper(24)),
  bed_two: bed(sleeper(17) + sleeper(31)),
  bed_heart: bed(sleeper(17) + sleeper(31) + heart(24, 35, 1.500)),
  health_sick: wrap('<path d="M13 19.500q3.500 4 7.500 .500M27.500 20q3.500 3.500 7.500-.500"/><path d="M12.500 14.500l6.500-2M35.500 14.500l-6.500-2" stroke-width="1.800"/><path d="M18.500 28l11-.300l.300 8q-.500 5.300-5.800 5.300t-5.500-5.500z" fill="currentColor" stroke-width="1"/>'),
  health_dizzy: wrap('<path d="M14 17.500l6.500 6M20.500 17.500l-6.500 6.500M28 17.500l6.500 6M34.500 17l-6.500 6.500"/><path d="M14.500 33q2.300-3.800 4.700 0t4.700 0t4.700 0t4.700 0"/>'),
  health_good: wrap(eye(17, 19.500) + eye(31, 19) + '<path d="M13.500 27.500q10.500 11.500 21-.500"/>'),
  drinks_0: svg(NONE),
  drinks_1: svg(bottle(24, 7)),
  drinks_2: svg(bottle(15) + bottle(33)),
  drinks_3: svg(THREE),
  drinks_4: svg(g(THREE, 'translate(6 -2) scale(.74)') + g(bottle(24, 6), 'rotate(-80 24 24) translate(-16 2) scale(.8)')),
  drugs_none: svg(NONE),
  drugs_cannabis: svg(LEAF),
  drugs_other: svg(PILL),
  drugs_both: svg(g(LEAF, 'translate(-3 -2) scale(.66)') + g(PILL, 'translate(19 17) scale(.62)')),
};

export const LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="var(--moon-dim)"/><path d="M24 4a20 20 0 0 1 0 40z" fill="var(--accent)"/></svg>';
