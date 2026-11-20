/* کارکرد — نمایش صفحه‌ها */
'use strict';

const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

function bar(pct) { return `<div class="bar"><span style="width:${pct}%"></span></div>`; }

function emptyBox(ico, title, text, action, btn) {
  return `<div class="empty"><div class="e-ico">${ico}</div><b>${title}</b>${text ? `<div>${text}</div>` : ''}` +
    (action ? `<button class="btn btn-primary" onclick="${action}">${btn}</button>` : '') + `</div>`;
}

function row(ico, title, sub, amt, cls, action) {
  return `<div class="row" onclick="${action}"><div class="row-ico">${ico}</div>` +
    `<div class="row-main"><div class="row-t">${esc(title)}</div><div class="row-s">${esc(sub)}</div></div>` +
    `<div class="row-a ${cls || ''}">${amt}</div></div>`;
}

function summaryHero(label, value, sub, action, btn) {
  return `<section class="hero"><div class="k">${label} • ${sub}</div>` +
    `<div class="big">${faN(value)}<small>تومان</small></div>` +
    `<div class="row-btns"><button class="btn btn-primary" onclick="${action}">${btn}</button></div></section>`;
}

/* ─── اسکلت ثابت صفحه‌ی پروژه‌ها (برای این‌که حین تایپ جستجو، فوکوس نپره) ─── */
function buildSkeletons() {
  $('pg-projects').innerHTML = `
    <div class="search-row"><input class="input" id="projQ" placeholder="🔍 جستجوی پروژه یا کارفرما..." autocomplete="off" oninput="setProjQuery(this.value)"></div>
    <div class="chips" id="pfilters">
      <button class="chip" data-f="all" onclick="setPFilter('all')">همه</button>
      <button class="chip" data-f="active" onclick="setPFilter('active')">در جریان</button>
      <button class="chip" data-f="done" onclick="setPFilter('done')">تمام‌شده</button>
    </div>
    <div id="projList" class="stagger"></div>`;
}

/* ─── کارت پروژه ─── */
function projectCard(p) {
  const st = projStats(p);
  const badge = p.status === 'done' ? '<span class="badge done">تمام‌شده</span>' : '<span class="badge">در جریان</span>';
  const warn = st.priced && !st.complete ? '<span class="badge warn">قیمت ناقص</span>' : '';
  return `<article class="pcard${p.pinned ? ' pinned' : ''}" onclick="go('project','${p.id}')">
    <div class="pc-top">
      <div class="pc-ico">🏗️</div>
      <div class="pc-main">
        <div class="pc-name">${p.pinned ? '📌 ' : ''}${esc(p.name)}</div>
        <div class="pc-sub">${esc(p.client || 'بدون کارفرما')} • ${faN(st.count)} ثبت</div>
      </div>
      <button class="more" onclick="event.stopPropagation();openActions('${p.id}')" aria-label="عملیات">⋯</button>
    </div>
    <div class="pc-nums">
      <div class="pc-amt">${st.priced ? faN(st.amount) + ' <small>تومان</small>' : 'نامعلوم'}</div>
      ${badge}
    </div>
    ${bar(st.pct)}
    <div class="pc-foot">
      <span>دریافتی <b>${faN(st.received)}</b></span>
      <span>مانده <b>${st.priced ? faN(st.balance) : '—'}</b></span>
      <span>متراژ <b>${dec(st.area)}</b> م</span>
      ${warn}
    </div>
  </article>`;
}

/* ─── داشبورد ─── */
function renderDashboard() {
  const el = $('pg-dashboard');
  if (!S.projects.length) {
    el.innerHTML = `<section class="hero"><div class="k">${faD(todayJ())}</div><div class="big">کارکرد</div>` +
      `<div class="hint">دفتر کارگاهت، توی جیبت: پروژه‌ها، صفحه و متر، دریافتی، هزینه، دستمزد و فاکتور.</div></section>` +
      emptyBox('🏗️', 'هنوز پروژه‌ای نداری', 'با ساختن اولین پروژه شروع کن', 'openProjectSheet()', 'پروژه جدید ➕');
    return;
  }
  const g = globalStats();
  const active = S.projects.filter(p => p.status === 'active');
  ST.feed = activityFeed(8);
  el.innerHTML = `
    <section class="hero">
      <div class="k">${faD(todayJ())} • ${faN(g.active)} پروژه در جریان</div>
      <div class="big">${faN(g.work)}<small>تومان مبلغ کل کار</small></div>
      <div class="kpis">
        <div class="kpi good"><b>${faN(g.received)}</b><span>دریافتی</span></div>
        <div class="kpi warn"><b>${faN(g.owed)}</b><span>مانده مطالبه</span></div>
        <div class="kpi ${g.cash >= 0 ? 'good' : 'bad'}"><b>${faN(g.cash)}</b><span>نقدینگی</span></div>
      </div>
    </section>
    <div class="actbar">
      <button class="act" onclick="openEntrySheet()"><i>📝</i>ثبت کار</button>
      <button class="act" onclick="openReceiptSheet()"><i>💵</i>دریافتی</button>
      <button class="act" onclick="openCostSheet()"><i>🧰</i>هزینه</button>
      <button class="act" onclick="openWageSheet()"><i>💰</i>پرداخت</button>
      <button class="act" onclick="openProjectSheet()"><i>🏗️</i>پروژه</button>
    </div>
    <div class="sec"><h2>پروژه‌های در جریان</h2><button class="link" onclick="go('projects')">همه ›</button></div>
    ${active.length ? active.slice(0, 4).map(projectCard).join('') : '<div class="hint">پروژه‌ی فعالی نیست.</div>'}
    <div class="sec"><h2>آخرین فعالیت‌ها</h2></div>
    ${ST.feed.length
      ? `<div class="list">${ST.feed.map((a, i) => row(a.ico, a.title, a.sub + ' • ' + faD(a.date), a.amt ? faN(a.amt) : '—', a.pos ? 'pos' : '', `feedOpen(${i})`)).join('')}</div>`
      : '<div class="hint">هنوز فعالیتی ثبت نشده.</div>'}`;
}

function feedOpen(i) { const a = ST.feed && ST.feed[i]; if (a && a.act) a.act(); }

/* ─── لیست پروژه‌ها ─── */
function setProjQuery(v) { ST.pq = toEn(v).trim().toLowerCase(); renderProjectList(); }
function setPFilter(f) { ST.pfilter = f; renderProjectList(); }

function renderProjectList() {
  document.querySelectorAll('#pfilters .chip').forEach(c => c.classList.toggle('on', c.dataset.f === ST.pfilter));
  const box = $('projList');
  if (!S.projects.length) {
    box.innerHTML = emptyBox('🏗️', 'هنوز پروژه‌ای نداری', 'اولین کارگاهت رو بساز', 'openProjectSheet()', 'پروژه جدید ➕');
    return;
  }
  const q = ST.pq;
  const list = S.projects
    .filter(p => (ST.pfilter === 'all' || p.status === ST.pfilter) &&
      (!q || [p.name, p.client, p.address].some(x => toEn(x).toLowerCase().includes(q))))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  box.innerHTML = list.length ? list.map(projectCard).join('') : emptyBox('🔍', 'پروژه‌ای پیدا نشد', '');
}

/* ─── صفحه‌ی یک پروژه ─── */
function renderProjectPage() {
  const p = findP(ST.pid);
  const el = $('pg-project');
  if (!p) { el.innerHTML = ''; return; }
  const st = projStats(p);
  const tabs = [['entries', 'ثبت‌ها'], ['recv', 'دریافتی'], ['costs', 'هزینه'], ['wages', 'دستمزد']];
  const meta = [p.client, p.phone ? faD(p.phone) : '', p.start ? 'شروع ' + faD(p.start) : '']
    .filter(Boolean).map(esc).join(' • ');
  el.innerHTML = `
    <div class="topbar">
      <button class="back" onclick="go('projects')">→ همه پروژه‌ها</button>
      <button class="icon-btn sm" onclick="openActions('${p.id}')" aria-label="عملیات">⋯</button>
    </div>
    <section class="hero">
      <div class="k">🏗️ ${esc(p.name)} ${p.status === 'done' ? '<span class="badge done">تمام‌شده</span>' : '<span class="badge">در جریان</span>'}</div>
      <div class="big">${st.priced ? faN(st.amount) : 'نامعلوم'}<small>${st.priced ? 'تومان مبلغ کار' : 'قیمت‌ها رو ثبت کن'}</small></div>
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      ${bar(st.pct)}
      <div class="meta">دریافتی ${faN(st.received)} از ${st.priced ? faN(st.amount) : '—'} • ${faD(st.pct)}٪</div>
      <div class="kpis">
        <div class="kpi"><b>${dec(st.area)} م</b><span>متراژ کل</span></div>
        <div class="kpi ${st.balance > 0 ? 'warn' : 'good'}"><b>${st.priced ? faN(st.balance) : '—'}</b><span>مانده</span></div>
        <div class="kpi bad"><b>${faN(st.costs + st.wages)}</b><span>هزینه و دستمزد</span></div>
      </div>
      ${!st.complete && st.count ? '<div class="hint warn-t">⚠️ بعضی ثبت‌ها قیمت ندارن؛ قیمت‌های این پروژه رو کامل کن.</div>' : ''}
    </section>
    <div class="actbar">
      <button class="act" onclick="openEntrySheet('${p.id}')"><i>📝</i>ثبت کار</button>
      <button class="act" onclick="openReceiptSheet('', '${p.id}')"><i>💵</i>دریافتی</button>
      <button class="act" onclick="openCostSheet('', '${p.id}')"><i>🧰</i>هزینه</button>
      <button class="act" onclick="openPrices('${p.id}')"><i>💰</i>قیمت‌ها</button>
      <button class="act" onclick="openInvoice('${p.id}')"><i>🧾</i>فاکتور</button>
    </div>
    <div class="seg-tabs">${tabs.map(([k, l]) => `<button class="${ST.ptab === k ? 'on' : ''}" onclick="setPTab('${k}')">${l}</button>`).join('')}</div>
    <div id="ptabBody">${projectTabBody(p)}</div>`;
}

function setPTab(t) { ST.ptab = t; renderProjectPage(); }

function projectTabBody(p) {
  const pr = p.prices;
  if (ST.ptab === 'entries') {
    const list = [...p.entries].sort(byDateDesc);
    if (!list.length) return emptyBox('📝', 'هنوز کاری ثبت نشده', 'اولین ثبت کار این پروژه رو بزن', `openEntrySheet('${p.id}')`, 'ثبت کار');
    return `<div class="list">${list.map(e => {
      const a = entryAmount(e, pr);
      return row('📝', e.desc || 'ثبت کار', faD(e.date) + ' • ' + entrySummary(e), a > 0 ? faN(a) : '—', '', `openEntrySheet('${p.id}','${e.id}')`);
    }).join('')}</div>`;
  }
  if (ST.ptab === 'recv') {
    const list = S.receipts.filter(r => r.pid === p.id).sort(byDateDesc);
    if (!list.length) return emptyBox('💵', 'دریافتی ثبت نشده', '', `openReceiptSheet('', '${p.id}')`, 'ثبت دریافتی');
    return `<div class="list">${list.map(r => row('💵', r.source || '—',
      faD(r.date) + (r.method ? ' • ' + r.method : '') + (r.desc ? ' • ' + r.desc : ''),
      faN(r.amount), 'pos', `openReceiptSheet('${r.id}')`)).join('')}</div>`;
  }
  if (ST.ptab === 'costs') {
    const list = S.costs.filter(c => c.pid === p.id).sort(byDateDesc);
    if (!list.length) return emptyBox('🧰', 'هزینه‌ای ثبت نشده', '', `openCostSheet('', '${p.id}')`, 'ثبت هزینه');
    return `<div class="list">${list.map(c => row('🧰', c.cat,
      faD(c.date) + (c.desc ? ' • ' + c.desc : ''), faN(c.amount), '', `openCostSheet('${c.id}')`)).join('')}</div>`;
  }
  const list = S.wages.filter(w => w.pid === p.id).sort(byDateDesc);
  if (!list.length) return emptyBox('💰', 'پرداختی برای این پروژه ثبت نشده', '', `openWageSheet('', '')`, 'ثبت پرداخت');
  return `<div class="list">${list.map(w => row('💰', staffName(w.sid),
    faD(w.date) + ' • ' + (w.kind === 'advance' ? 'علی‌الحساب' : 'دستمزد') + (w.desc ? ' • ' + w.desc : ''),
    faN(w.amount), '', `openWageSheet('${w.id}')`)).join('')}</div>`;
}

/* ─── پول: دریافتی، هزینه، دستمزد ─── */
function setMTab(t) { ST.mtab = t; renderMoney(); }

function renderMoney() {
  const tabs = [['recv', '💵 دریافتی'], ['cost', '🧰 هزینه'], ['wage', '💰 دستمزد']];
  const seg = `<div class="seg-tabs">${tabs.map(([k, l]) => `<button class="${ST.mtab === k ? 'on' : ''}" onclick="setMTab('${k}')">${l}</button>`).join('')}</div>`;
  let html = '';

  if (ST.mtab === 'recv') {
    const list = [...S.receipts].sort(byDateDesc);
    html = summaryHero('جمع دریافتی', sumBy(S.receipts, r => r.amount), faN(list.length) + ' مورد', 'openReceiptSheet()', 'ثبت دریافتی 💵') +
      (list.length
        ? `<div class="list">${list.map(r => row('💵', r.source || '—',
          (projName(r.pid) || 'عمومی') + ' • ' + faD(r.date) + (r.method ? ' • ' + r.method : ''),
          faN(r.amount), 'pos', `openReceiptSheet('${r.id}')`)).join('')}</div>`
        : emptyBox('💵', 'هنوز دریافتی ثبت نشده', ''));
  } else if (ST.mtab === 'cost') {
    const list = [...S.costs].sort(byDateDesc);
    const cats = S.costCats.map(c => ({ c, t: sumBy(S.costs.filter(x => x.cat === c), x => x.amount) })).filter(x => x.t > 0);
    html = summaryHero('جمع هزینه‌ها', sumBy(S.costs, c => c.amount), faN(list.length) + ' مورد', 'openCostSheet()', 'ثبت هزینه 🧰') +
      (cats.length ? `<div class="tag-row">${cats.map(x => `<span class="tag">${esc(x.c)}: ${faN(x.t)}</span>`).join('')}</div>` : '') +
      (list.length
        ? `<div class="list">${list.map(c => row('🧰', c.cat,
          (projName(c.pid) || 'عمومی') + ' • ' + faD(c.date) + (c.desc ? ' • ' + c.desc : ''),
          faN(c.amount), '', `openCostSheet('${c.id}')`)).join('')}</div>`
        : emptyBox('🧰', 'هنوز هزینه‌ای ثبت نشده', ''));
  } else {
    const list = [...S.wages].sort(byDateDesc);
    const cards = S.staff.map(s => {
      const paid = sumBy(S.wages.filter(w => w.sid === s.id), w => w.amount);
      return `<div class="staff" onclick="openWageSheet('', '${s.id}')">
        <div class="st-top"><div class="st-ava">${esc((s.name || '؟').charAt(0))}</div>
        <button class="st-edit" onclick="event.stopPropagation();openStaffSheet('${s.id}')" aria-label="ویرایش">✏️</button></div>
        <b>${esc(s.name)}</b><small>${esc(s.role || 'کارگر')}</small><span>${faN(paid)} تومان</span></div>`;
    }).join('');
    html = summaryHero('جمع پرداختی به کارگرها', sumBy(S.wages, w => w.amount), faN(S.staff.length) + ' نفر', 'openWageSheet()', 'ثبت پرداخت 💰') +
      `<div class="sec"><h2>کارگرها</h2><button class="link" onclick="openStaffSheet()">+ کارگر جدید</button></div>` +
      (S.staff.length ? `<div class="staff-grid">${cards}</div>` : emptyBox('👷', 'کارگری ثبت نشده', '', 'openStaffSheet()', 'کارگر جدید')) +
      `<div class="sec"><h2>سوابق پرداخت</h2></div>` +
      (list.length
        ? `<div class="list">${list.map(w => row('💰', staffName(w.sid),
          faD(w.date) + ' • ' + (w.kind === 'advance' ? 'علی‌الحساب' : 'دستمزد') + (projName(w.pid) ? ' • ' + projName(w.pid) : '') + (w.desc ? ' • ' + w.desc : ''),
          faN(w.amount), '', `openWageSheet('${w.id}')`)).join('')}</div>`
        : emptyBox('💰', 'هنوز پرداختی ثبت نشده', ''));
  }
  $('pg-money').innerHTML = seg + html;
}

/* ─── گزارش ─── */
function renderReports() {
  const g = globalStats();
  const rows = S.projects.map(p => {
    const st = projStats(p);
    return `<tr onclick="go('project','${p.id}')"><td>${esc(p.name)}</td><td>${dec(st.area)}</td>` +
      `<td>${st.priced ? faN(st.amount) : '—'}</td><td>${faN(st.received)}</td>` +
      `<td>${st.priced ? faN(st.balance) : '—'}</td><td>${faN(st.costs + st.wages)}</td>` +
      `<td class="${st.profit >= 0 ? 'pos' : 'neg'}">${st.priced ? faN(st.profit) : '—'}</td></tr>`;
  }).join('');
  const months = monthlyStats().map(m =>
    `<tr><td>${faD(m.key)}</td><td>${faN(m.work)}</td><td>${faN(m.recv)}</td><td>${faN(m.cost)}</td><td>${faN(m.wage)}</td></tr>`
  ).join('');

  $('pg-reports').innerHTML = `
    <section class="hero">
      <div class="k">خلاصه کل کارگاه</div>
      <div class="kpis">
        <div class="kpi"><b>${faN(g.work)}</b><span>مبلغ کل کار</span></div>
        <div class="kpi good"><b>${faN(g.received)}</b><span>دریافتی</span></div>
        <div class="kpi warn"><b>${faN(g.owed)}</b><span>مانده مطالبه</span></div>
      </div>
      <div class="kpis">
        <div class="kpi bad"><b>${faN(g.costs)}</b><span>هزینه‌ها</span></div>
        <div class="kpi bad"><b>${faN(g.wages)}</b><span>دستمزد</span></div>
        <div class="kpi ${g.cash >= 0 ? 'good' : 'bad'}"><b>${faN(g.cash)}</b><span>نقدینگی</span></div>
      </div>
    </section>
    <section class="card">
      <div class="ctitle">🏗️ پروژه‌ها</div>
      ${S.projects.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>پروژه</th><th>متراژ</th><th>مبلغ کار</th><th>دریافتی</th><th>مانده</th><th>هزینه+دستمزد</th><th>سود</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>جمع</td><td></td><td>${faN(g.work)}</td><td>${faN(g.received)}</td><td>${faN(g.owed)}</td><td>${faN(g.costs + g.wages)}</td><td>${faN(g.work - g.costs - g.wages)}</td></tr></tfoot>
      </table></div>` : '<div class="hint">پروژه‌ای نیست.</div>'}
    </section>
    <section class="card">
      <div class="ctitle">🗓️ ماه به ماه</div>
      ${months ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>ماه</th><th>کار</th><th>دریافتی</th><th>هزینه</th><th>دستمزد</th></tr></thead>
        <tbody>${months}</tbody></table></div>` : '<div class="hint">هنوز ثبتی نیست.</div>'}
    </section>
    <p class="hint">مانده = مبلغ کار − دریافتی • نقدینگی = دریافتی − هزینه − دستمزد • سود = مبلغ کار − هزینه − دستمزد</p>`;
}

/* ─── تنظیمات ─── */
function renderSettings() {
  const s = S.settings;
  const accents = [['gold', 'طلایی', '#f5b942'], ['blue', 'آبی', '#6f9bff'], ['green', 'سبز', '#34d399'], ['rose', 'صورتی', '#ff7a95']];
  $('pg-settings').innerHTML = `
    <section class="card">
      <div class="ctitle">🎨 ظاهر</div>
      <div class="setting-row"><span>تم</span>
        <div class="seg">
          <button class="${s.theme === 'dark' ? 'on' : ''}" onclick="setTheme('dark')">تیره</button>
          <button class="${s.theme === 'light' ? 'on' : ''}" onclick="setTheme('light')">روشن</button>
          <button class="${s.theme === 'auto' ? 'on' : ''}" onclick="setTheme('auto')">خودکار</button>
        </div>
      </div>
      <div class="setting-row"><span>رنگ اصلی</span>
        <div class="swatches">${accents.map(([k, l, c]) => `<button class="sw${s.accent === k ? ' on' : ''}" style="background:${c}" onclick="setAccent('${k}')" aria-label="${l}"></button>`).join('')}</div>
      </div>
    </section>
    <section class="card">
      <div class="ctitle">🧰 دسته‌های هزینه</div>
      <div class="chips">${S.costCats.map((c, i) => `<span class="chip on">${esc(c)} <button class="x" onclick="removeCostCat(${i})" aria-label="حذف">✕</button></span>`).join('')}</div>
      <div class="inline-add"><input class="input" id="newCat" placeholder="دسته جدید..." autocomplete="off"><button class="btn btn-soft btn-sm" onclick="addCostCat()">افزودن</button></div>
    </section>
    <section class="card">
      <div class="ctitle">💾 داده و بکاپ</div>
      <p class="hint">همه‌ی اطلاعات فقط روی همین گوشی ذخیره می‌شه. هفته‌ای یک‌بار بکاپ بگیر.</p>
      <div class="row-btns"><button class="btn btn-soft" onclick="backupDownload()">⬇️ دانلود بکاپ</button><button class="btn btn-soft" onclick="backupCopy()">📋 کپی بکاپ</button></div>
      <label class="label mt">بازیابی از فایل</label>
      <input class="input" id="impFile" type="file" accept=".json,application/json" onchange="importFile(this)">
      <label class="label mt">یا چسباندن متن بکاپ</label>
      <textarea class="input" id="impText" rows="3" placeholder="متن بکاپ را اینجا بچسبان" dir="ltr"></textarea>
      <div class="row-btns"><button class="btn btn-ghost" onclick="importText()">بازیابی ⬆️</button></div>
    </section>
    <section class="card">
      <div class="ctitle">⚙️ نگهداری</div>
      <div class="setting-row"><span>داده‌ی نمونه</span><button class="btn btn-ghost btn-sm" onclick="loadDemo()">بارگذاری</button></div>
      <div class="setting-row"><span>به‌روزرسانی برنامه</span><button class="btn btn-ghost btn-sm" onclick="refreshApp()">پاک‌سازی کش</button></div>
      <div class="setting-row"><span>پاک کردن همه داده‌ها</span><button class="btn btn-danger btn-sm" onclick="resetAll()">پاک‌سازی</button></div>
    </section>
    <p class="foot">کارکرد نسخه ۲.۰ • ساخته‌شده توسط <a href="https://t.me/mmdGK" target="_blank" rel="noopener">mmdGK</a></p>`;
}

/* ─── صورت‌کار / فاکتور ─── */
function invoiceHTML(p, showMoney, detail) {
  const pr = p.prices;
  const st = projStats(p);
  const itemKeys = ITEM_KEYS.filter(k => p.entries.some(e => e[k] > 0));
  const hasH = p.entries.some(e => e.hours > 0);
  const head = `<tr><th>ردیف</th><th>تاریخ</th>${detail ? '<th>شرح</th>' : ''}<th>صفحه</th><th>متراژ</th><th>روکار</th>` +
    `${hasH ? '<th>ساعت</th>' : ''}${itemKeys.map(k => `<th>${ITEMS[k].label}</th>`).join('')}${showMoney ? '<th>مبلغ (تومان)</th>' : ''}</tr>`;
  const rows = p.entries.map((e, i) => {
    const a = entryAmount(e, pr);
    return `<tr><td>${faN(i + 1)}</td><td>${faD(e.date)}</td>${detail ? `<td>${esc(e.desc)}</td>` : ''}` +
      `<td>${e.pages ? faN(e.pages) : '—'}</td><td>${e.pages ? faN(e.pages * 3) : '—'}</td><td>${e.meter ? dec(e.meter) : '—'}</td>` +
      `${hasH ? `<td>${e.hours ? dec(e.hours) : '—'}</td>` : ''}` +
      `${itemKeys.map(k => `<td>${e[k] ? dec(e[k]) : '—'}</td>`).join('')}` +
      `${showMoney ? `<td>${a > 0 ? faN(a) : '—'}</td>` : ''}</tr>`;
  }).join('');
  const qty = [
    st.pages ? `${faN(st.pages)} صفحه (${faN(st.pages * 3)} متر)` : '',
    st.meter ? `${dec(st.meter)} متر روکار` : '',
    st.hours ? `${dec(st.hours)} ساعت` : '',
    ...itemKeys.map(k => `${dec(st.items[k])} ${ITEMS[k].label}`)
  ].filter(Boolean).join(' • ');
  return `<h1>صورت‌کار ${esc(p.name)}</h1>
    <div class="sub">${p.client ? esc(p.client) + ' • ' : ''}تاریخ تنظیم: ${faD(todayJ())}</div>
    <table><thead>${head}</thead><tbody>${rows || `<tr><td colspan="9">ثبتی نیست</td></tr>`}</tbody></table>
    <div class="inv-tot2">جمع کار: ${qty || '—'}</div>
    ${showMoney ? `<div class="inv-tot">مبلغ کل: ${st.priced ? faN(st.amount) + ' تومان' : 'نامعلوم'}</div>` : ''}
    <div class="inv-note">این صورت، مقادیر کار انجام‌شده است.</div>`;
}
