/* کارکرد — ابزارهای کمکی: عدد فارسی، تاریخ شمسی، امنیت متن */
'use strict';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* عدد فارسی ↔ انگلیسی */
const toEn = v => String(v ?? '').replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const faD = v => String(v ?? '').replace(/[0-9]/g, d => FA[d]);
const sep = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
const faN = n => faD(sep(String(Math.round(+n || 0))));
const dec = n => faD(String(Math.round((+n || 0) * 100) / 100)).replace('.', '٫');
const num = v => {
  const s = toEn(v).replace(/[٬,،\s]/g, '').replace('٫', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const money = n => faN(n) + ' تومان';
const pad2 = x => String(x).padStart(2, '0');

/* ─── هسته تقویم شمسی (آفلاین) ─── */
const JBR = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
function jDiv(a, b) { return ~~(a / b); }
function jMod(a, b) { return a - ~~(a / b) * b; }
function jalCal(jy, withoutLeap) {
  const bl = JBR.length; let gy = jy + 621, leapJ = -14, jp = JBR[0], jm = 0, jump = 0, leap = 0, leapG = 0, march = 0, n = 0;
  for (let i = 1; i < bl; i++) { jm = JBR[i]; jump = jm - jp; if (jy < jm) break; leapJ = leapJ + jDiv(jump, 33) * 8 + jDiv(jMod(jump, 33), 4); jp = jm; }
  n = jy - jp;
  leapJ = leapJ + jDiv(n, 33) * 8 + jDiv(jMod(n, 33) + 3, 4);
  if (jMod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = jDiv(gy, 4) - jDiv((jDiv(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (withoutLeap) return { gy: gy, march: march };
  if (jump - n < 6) n = n - jump + jDiv(jump + 4, 33) * 33;
  leap = jMod(jMod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap: leap, gy: gy, march: march };
}
function jG2d(gy, gm, gd) { let d = jDiv((gy + jDiv(gm - 8, 6) + 100100) * 1461, 4) + jDiv(153 * jMod(gm + 9, 12) + 2, 5) + gd - 34840408; d = d - jDiv(jDiv(gy + 100100 + jDiv(gm - 8, 6), 100) * 3, 4) + 752; return d; }
function jD2g(jdn) { let j = 4 * jdn + 139361631; j = j + jDiv(jDiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908; const i = jDiv(jMod(j, 1461), 4) * 5 + 308; const gd = jDiv(jMod(i, 153), 5) + 1; const gm = jMod(jDiv(i, 153), 12) + 1; const gy = jDiv(j, 1461) - 100100 + jDiv(8 - gm, 6); return { gy: gy, gm: gm, gd: gd }; }
function jJ2d(jy, jm, jd) { const r = jalCal(jy, true); return jG2d(r.gy, 3, r.march) + (jm - 1) * 31 - jDiv(jm, 7) * (jm - 7) + jd - 1; }
function jD2j(jdn) {
  const gy = jD2g(jdn).gy; let jy = gy - 621; const r = jalCal(jy, false); const jdn1f = jG2d(gy, 3, r.march);
  let jd, jm; let k = jdn - jdn1f;
  if (k >= 0) { if (k <= 185) { jm = 1 + jDiv(k, 31); jd = jMod(k, 31) + 1; return { jy: jy, jm: jm, jd: jd }; } k -= 186; }
  else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
  jm = 7 + jDiv(k, 30); jd = jMod(k, 30) + 1;
  return { jy: jy, jm: jm, jd: jd };
}
function jMonthLen(jy, jm) { if (jm <= 6) return 31; if (jm <= 11) return 30; return jalCal(jy, false).leap === 0 ? 30 : 29; }

/* امروز به شمسی: 'سال/ماه/روز' با رقم انگلیسی و صفرِ پُر */
function todayJ() {
  try {
    const p = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const g = t => (p.find(x => x.type === t) || {}).value;
    if (g('year') && g('month') && g('day')) return g('year') + '/' + pad2(g('month')) + '/' + pad2(g('day'));
  } catch (e) {}
  const n = new Date();
  const j = jD2j(jG2d(n.getFullYear(), n.getMonth() + 1, n.getDate()));
  return j.jy + '/' + pad2(j.jm) + '/' + pad2(j.jd);
}

/* 'سال/ماه/روز' (هر رقمی) → {y,m,d} */
function parseJ(s) {
  const m = toEn(s).match(/(\d{3,4})\/(\d{1,2})\/(\d{1,2})/);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
