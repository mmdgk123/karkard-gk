/* کارکرد — رابط: ناوبری، پنجره‌ها، تاریخ و تقویم، تم، پیام کوتاه */
'use strict';

const ST = {
  page: 'dashboard', pid: null, ptab: 'entries', pfilter: 'all', pq: '', mtab: 'recv',
  pricePid: null, actPid: null, invPid: null, editPid: '', scCat: '', ctx: {},
  confirmFn: null, calTarget: null, calY: 0, calM: 0, feed: []
};

const JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const JWDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const PAGE_TITLE = { dashboard: 'کارکرد', projects: 'پروژه‌ها', money: 'پول', reports: 'گزارش', settings: 'تنظیمات' };

/* ─── پیام کوتاه و لرزش ─── */
function toast(msg) {
  const el = $('toastBox');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

/* ─── پنجره‌ها ─── */
function openSheet(id) {
  if (id !== 'sh-quick') closeSheet('sh-quick'); // منوی سریع فقط راه‌انداز است
  $(id).classList.add('open');
  document.body.classList.add('lock');
}
function closeSheet(id) {
  const el = $(id);
  if (el) el.classList.remove('open');
  if (!document.querySelector('.overlay.open')) document.body.classList.remove('lock');
}
function toggleQuickAdd() { haptic(6); openSheet('sh-quick'); }

function confirmAsk(title, text, fn) {
  $('cfTitle').textContent = title;
  $('cfText').textContent = text;
  ST.confirmFn = fn;
  openSheet('sh-confirm');
}
function confirmOk() {
  const fn = ST.confirmFn;
  ST.confirmFn = null;
  closeSheet('sh-confirm');
  if (fn) fn();
}

/* ─── فیلد تاریخ: مقدار واقعی در data-v (انگلیسی)، نمایش فارسی ─── */
function setDate(id, en) { const el = $(id); el.dataset.v = en; el.value = faD(en); }
function getDate(id) { return $(id).dataset.v || todayJ(); }
function setSeg(id, v) { document.querySelectorAll('#' + id + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
function getSeg(id) { const b = document.querySelector('#' + id + ' button.on'); return b ? b.dataset.v : ''; }
function pickSeg(btn) { btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); }

/* ─── تقویم ─── */
function openCal(el) {
  ST.calTarget = el.id;
  const p = parseJ(el.dataset.v) || parseJ(todayJ()) || { y: 1405, m: 1, d: 1 };
  ST.calY = p.y; ST.calM = p.m;
  renderCal();
  openSheet('sh-cal');
}
function closeCal() { closeSheet('sh-cal'); }
function calGo(d) {
  ST.calM += d;
  if (ST.calM < 1) { ST.calM = 12; ST.calY--; }
  if (ST.calM > 12) { ST.calM = 1; ST.calY++; }
  renderCal();
}
function calGoYear(d) { ST.calY += d; renderCal(); }
function calPick(d) { setDate(ST.calTarget, ST.calY + '/' + pad2(ST.calM) + '/' + pad2(d)); closeSheet('sh-cal'); }
function calToday() { setDate(ST.calTarget, todayJ()); closeSheet('sh-cal'); }
function renderCal() {
  $('calTitle').textContent = JMONTHS[ST.calM - 1] + ' ' + faD(ST.calY);
  const len = jMonthLen(ST.calY, ST.calM);
  const first = (jMod(jJ2d(ST.calY, ST.calM, 1), 7) + 2) % 7; // هفته از شنبه شروع می‌شه
  const t = parseJ(todayJ()) || {};
  const sel = parseJ(($(ST.calTarget) || {}).dataset ? $(ST.calTarget).dataset.v : '') || {};
  let h = JWDAYS.map(w => `<div class="cal-w">${w}</div>`).join('');
  for (let i = 0; i < first; i++) h += '<div></div>';
  for (let d = 1; d <= len; d++) {
    const isToday = d === t.d && ST.calY === t.y && ST.calM === t.m;
    const isSel = d === sel.d && ST.calY === sel.y && ST.calM === sel.m;
    h += `<button class="cal-d${isToday ? ' today' : ''}${isSel ? ' sel' : ''}" onclick="calPick(${d})">${faD(d)}</button>`;
  }
  $('calGrid').innerHTML = h;
}

/* ─── ناوبری ─── */
function go(page, pid) {
  if (page === 'project') {
    if (pid) ST.pid = pid;
    if (!findP(ST.pid)) page = 'projects';
  }
  ST.page = page;
  document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.id === 'pg-' + page));
  const navPage = page === 'project' ? 'projects' : page;
  document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('on', b.dataset.page === navPage));
  $('fab').classList.toggle('hidden', page === 'settings');
  window.scrollTo(0, 0);
  renderPage();
}

function renderPage() {
  const p = ST.page;
  const title = p === 'project' ? ((findP(ST.pid) || {}).name || 'پروژه') : (PAGE_TITLE[p] || 'کارکرد');
  $('hTitle').textContent = title;
  if (p === 'dashboard') renderDashboard();
  else if (p === 'projects') renderProjectList();
  else if (p === 'project') renderProjectPage();
  else if (p === 'money') renderMoney();
  else if (p === 'reports') renderReports();
  else if (p === 'settings') renderSettings();
}

function refresh() { renderPage(); }

/* ─── تم ─── */
function applyTheme() {
  const s = S.settings;
  const sysDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = s.theme === 'dark' || (s.theme === 'auto' && sysDark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-accent', s.accent || 'gold');
  const m = $('metaTheme');
  if (m) m.setAttribute('content', dark ? '#07090f' : '#f3f4f8');
  const b = $('themeBtn');
  if (b) b.textContent = dark ? '🌙' : '☀️';
}

/* فیلد مبلغ: سه‌رقمی‌گذاری همزمان با تایپ */
document.addEventListener('input', e => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('money')) {
    const n = num(t.value);
    t.value = n > 0 ? faD(sep(String(Math.round(n)))) : '';
  }
});

/* جلوگیری از زوم خودکار iOS وقتی کیبورد باز می‌شه (فونت زیر ۱۶ پیکسل زوم می‌کنه) */
document.addEventListener('focusin', e => {
  const t = e.target;
  if (!t || !t.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
  const fs = parseFloat(window.getComputedStyle(t).fontSize) || 0;
  if (fs < 16) t.style.fontSize = '16px';
});
