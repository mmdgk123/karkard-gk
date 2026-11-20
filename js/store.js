/* کارکرد — داده‌ها: ساختار، ذخیره، مهاجرت از نسخه قبل و محاسبات */
'use strict';

const KEY = 'karkard_v2';
const OLD_KEY = 'karkard_v1';
const PRICE_KEYS = ['meter', 'linear', 'cooler', 'chand', 'halogen', 'hour'];
const ITEMS = {
  cooler: { label: 'دریچه کولر', unit: 'عدد', icon: '❄️' },
  chand: { label: 'دریچه لوستر', unit: 'عدد', icon: '💡' },
  halogen: { label: 'هالوژن', unit: 'عدد', icon: '🔆' },
  linear: { label: 'لاین نوری', unit: 'متر', icon: '➖' }
};
const ITEM_KEYS = Object.keys(ITEMS);
const DEFAULT_CATS = ['غذا', 'مصالح', 'کرایه حمل', 'ابزار', 'متفرقه'];
const METHODS = ['نقدی', 'کارت به کارت', 'چک', 'حواله'];

let S = null;

function blankPrices() { const o = {}; PRICE_KEYS.forEach(k => o[k] = 0); return o; }

function blankData() {
  return {
    v: 2, projects: [], receipts: [], costs: [], staff: [], wages: [],
    costCats: DEFAULT_CATS.slice(),
    settings: { theme: 'dark', accent: 'gold', welcomed: false }
  };
}

function normEntry(e) {
  return {
    id: e.id || uid(), date: toEn(e.date) || todayJ(),
    pages: num(e.pages), meter: num(e.meter), hours: num(e.hours),
    cooler: num(e.cooler), chand: num(e.chand), halogen: num(e.halogen), linear: num(e.linear),
    desc: String(e.desc || '')
  };
}

/* هر داده‌ای (نسخه‌ی قبلی یا بکاپ) را به ساختار فعلی تبدیل می‌کند */
function normalize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.projects)) return null;
  const d = blankData();
  d.settings = Object.assign({ theme: 'dark', accent: 'gold', welcomed: true }, raw.settings || {});
  if (!['dark', 'light', 'auto'].includes(d.settings.theme)) d.settings.theme = 'dark';

  d.projects = raw.projects.map((p, i) => {
    const pr = blankPrices(); const src = p.prices || {};
    PRICE_KEYS.forEach(k => pr[k] = num(src[k]));
    if (!pr.meter && num(src.page) > 0) pr.meter = Math.round(num(src.page) / 3); // نسخه‌های خیلی قدیمی
    return {
      id: p.id || uid(),
      // ترتیب نمایش: جدیدترین بالا. داده‌ی قدیمی تاریخ ساخت نداره، از ترتیب ذخیره‌ش شناخته می‌شه
      created: num(p.created) || (Date.now() - (raw.projects.length - i) * 1000),
      name: String(p.name || '').trim() || 'بی‌نام',
      client: String(p.client || ''), phone: String(p.phone || ''), address: String(p.address || ''),
      start: toEn(p.start || ''), status: p.status === 'done' ? 'done' : 'active',
      note: String(p.note || ''), pinned: !!p.pinned, prices: pr,
      entries: (Array.isArray(p.entries) ? p.entries : []).map(normEntry)
    };
  });
  const pids = new Set(d.projects.map(p => p.id));
  const pidOf = x => (pids.has(x) ? x : '');

  d.staff = (Array.isArray(raw.staff) ? raw.staff : []).map(s => ({
    id: s.id || uid(), name: String(s.name || '').trim() || 'بی‌نام', phone: String(s.phone || ''), role: String(s.role || '')
  }));

  d.receipts = (raw.receipts || []).map(r => {
    let pid = r.pid;
    if (pid == null) { const hit = d.projects.find(p => p.name === String(r.source || '').trim()); pid = hit ? hit.id : ''; }
    return {
      id: r.id || uid(), pid: pidOf(pid), source: String(r.source || ''), date: toEn(r.date) || '',
      amount: num(r.amount), method: String(r.method || ''), desc: String(r.desc || '')
    };
  });

  d.costs = (raw.costs || []).map(c => ({
    id: c.id || uid(), pid: pidOf(c.pid), cat: String(c.cat || 'متفرقه'), date: toEn(c.date) || '',
    amount: num(c.amount), desc: String(c.desc || '')
  }));

  d.wages = (raw.wages || []).map(w => {
    let sid = w.sid;
    if (!d.staff.some(s => s.id === sid)) { // نسخه‌ی قبلی: پرداخت با اسم ثبت می‌شد
      const name = String(w.name || 'بی‌نام').trim() || 'بی‌نام';
      let st = d.staff.find(s => s.name === name);
      if (!st) { st = { id: uid(), name: name, phone: '', role: '' }; d.staff.push(st); }
      sid = st.id;
    }
    return {
      id: w.id || uid(), sid: sid, pid: pidOf(w.pid), date: toEn(w.date) || '', amount: num(w.amount),
      kind: w.kind === 'advance' ? 'advance' : 'salary', desc: String(w.desc || '')
    };
  });

  const cats = Array.isArray(raw.costCats) ? raw.costCats.map(String) : DEFAULT_CATS.slice();
  d.costs.forEach(c => { if (!cats.includes(c.cat)) cats.push(c.cat); });
  d.costCats = cats.filter((c, i) => c && cats.indexOf(c) === i);
  return d;
}

function loadData() {
  for (const k of [KEY, OLD_KEY]) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) { const d = normalize(JSON.parse(raw)); if (d) return d; }
    } catch (e) {}
  }
  return null;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('حافظه گوشی پره؛ یه بکاپ بگیر'); }
}

/* ─── دسترسی و کمکی‌ها ─── */
const sumBy = (arr, fn) => arr.reduce((a, x) => a + (+fn(x) || 0), 0);
const findP = id => S.projects.find(p => p.id === id);
/* پین‌شده‌ها بالا، بعد جدیدترین‌ها به قدیمی‌تر */
function projectSort(a, b) {
  const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
  if (pa !== pb) return pb - pa;
  return (+b.created || 0) - (+a.created || 0);
}
function sortedProjects() { return S.projects.slice().sort(projectSort); }
const findStaff = id => S.staff.find(s => s.id === id);
const projName = pid => { const p = findP(pid); return p ? p.name : ''; };
const staffName = sid => { const s = findStaff(sid); return s ? s.name : 'نامشخص'; };

function entrySummary(e) {
  const parts = [];
  if (e.pages) parts.push(faN(e.pages) + ' صفحه');
  if (e.meter) parts.push(dec(e.meter) + ' متر روکار');
  ITEM_KEYS.forEach(k => { if (e[k]) parts.push(dec(e[k]) + ' ' + ITEMS[k].label); });
  if (e.hours) parts.push(dec(e.hours) + ' ساعت');
  return parts.join(' • ') || '—';
}

/* ─── محاسبه ─── */
// متراژ = صفحه×۳ + متراژ روکار
function entryAmount(e, pr) {
  return ((e.pages * 3 + e.meter) * pr.meter)
    + e.cooler * pr.cooler + e.chand * pr.chand + e.halogen * pr.halogen + e.linear * pr.linear
    + e.hours * pr.hour;
}
function entryComplete(e, pr) {
  if ((e.pages * 3 + e.meter) > 0 && !(pr.meter > 0)) return false;
  if (e.hours > 0 && !(pr.hour > 0)) return false;
  return ITEM_KEYS.every(k => !(e[k] > 0) || pr[k] > 0);
}
function receivedOf(pid) { return sumBy(S.receipts.filter(r => r.pid === pid), r => r.amount); }
function costsOf(pid) { return sumBy(S.costs.filter(c => c.pid === pid), c => c.amount); }
function wagesOf(pid) { return sumBy(S.wages.filter(w => w.pid === pid), w => w.amount); }

function projStats(p) {
  const pr = p.prices;
  const st = { pages: 0, meter: 0, hours: 0, amount: 0, complete: true, items: {} };
  ITEM_KEYS.forEach(k => st.items[k] = 0);
  p.entries.forEach(e => {
    st.pages += e.pages; st.meter += e.meter; st.hours += e.hours;
    st.amount += entryAmount(e, pr);
    if (!entryComplete(e, pr)) st.complete = false;
    ITEM_KEYS.forEach(k => st.items[k] += e[k]);
  });
  st.area = st.pages * 3 + st.meter;
  st.count = p.entries.length;
  st.priced = st.amount > 0;
  st.received = receivedOf(p.id);
  st.costs = costsOf(p.id);
  st.wages = wagesOf(p.id);
  st.balance = st.amount - st.received;      // مانده‌ی مطالبه
  st.profit = st.amount - st.costs - st.wages; // سود تقریبی
  st.pct = st.amount > 0 ? Math.max(0, Math.min(100, Math.round(st.received / st.amount * 100))) : 0;
  return st;
}

function globalStats() {
  let work = 0;
  S.projects.forEach(p => { work += projStats(p).amount; });
  const received = sumBy(S.receipts, r => r.amount);
  const costs = sumBy(S.costs, c => c.amount);
  const wages = sumBy(S.wages, w => w.amount);
  return {
    work, received, costs, wages,
    owed: work - received,                 // مانده‌ی مطالبه از کارفرماها
    cash: received - costs - wages,        // نقدینگی
    active: S.projects.filter(p => p.status === 'active').length
  };
}

/* آخرین فعالیت‌ها برای داشبورد */
function activityFeed(limit) {
  const items = [];
  S.projects.forEach(p => p.entries.forEach(e => items.push({
    date: e.date, ico: '📝', title: e.desc || 'ثبت کار', sub: p.name,
    amt: entryAmount(e, p.prices), pos: false, act: () => openEntrySheet(p.id, e.id)
  })));
  S.receipts.forEach(r => items.push({
    date: r.date, ico: '💵', title: 'دریافتی از ' + (r.source || '—'), sub: projName(r.pid) || 'عمومی',
    amt: r.amount, pos: true, act: () => openReceiptSheet(r.id)
  }));
  S.costs.forEach(c => items.push({
    date: c.date, ico: '🧰', title: c.cat + (c.desc ? ' • ' + c.desc : ''), sub: projName(c.pid) || 'عمومی',
    amt: c.amount, pos: false, act: () => openCostSheet(c.id)
  }));
  S.wages.forEach(w => items.push({
    date: w.date, ico: '💰', title: 'پرداخت به ' + staffName(w.sid),
    sub: (w.kind === 'advance' ? 'علی‌الحساب' : 'دستمزد') + ' • ' + (projName(w.pid) || 'عمومی'),
    amt: w.amount, pos: false, act: () => openWageSheet(w.id)
  }));
  return items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, limit || 8);
}

/* جمع ماهانه: کار، دریافتی، هزینه، دستمزد */
function monthlyStats() {
  const m = {};
  const add = (key, field, v) => {
    if (!key) return;
    m[key] = m[key] || { work: 0, recv: 0, cost: 0, wage: 0 };
    m[key][field] += v;
  };
  const mk = d => String(d || '').slice(0, 7);
  S.projects.forEach(p => p.entries.forEach(e => add(mk(e.date), 'work', entryAmount(e, p.prices))));
  S.receipts.forEach(r => add(mk(r.date), 'recv', r.amount));
  S.costs.forEach(c => add(mk(c.date), 'cost', c.amount));
  S.wages.forEach(w => add(mk(w.date), 'wage', w.amount));
  return Object.keys(m).sort().reverse().map(k => Object.assign({ key: k }, m[k]));
}

function deleteProjectData(pid) {
  S.projects = S.projects.filter(p => p.id !== pid);
  S.receipts.forEach(r => { if (r.pid === pid) r.pid = ''; });
  S.costs.forEach(c => { if (c.pid === pid) c.pid = ''; });
  S.wages.forEach(w => { if (w.pid === pid) w.pid = ''; });
  save();
}

/* داده‌ی نمونه */
function demoData() {
  const d = blankData();
  d.settings.welcomed = true;
  const p = {
    id: uid(), created: Date.now(), name: 'ویلای نمونه', client: 'آقای رضایی', phone: '', address: '', start: '1405/05/01',
    status: 'active', note: '', pinned: true,
    prices: { meter: 220000, cooler: 100000, chand: 100000, halogen: 0, linear: 0, hour: 0 },
    entries: [
      { date: '1405/05/03', pages: 61 },
      { date: '1405/05/17', pages: 10, cooler: 5 },
      { date: '1405/06/03', pages: 67, cooler: 4, chand: 1 },
      { date: '1405/06/07', pages: 20, desc: 'کناف سقف' },
      { date: '1405/06/10', chand: 7, desc: 'دریچه لوستر' },
      { date: '1405/06/12', pages: 1 }
    ].map(normEntry)
  };
  d.projects = [p];
  const st = { id: uid(), name: 'سجاد', phone: '', role: 'کناف‌کار' };
  d.staff = [st];
  d.receipts = [{ id: uid(), pid: p.id, source: 'آقای رضایی', date: '1405/06/08', amount: 15000000, method: 'کارت به کارت', desc: 'پیش‌پرداخت' }];
  d.costs = [{ id: uid(), pid: p.id, cat: 'مصالح', date: '1405/06/05', amount: 3200000, desc: 'پروفیل و ورق کناف' }];
  d.wages = [{ id: uid(), sid: st.id, pid: p.id, date: '1405/06/08', amount: 18600000, kind: 'salary', desc: 'تسویه تا ۸ شهریور' }];
  return d;
}
