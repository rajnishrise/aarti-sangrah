/* Aarti Sangrah. Data comes from data/library.js (window.AARTI_DATA), which tools/build.py compiles from content/. */
'use strict';

/* ---------- Search normalisation ----------
   People type Hindi in Roman with no fixed spelling (jagdish / jagadish / jagdeesh).
   light(): lowercase, strip accents, fold long vowels.
   skel():  consonant skeleton — drops vowels and aspiration, folds m/n and v/b. */
function light(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z]+/g,' ').replace(/w/g,'v').replace(/z/g,'j').replace(/q/g,'k').replace(/f/g,'ph')
    .replace(/a{2,}/g,'a').replace(/e{2,}/g,'i').replace(/i{2,}/g,'i').replace(/o{2,}/g,'u').replace(/u{2,}/g,'u')
    .replace(/\s+/g,' ').trim();
}
function skel(s){
  return light(s).replace(/\Bh/g,'').replace(/x/g,'ks').replace(/[aeiouy ]/g,'')
    .replace(/m/g,'n').replace(/v/g,'b').replace(/(.)\1+/g,'$1');
}
/* word-aware skeleton: keeps word boundaries so matches can't straddle two words */
function skelW(s){ return light(s).split(' ').map(skel).filter(Boolean).join(' '); }
const wp = (hay, needle) => (' ' + hay).includes(' ' + needle);
function deva(s){
  return String(s||'').normalize('NFC').replace(/[\u200c\u200d\u093c]/g,'').replace(/\u0901/g,'\u0902')
    .replace(/[^\u0900-\u0963\u0966-\u097F]+/g,' ').replace(/\s+/g,' ').trim();
}
const STOP = new Set(['aarti','arti','arati','aarthi','arthi','ki','ka','ke','ji','shri','sri','shree','sree','maa','ma','mata','bhagwan','bhagavan','lyrics','lyric','hindi','song','bhajan','the','of','for','in','and','dev','deva']);
const DSTOP = new Set(['आरती','की','का','के','श्री','जी','माता','मां','भगवान']);

const D = window.AARTI_DATA;
const DEITIES = D.deities, KINDS = D.kinds, OCC = D.occasions, OCC_ORDER = D.occOrder,
  WEEKDAYS = D.weekdays, FESTS = D.fests, PRESETS = D.presets, TEXTS = D.texts, NAV = D.navratri;
const DEITY = Object.fromEntries(DEITIES.map(d => [d.id, d]));
const KIND = Object.fromEntries(KINDS.map(k => [k.id, k]));
const BY_ID = Object.fromEntries(TEXTS.map(t => [t.id, t]));
const DAY_DEITY = ['surya', 'shiv', 'hanuman', 'ganesh', 'vishnu', 'lakshmi', 'hanuman'];
const RITUAL = new Set(['daily', 'closing', 'morning', 'meals']);
const AUTH = {
  known: ['Known author', 'The author is historically documented.'],
  attributed: ['Attributed', 'Traditionally credited, usually through a signature line in the text, but not independently documented.'],
  traditional: ['Traditional', 'Author unknown; passed down in sung and printed tradition.']
};
const ISSUES = 'https://github.com/rajnishrise/aarti-sangrah/issues/new';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toDev = n => String(n).replace(/\d/g, x => '०१२३४५६७८९'[x]);
const lines = s => esc(s).split('\n').join('<br>');
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const store = {
  get(k, d) { try { const v = localStorage.getItem('aarti:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('aarti:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
/* meaning: 'en', 'hi', 'both' or 'off'. Older visits stored true or false. */
const MEANINGS = ['en', 'hi', 'both', 'off'];
const storedMeaning = store.get('meaning', 'both');
const state = {
  script: store.get('script', 'both'),
  meaning: storedMeaning === false ? 'off' : MEANINGS.includes(storedMeaning) ? storedMeaning : 'both',
  refrainFull: store.get('refrainFull', false),
  scale: store.get('scale', 1), favs: new Set(store.get('favs', []).filter(id => BY_ID[id])),
  puja: store.get('puja', []).filter(id => BY_ID[id] && BY_ID[id].kind !== 'granth'),
  filter: { kind: 'all', value: null }, query: '', view: null, step: -1, pujaMode: false, seqPos: -1,
  homeScroll: 0, pendingBrowse: false, startPuja: false
};
const TABS = [['all', 'सभी', 'All'], ['kind', 'प्रकार', 'Type'], ['deity', 'देवता', 'Deity'], ['occ', 'अवसर', 'Occasion'], ['day', 'वार', 'Day'], ['lang', 'भाषा', 'Language'], ['fav', '', 'Saved']];

const chapterOf = (g, n) => g.chapters.find(c => c.n === n);
const textHref = t => t.kind === 'granth' ? `#/granth/${t.id}` : `#/${t.kind}/${t.id}`;
const baseLang = t => t.language.split(' (')[0];
const kindLabel = t => t.form || KIND[t.kind].n;
const shortTitle = t => t.title.r.split(' (')[0];

/* ---- deity art: painting in a temple arch, with a marigold mala along the arch ---- */
const MALA_P = 'M1.5 64V50C1.5 27 21 15 38.5 9.4C44 7.6 48 4.8 50 2.2C52 4.8 56 7.6 61.5 9.4C79 15 98.5 27 98.5 50V64';
const MALA = `<svg class="mala" viewBox="-5 -7 110 154" aria-hidden="true" focusable="false">` +
  `<path d="${MALA_P}" fill="none" stroke="#B9480A" stroke-width="7.6" stroke-linecap="round" stroke-dasharray="0 9"/>` +
  `<path d="${MALA_P}" fill="none" stroke="#F28C12" stroke-width="5.8" stroke-linecap="round" stroke-dasharray="0 9"/>` +
  `<path d="${MALA_P}" fill="none" stroke="#FFC23A" stroke-width="5.8" stroke-linecap="round" stroke-dasharray="0 18" stroke-dashoffset="9"/>` +
  `<path d="${MALA_P}" fill="none" stroke="#FFE38A" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="0 9"/>` +
  `<path d="M1.5 66c3.6 4 3.6 10 0 15c-3.6-5-3.6-11 0-15zM98.5 66c3.6 4 3.6 10 0 15c-3.6-5-3.6-11 0-15z" fill="#3E7B34"/></svg>`;
const pos = d => d.img ? d.img.pos : '50% 25%';
function imgTag(d, alt, eager) {
  if (!d.img) return '';
  return `<img src="${esc(d.img.src)}" alt="${esc(alt || '')}"${eager ? '' : ' loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`;
}
function avatar(d, cls = '') {
  return `<span class="mono ${cls}" style="--c:${d.c};--pos:${pos(d)}" aria-hidden="true">${d.ini}${imgTag(d)}</span>`;
}
function arch(d, w, alt, eager) {
  return `<figure class="arch" style="--w:${w};--c:${d.c};--pos:${pos(d)}"><div class="arch-frame"><div class="arch-in">` +
    `<span class="fb" lang="hi">${d.ini}</span>${imgTag(d, alt, eager)}</div></div>${MALA}</figure>`;
}

/* ---- search: one unit per text, plus one per readable chapter of a granth ---- */
const UNITS = [];
function addUnit(t, ch, blocks, titleR, titleD, extra) {
  const d = DEITY[t.deity], k = KIND[t.kind];
  const kw = [d.n, d.label, ...d.aka, t.language, t.dialect, t.region, t.auth.t, t.title.en, k.n, k.pl, t.form, ...(extra || [])]
    .concat(t.occ.flatMap(o => [OCC[o].n, ...OCC[o].aka])).filter(Boolean);
  const withRef = !ch && t.refrain;
  const all = (withRef ? [t.refrain] : []).concat(blocks);
  UNITS.push({ t, ch, I: {
    tL: light(titleR), tS: skelW(titleR), tD: deva(titleD),
    kL: kw.map(light), kS: kw.map(skelW), kD: deva([d.d, ...(d.akaD || []), k.d, ...t.occ.map(o => OCC[o].d)].join(' ')),
    vL: all.map(b => light(b.r)), vS: all.map(b => skel(b.r)), vW: all.map(b => skelW(b.r)), vD: all.map(b => deva(b.d)),
    vMap: (withRef ? [-1] : []).concat(blocks.map((_, i) => i))
  } });
}
for (const t of TEXTS) {
  if (t.kind !== 'granth') { addUnit(t, null, t.verses, t.title.r + ' ' + t.title.en, t.title.d); continue; }
  const gk = t.kw || [];
  addUnit(t, null, [], t.title.r + ' ' + t.title.en, t.title.d, gk);
  for (const c of t.chapters) {
    if (c.verses) addUnit(t, c.n, c.verses, `${shortTitle(t)} chapter ${c.n} ${c.r} ${c.en}`, `${t.title.d} ${c.d}`, gk.concat(['adhyay ' + c.n]));
  }
}

/* Every query word must match somewhere: title, names and festivals, or the lyrics.
   A whole phrase inside a verse scores highest, so a half-remembered line finds its text. */
function search(q) {
  const out = [];
  if (/[\u0900-\u097F]/.test(q)) {
    const qn = deva(q), toks = qn.split(' ').filter(t => t && !DSTOP.has(t));
    for (const u of UNITS) {
      const I = u.I; let score = 0, hit = null, ok = true, inTitle = false;
      if (qn && I.tD.includes(qn)) { score += 120; inTitle = true; }
      if (qn.length >= 4 && !inTitle) { const vi = I.vD.findIndex(s => s.includes(qn)); if (vi > -1) { score += 60; hit = vi; } }
      for (const t of toks) {
        let s = 0;
        if (I.tD.includes(t)) s += 40;
        if (I.kD.includes(t)) s += 30;
        const vi = I.vD.findIndex(x => x.includes(t));
        if (vi > -1) { s += 10; if (hit == null && !inTitle) hit = vi; }
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok && score > 0) out.push({ a: u.t, ch: u.ch, hit: hit == null ? null : I.vMap[hit], score: score + (!u.ch && u.t.kind === 'granth' ? 10 : 0) });
    }
  } else {
    const ql = light(q), qs = skel(q), qw = skelW(q), toks = ql.split(' ').filter(t => t && !STOP.has(t));
    if (!ql) return [];
    for (const u of UNITS) {
      const I = u.I; let score = 0, hit = null, ok = true, inTitle = false;
      if (I.tL.includes(ql)) { score += 120; inTitle = true; }
      else if (qw.length >= 3 && wp(I.tS, qw)) { score += 80; inTitle = true; }
      if (!inTitle && (toks.length > 1 || (toks.length === 1 && toks[0].length >= 8))) {
        let vi = I.vL.findIndex(s => s.includes(ql));
        if (vi > -1) { score += 70; hit = vi; }
        else if (qs.length >= 5) { vi = I.vS.findIndex(s => s.includes(qs)); if (vi > -1) { score += 45; hit = vi; } }
      }
      for (const t of toks) {
        const ts = skel(t); let s = 0, tHit = false;
        if (wp(I.tL, t)) { s += 40; tHit = true; }
        else if ((ts.length >= 3 && wp(I.tS, ts)) || (' ' + I.tS + ' ').includes(' ' + ts + ' ')) { s += 25; tHit = true; }
        if (I.kL.some(k => (' ' + k + ' ').includes(' ' + t + ' ') || (t.length >= 4 && k.startsWith(t)))) s += 30;
        else if (ts.length >= 3 && I.kS.some(k => wp(k, ts))) s += 18;
        let vi = I.vL.findIndex(x => wp(x, t));
        if (vi === -1 && ts.length >= 3) vi = I.vW.findIndex(x => wp(x, ts));
        if (vi > -1) { s += 8; if (hit == null && !inTitle && !tHit) hit = vi; }
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok && (score > 0 || !toks.length)) out.push({ a: u.t, ch: u.ch, hit: hit == null ? null : I.vMap[hit], score: score + (!u.ch && u.t.kind === 'granth' ? 10 : 0) });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

/* ================= Home ================= */
const day0 = dt => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function fmt(dt) { try { return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return dt.toDateString(); } }
function linkChip(t) {
  return `<a class="lchip" href="${textHref(t)}">${avatar(DEITY[t.deity], 'xs')}<span lang="${t.lang}">${esc(t.title.d)}</span></a>`;
}

function renderToday() {
  const now = new Date(), t0 = day0(now), w = WEEKDAYS[now.getDay()], dd = DEITY[DAY_DEITY[now.getDay()]];
  let html = `<a class="ha" href="#/deity/${dd.id}" aria-label="${esc(dd.n)}: all texts">${arch(dd, 'clamp(104px,28vw,190px)', 'Painting of ' + dd.n, true)}</a>
    <div class="day"><p class="h-label" lang="hi">आज</p><h1 class="h-day" lang="hi">${w.d}</h1>
    <p class="h-line">${esc(w.n)}, traditionally ${esc(w.who)}’s day.</p>${w.note ? `<p class="h-note">${esc(w.note)}</p>` : ''}</div>
    <div class="h-links day-links">${w.ids.map(id => linkChip(BY_ID[id])).join('')}</div>`;
  const up = FESTS.map(f => { const s = pd(f.date); return { ...f, start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + (f.len || 1)) }; })
    .filter(f => f.end > t0).sort((a, b) => a.start - b.start);
  if (!up.length) {
    html += `<div class="fest"><p class="h-label">Festivals</p><p class="h-line">Next year’s festival dates haven’t been added yet.</p></div>`;
  } else {
    const f = up[0], o = OCC[f.occ], live = f.start <= t0, name = f.label || o.n;
    const days = Math.round((f.start - t0) / 864e5), dayN = Math.round((t0 - f.start) / 864e5) + 1;
    const when = live
      ? `<p class="h-label">Today’s festival</p><p class="f-name" lang="hi">${o.d}</p><p class="f-sub">${esc(name)}${f.len > 1 ? `, day ${dayN} of ${f.len}` : ''}</p>`
      : `<p class="h-label">Next festival</p><div class="f-when"><span class="f-num">${toDev(days)}</span><span>${days === 1 ? 'day to go' : 'days to go'}</span></div><p class="f-name" lang="hi">${o.d}</p><p class="f-sub">${esc(name)}, ${fmt(f.start)}</p>`;
    const more = up.slice(1, 5).map(g => `<li><a href="#/" data-filter="occ:${g.occ}" style="color:inherit">${esc(g.label || OCC[g.occ].n)}</a><span>${fmt(g.start)}</span></li>`).join('');
    const texts = TEXTS.filter(t => t.occ.includes(f.occ));
    const navLink = NAV && f.occ === NAV.occ ? `<a class="lchip nav" href="#/navratri${live ? '/' + dayN : ''}"><span class="nv-dot" lang="hi">${toDev(live ? dayN : 9)}</span><span>${live ? `Tonight: <span lang="hi">${NAV.days[dayN - 1].gd}</span>` : 'The nine nights'}</span></a>` : '';
    html += `<div class="fest">${when}${texts.length || navLink ? `<div class="h-links">${navLink}${texts.slice(0, navLink ? 5 : 99).map(linkChip).join('')}${navLink && texts.length > 5 ? `<a class="lchip more" href="#/navratri">+${texts.length - 5} more</a>` : ''}</div>` : ''}
      ${more ? `<details class="f-more"><summary>Coming up after that</summary><ul>${more}</ul></details>` : ''}
      <p class="f-fine">Dates follow a North Indian panchang and can differ by a day where you live.</p></div>`;
  }
  $('#today').innerHTML = html;
}

let galleryDone = false;
function renderGallery() {
  if (galleryDone) return;
  galleryDone = true;
  $('#darshan').innerHTML = DEITIES.filter(d => d.gallery !== false).map(d =>
    `<a class="dcard" href="#/deity/${d.id}">${arch(d, '100%')}<span class="dn" lang="hi">${d.d}</span><span class="en">${esc(d.n)}</span></a>`).join('');
  $('#shelfSub').textContent = `${TEXTS.length} texts so far, each with the Devanagari, a singable Roman version and the meaning of every verse.`;
}
function renderShelf() {
  $('#shelf').innerHTML = KINDS.map(k => {
    const n = TEXTS.filter(t => t.kind === k.id).length, on = state.filter.kind === 'kind' && state.filter.value === k.id;
    return `<a class="pothi" href="#/library/${k.id}"${on ? ' aria-current="true"' : ''}><span class="pd" lang="hi">${k.d}</span>
      <span><span class="pe">${esc(k.pl)}</span><span class="pn">${esc(k.note)}</span></span><span class="pc" aria-label="${n} texts">${toDev(n)}</span></a>`;
  }).join('');
}

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, dv, en]) =>
    `<button role="tab" type="button" data-kind="${k}" aria-selected="${state.filter.kind === k}">${dv ? `<span lang="hi">${dv}</span>` : ''}${en}</button>`).join('');
}
function chip(kind, val, label, n) {
  const on = state.filter.kind === kind && state.filter.value === val;
  return `<button class="chip" type="button" data-chip="${kind}:${val}" aria-pressed="${on}">${label}<span class="n">${n}</span></button>`;
}
function renderChips() {
  const k = state.filter.kind, today = new Date().getDay();
  let html = '';
  if (k === 'kind') html = KINDS.map(x => chip('kind', x.id, `${esc(x.pl)} <span class="dv" lang="hi">${x.d}</span>`, TEXTS.filter(t => t.kind === x.id).length)).join('');
  if (k === 'deity') html = DEITIES.map(d => chip('deity', d.id, `${avatar(d, 'xs')}${esc(d.label || d.n)} <span class="dv" lang="hi">${d.d}</span>`, TEXTS.filter(t => t.deity === d.id).length)).join('');
  if (k === 'occ') html = OCC_ORDER.filter(id => TEXTS.some(t => t.occ.includes(id))).map(id => chip('occ', id, `${esc(OCC[id].n)} <span class="dv" lang="hi">${OCC[id].d}</span>`, TEXTS.filter(t => t.occ.includes(id)).length)).join('');
  if (k === 'day') html = WEEKDAYS.map((w, i) => chip('day', String(i), `${w.n}${i === today ? ' (today)' : ''} <span class="dv" lang="hi">${w.d}</span>`, w.ids.length)).join('');
  if (k === 'lang') html = [...new Set(TEXTS.map(baseLang))].map(l => chip('lang', l, esc(l), TEXTS.filter(t => baseLang(t) === l).length)).join('');
  $('#chips').innerHTML = html;
  $('#chips').hidden = !html;
}

function currentList() {
  const q = state.query.trim();
  if (q) {
    const r = search(q);
    return { items: r, title: `${r.length} ${r.length === 1 ? 'match' : 'matches'} for “${q}”`,
      note: r.length ? 'Spellings are matched loosely, and lines from inside a text count too.' : 'Nothing matched. Try another spelling, a name like Bholenath or Bajrangbali, or a line you remember.' };
  }
  const { kind, value } = state.filter;
  let items = TEXTS, title = 'Everything', note = `All ${TEXTS.length} texts, aartis first.`;
  if (kind === 'kind' && value) { const k = KIND[value]; items = TEXTS.filter(t => t.kind === value); title = `${k.pl}, ${k.d}`; note = k.note; }
  else if (kind === 'deity' && value) { const d = DEITY[value]; items = TEXTS.filter(t => t.deity === value); title = `${d.label || d.n}, ${d.d}`; note = ''; }
  else if (kind === 'occ' && value) { const o = OCC[value]; items = TEXTS.filter(t => t.occ.includes(value)); title = `${o.n}, ${o.d}`; note = o.note || ''; }
  else if (kind === 'day' && value != null) { const w = WEEKDAYS[+value]; items = w.ids.map(id => BY_ID[id]); title = `${w.n}, ${w.d}`; note = `Traditionally ${w.who}’s day. ${w.note || ''} Customs vary between regions and families.`; }
  else if (kind === 'lang' && value) { items = TEXTS.filter(t => baseLang(t) === value); title = value; note = ''; }
  else if (kind === 'fav') { items = TEXTS.filter(t => state.favs.has(t.id)); title = 'Saved'; note = items.length ? 'Saved on this device.' : 'Tap “Save” on any text to keep it here.'; }
  else if (kind !== 'all') { title = 'Everything'; note = 'Choose one above to narrow the list.'; }
  return { items: items.map(a => ({ a, ch: null, hit: null })), title, note };
}

function rowHTML({ a, ch, hit }, devQuery) {
  const d = DEITY[a.deity];
  let tD = a.title.d, tR = a.title.r, href = textHref(a), meta, L = a.lang, blocks = a.verses;
  if (a.kind === 'granth' && ch) {
    const c = chapterOf(a, ch);
    tD = c.d; tR = `${shortTitle(a)}, chapter ${ch}: ${c.r}`; href = `#/granth/${a.id}/${ch}`; blocks = c.verses;
    meta = `Chapter ${ch}<br>${c.part ? `Verses ${c.part.from}–${c.part.to}` : `${c.count} verses`}`;
  } else if (a.kind === 'granth') {
    meta = `Granth<br>${a.chapters.filter(c => c.verses && !c.part).length} of ${a.chapters.length} chapters`;
  } else {
    meta = `${esc(kindLabel(a))}<br>${a.verses.length} ${a.verses.length === 1 ? 'verse' : 'verses'}`;
  }
  let snip = '';
  if (hit != null && blocks) {
    const v = hit === -1 ? a.refrain : blocks[hit];
    const label = hit === -1 ? 'Refrain' : (v.n ? v.n : 'Verse ' + (hit + 1));
    snip = `<span class="snip"${devQuery ? ` lang="${L}"` : ''}>${esc(label)}: ${esc((devQuery ? v.d : v.r).split('\n')[0])}</span>`;
    if (hit >= 0) href += '/' + hit;
  }
  return `<li><a class="row" href="${href}">${avatar(d)}<span class="t" lang="${L}">${esc(tD)}</span>
    <span class="meta">${meta}${state.favs.has(a.id) && !ch ? ' <span class="heart" aria-label="saved">♥</span>' : ''}</span>
    <span class="r">${esc(tR)}${baseLang(a) !== 'Hindi' && !ch ? ', ' + esc(a.language) : ''}</span>${snip}</a></li>`;
}
/* Navratri pages show up in search for the festival's name or a goddess of the nine nights. */
const NAV_WORDS = ['navratri', 'navaratri', 'navratra', 'navratre', 'navdurga', 'navadurga', 'nine nights', 'durga puja', 'garba'];
function navHits(q) {
  if (!NAV || !q.trim()) return [];
  const dev = /[\u0900-\u097F]/.test(q), qd = deva(q), ql = light(q), out = [];
  const hit = (r, d) => dev ? !!qd && (d.includes(qd) || qd.includes(d)) : ql.length >= 4 && (light(r).startsWith(ql) || ql.includes(light(r)));
  if (NAV_WORDS.some(w => hit(w, '')) || (dev && /नवरात्र|नवदुर्गा/.test(qd))) out.push(null);
  NAV.days.forEach(x => { if (hit(x.g, deva(x.gd))) out.push(x); });
  return out;
}
function navRowHTML(x) {
  const href = x ? `#/navratri/${x.n}` : '#/navratri';
  return `<li><a class="row nvrow" href="${href}"><span class="mono" style="--c:#A3121F" aria-hidden="true">${x ? toDev(x.n) : 'न'}</span>
    <span class="t" lang="hi">${x ? 'माँ ' + x.gd : NAV.d}</span><span class="meta">${x ? `Navratri<br>night ${x.n}` : 'Festival<br>9 nights'}</span>
    <span class="r">${x ? `${esc(x.g)}, ${esc(x.means.toLowerCase())}` : 'The nine nights: each goddess, her verse, and what to read'}</span></a></li>`;
}
function renderList() {
  const { items, title, note } = currentList(), devQ = /[\u0900-\u097F]/.test(state.query);
  $('#listTitle').textContent = title;
  $('#listNote').textContent = note;
  $('#list').innerHTML = navHits(state.query).map(navRowHTML).join('') + items.map(it => rowHTML(it, devQ)).join('');
}
function renderBrowse() { renderTabs(); renderChips(); renderList(); renderShelf(); }

/* ================= Pages: deity, granth, credits ================= */
const HOME_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 11 12 4l8.5 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9.6V20h4.4v-5.4h3.2V20H18V9.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
const THEME_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
const BACK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bar = (title, tools = '') => `<div class="rbar"><div class="wrap rbar-in">
  <div class="navbtns"><button class="btn bare nb" type="button" data-act="back" aria-label="Back">${BACK_ICON}<span>Back</span></button><a class="btn bare nb" href="#/" data-act="home" aria-label="Home">${HOME_ICON}<span>Home</span></a></div>
  <div class="rbar-t">${title}</div>${tools}</div><div class="progress" aria-hidden="true"><span id="prog"></span></div></div>`;
const groupHTML = (dv, en, rows) => `<section class="group"><h2><span class="dv" lang="hi">${dv}</span>${esc(en)}</h2><ul class="index">${rows}</ul></section>`;

function renderDeityPage(d) {
  const texts = TEXTS.filter(t => t.deity === d.id);
  const days = DAY_DEITY.map((x, i) => x === d.id ? WEEKDAYS[i].n : null).filter(Boolean);
  const fests = [...new Set(texts.flatMap(t => t.occ))].filter(o => !RITUAL.has(o)).map(o => `<a href="#/" data-filter="occ:${o}">${esc(OCC[o].n)}</a>`);
  const facts = [days.length ? `Worshipped especially on ${days.join(' and ')}.` : '', fests.length ? `Festivals: ${fests.join(', ')}.` : ''].join(' ').trim();
  const credit = d.img ? `<p class="credit">Painting: ${esc(d.img.cap)}, ${esc(d.img.by)}. Public domain, <a href="${esc(d.img.page)}" target="_blank" rel="noopener">via Wikimedia Commons</a>.</p>` : '';
  const groups = KINDS.map(k => { const ts = texts.filter(t => t.kind === k.id); return ts.length ? groupHTML(k.d, k.pl, ts.map(t => rowHTML({ a: t, ch: null, hit: null })).join('')) : ''; }).join('');
  $('#reader').innerHTML = bar(`<span lang="hi">${d.d}</span>`) + `<div class="page">
    <header class="dp-head">${arch(d, 'clamp(150px,46vw,230px)', 'Painting of ' + d.n, true)}<div>
      <h1 class="dp-name" lang="hi">${d.d}</h1>
      <p class="dp-en">${esc(d.label || d.n)}${d.akaD && d.akaD.length ? `, also called <span lang="hi">${d.akaD.join(', ')}</span>` : ''}</p>
      <p class="dp-about">${esc(d.about)}</p>${facts ? `<p class="dp-facts">${facts}</p>` : ''}${credit}
      ${NAV && d.id === 'durga' ? `<p class="dp-cta"><a class="btn solid" href="#/navratri">Navratri: the nine nights</a><a class="btn" href="#/granth/durga-saptashati">Durga Saptashati</a></p>` : ''}</div></header>
    ${groups || '<p class="empty">No texts for this deity yet.</p>'}</div>`;
}

function renderGranthPage(g) {
  const full = g.chapters.filter(c => c.verses && !c.part).length, parts = g.chapters.filter(c => c.part);
  const rows = g.chapters.map(c => {
    const inner = `<span class="cn">${toDev(c.n)}</span><span class="cd" lang="sa">${c.d}</span><span class="ce">${esc(c.r)}: ${esc(c.en)}</span>`;
    const sum = c.sum ? `<details class="ch-sum"><summary>${c.verses ? 'The story of this chapter' : 'What happens in this chapter'}</summary><p>${esc(c.sum)}</p></details>` : '';
    const row = !c.verses ? `<div class="ch soon">${inner}<span class="cs">${c.count} verses<br>In preparation</span></div>`
      : c.part ? `<a class="ch" href="#/granth/${g.id}/${c.n}">${inner}<span class="cs">Verses ${c.part.from}–${c.part.to}<br><span class="part">of ${c.count}</span></span></a>`
      : `<a class="ch" href="#/granth/${g.id}/${c.n}">${inner}<span class="cs">${c.count} verses</span></a>`;
    return `<li>${row}${sum}</li>`;
  }).join('');
  const d = DEITY[g.deity];
  const status = `${full} of ${g.chapters.length} chapters are ready to read${parts.length ? `, with part of chapter ${parts.map(c => c.n).join(' and ')}` : ''}.`;
  $('#reader').innerHTML = bar(`<span lang="sa">${g.title.d}</span>`) + `<div class="page">
    <header class="dp-head">${arch(d, 'clamp(130px,40vw,200px)', 'Painting of ' + (d.label || d.n), true)}<div>
      <p class="kind">Granth</p><h1 class="dp-name" lang="sa">${g.title.d}</h1>
      <p class="dp-en">${esc(g.title.r)}: ${esc(g.title.en)}</p><p class="dp-about">${esc(g.when)}</p>
      <p class="dp-facts">${esc(g.auth.t)}. ${esc(g.notes || '')}</p></div></header>
    <section class="group"><h2><span class="dv" lang="hi">अध्याय</span>Chapters</h2>
      <p class="dp-facts">${status}</p><ol class="chapters">${rows}</ol></section></div>`;
}

function renderCredits() {
  const rows = DEITIES.filter(d => d.img).map(d =>
    `<li><a class="row" href="${esc(d.img.page)}" target="_blank" rel="noopener">${avatar(d)}<span class="t" lang="hi">${d.d}</span><span class="meta">${esc(d.img.by)}</span><span class="r">${esc(d.img.cap)}</span></a></li>`).join('');
  $('#reader').innerHTML = bar('Image credits') + `<div class="page">
    <h1 class="dp-name" lang="hi">चित्र आभार</h1>
    <p class="dp-about">The paintings are public-domain works, most by Raja Ravi Varma (1848–1906) and the Ravi Varma Press, shown from Wikimedia Commons. Each one links to its page there. The marigolds, lotuses and arches are original artwork made for this site.</p>
    <ul class="index" style="margin-top:18px">${rows}</ul>
    <p class="dp-about" style="margin-top:22px">The texts are traditional and in the public domain. The Roman versions and the English and Hindi meanings were written for this site.</p></div>`;
}


/* ================= Navratri ================= */
/* The nine nights come from core.json (navratri) and the festival dates (fests). */
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
function navSeason() {
  if (!NAV) return null;
  const t0 = day0(new Date());
  const runs = FESTS.filter(f => f.occ === NAV.occ).map(f => { const s = pd(f.date); return { f, start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + (f.len || 9)) }; })
    .sort((a, b) => a.start - b.start);
  if (!runs.length) return null;
  const r = runs.find(x => x.end > t0) || runs[runs.length - 1];
  const dayN = Math.floor((t0 - r.start) / 864e5) + 1;
  const live = dayN >= 1 && dayN <= 9;
  const until = Math.round((r.start - t0) / 864e5);
  return { ...r, live, dayN: live ? dayN : null, until, soon: until > 0 && until <= 45, justAfter: dayN === 10 };
}
const nightDate = (se, n) => se ? new Date(se.start.getFullYear(), se.start.getMonth(), se.start.getDate() + n - 1) : null;
function readHref(r) {
  const t = BY_ID[r.id];
  if (r.ch) {
    const c = chapterOf(t, r.ch), i = r.at ? c.verses.findIndex(v => v.n === r.at) : -1;
    return `#/granth/${t.id}/${r.ch}${i > -1 ? '/' + i : ''}`;
  }
  return textHref(t) + (r.v != null ? '/' + r.v : '');
}
function readRow(r) {
  const t = BY_ID[r.id], d = DEITY[t.deity], c = r.ch ? chapterOf(t, r.ch) : null;
  const tD = c ? c.d : t.title.d, tR = c ? `${shortTitle(t)}, chapter ${r.ch}${c.part ? ` (verses ${c.part.from}–${c.part.to})` : ''}` : t.title.r;
  return `<li><a class="row" href="${readHref(r)}">${avatar(d)}<span class="t" lang="${t.lang}">${esc(tD)}</span>
    <span class="meta">${esc(c ? 'Granth' : kindLabel(t))}</span><span class="r">${esc(tR)}</span><span class="why">${esc(r.why)}</span></a></li>`;
}
function nightStrip(se, cur) {
  return `<ol class="nights${cur ? ' row' : ''}" aria-label="The nine nights">${NAV.days.map(x => {
    const dt = nightDate(se, x.n), tonight = se && se.live && se.dayN === x.n, past = se && se.live && x.n < se.dayN;
    return `<li><a class="night${tonight ? ' tonight' : ''}${past ? ' past' : ''}" href="#/navratri/${x.n}"${cur === x.n ? ' aria-current="page"' : ''}>
      <span class="nn" lang="hi">${toDev(x.n)}</span><span class="ng" lang="hi">${x.gd}</span><span class="ne">${esc(x.g)}</span>
      ${dt ? `<span class="nd">${tonight ? 'Tonight' : esc(fmt(dt))}</span>` : ''}</a></li>`;
  }).join('')}</ol>`;
}
function navStatus(se) {
  if (!se) return 'Dates for the next Navratri haven’t been added yet.';
  const range = `${fmt(se.start)} to ${fmt(nightDate(se, 9))}`;
  if (se.live) { const x = NAV.days[se.dayN - 1]; return `Tonight is the ${ORD[se.dayN]} night, for Maa ${x.g}. ${range}.`; }
  if (se.until > 0) return `Begins in ${se.until} ${se.until === 1 ? 'day' : 'days'}: ${range}.`;
  return `This year’s Navratri was ${range}.`;
}
function renderNavratri(n) {
  const se = navSeason(), x = n ? NAV.days[n - 1] : null, durga = DEITY.durga;
  const head = `<header class="nv-hero${n ? ' compact' : ''}"><div class="toran" aria-hidden="true"></div><div class="nv-in">
      ${n ? '' : arch(durga, 'clamp(110px,30vw,170px)', 'Painting of Maa Durga', true)}
      <div><p class="nv-kicker">${esc(NAV.tag)}</p><h1 class="nv-title" lang="hi">${NAV.d}</h1>
      <p class="nv-en">${esc(NAV.n)}</p><p class="nv-status">${esc(navStatus(se))}</p>
      ${n ? '<a class="btn ghost" href="#/navratri">About the festival</a>' : (se && se.live ? `<a class="btn gold" href="#/navratri/${se.dayN}">Tonight: <span lang="hi">${NAV.days[se.dayN - 1].gd}</span></a>` : '')}
      </div></div></header>`;
  let body;
  if (x) {
    const dh = BY_ID['navdurga-dhyan'], dr = x.read.find(r => r.id === 'navdurga-dhyan'), v = dr ? dh.verses[dr.v] : null, dt = nightDate(se, x.n);
    const prev = n > 1 ? NAV.days[n - 2] : null, next = n < 9 ? NAV.days[n] : null;
    body = `<section class="nv-day">
      <p class="kind">${esc(x.tithi)}, <span lang="hi">${x.td}</span>${dt ? ` · ${esc(fmt(dt))}` : ''}</p>
      <h2 class="nv-g"><span class="nv-num" lang="hi">${toDev(x.n)}</span><span lang="hi">माँ ${x.gd}</span></h2>
      <p class="nv-means">${esc(x.g)}: ${esc(x.means)}</p>
      <p>${esc(x.about)}</p>
      <dl class="facts nv-facts"><div><dt>Her form</dt><dd>${esc(x.look)}</dd></div><div><dt>Offering</dt><dd>${esc(x.offer)} Customs vary from family to family.</dd></div></dl>
      ${v ? `<div class="dhyan s-${state.script} m-${state.meaning}"><p class="dh-l"><span lang="hi">ध्यान मन्त्र</span> Meditation verse</p>
        <p class="dev" lang="sa">${lines(v.d)}</p><p class="rom" lang="sa-Latn">${lines(v.r)}</p>
        ${v.m ? `<p class="mean">${esc(v.m)}</p>` : ''}${v.h ? `<p class="mean-hi" lang="hi">${esc(v.h)}</p>` : ''}
        <a class="btn" href="${readHref(dr)}">Open in the reader</a></div>` : ''}
      <h3 class="sec-h"><span class="dv" lang="hi">आज का पाठ</span>Read and sing tonight</h3>
      <ul class="index">${x.read.filter(r => r !== dr).map(readRow).join('')}</ul>
      <nav class="chnav" aria-label="Nights">${prev ? `<a class="btn" href="#/navratri/${n - 1}">← <span lang="hi">${prev.gd}</span></a>` : '<span></span>'}
        <a class="btn" href="#/navratri">All nine nights</a>${next ? `<a class="btn" href="#/navratri/${n + 1}"><span lang="hi">${next.gd}</span> →</a>` : `<a class="btn" href="#/" data-filter="occ:${NAV.after.occ}">${esc(OCC[NAV.after.occ].n)} →</a>`}</nav>
    </section>`;
  } else {
    const texts = TEXTS.filter(t => t.occ.includes(NAV.occ));
    const groups = KINDS.map(k => { const ts = texts.filter(t => t.kind === k.id); return ts.length ? groupHTML(k.d, k.pl, ts.map(t => rowHTML({ a: t, ch: null, hit: null })).join('')) : ''; }).join('');
    body = `<section class="nv-about">${NAV.about.map(p => `<p>${esc(p)}</p>`).join('')}</section>
      <section class="group"><h2><span class="dv" lang="hi">परम्परा</span>How it is kept</h2>
        <div class="customs">${NAV.customs.map(c => `<div class="custom"><h3><span lang="hi">${c.d}</span>${esc(c.n)}</h3><p>${esc(c.t)}</p></div>`).join('')}</div></section>
      <section class="group nv-puja"><h2><span class="dv" lang="hi">पूजा क्रम</span>An evening puja order</h2>
        <p class="dp-facts">Ganesh aarti, Durga Chalisa, Jai Ambe Gauri and Karpur Gauram, the order many North Indian homes follow. Begin puja opens each in turn in puja mode.</p>
        <button class="btn solid" type="button" data-act="navpuja">Begin Navratri puja</button></section>
      ${groups}
      <section class="group"><h2><span class="dv" lang="hi">विजयादशमी</span>The tenth day</h2><p class="dp-about">${esc(NAV.after.t)}</p></section>`;
  }
  $('#reader').innerHTML = bar(`<span lang="hi">नवरात्रि</span>${n ? ` · <span lang="hi">${x.gd}</span>` : ''}`) + `<div class="page nv">${head}
    <section class="group"><h2><span class="dv" lang="hi">नौ रातें</span>The nine nights</h2>${nightStrip(se, n)}</section>${body}</div>`;
}
function navBanner() {
  const se = navSeason(), box = $('#navratri');
  if (!se || !(se.live || se.soon)) { box.hidden = true; $('#festBtn').hidden = true; return; }
  const x = se.live ? NAV.days[se.dayN - 1] : NAV.days[0];
  box.hidden = false; $('#festBtn').hidden = false;
  box.innerHTML = `<div class="wrap nb-in">
    <div class="nb-text"><p class="nv-kicker">${se.live ? `Navratri · night ${se.dayN} of 9` : `Navratri begins in ${se.until} ${se.until === 1 ? 'day' : 'days'}`}</p>
      <h2 class="nb-title"><span lang="hi">${se.live ? 'माँ ' + x.gd : NAV.d}</span></h2>
      <p class="nb-sub">${se.live ? `${esc(x.g)}, ${esc(x.means.toLowerCase())}. ${esc(x.about.split('. ')[0])}.` : 'A page for each of the nine nights, with the goddess of the night, her meditation verse, and the aartis, chalisa and Durga Saptashati to read.'}</p>
      <div class="nb-acts"><a class="btn gold" href="#/navratri/${x.n}">${se.live ? 'Tonight’s puja' : 'The first night'}</a><a class="btn ghost" href="#/navratri">All nine nights</a><a class="btn ghost" href="#/granth/durga-saptashati">Durga Saptashati</a></div></div>
    <ol class="nb-dots" aria-hidden="true">${NAV.days.map(d => `<li class="${se.live && d.n === se.dayN ? 'on' : se.live && d.n < se.dayN ? 'done' : ''}"><span lang="hi">${toDev(d.n)}</span></li>`).join('')}</ol></div>`;
}

/* ================= Reader ================= */
function blockHTML(v, label, cls, dv, L) {
  const spNo = v.sp && v.sp.no ? `<span class="spn" aria-hidden="true"> ॥${toDev(v.sp.no)}॥</span>` : '';
  const sp = v.sp ? `<p class="sp"><span class="spd" lang="${L}">${esc(v.sp.d)}${spNo}</span><span class="spr">${esc(v.sp.r)}</span></p>` : '';
  return `<div class="step ${cls}" data-v="${dv}" tabindex="0"><span class="vn" aria-hidden="true">${esc(label)}</span><div>${sp}
    <p class="dev" lang="${L}">${lines(v.d)}</p><p class="rom" lang="${L}-Latn">${lines(v.r)}</p>${v.m ? `<p class="mean">${esc(v.m)}</p>` : ''}${v.h ? `<p class="mean-hi" lang="hi">${esc(v.h)}</p>` : ''}</div></div>`;
}
function versesHTML(a, ch) {
  const L = a.lang, out = [];
  if (ch) { chapterOf(a, ch).verses.forEach((v, i) => out.push(blockHTML(v, v.n || toDev(i + 1), 'verse', i, L))); return out.join(''); }
  const cd = a.refrain ? a.refrain.d.split(/[,।\n]/)[0].trim() : '', cr = a.refrain ? a.refrain.r.split(/[,.\n]/)[0].trim() : '';
  const ref = () => state.refrainFull ? blockHTML(a.refrain, '॥', 'ref', -1, L)
    : `<div class="step chip-r" data-v="r" tabindex="0" aria-label="Refrain"><p class="dev" lang="${L}">॥ ${esc(cd)} ॥</p><p class="rom">${esc(cr)}</p></div>`;
  if (a.refrain && a.refrainFirst) out.push(blockHTML(a.refrain, '॥', 'ref', -1, L));
  let k = 0;
  a.verses.forEach((v, i) => { out.push(blockHTML(v, v.n || toDev(++k), 'verse', i, L)); if (a.refrain) out.push(ref()); });
  return out.join('');
}
function labelWidth(a, ch) {
  const vs = ch ? chapterOf(a, ch).verses : a.verses;
  const m = Math.max(...vs.map((v, i) => (v.n || toDev(i + 1)).length));
  return m > 6 ? '5.2em' : m > 4 ? '4.4em' : m > 3 ? '3.9em' : m > 2 ? '3.2em' : m > 1 ? '2.6em' : '2.2em';
}
function aboutHTML(a, c) {
  const d = DEITY[a.deity], b = AUTH[a.auth.c];
  const occ = a.occ.map(o => `<a class="occ" href="#/" data-filter="occ:${o}">${esc(OCC[o].n)}</a>`).join(' ');
  const fix = `${ISSUES}?title=${encodeURIComponent('Correction: ' + a.title.r + (c ? ', chapter ' + c.n : ''))}`;
  return `<h2 class="sec-h"><span class="dv" lang="hi">परिचय</span>About this ${a.kind === 'granth' ? 'granth' : 'text'}</h2>
  <dl class="facts">
    <div><dt>Deity</dt><dd><a href="#/deity/${d.id}">${esc(d.label || d.n)}</a> <span lang="hi">${d.d}</span></dd></div>
    <div><dt>Form</dt><dd>${esc(kindLabel(a))}</dd></div>
    <div><dt>Language</dt><dd>${esc(a.language)}${a.dialect ? ` (${esc(a.dialect)})` : ''}</dd></div>
    <div><dt>Tradition</dt><dd>${esc(a.region)}</dd></div>
    <div><dt>Author</dt><dd>${esc(a.auth.t)} <span class="badge b-${a.auth.c}" title="${esc(b[1])}">${b[0]}</span></dd></div>
    <div><dt>${a.kind === 'granth' ? 'Read on' : 'Sung on'}</dt><dd>${occ}</dd></div>
  </dl>
  <h3>${a.kind === 'granth' ? 'Reading it' : 'When it’s sung'}</h3><p>${esc(a.when)}</p>
  ${a.notes ? `<h3>Variants and notes</h3><p>${esc(a.notes)}</p>` : ''}
  <p class="proof">This text is still being proofread against printed editions. Spotted a mistake? <a href="${fix}" target="_blank" rel="noopener">Report it on GitHub</a>.</p>`;
}
function related(a) {
  return TEXTS.filter(b => b.id !== a.id && b.kind !== 'granth')
    .map(b => ({ b, s: (b.deity === a.deity ? 3 : 0) + b.occ.filter(o => a.occ.includes(o) && !RITUAL.has(o)).length }))
    .filter(x => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 4).map(x => ({ a: x.b, ch: null, hit: null }));
}
const nextInSeq = () => state.seqPos >= 0 && state.puja[state.seqPos + 1] ? BY_ID[state.puja[state.seqPos + 1]] : null;

function renderReader(a, ch) {
  const d = DEITY[a.deity], c = ch ? chapterOf(a, ch) : null, fav = state.favs.has(a.id), inP = state.puja.includes(a.id);
  const nx = c ? null : nextInSeq(), rel = c ? [] : related(a);
  const tD = c ? c.d : a.title.d, tR = c ? `${a.title.r}, chapter ${ch}: ${c.r}` : a.title.r;
  const kindLine = c ? `Chapter ${ch} of ${a.chapters.length}${c.part ? `, verses ${c.part.from} to ${c.part.to}` : ''}, <span lang="sa">${a.title.d}</span>`
    : d.id === 'ishvar' ? `${esc(kindLabel(a))}, a universal prayer` : `${esc(kindLabel(a))} of ${esc(d.n)}, <span lang="hi">${d.d}</span>`;
  const seqLbl = state.seqPos >= 0 && !c ? `<small>Puja ${state.seqPos + 1} of ${state.puja.length}</small>` : '';
  const ready = c ? a.chapters.filter(x => x.verses) : [];
  const prev = c ? ready.filter(x => x.n < ch).pop() : null, next = c ? ready.find(x => x.n > ch) : null;
  const chnav = c ? `<nav class="chnav" aria-label="Chapters">${prev ? `<a class="btn" href="#/granth/${a.id}/${prev.n}">Chapter ${prev.n}</a>` : '<span></span>'}
    <a class="btn" href="#/granth/${a.id}">All chapters</a>${next ? `<a class="btn" href="#/granth/${a.id}/${next.n}">Chapter ${next.n}</a>` : '<span></span>'}</nav>` : '';
  const tools = `<div class="tools" role="toolbar" aria-label="Reading options">
      <div class="seg" role="group" aria-label="Script">
        <button type="button" data-script="dev" aria-pressed="${state.script === 'dev'}" aria-label="Devanagari only"><span class="dv" lang="hi">अ</span></button>
        <button type="button" data-script="both" aria-pressed="${state.script === 'both'}" aria-label="Devanagari and Roman"><span class="dv" lang="hi">अ</span>+A</button>
        <button type="button" data-script="rom" aria-pressed="${state.script === 'rom'}" aria-label="Roman only">A</button>
      </div>
      <div class="seg" role="group" aria-label="Meaning">
        <span class="seg-l" aria-hidden="true">Meaning</span>
        <button type="button" data-mean="en" aria-pressed="${state.meaning === 'en'}" aria-label="English meaning">EN</button>
        <button type="button" data-mean="hi" aria-pressed="${state.meaning === 'hi'}" aria-label="Hindi meaning"><span class="dv" lang="hi">हिंदी</span></button>
        <button type="button" data-mean="both" aria-pressed="${state.meaning === 'both'}" aria-label="English and Hindi meaning">EN+<span class="dv" lang="hi">हि</span></button>
        <button type="button" data-mean="off" aria-pressed="${state.meaning === 'off'}" aria-label="Hide meanings">Off</button>
      </div>
      ${a.refrain && !c ? `<button class="btn" type="button" data-act="refrain" aria-pressed="${state.refrainFull}" title="Show the whole refrain after every verse">Full refrain</button>` : ''}
      <div class="seg" role="group" aria-label="Text size"><button type="button" data-act="smaller" aria-label="Smaller text">A−</button><button type="button" data-act="bigger" aria-label="Larger text">A+</button></div>
      <button class="btn bare themeb" type="button" data-act="theme" aria-label="Switch light or dark">${THEME_ICON}</button>
      <button class="btn solid" type="button" data-act="puja">${state.pujaMode ? 'Leave puja mode' : 'Puja mode'}</button>
    </div>`;
  $('#reader').innerHTML = bar(`<span lang="${a.lang}">${esc(tD)}</span>${seqLbl}`, tools) + `
  <article id="art" class="s-${state.script} m-${state.meaning}">
    <header class="a-head">
      <a class="ah-arch" href="#/deity/${d.id}" aria-label="${esc(d.label || d.n)}: all texts">${arch(d, 'clamp(70px,17vw,100px)')}</a>
      <p class="kind">${kindLine}</p>
      <h1 lang="${a.lang}">${esc(tD)}</h1>
      <p class="a-rom">${esc(tR)}</p>
      <div class="acts">
        <button class="btn" type="button" data-act="fav" aria-pressed="${fav}">${fav ? '♥ Saved' : '♡ Save'}</button>
        ${c ? '' : `<button class="btn" type="button" data-act="addpuja" aria-pressed="${inP}">${inP ? '✓ In my puja' : 'Add to my puja'}</button>`}
        <button class="btn" type="button" data-act="share">Share</button>
        <button class="btn" type="button" data-act="print">Print</button>
      </div>
    </header>
    ${c && c.intro ? `<p class="intro">${esc(c.intro)}</p>` : ''}
    ${c && c.excerpt ? `<p class="intro excerpt"><strong>Part of this chapter.</strong> ${esc(c.excerpt)}</p>` : ''}
    <div class="verses" id="verses" style="--lw:${labelWidth(a, ch)}">${versesHTML(a, ch)}</div>
    ${nx ? `<div class="seqnext"><button class="btn solid" type="button" data-act="nextaarti">Next in my puja: <span lang="${nx.lang}">${esc(nx.title.d)}</span></button></div>` : ''}
    <div class="offer"><svg class="lotus" aria-hidden="true"><use href="#kamal"/></svg>
      <button class="btn flower" type="button" data-act="offer"><svg aria-hidden="true"><use href="#genda"/></svg><span lang="hi">पुष्प अर्पित करें</span> Offer flowers</button></div>
    ${chnav}
    <section class="about">${aboutHTML(a, c)}</section>
    ${rel.length ? `<section class="related"><h2 class="sec-h"><span class="dv" lang="hi">और भी</span>Sung alongside</h2><ul class="index">${rel.map(x => rowHTML(x)).join('')}</ul></section>` : ''}
  </article>`;
}

/* ================= Utilities ================= */
const root = document.documentElement;
function applyTheme(t) { if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme'); }
function isDark() { const t = root.getAttribute('data-theme'); return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
function toggleTheme() { const t = isDark() ? 'light' : 'dark'; applyTheme(t); store.set('theme', t); }
function applyScale(s) { state.scale = Math.round(Math.min(2.2, Math.max(0.8, s)) * 100) / 100; root.style.setProperty('--scale', state.scale); store.set('scale', state.scale); }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function savePuja() { store.set('puja', state.puja); $('#pujaCount').textContent = state.puja.length || ''; }

/* pushpanjali: a shower of marigold, rose and jasmine petals */
function offerFlowers() {
  toast('पुष्प अर्पित · Flowers offered');
  if (reduceMotion || document.querySelector('.petals')) return;
  const colors = ['#E8660C', '#F59A1B', '#FFC23A', '#C81E3A', '#F4A3BE', '#FFF4E0'];
  let html = '';
  for (let i = 0; i < 34; i++) {
    const s = 0.7 + Math.random() * 0.8;
    html += `<svg class="petal" viewBox="0 0 16 20" style="left:${(Math.random() * 100).toFixed(1)}%;width:${(16 * s).toFixed(1)}px;height:${(20 * s).toFixed(1)}px;` +
      `color:${colors[i % colors.length]};--d:${(2.6 + Math.random() * 2).toFixed(2)}s;--delay:${(Math.random() * 1.3).toFixed(2)}s;` +
      `--x:${Math.round((Math.random() * 2 - 1) * 120)}px;--r:${Math.round((Math.random() * 2 - 1) * 720)}deg"><use href="#petal"/></svg>`;
  }
  const box = document.createElement('div');
  box.className = 'petals'; box.setAttribute('aria-hidden', 'true'); box.innerHTML = html;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 5600);
}

/* ================= Routing ================= */
const navStack = [];
function trackNav() {
  const h = location.hash || '#/';
  if (navStack.length > 1 && navStack[navStack.length - 2] === h) navStack.pop();
  else if (navStack[navStack.length - 1] !== h) navStack.push(h);
}
function goBack() { if (navStack.length > 1) history.back(); else location.hash = '#/'; }

function route() {
  trackNav();
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!p.length) return showHome();
  const [a, b, c, d] = p;
  if (a === 'deity' && DEITY[b]) return openView({ type: 'deity', id: b });
  if (a === 'credits') return openView({ type: 'credits' });
  if (a === 'navratri' && NAV) { const n = Number(b); return openView({ type: 'navratri', n: n >= 1 && n <= 9 ? n : null }); }
  if (a === 'library' && KIND[b]) { state.filter = { kind: 'kind', value: b }; clearQuery(); state.pendingBrowse = true; return showHome(); }
  if (a === 'granth' && BY_ID[b]) {
    const n = Number(c);
    if (c && chapterOf(BY_ID[b], n) && chapterOf(BY_ID[b], n).verses) return openView({ type: 'text', id: b, ch: n, verse: d != null ? Number(d) : null });
    return openView({ type: 'granth', id: b });
  }
  const id = BY_ID[b] ? b : BY_ID[a] ? a : null, v = BY_ID[b] ? c : b;
  if (id) {
    if (BY_ID[id].kind === 'granth') return openView({ type: 'granth', id });
    return openView({ type: 'text', id, verse: v != null && v !== '' ? Number(v) : null });
  }
  showHome();
}
function showHome() {
  const was = document.body.classList.contains('reading');
  if (state.pujaMode) setPuja(false);
  state.view = null; state.seqPos = -1;
  document.body.classList.remove('reading');
  $('#reader').hidden = true; $('#reader').innerHTML = '';
  document.title = 'आरती संग्रह · Aarti Sangrah';
  renderToday(); navBanner(); renderGallery(); renderBrowse();
  if (state.pendingBrowse) { state.pendingBrowse = false; requestAnimationFrame(scrollToBrowse); }
  else if (was) requestAnimationFrame(() => window.scrollTo(0, state.homeScroll));
}
function scrollToBrowse() {
  const y = $('#browse').getBoundingClientRect().top + window.scrollY - $('.top').offsetHeight;
  window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? 'auto' : 'smooth' });
}
function openView(v) {
  if (!document.body.classList.contains('reading')) state.homeScroll = window.scrollY;
  if (state.pujaMode && v.type !== 'text') setPuja(false);
  state.view = v; state.step = -1;
  document.body.classList.add('reading');
  $('#reader').hidden = false;
  if (v.type === 'deity') { const d = DEITY[v.id]; renderDeityPage(d); document.title = `${d.d} · ${d.label || d.n}: aartis, mantras and bhajans | Aarti Sangrah`; }
  else if (v.type === 'granth') { const g = BY_ID[v.id]; renderGranthPage(g); document.title = `${g.title.d} · ${g.title.r} | Aarti Sangrah`; }
  else if (v.type === 'credits') { renderCredits(); document.title = 'Image credits | Aarti Sangrah'; }
  else if (v.type === 'navratri') { renderNavratri(v.n); const cur = $('.nights.row [aria-current]'); if (cur) cur.parentNode.parentNode.scrollLeft = Math.max(0, cur.parentNode.offsetLeft - 40); const x = v.n ? NAV.days[v.n - 1] : null; document.title = x ? `Navratri night ${v.n}: ${x.gd} · Maa ${x.g} | Aarti Sangrah` : `${NAV.d} · Navratri: the nine nights, aartis and Durga Saptashati | Aarti Sangrah`; }
  else {
    const a = BY_ID[v.id];
    if (!v.ch && state.seqPos >= 0 && state.puja[state.seqPos] !== a.id) state.seqPos = state.puja.indexOf(a.id);
    renderReader(a, v.ch);
    const c = v.ch ? chapterOf(a, v.ch) : null;
    document.title = c ? `${a.title.r} ${v.ch}: ${c.r}, with meaning | Aarti Sangrah` : `${a.title.d} · ${a.title.r}, with meaning | Aarti Sangrah`;
  }
  window.scrollTo(0, 0);
  const rd = $('#reader'); rd.classList.remove('enter'); void rd.offsetWidth; rd.classList.add('enter');
  if (v.type !== 'text') return;
  if (v.verse != null && !Number.isNaN(v.verse)) {
    const i = $$('#verses .step').findIndex(s => s.dataset.v === String(v.verse));
    if (i > -1) setStep(i, true);
  } else if (state.pujaMode) setStep(0, false);
  updatePctl();
  if (state.startPuja) { state.startPuja = false; setPuja(true); }
}

/* ================= Puja mode ================= */
function setStep(i, scroll) {
  const s = $$('#verses .step'); if (!s.length) return;
  i = Math.max(0, Math.min(s.length - 1, i));
  s.forEach((el, k) => el.classList.toggle('current', k === i));
  state.step = i;
  if (scroll) s[i].scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  updatePctl();
}
function updatePctl() {
  if (!state.pujaMode) return;
  const n = $$('#verses .step').length, last = state.step >= n - 1, nx = state.view && state.view.ch ? null : nextInSeq();
  $('#pPos').textContent = n ? `${Math.max(1, state.step + 1)} of ${n}` : '';
  $('#pNext').textContent = last ? (nx ? `Next: ${nx.title.r}` : 'Offer flowers') : 'Next verse';
  $('#pPrev').disabled = state.step <= 0;
}
function stepNext() {
  const n = $$('#verses .step').length;
  if (state.step < n - 1) return setStep(state.step + 1, true);
  if (nextInSeq() && !(state.view && state.view.ch)) return nextAarti();
  offerFlowers();
}
function nextAarti() { const nx = nextInSeq(); if (!nx) return; state.seqPos += 1; location.hash = textHref(nx); }
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); $('#wake').textContent = 'Screen stays on'; }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { $('#wake').textContent = ''; }
  if (!on) $('#wake').textContent = '';
}
document.addEventListener('visibilitychange', () => { if (state.pujaMode && document.visibilityState === 'visible') keepAwake(true); });
function setPuja(on) {
  state.pujaMode = on;
  document.body.classList.toggle('puja', on);
  $('#pctl').hidden = !on;
  keepAwake(on);
  const b = $('#reader [data-act="puja"]'); if (b) b.textContent = on ? 'Leave puja mode' : 'Puja mode';
  if (on) setStep(state.step < 0 ? 0 : state.step, true);
}

/* ================= Reader actions ================= */
function syncReader() {
  const art = $('#art'); if (!art) return;
  art.classList.remove('s-dev', 's-rom', 's-both'); art.classList.add('s-' + state.script);
  MEANINGS.forEach(m => art.classList.toggle('m-' + m, state.meaning === m));
  $$('#reader [data-script]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.script === state.script)));
  $$('#reader [data-mean]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mean === state.meaning)));
  const r = $('#reader [data-act="refrain"]'); if (r) r.setAttribute('aria-pressed', String(state.refrainFull));
}
function rerenderVerses() {
  const v = state.view, cur = $$('#verses .step')[state.step], key = cur ? cur.dataset.v : null;
  $('#verses').innerHTML = versesHTML(BY_ID[v.id], v.ch);
  syncReader(); state.step = -1;
  if (key != null) { const i = $$('#verses .step').findIndex(s => s.dataset.v === key); if (i > -1) setStep(i, false); }
}
async function share(a) {
  const url = location.href.split('#')[0] + (location.hash || textHref(a));
  const text = `${a.title.d} (${a.title.r}), with meaning`;
  try { if (navigator.share) { await navigator.share({ title: text, text, url }); return; } }
  catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast(url); }
}
function act(name) {
  const v = state.view, a = v && BY_ID[v.id];
  switch (name) {
    case 'back': goBack(); break;
    case 'home': state.homeScroll = 0; break;
    case 'navpuja': {
      const pr = PRESETS.find(p => p.n === 'Navratri');
      state.puja = pr.ids.slice(); savePuja(); state.seqPos = 0; state.startPuja = true;
      toast('My puja is now the Navratri order');
      location.hash = textHref(BY_ID[state.puja[0]]); break;
    }
    case 'refrain': state.refrainFull = !state.refrainFull; store.set('refrainFull', state.refrainFull); rerenderVerses(); break;
    case 'smaller': applyScale(state.scale - 0.1); break;
    case 'bigger': applyScale(state.scale + 0.1); break;
    case 'theme': toggleTheme(); break;
    case 'puja': setPuja(!state.pujaMode); break;
    case 'nextaarti': nextAarti(); break;
    case 'offer': offerFlowers(); break;
    case 'share': share(a); break;
    case 'print': try { window.print(); } catch (e) { toast('Printing isn’t available here'); } break;
    case 'fav': {
      const on = !state.favs.has(a.id); on ? state.favs.add(a.id) : state.favs.delete(a.id);
      store.set('favs', [...state.favs]);
      const b = $('#reader [data-act="fav"]'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '♥ Saved' : '♡ Save';
      toast(on ? 'Saved' : 'Removed from saved'); break;
    }
    case 'addpuja': {
      const i = state.puja.indexOf(a.id), on = i === -1;
      on ? state.puja.push(a.id) : state.puja.splice(i, 1); savePuja();
      const b = $('#reader [data-act="addpuja"]'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '✓ In my puja' : 'Add to my puja';
      toast(on ? `Added to my puja (${state.puja.length})` : 'Removed from my puja'); break;
    }
  }
}
$('#reader').addEventListener('click', e => {
  const s = e.target.closest('[data-script]');
  if (s) { state.script = s.dataset.script; store.set('script', state.script); syncReader(); return; }
  const mb = e.target.closest('[data-mean]');
  if (mb) { state.meaning = mb.dataset.mean; store.set('meaning', state.meaning); syncReader(); return; }
  const b = e.target.closest('[data-act]');
  if (b) { act(b.dataset.act); return; }
  const st = e.target.closest('.step');
  if (st && !e.target.closest('a')) setStep($$('#verses .step').indexOf(st), false);
});
$('#reader').addEventListener('keydown', e => {
  const st = e.target.closest && e.target.closest('.step');
  if (st && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setStep($$('#verses .step').indexOf(st), false); }
});
$('#pNext').addEventListener('click', stepNext);
$('#pPrev').addEventListener('click', () => setStep(state.step - 1, true));
$('#pExit').addEventListener('click', () => setPuja(false));
document.addEventListener('keydown', e => {
  if (state.pujaMode && $('#drawer').hidden) {
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.target.closest('button, .step, input'))) { e.preventDefault(); stepNext(); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); setStep(state.step - 1, true); }
    else if (e.key === 'Escape') setPuja(false);
    return;
  }
  if (e.key === '/' && !document.body.classList.contains('reading') && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
  if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer();
});

/* ================= My puja ================= */
function renderDrawer() {
  $('#seq').innerHTML = state.puja.map((id, i) => {
    const a = BY_ID[id];
    return `<li>${avatar(DEITY[a.deity], 'xs')}<span class="st"><span lang="${a.lang}">${esc(a.title.d)}</span><small>${esc(a.title.r)}</small></span>
      <span class="mv"><button type="button" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-down="${i}" aria-label="Move down" ${i === state.puja.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-rm="${i}" aria-label="Remove">✕</button></span></li>`;
  }).join('');
  $('#seqEmpty').textContent = state.puja.length ? 'Or replace it with a common order:' : 'Nothing added yet. Use “Add to my puja” on any text, or start from a common order:';
  $('#presets').innerHTML = PRESETS.map((p, i) => `<button class="btn" type="button" data-preset="${i}">${esc(p.n)}</button>`).join('') +
    `<p style="font-size:.88rem;color:var(--ink3);margin:6px 0 0">These follow a common North Indian order. Adjust them to your family’s tradition.</p>`;
  $('#seqBegin').disabled = !state.puja.length;
  $('#seqClear').disabled = !state.puja.length;
}
let lastFocus = null;
function openDrawer() { lastFocus = document.activeElement; renderDrawer(); $('#scrim').hidden = false; $('#drawer').hidden = false; $('#drClose').focus(); }
function closeDrawer() { $('#scrim').hidden = true; $('#drawer').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
$('#pujaBtn').addEventListener('click', openDrawer);
$('#drClose').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
$('#drawer').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const P = state.puja;
  if (t.dataset.up) { const i = +t.dataset.up; [P[i - 1], P[i]] = [P[i], P[i - 1]]; }
  else if (t.dataset.down) { const i = +t.dataset.down; [P[i + 1], P[i]] = [P[i], P[i + 1]]; }
  else if (t.dataset.rm) P.splice(+t.dataset.rm, 1);
  else if (t.dataset.preset) state.puja = PRESETS[+t.dataset.preset].ids.slice();
  else return;
  savePuja(); renderDrawer();
});
$('#seqClear').addEventListener('click', () => { state.puja = []; savePuja(); renderDrawer(); });
$('#seqBegin').addEventListener('click', () => {
  if (!state.puja.length) return;
  closeDrawer(); state.seqPos = 0; state.startPuja = true;
  const target = textHref(BY_ID[state.puja[0]]);
  if (location.hash === target) route(); else location.hash = target;
});

/* ================= Home events ================= */
let qT;
function clearQuery() { $('#q').value = ''; state.query = ''; document.body.classList.remove('searching'); }
$('#q').addEventListener('input', () => {
  clearTimeout(qT);
  qT = setTimeout(() => {
    state.query = $('#q').value;
    const on = !!state.query.trim();
    document.body.classList.toggle('searching', on);
    renderList();
    if (on) window.scrollTo(0, 0);
  }, 110);
});
$('#q').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const r = $('#list .row'); if (r) location.hash = r.getAttribute('href'); }
  if (e.key === 'Escape') { clearQuery(); renderList(); }
});
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-kind]'); if (!b) return;
  const k = b.dataset.kind;
  state.filter = { kind: k, value: k === 'day' ? String(new Date().getDay()) : null };
  clearQuery(); renderBrowse();
});
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('[data-chip]'); if (!c) return;
  const [k, v] = c.dataset.chip.split(':');
  state.filter = state.filter.kind === k && state.filter.value === v ? { kind: k, value: null } : { kind: k, value: v };
  renderChips(); renderList(); renderShelf();
});
document.addEventListener('click', e => {
  const f = e.target.closest('[data-filter]'); if (!f) return;
  e.preventDefault();
  const [k, v] = f.dataset.filter.split(':');
  state.filter = { kind: k, value: v }; clearQuery();
  if (document.body.classList.contains('reading')) { state.pendingBrowse = true; location.hash = '#/'; }
  else { renderBrowse(); scrollToBrowse(); }
});
$('#themeBtn').addEventListener('click', toggleTheme);

/* reading progress along the reader bar, and a way back to the top of long pages */
let scrollRaf = 0;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    const p = $('#prog'); if (p) p.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    $('#toTop').classList.toggle('show', y > 900 && !state.pujaMode);
    document.body.classList.toggle('scrolled', y > 8);
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
$('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ================= Start ================= */
applyTheme(store.get('theme', null));
applyScale(state.scale);
savePuja();
window.addEventListener('hashchange', route);
route();
