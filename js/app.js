/* کارکرد — پنجره‌های ثبت، ذخیره، فاکتور، تنظیمات و راه‌اندازی */
'use strict';

const PRICE_IDS = { meter: 'ppMeter', linear: 'ppLinear', cooler: 'ppCooler', chand: 'ppChand', halogen: 'ppHalogen', hour: 'ppHour' };

/* ─── کمکی‌ها ─── */
function moneyVal(n) { return n > 0 ? faD(sep(String(Math.round(n)))) : ''; }
function defaultPid() {
  if (ST.page === 'project' && findP(ST.pid)) return ST.pid;
  return S.projects[0] ? S.projects[0].id : '';
}
function projOptions(withGeneral) {
  const head = withGeneral ? '<option value="">عمومی (بدون پروژه)</option>' : '';
  return head + S.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
}
function fillSelect(id, html, value) {
  const el = $(id);
  el.innerHTML = html;
  const ok = value && [...el.options].some(o => o.value === value);
  el.value = ok ? value : (el.options[0] ? el.options[0].value : '');
}
function copyText(text, msg) {
  const done = () => toast(msg || 'کپی شد ✅');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const t = document.createElement('textarea');
  t.value = text;
  t.setAttribute('readonly', '');
  t.style.position = 'fixed';
  t.style.opacity = '0';
  document.body.appendChild(t);
  t.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('کپی نشد'); }
  t.remove();
}

/* ═══════════ ثبت کار ═══════════ */
function buildEntryItems(vals) {
  const p = findP($('seProj').value);
  const box = $('seItems');
  if (!p) { box.innerHTML = ''; return; }
  const v = vals || {};
  box.innerHTML = ITEM_KEYS.map(k => `<div class="field"><label class="label">${ITEMS[k].icon} ${ITEMS[k].label} (${ITEMS[k].unit})</label>` +
    `<input class="input" id="si-${k}" inputmode="decimal" autocomplete="off" placeholder="۰" value="${v[k] ? dec(v[k]) : ''}" oninput="updateEntryPreview()"></div>`).join('');
}
function readEntryForm() {
  const f = {
    pages: num($('sePages').value), meter: num($('seMeter').value),
    hours: num($('seHours').value), desc: $('seDesc').value.trim()
  };
  ITEM_KEYS.forEach(k => { const el = $('si-' + k); f[k] = el ? num(el.value) : 0; });
  return f;
}
function updateEntryPreview() {
  const p = findP($('seProj').value);
  const f = readEntryForm();
  const area = f.pages * 3 + f.meter;
  $('seArea').value = dec(area) + ' متر';
  if (!p) return;
  const amt = entryAmount(f, p.prices);
  const hasQty = area > 0 || f.hours > 0 || ITEM_KEYS.some(k => f[k] > 0);
  $('seAmount').textContent = amt > 0 ? money(amt) : (hasQty ? 'نامعلوم' : '۰ تومان');
  const incomplete = !entryComplete(f, p.prices);
  const h = $('seHint');
  h.classList.toggle('hidden', !incomplete);
  h.textContent = 'برای بعضی از مقدارها قیمت ثبت نشده؛ از «قیمت‌ها» در صفحه‌ی پروژه تنظیمش کن.';
}
function openEntrySheet(pid, eid) {
  if (!S.projects.length) { toast('اول یه پروژه بساز'); openProjectSheet(); return; }
  let p = findP(pid) || findP(defaultPid());
  let e = null;
  if (eid) {
    p = findP(pid);
    e = p ? p.entries.find(x => x.id === eid) : null;
    if (!e) return;
  }
  ST.ctx = { pid: p.id, eid: eid || '' };
  $('seTitle').textContent = eid ? 'ویرایش ثبت' : 'ثبت کار جدید';
  $('seProjWrap').classList.toggle('hidden', !!eid);
  fillSelect('seProj', projOptions(false), p.id);
  setDate('seDate', e ? e.date : todayJ());
  $('sePages').value = e && e.pages ? dec(e.pages) : '';
  $('seMeter').value = e && e.meter ? dec(e.meter) : '';
  $('seHours').value = e && e.hours ? dec(e.hours) : '';
  $('seDesc').value = e ? e.desc : '';
  buildEntryItems(e || {});
  updateEntryPreview();
  $('seDel').classList.toggle('hidden', !eid);
  $('seSave').textContent = eid ? 'ذخیره' : 'ثبت';
  openSheet('sh-entry');
}
function saveEntry() {
  const pid = ST.ctx.pid, eid = ST.ctx.eid;
  const p = findP(pid);
  if (!p) { toast('پروژه پیدا نشد'); return; }
  const f = readEntryForm();
  const hasQty = f.pages > 0 || f.meter > 0 || f.hours > 0 || ITEM_KEYS.some(k => f[k] > 0);
  if (!hasQty) { toast('یه مقداری وارد کن'); return; }
  const date = getDate('seDate');
  if (eid) {
    const e = p.entries.find(x => x.id === eid);
    if (!e) { closeSheet('sh-entry'); return; }
    Object.assign(e, f, { date: date });
  } else {
    p.entries.push(normEntry(Object.assign({}, f, { id: uid(), date: date })));
  }
  save();
  closeSheet('sh-entry');
  ST.ctx = {};
  refresh();
  toast(eid ? 'ذخیره شد ✅' : 'ثبت شد ✅');
}
function deleteEntryFromSheet() {
  const pid = ST.ctx.pid, eid = ST.ctx.eid;
  closeSheet('sh-entry');
  confirmAsk('حذف ثبت', 'این ثبت پاک بشه؟', () => {
    const p = findP(pid);
    if (p) p.entries = p.entries.filter(e => e.id !== eid);
    save(); refresh(); toast('حذف شد');
  });
}

/* ═══════════ قیمت‌های پروژه ═══════════ */
function openPrices(pid) {
  const p = findP(pid);
  if (!p) return;
  ST.pricePid = pid;
  $('ppTitle').textContent = 'قیمت‌های ' + p.name;
  Object.keys(PRICE_IDS).forEach(k => { $(PRICE_IDS[k]).value = moneyVal(p.prices[k]); });
  pricesPreview();
  openSheet('sh-prices');
}
function pricesPreview() {
  const p = findP(ST.pricePid);
  if (!p) return;
  const pr = {};
  Object.keys(PRICE_IDS).forEach(k => { pr[k] = num($(PRICE_IDS[k]).value); });
  const total = sumBy(p.entries, e => entryAmount(e, pr));
  const incomplete = p.entries.some(e => !entryComplete(e, pr));
  $('ppPreview').textContent = total > 0 ? money(total) + (incomplete ? ' (ناقص)' : '') : 'نامعلوم';
}
function savePrices() {
  const p = findP(ST.pricePid);
  if (!p) return;
  Object.keys(PRICE_IDS).forEach(k => { p.prices[k] = num($(PRICE_IDS[k]).value); });
  save(); closeSheet('sh-prices'); refresh();
  toast('قیمت‌ها ذخیره شد ✅ روی همه ثبت‌ها اعمال شد');
}

/* ═══════════ دریافتی ═══════════ */
function openReceiptSheet(rid, pid) {
  const r = rid ? S.receipts.find(x => x.id === rid) : null;
  ST.ctx = { rid: r ? r.id : '' };
  $('srTitle').textContent = r ? 'ویرایش دریافتی' : 'ثبت دریافتی';
  $('srAmount').value = r ? moneyVal(r.amount) : '';
  $('srSource').value = r ? r.source : '';
  fillSelect('srProj', projOptions(true), r ? r.pid : (pid || (ST.page === 'project' ? ST.pid : '')));
  fillSelect('srMethod', '<option value="">—</option>' + METHODS.map(m => `<option>${m}</option>`).join(''), r ? r.method : '');
  setDate('srDate', r ? r.date : todayJ());
  $('srDesc').value = r ? r.desc : '';
  $('srDel').classList.toggle('hidden', !r);
  $('srSave').textContent = r ? 'ذخیره' : 'ثبت';
  openSheet('sh-receipt');
}
function saveReceipt() {
  const amount = num($('srAmount').value);
  if (!amount) { toast('مبلغ رو وارد کن'); return; }
  const rec = {
    pid: $('srProj').value, source: $('srSource').value.trim(), date: getDate('srDate'),
    amount: amount, method: $('srMethod').value, desc: $('srDesc').value.trim()
  };
  const rid = ST.ctx.rid;
  if (rid) {
    const r = S.receipts.find(x => x.id === rid);
    if (r) Object.assign(r, rec);
  } else {
    S.receipts.push(Object.assign({ id: uid() }, rec));
  }
  save(); closeSheet('sh-receipt'); ST.ctx = {}; refresh();
  toast('ثبت شد ✅');
}
function deleteReceiptFromSheet() {
  const rid = ST.ctx.rid;
  closeSheet('sh-receipt');
  confirmAsk('حذف دریافتی', 'این دریافتی پاک بشه؟', () => {
    S.receipts = S.receipts.filter(r => r.id !== rid);
    save(); refresh(); toast('حذف شد');
  });
}

/* ═══════════ هزینه ═══════════ */
function renderCostCats() {
  $('scCats').innerHTML = S.costCats.map((c, i) =>
    `<button class="chip${ST.scCat === c ? ' on' : ''}" onclick="pickCostCat(${i})">${esc(c)}</button>`).join('') ||
    '<span class="hint">هنوز دسته‌ای نیست</span>';
}
function pickCostCat(i) { ST.scCat = S.costCats[i]; renderCostCats(); }
function addCostCatInline() {
  const name = $('scNewCat').value.trim();
  if (!name) return;
  if (!S.costCats.includes(name)) { S.costCats.push(name); save(); }
  ST.scCat = name;
  $('scNewCat').value = '';
  renderCostCats();
}
function openCostSheet(cid, pid) {
  const c = cid ? S.costs.find(x => x.id === cid) : null;
  ST.ctx = { cid: c ? c.id : '' };
  ST.scCat = c ? c.cat : (S.costCats[0] || '');
  $('scTitle').textContent = c ? 'ویرایش هزینه' : 'ثبت هزینه';
  $('scAmount').value = c ? moneyVal(c.amount) : '';
  $('scNewCat').value = '';
  renderCostCats();
  fillSelect('scProj', projOptions(true), c ? c.pid : (pid || (ST.page === 'project' ? ST.pid : '')));
  setDate('scDate', c ? c.date : todayJ());
  $('scDesc').value = c ? c.desc : '';
  $('scDel').classList.toggle('hidden', !c);
  $('scSave').textContent = c ? 'ذخیره' : 'ثبت';
  openSheet('sh-cost');
}
function saveCost() {
  if ($('scNewCat').value.trim()) addCostCatInline();
  const amount = num($('scAmount').value);
  if (!amount) { toast('مبلغ رو وارد کن'); return; }
  if (!ST.scCat) { toast('یه دسته انتخاب کن'); return; }
  const rec = {
    cat: ST.scCat, pid: $('scProj').value, date: getDate('scDate'),
    amount: amount, desc: $('scDesc').value.trim()
  };
  const cid = ST.ctx.cid;
  if (cid) {
    const c = S.costs.find(x => x.id === cid);
    if (c) Object.assign(c, rec);
  } else {
    S.costs.push(Object.assign({ id: uid() }, rec));
  }
  save(); closeSheet('sh-cost'); ST.ctx = {}; refresh();
  toast('ثبت شد ✅');
}
function deleteCostFromSheet() {
  const cid = ST.ctx.cid;
  closeSheet('sh-cost');
  confirmAsk('حذف هزینه', 'این هزینه پاک بشه؟', () => {
    S.costs = S.costs.filter(c => c.id !== cid);
    save(); refresh(); toast('حذف شد');
  });
}

/* ═══════════ کارگر و پرداخت ═══════════ */
function openStaffSheet(sid) {
  const s = sid ? findStaff(sid) : null;
  ST.ctx = { sid: s ? s.id : '' };
  $('ssTitle').textContent = s ? 'ویرایش کارگر' : 'کارگر جدید';
  $('ssName').value = s ? s.name : '';
  $('ssPhone').value = s ? s.phone : '';
  $('ssRole').value = s ? s.role : '';
  $('ssDel').classList.toggle('hidden', !s);
  openSheet('sh-staff');
}
function saveStaff() {
  const name = $('ssName').value.trim();
  if (!name) { toast('اسم کارگر رو بنویس'); return; }
  const rec = { name: name, phone: toEn($('ssPhone').value).trim(), role: $('ssRole').value.trim() };
  const s = ST.ctx.sid ? findStaff(ST.ctx.sid) : null;
  if (s) Object.assign(s, rec);
  else S.staff.push(Object.assign({ id: uid() }, rec));
  save(); closeSheet('sh-staff'); ST.ctx = {}; refresh();
  toast('ذخیره شد ✅');
}
function deleteStaffFromSheet() {
  const sid = ST.ctx.sid;
  if (S.wages.some(w => w.sid === sid)) { toast('اول پرداخت‌های این کارگر رو پاک کن'); return; }
  closeSheet('sh-staff');
  confirmAsk('حذف کارگر', 'این کارگر از فهرست حذف بشه؟', () => {
    S.staff = S.staff.filter(s => s.id !== sid);
    save(); refresh(); toast('حذف شد');
  });
}
function openWageSheet(wid, sid) {
  if (!S.staff.length) { toast('اول یه کارگر اضافه کن'); openStaffSheet(); return; }
  const w = wid ? S.wages.find(x => x.id === wid) : null;
  ST.ctx = { wid: w ? w.id : '' };
  $('swTitle').textContent = w ? 'ویرایش پرداخت' : 'ثبت پرداخت';
  fillSelect('swStaff', S.staff.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join(''), w ? w.sid : (sid || ''));
  $('swAmount').value = w ? moneyVal(w.amount) : '';
  setSeg('swKind', w ? w.kind : 'salary');
  fillSelect('swProj', projOptions(true), w ? w.pid : (ST.page === 'project' ? ST.pid : ''));
  setDate('swDate', w ? w.date : todayJ());
  $('swDesc').value = w ? w.desc : '';
  $('swDel').classList.toggle('hidden', !w);
  $('swSave').textContent = w ? 'ذخیره' : 'ثبت';
  openSheet('sh-wage');
}
function saveWage() {
  const sid = $('swStaff').value;
  if (!sid) { toast('کارگر رو انتخاب کن'); return; }
  const amount = num($('swAmount').value);
  if (!amount) { toast('مبلغ رو وارد کن'); return; }
  const rec = {
    sid: sid, pid: $('swProj').value, date: getDate('swDate'), amount: amount,
    kind: getSeg('swKind') === 'advance' ? 'advance' : 'salary', desc: $('swDesc').value.trim()
  };
  const wid = ST.ctx.wid;
  if (wid) {
    const w = S.wages.find(x => x.id === wid);
    if (w) Object.assign(w, rec);
  } else {
    S.wages.push(Object.assign({ id: uid() }, rec));
  }
  save(); closeSheet('sh-wage'); ST.ctx = {}; refresh();
  toast('ثبت شد ✅');
}
function deleteWageFromSheet() {
  const wid = ST.ctx.wid;
  closeSheet('sh-wage');
  confirmAsk('حذف پرداخت', 'این پرداخت پاک بشه؟', () => {
    S.wages = S.wages.filter(w => w.id !== wid);
    save(); refresh(); toast('حذف شد');
  });
}

/* ═══════════ پروژه ═══════════ */
function openProjectSheet(pid) {
  const p = pid ? findP(pid) : null;
  ST.ctx = { pid: p ? p.id : '' };
  $('spTitle').textContent = p ? 'ویرایش پروژه' : 'پروژه جدید';
  $('spName').value = p ? p.name : '';
  $('spClient').value = p ? p.client : '';
  $('spPhone').value = p ? p.phone : '';
  $('spAddress').value = p ? p.address : '';
  setDate('spStart', p && p.start ? p.start : todayJ());
  $('spStatus').value = p && p.status === 'done' ? 'done' : 'active';
  $('spNote').value = p ? p.note : '';
  $('spSave').textContent = p ? 'ذخیره' : 'ساختن پروژه';
  $('spDel').classList.toggle('hidden', !p);
  openSheet('sh-project');
}
function saveProject() {
  const name = $('spName').value.trim();
  if (!name) { toast('اسم پروژه رو بنویس'); return; }
  const rec = {
    name: name, client: $('spClient').value.trim(), phone: toEn($('spPhone').value).trim(),
    address: $('spAddress').value.trim(), start: getDate('spStart'),
    status: $('spStatus').value === 'done' ? 'done' : 'active', note: $('spNote').value.trim()
  };
  const p = ST.ctx.pid ? findP(ST.ctx.pid) : null;
  if (p) {
    Object.assign(p, rec);
  } else {
    const np = Object.assign({ id: uid(), pinned: false, prices: blankPrices(), entries: [] }, rec);
    S.projects.push(np);
    ST.pid = np.id;
  }
  save(); closeSheet('sh-project'); ST.ctx = {};
  if (p) { refresh(); toast('ذخیره شد ✅'); }
  else { go('project', ST.pid); toast('پروژه ساخته شد ✅'); }
}
function deleteProjectFromSheet() {
  const pid = ST.ctx.pid;
  const p = findP(pid);
  if (!p) return;
  closeSheet('sh-project');
  confirmAsk('حذف پروژه', `«${p.name}» و همه‌ی ثبت‌هاش پاک بشه؟ دریافتی، هزینه و پرداخت‌های مرتبط به «عمومی» منتقل می‌شن.`, () => {
    deleteProjectData(pid);
    if (ST.pid === pid) ST.pid = null;
    go('projects');
    toast('پروژه حذف شد');
  });
}

/* ═══════════ منوی پروژه ═══════════ */
function openActions(pid) {
  const p = findP(pid);
  if (!p) return;
  ST.actPid = pid;
  $('saTitle').textContent = p.name;
  $('saPin').textContent = p.pinned ? 'برداشتن پین' : 'پین کردن';
  $('saStatus').textContent = p.status === 'done' ? 'در جریان' : 'تمام شد';
  openSheet('sh-actions');
}
function actionsPin() {
  const p = findP(ST.actPid);
  if (!p) return;
  p.pinned = !p.pinned;
  save(); closeSheet('sh-actions'); refresh();
  toast(p.pinned ? 'پین شد 📌 بالای لیست' : 'پین برداشته شد');
}
function actionsEdit() { const pid = ST.actPid; closeSheet('sh-actions'); openProjectSheet(pid); }
function actionsPrices() { const pid = ST.actPid; closeSheet('sh-actions'); openPrices(pid); }
function actionsInvoice() { const pid = ST.actPid; closeSheet('sh-actions'); openInvoice(pid); }
function actionsStatus() {
  const p = findP(ST.actPid);
  if (!p) return;
  p.status = p.status === 'done' ? 'active' : 'done';
  save(); closeSheet('sh-actions'); refresh();
  toast(p.status === 'done' ? 'پروژه تمام‌شده ثبت شد ✅' : 'پروژه دوباره در جریان شد');
}
function actionsDelete() {
  const pid = ST.actPid;
  const p = findP(pid);
  if (!p) return;
  closeSheet('sh-actions');
  confirmAsk('حذف پروژه', `«${p.name}» و همه‌ی ثبت‌هاش پاک بشه؟`, () => {
    deleteProjectData(pid);
    if (ST.pid === pid) ST.pid = null;
    go('projects');
    toast('پروژه حذف شد');
  });
}

/* ═══════════ فاکتور ═══════════ */
function invOpt(v) {
  const b = document.querySelector(`#invOpts [data-v="${v}"]`);
  return !!(b && b.classList.contains('on'));
}
function renderInvoice() {
  const p = findP(ST.invPid);
  if (!p) return;
  $('invPreview').innerHTML = invoiceHTML(p, invOpt('money'), invOpt('detail'));
}
function openInvoice(pid) {
  const p = findP(pid) || findP(defaultPid());
  if (!p) { toast('اول یه پروژه بساز'); return; }
  ST.invPid = p.id;
  renderInvoice();
  openSheet('sh-invoice');
}
function toggleInvOpt(btn) { btn.classList.toggle('on'); renderInvoice(); }
function printInvoice() {
  const p = findP(ST.invPid);
  if (!p) return;
  $('printArea').innerHTML = invoiceHTML(p, invOpt('money'), invOpt('detail'));
  window.print();
}
function shareInvoice() {
  const p = findP(ST.invPid);
  if (!p) return;
  const st = projStats(p);
  const text = `صورت‌کار ${p.name}\n` +
    `متراژ: ${dec(st.area)} متر\n` +
    `مبلغ کل: ${st.priced ? money(st.amount) : 'نامعلوم'}\n` +
    `دریافتی: ${money(st.received)}\n` +
    `مانده: ${st.priced ? money(st.balance) : '—'}`;
  if (navigator.share) navigator.share({ title: 'صورت‌کار ' + p.name, text: text }).catch(() => {});
  else copyText(text, 'متن فاکتور کپی شد ✅');
}

/* ═══════════ تنظیمات ═══════════ */
function setTheme(t) { S.settings.theme = t; save(); applyTheme(); renderSettings(); }
function setAccent(a) { S.settings.accent = a; save(); applyTheme(); renderSettings(); }
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(dark ? 'light' : 'dark');
}
function addCostCat() {
  const v = $('newCat').value.trim();
  if (!v) return;
  if (!S.costCats.includes(v)) S.costCats.push(v);
  save(); renderSettings(); toast('دسته اضافه شد ✅');
}
function removeCostCat(i) {
  const c = S.costCats[i];
  if (c === undefined) return;
  confirmAsk('حذف دسته', `«${c}» از فهرست حذف بشه؟ ثبت‌های قبلی با همین دسته سر جاشون می‌مونن.`, () => {
    const idx = S.costCats.indexOf(c);
    if (idx >= 0) S.costCats.splice(idx, 1);
    save(); renderSettings();
  });
}

/* ─── بکاپ ─── */
function backupDownload() {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'karkard-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function backupCopy() { copyText(JSON.stringify(S), 'بکاپ کپی شد ✅ یه جای امن بفرستش'); }
function importFile(inp) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => importRaw(String(r.result || ''));
  r.onerror = () => toast('فایل خونده نشد');
  r.readAsText(f);
  inp.value = '';
}
function importText() { importRaw($('impText').value); }
function importRaw(txt) {
  let d = null;
  try { d = normalize(JSON.parse(txt)); } catch (e) { d = null; }
  if (!d) { toast('بکاپ معتبر نیست ❌'); return; }
  confirmAsk('بازیابی بکاپ', 'داده‌های فعلی با این بکاپ جایگزین می‌شن. ادامه بدیم؟', () => {
    S = d; save(); applyTheme(); ST.pid = null;
    go('dashboard'); toast('برگردونده شد ✅');
  });
}
function loadDemo() {
  confirmAsk('داده‌ی نمونه', 'داده‌های فعلی پاک می‌شن و نمونه جاش میاد. ادامه؟', () => {
    const st = S.settings;
    S = demoData();
    S.settings.theme = st.theme;
    S.settings.accent = st.accent;
    save(); applyTheme(); ST.pid = null;
    go('dashboard'); toast('نمونه بارگذاری شد');
  });
}
function refreshApp() {
  confirmAsk('به‌روزرسانی برنامه', 'کش برنامه پاک و دوباره بارگذاری می‌شه. داده‌هات پاک نمی‌شن.', async () => {
    try {
      if ('caches' in window) {
        const ks = await caches.keys();
        await Promise.all(ks.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.unregister()));
      }
    } catch (e) {}
    location.reload();
  });
}
function resetAll() {
  confirmAsk('پاک‌سازی همه داده‌ها', 'همه‌ی پروژه‌ها، ثبت‌ها، کارگرها و پرداخت‌ها پاک می‌شن. قبلش بکاپ گرفتی؟', () => {
    const st = S.settings;
    S = blankData();
    S.settings = Object.assign(st, { welcomed: true });
    ST.pid = null;
    save(); go('dashboard'); toast('همه‌چی پاک شد');
  });
}

/* ═══════════ خوش‌آمد ═══════════ */
function welcomeStart(mode) {
  if (mode === 'demo') {
    const st = S.settings;
    S = demoData();
    S.settings.theme = st.theme;
    S.settings.accent = st.accent;
  }
  S.settings.welcomed = true;
  save(); applyTheme(); closeSheet('sh-welcome'); go('dashboard');
}

/* ═══════════ راه‌اندازی ═══════════ */
function boot() {
  S = loadData() || blankData();
  save();
  applyTheme();
  buildSkeletons();
  go('dashboard');
  if (!S.settings.welcomed) openSheet('sh-welcome');
}
boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
