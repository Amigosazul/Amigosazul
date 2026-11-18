// Builds the whole profile README and every image in assets/ from live GitHub data.
// Nothing here is hand-written per user: run it for any login.
//
//   GITHUB_TOKEN=... node scripts/render.js <login> <outDir>
//   node scripts/render.js <login> <outDir> --data data.json   (offline, normalized data)
//   ... --save data.json                                        (write the normalized data too)
const fs = require('fs');
const path = require('path');
const P = require('./pixel');
const { C, INK } = P;

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const LOGIN = pos[0] || 'Amigosazul';
const OUT = pos[1] || '.';
const TOKEN = process.env.GITHUB_TOKEN;

// ---------------- data ----------------
const headers = auth => ({ 'User-Agent': 'pixel-profile', Accept: 'application/vnd.github+json', ...(auth && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) });
// Public data is read without auth first: a repo-scoped token (like the Actions GITHUB_TOKEN)
// hides the owner's other public repos. Fall back to the token when rate limited.
async function rest(url) {
  let r = await fetch(url, { headers: headers(false) });
  if ((r.status === 403 || r.status === 429) && TOKEN) r = await fetch(url, { headers: headers(true) });
  if (!r.ok) throw new Error(`${url}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function graphql(query, variables) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN is required for the contribution calendar');
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: headers(true), body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}
const GQL = `query($login:String!){user(login:$login){
  pullRequests{totalCount} issues{totalCount}
  contributionsCollection{totalCommitContributions contributionCalendar{totalContributions
    weeks{contributionDays{date contributionCount contributionLevel weekday}}}}}}`;

async function load() {
  const u = await rest(`https://api.github.com/users/${LOGIN}`);
  const list = await rest(`https://api.github.com/users/${LOGIN}/repos?type=owner&sort=pushed&per_page=100`);
  const repos = [];
  for (const r of list.filter(r => !r.fork)) {
    const languages = r.size > 0 ? await rest(r.languages_url) : {};
    repos.push({ name: r.name, description: r.description, url: r.html_url, stars: r.stargazers_count, forks: r.forks_count,
      pushedAt: r.pushed_at, archived: r.archived, language: r.language, languages });
  }
  const g = (await graphql(GQL, { login: LOGIN })).user;
  return {
    user: { login: u.login, name: u.name, bio: u.bio, location: u.location, createdAt: u.created_at,
      followers: u.followers, following: u.following, publicRepos: u.public_repos },
    repos,
    activity: { prs: g.pullRequests.totalCount, issues: g.issues.totalCount, commitsYear: g.contributionsCollection.totalCommitContributions,
      calendar: g.contributionsCollection.contributionCalendar },
  };
}

// ---------------- derived stats ----------------
const LANG_COLORS = {
  Python: '#3572A5', Java: '#b07219', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
  'Jupyter Notebook': '#DA5B0B', Go: '#00ADD8', Rust: '#dea584', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Shell: '#89e051', PowerShell: '#012456', Kotlin: '#A97BFF', Swift: '#F05138', PHP: '#4F5D95', Ruby: '#701516',
  Vue: '#41b883', Dart: '#00B4AB', Lua: '#000080', Dockerfile: '#384d54', SCSS: '#c6538c', Markdown: '#083fa1',
};
const CLASSES = {
  Python: 'PYTHON MAGE', Java: 'JAVA KNIGHT', JavaScript: 'JS ROGUE', TypeScript: 'TS PALADIN', Go: 'GO RANGER',
  Rust: 'RUST WARRIOR', 'C++': 'C++ BERSERKER', C: 'C MONK', 'C#': 'C# CLERIC', Kotlin: 'KOTLIN BARD', Swift: 'SWIFT ARCHER',
  PHP: 'PHP DRUID', Ruby: 'RUBY SORCERER', HTML: 'HTML BUILDER', CSS: 'CSS ILLUSIONIST', 'Jupyter Notebook': 'DATA ALCHEMIST',
  Shell: 'SHELL SUMMONER', Vue: 'VUE ENCHANTER', Dart: 'DART HUNTER',
};
const langColor = n => LANG_COLORS[n] || C.lav;

function derive(d) {
  const { user, activity } = d;
  // the profile repo only holds this generator, so it is left out of languages and quests
  const isProfile = r => r.name.toLowerCase() === user.login.toLowerCase();
  const repos = d.repos.filter(r => !r.archived && !isProfile(r));
  const bytes = {};
  for (const r of repos) for (const [n, b] of Object.entries(r.languages || {})) bytes[n] = (bytes[n] || 0) + b;
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([name, b]) => ({ name, pct: (b / total) * 100, color: langColor(name) }));
  const top = langs[0] && langs[0].name;
  const cls = top ? CLASSES[top] || `${P.up(top)} ADVENTURER` : 'NOVICE';

  const days = activity.calendar.weeks.flatMap(w => w.contributionDays);
  let longest = 0, run = 0;
  for (const day of days) { run = day.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0, i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--; // today may not have started yet
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;

  const stars = d.repos.reduce((a, r) => a + r.stars, 0);
  const contrib = activity.calendar.totalContributions;
  const xp = contrib * 10 + stars * 50 + user.publicRepos * 20 + user.followers * 20;
  const lv = Math.floor(Math.sqrt(xp / 50)) + 1, cur = 50 * (lv - 1) ** 2, next = 50 * lv ** 2;

  const quests = repos.slice(0, 4);
  const displayName = user.name && P.canPixel(user.name) ? user.name : user.login;
  return { ...d, langs, cls, stars, contrib, xp, lv, cur, next, longest, current, quests, displayName };
}

// ---------------- images ----------------
function banner(s) {
  const W = 960, H = 320, B = 6, GY = 262;
  let b = P.box(0, 0, W, H, 8, INK);
  b += `<clipPath id="in"><path d="${P.boxD(B, B, W - 2 * B, H - 2 * B, 6)}"/></clipPath><g clip-path="url(#in)">`;
  b += P.skyBands(0, 0, W, GY) + P.sun(860, 72, 5);
  let cl = '';
  for (const off of [0, 960]) cl += P.cloud(90 + off, 8, 3) + P.cloud(560 + off, 10, 3);
  b += `<g class="drift">${cl}</g>` + P.hills(W, GY) + P.ground(W, GY, H - GY, 11);
  b += P.robot(70, GY - 4 - P.ROBOT.length * 6, 6) + '</g>';

  const tx = 230, title = P.up(s.displayName);
  const k = Math.max(2, Math.min(6, Math.floor(560 / (title.length * 7))));
  b += P.plain('PLAYER 1', tx, 36, 3, C.red);
  b += P.logo(title, tx, 66, k, C.yellow);
  b += P.plain(P.fit(`CLASS: ${s.cls}`, 3, 580), tx, 144, 3, INK);
  const year = s.user.createdAt.slice(0, 4), n = s.user.publicRepos, f = s.user.followers;
  b += P.plain(P.fit(`JOINED ${year} / ${n} REPO${n === 1 ? '' : 'S'} / ${f} FOLLOWER${f === 1 ? '' : 'S'}`, 2, 600), tx, 180, 2, C.grey);
  const lvText = `LV ${s.lv}`;
  b += P.plain(lvText, tx, 214, 3, INK);
  const bx = tx + P.textW(lvText, 3) + 18, bw = 260, by = 210, bh = 26;
  const p = Math.max(0.02, Math.min(1, (s.xp - s.cur) / (s.next - s.cur)));
  b += P.box(bx - 4, by - 4, bw + 8, bh + 8, 4, INK) + `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${C.paper}"/>`;
  b += `<rect class="grow" x="${bx}" y="${by}" width="${Math.round(bw * p)}" height="${bh}" fill="${C.green}"/><rect class="grow" x="${bx}" y="${by}" width="${Math.round(bw * p)}" height="6" fill="#8dffae"/>`;
  b += P.plain(`${s.xp}/${s.next} XP`, bx + bw + 16, 217, 2, INK);
  b += P.plain('PRESS START', W - P.textW('PRESS START', 2) - 30, 250 - 24, 2, C.red, 'blink');
  return P.svg(W, H, b, `${s.displayName}: level ${s.lv} ${s.cls}`);
}

function player(s) {
  const u = s.user, w = 874;
  const rows = [
    ['NAME', s.displayName], ['CLASS', s.cls], ['LEVEL', `${s.lv}  (${s.xp} XP)`], ['JOINED', u.createdAt.slice(0, 10)],
    ['REPOS', `${u.publicRepos} PUBLIC`], ['PARTY', `${u.followers} FOLLOWERS / ${u.following} FOLLOWING`],
  ];
  const free = [];
  if (u.location) free.push(['FROM', u.location]);
  if (u.bio) free.push(['BIO', u.bio]);
  const h = Math.max(234, 30 + (rows.length + free.length) * 32 + 12);
  let b = P.win(0, 0, w, h, C.paper);
  // portrait
  const px = 24, py = 24, pw = 150, ph = h - 48;
  b += P.box(px, py, pw, ph, 4, INK) + `<clipPath id="pt"><path d="${P.boxD(px + 4, py + 4, pw - 8, ph - 8, 2)}"/></clipPath><g clip-path="url(#pt)">`;
  b += P.skyBands(px, py, pw, ph - 30) + P.ground(pw + px, py + ph - 30, 30, 5) + P.robot(px + 27, py + ph - 34 - P.ROBOT.length * 6, 6) + '</g>';
  // rows
  const lx = 204, vx = 330;
  let y = 30;
  for (const [label, value] of rows) {
    b += P.plain(label, lx, y + 4, 2, C.grey) + P.plain(P.fit(value, 3, w - vx - 30), vx, y, 3, INK);
    y += 32;
  }
  for (const [label, value] of free) {
    b += P.plain(label, lx, y + 4, 2, C.grey) + P.sysText(P.clip(value, 18, w - vx - 30), vx, y + 17, 18, INK, 600);
    y += 32;
  }
  return P.svg(w + 6, h + 6, b, `${s.displayName} · ${s.cls} · level ${s.lv}`);
}

const GEM = ['..KKKKK..', '.KLCCCCK.', 'KLCCCCCCK', 'KCCCCCCDK', '.KCCCCDK.', '..KCCDK..', '...KDK...', '....K....'];
const darken = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
function inventory(s) {
  const w = 874, h = 204, slot = 88, gap = 16, x0 = 24, y0 = 56;
  let b = P.win(0, 0, w, h, C.paper);
  b += P.plain('LANGUAGES BY CODE SIZE', x0, 22, 2, C.grey);
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * (slot + gap), l = s.langs[i];
    b += P.box(x, y0, slot, slot, 4, l ? INK : C.lgrey) + P.box(x + 4, y0 + 4, slot - 8, slot - 8, 2, C.slot);
    if (!l) continue;
    const col = /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : C.lav;
    b += `<g class="${i === 0 ? 'bob' : ''}">${P.sprite(GEM, { K: INK, L: C.paper, C: col, D: darken(col, 0.6) }, x + 17, y0 + 20, 6)}</g>`;
    b += P.plain(P.fit(l.name, 2, slot), x, y0 + slot + 10, 2, INK);
    b += P.plain(l.pct < 1 ? '<1%' : `${l.pct.toFixed(l.pct < 10 ? 1 : 0)}%`, x, y0 + slot + 30, 2, C.grey);
  }
  if (!s.langs.length) b += P.plain('EMPTY INVENTORY: PUSH CODE TO A PUBLIC REPO TO COLLECT GEMS', x0, y0 + slot + 20, 2, C.grey);
  return P.svg(w + 6, h + 6, b, 'Languages: ' + (s.langs.map(l => `${l.name} ${l.pct.toFixed(1)}%`).join(', ') || 'none'));
}

const SCROLL = ['.KKKKKKKKKK.', 'KPPPPPPPPPPK', 'KPKKKKKKKKPK', '.KPPPPPPPPK.', '.KPKKKKKPPK.', '.KPPPPPPPPK.',
  '.KPKKKKKKPK.', '.KPPPPPPPPK.', '.KPKKKPPPPK.', 'KPPPPPPPPPPK', 'KPKKKKKKKKPK', '.KKKKKKKKKK.'];
function emptyQuest() {
  const w = 874, h = 144;
  let b = P.win(0, 0, w, h, C.paper);
  b += `<rect x="4" y="4" width="${w - 8}" height="36" fill="${C.palePink}"/><rect x="4" y="40" width="${w - 8}" height="4" fill="${INK}"/>`;
  b += P.plain('QUEST BOARD', 24, 15, 2, C.red);
  b += P.sprite(SCROLL, { K: INK, P: C.paleYellow }, 30, 60, 5);
  b += P.plain('NO QUESTS YET', 120, 58, 3, INK);
  b += P.plain('PUBLIC REPOSITORIES WILL SHOW UP HERE AUTOMATICALLY', 120, 98, 2, C.grey);
  b += P.plain('...', 120, 118, 2, C.grey, 'blink');
  return P.svg(w + 6, h + 6, b, 'No quests yet');
}

function quest(r, i, now) {
  const w = 874, h = 144;
  let b = P.win(0, 0, w, h, C.paper);
  b += `<rect x="4" y="4" width="${w - 8}" height="36" fill="${C.palePink}"/><rect x="4" y="40" width="${w - 8}" height="4" fill="${INK}"/>`;
  b += P.plain(`QUEST ${String(i + 1).padStart(2, '0')}`, 24, 15, 2, C.red);
  const active = now - Date.parse(r.pushedAt) < 30 * 864e5;
  const tag = active ? 'ACTIVE' : 'PAUSED', tw = P.textW(tag, 2);
  b += P.box(w - tw - 56, 8, tw + 36, 28, 4, INK) + P.box(w - tw - 52, 12, tw + 28, 20, 2, active ? C.green : C.lgrey);
  b += P.plain(tag, w - tw - 38, 15, 2, INK, active ? 'blink' : '');
  b += P.sprite(SCROLL, { K: INK, P: C.paleYellow }, 30, 60, 5);
  const x = 120;
  b += P.plain(P.fit(r.name, 3, w - x - 30), x, 58, 3, INK);
  b += r.description ? P.sysText(P.clip(r.description, 16, w - x - 30), x, 104, 16, C.grey) : P.sysText('No description', x, 104, 16, C.lgrey);
  let bx = x;
  const y = 118;
  if (r.language) {
    b += P.box(bx, y - 1, 16, 16, 2, INK) + `<rect x="${bx + 3}" y="${y + 2}" width="10" height="10" fill="${langColor(r.language)}"/>`;
    b += P.plain(r.language, bx + 24, y, 2, INK);
    bx += 24 + P.textW(P.up(r.language), 2) + 28;
  }
  b += P.icon('star', bx, y, 2, C.orange) + P.plain(String(r.stars), bx + 20, y, 2, INK);
  bx += 20 + P.textW(String(r.stars), 2) + 24;
  b += P.icon('fork', bx, y, 2, C.lav) + P.plain(String(r.forks), bx + 16, y, 2, INK);
  const upd = `UPDATED ${r.pushedAt.slice(0, 10)}`;
  b += P.plain(upd, w - 28 - P.textW(upd, 2), y, 2, C.grey);
  return P.svg(w + 6, h + 6, b, `Quest ${i + 1}: ${r.name}${r.description ? ' - ' + r.description : ''}`);
}

function stats(s) {
  const w = 874, h = 272, tw = 196, th = 84, gap = 12, x0 = 24;
  const a = s.activity;
  const tiles = [
    ['calendar', C.green, s.contrib, 'CONTRIBUTIONS'], ['bolt', C.blue, a.commitsYear, 'COMMITS'],
    ['merge', C.purple, a.prs, 'PULL REQUESTS'], ['bug', C.red, a.issues, 'ISSUES'],
    ['star', C.orange, s.stars, 'STARS EARNED'], ['fire', C.red, s.current, 'CURRENT STREAK'],
    ['fire', C.orange, s.longest, 'LONGEST STREAK'], ['gem', C.blue, s.xp, 'TOTAL XP'],
  ];
  let b = P.win(0, 0, w, h, C.paper);
  tiles.forEach(([ic, col, val, label], i) => {
    const x = x0 + (i % 4) * (tw + gap), y = 24 + Math.floor(i / 4) * (th + gap);
    b += P.box(x, y, tw, th, 4, C.slot);
    b += P.icon(ic, x + 14, y + 16, 4, col);
    b += P.plain(P.fit(String(val), 4, tw - 70), x + 56, y + 14, 4, INK);
    b += P.plain(P.fit(label, 2, tw - 24), x + 14, y + 56, 2, C.grey);
  });
  b += P.plain('CONTRIBUTIONS, COMMITS AND STREAKS: LAST 365 DAYS', x0, 222, 2, C.lgrey);
  b += P.plain('XP = CONTRIBUTION X10 + STAR X50 + REPO X20 + FOLLOWER X20', x0, 242, 2, C.lgrey);
  return P.svg(w + 6, h + 6, b, `Stats: ${s.contrib} contributions, ${s.stars} stars, ${s.current}-day streak`);
}

const LEVEL = { NONE: '#ebedf0', FIRST_QUARTILE: '#9be9a8', SECOND_QUARTILE: '#40c463', THIRD_QUARTILE: '#30a14e', FOURTH_QUARTILE: '#216e39' };
function blackhole(s) {
  const cal = s.activity.calendar;
  const W = 880, H = 270, CELL = 12, GAP = 3, STEP = CELL + GAP, T = 14;
  const weeks = cal.weeks.slice(-53);
  const gw = weeks.length * STEP - GAP, gx = Math.round((W - gw) / 2), gy = 66;
  const cx = gx + gw / 2, cy = gy + (7 * STEP - GAP) / 2, maxD = Math.hypot(gw / 2, (7 * STEP) / 2);
  let cells = '';
  weeks.forEach((wk, wi) => wk.contributionDays.forEach(day => {
    const x = gx + wi * STEP, y = gy + day.weekday * STEP, dx = cx - (x + CELL / 2), dy = cy - (y + CELL / 2);
    const delay = ((Math.hypot(dx, dy) / maxD) * 2.6).toFixed(2);
    cells += `<g class="o" style="animation-delay:${delay}s"><rect class="c" x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${LEVEL[day.contributionLevel] || LEVEL.NONE}" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;animation-delay:${delay}s"/></g>`;
  }));
  const cols = ['#ffec27', '#ffa300', '#ff77a8', '#ff004d', '#ffa300', '#ffccaa'];
  let disk = '';
  for (let ring = 0; ring < 6; ring++) {
    const r = 36 + ring * 8, n = 34 + ring * 8, sz = ring < 3 ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring;
      disk += `<rect x="${(Math.cos(a) * r - sz / 2).toFixed(1)}" y="${(Math.sin(a) * r - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" fill="${cols[(i + ring) % cols.length]}" opacity="${(1 - ring * 0.13).toFixed(2)}"/>`;
    }
  }
  let core = '', ringPx = '', halo = '';
  for (let y = -11; y < 11; y++) for (let x = -11; x < 11; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5), px = `M${x * 4} ${y * 4}h4v4h-4z`;
    if (d <= 6) core += px; else if (d <= 7.4) ringPx += px; else if (d > 9.2 && d <= 10.2 && (x + y) % 2 === 0) halo += px;
  }
  const total = cal.totalContributions, label = `${total} CONTRIBUTION${total === 1 ? '' : 'S'} IN THE LAST YEAR`;
  const css = `<style>
.o{transform-origin:${cx}px ${cy}px;animation:orbit ${T}s cubic-bezier(.55,0,.9,.5) infinite}
.c{transform-box:fill-box;transform-origin:center;animation:fall ${T}s cubic-bezier(.55,0,.9,.5) infinite}
@keyframes orbit{0%,35%{transform:rotate(0)}72%,90%{transform:rotate(-420deg)}90.01%,100%{transform:rotate(0)}}
@keyframes fall{0%,35%{transform:translate(0,0) scale(1);opacity:1}72%{transform:translate(var(--dx),var(--dy)) scale(0) rotate(180deg);opacity:1}90%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}90.01%{transform:translate(0,0) scale(1);opacity:0}100%{transform:translate(0,0) scale(1);opacity:1}}
.bh{transform-origin:${cx}px ${cy}px;animation:bh ${T}s ease-in-out infinite}
@keyframes bh{0%,22%{transform:scale(0)}34%,72%{transform:scale(1)}80%{transform:scale(1.25)}88%{transform:scale(1)}96%,100%{transform:scale(0)}}
.spin{animation:spin 3s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.glow{animation:glow .5s steps(1) infinite}@keyframes glow{50%{opacity:.55}}
.warn{animation:warn ${T}s steps(1) infinite}@keyframes warn{0%,30%{opacity:0}31%,88%{opacity:1}89%,100%{opacity:0}}
.warn2{animation:blink .6s steps(1) infinite}@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.o,.c,.bh,.spin,.glow,.warn,.warn2{animation:none}.bh{transform:scale(0)}.warn{opacity:0}}
</style>`;
  let b = P.win(0, 0, W - 6, H - 6, C.paper);
  b += P.plain('CONTRIBUTION MAP', 28, 26, 3, INK);
  const warn = '! EVENT HORIZON DETECTED';
  b += `<g class="warn">${P.plain(warn, W - 34 - P.textW(warn, 2), 30, 2, C.red, 'warn2')}</g>`;
  b += `<clipPath id="field"><rect x="10" y="${gy - 14}" width="${W - 26}" height="${7 * STEP - GAP + 28}"/></clipPath><g clip-path="url(#field)">`;
  b += `<g class="bh"><g transform="translate(${cx} ${cy})"><g transform="scale(1 .38)"><g class="spin">${disk}</g></g>`;
  b += `<path fill="${C.lav}" opacity=".7" d="${halo}"/><path class="glow" fill="${C.orange}" d="${ringPx}"/><path fill="#000000" d="${core}"/></g></g>`;
  b += cells + '</g>';
  const by = H - 52;
  b += P.plain(label, 28, by, 2, C.grey);
  const lx = W - 34 - (P.textW('LESS', 2) + 12 + 5 * 16 + 4 + P.textW('MORE', 2));
  b += P.plain('LESS', lx, by, 2, C.grey);
  Object.values(LEVEL).forEach((c, i) => (b += `<rect x="${lx + P.textW('LESS', 2) + 12 + i * 16}" y="${by + 1}" width="12" height="12" fill="${c}"/>`));
  b += P.plain('MORE', lx + P.textW('LESS', 2) + 12 + 5 * 16 + 4, by, 2, C.grey);
  return P.svg(W, H, b, label, css);
}

function footer() {
  const W = 960, H = 160, B = 6, GY = 128;
  let b = P.box(0, 0, W, H, 8, INK);
  b += `<clipPath id="fin"><path d="${P.boxD(B, B, W - 2 * B, H - 2 * B, 6)}"/></clipPath><g clip-path="url(#fin)">`;
  b += P.skyBands(0, 0, W, GY) + P.cloud(60, 24, 3) + P.cloud(820, 18, 3) + P.ground(W, GY, H - GY, 29);
  b += P.robot(130, GY - 4 - P.ROBOT.length * 3, 3) + P.robot(W - 130 - 48, GY - 4 - P.ROBOT.length * 3, 3) + '</g>';
  const t1 = 'THANKS FOR PLAYING!';
  b += P.logo(t1, (W - (t1.length * 28 - 8)) / 2, 28, 4, C.yellow);
  b += P.plain('CONTINUE? 9', (W - P.textW('CONTINUE? 9', 2)) / 2, 84, 2, INK, 'blink');
  return P.svg(W, H, b, 'Thanks for playing!');
}

// ---------------- README ----------------
function readme(s) {
  const L = s.user.login;
  const qs = s.quests.length
    ? s.quests.map((r, i) => `<a href="${r.url}"><img src="./assets/quest-${i + 1}.svg" width="100%" alt="QUEST ${i + 1}: ${P.esc(r.name)}" /></a>`).join('\n')
    : '<img src="./assets/quest-none.svg" width="100%" alt="No quests yet" />';
  return `<!-- Generated by scripts/render.js from live GitHub data. Edit the script, not this file. -->
<div align="center">

<img src="./assets/banner.svg" width="100%" alt="${P.esc(s.displayName)} · LV ${s.lv} ${s.cls}" />

<img src="https://komarev.com/ghpvc/?username=${L}&style=for-the-badge&color=ff77a8&label=VISITORS" alt="visitors" />

</div>

<br />

<img src="./assets/header-player.svg" height="50" alt="PLAYER INFO · 玩家信息" />

<img src="./assets/player.svg" width="100%" alt="${P.esc(s.displayName)}" />

<img src="./assets/header-inventory.svg" height="50" alt="INVENTORY · 装备栏" />

<img src="./assets/inventory.svg" width="100%" alt="Languages" />

<img src="./assets/header-quests.svg" height="50" alt="QUEST LOG · 任务日志" />

${qs}

<img src="./assets/header-stats.svg" height="50" alt="STATS · 角色属性" />

<img src="./assets/stats.svg" width="100%" alt="Stats" />

<img src="./assets/header-blackhole.svg" height="50" alt="BLACK HOLE · 贡献黑洞" />

<img src="./assets/blackhole.svg" width="100%" alt="Contribution map being pulled into a pixel black hole" />

<br />

<img src="./assets/footer.svg" width="100%" alt="Thanks for playing!" />
`;
}

// ---------------- main ----------------
(async () => {
  const data = opt('--data') ? JSON.parse(fs.readFileSync(opt('--data'), 'utf8')) : await load();
  if (opt('--save')) fs.writeFileSync(opt('--save'), JSON.stringify(data, null, 1));
  const s = derive(data);
  const dir = path.join(OUT, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^quest-.*\.svg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const now = Date.now();
  const files = {
    'banner.svg': banner(s), 'player.svg': player(s), 'inventory.svg': inventory(s), 'stats.svg': stats(s),
    'blackhole.svg': blackhole(s), 'footer.svg': footer(),
    'header-player.svg': P.header('PLAYER INFO', 'heart', C.red, C.palePink, '玩家信息'),
    'header-inventory.svg': P.header('INVENTORY', 'gem', C.blue, C.paleBlue, '装备栏'),
    'header-quests.svg': P.header('QUEST LOG', 'sword', C.orange, C.paleYellow, '任务日志'),
    'header-stats.svg': P.header('STATS', 'chart', C.green, C.paleGreen, '角色属性'),
    'header-blackhole.svg': P.header('BLACK HOLE', 'hole', C.purple, C.palePurple, '贡献黑洞'),
  };
  s.quests.forEach((r, i) => (files[`quest-${i + 1}.svg`] = quest(r, i, now)));
  if (!s.quests.length) files['quest-none.svg'] = emptyQuest();
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), c);
  fs.writeFileSync(path.join(OUT, 'README.md'), readme(s));
  console.log(`rendered ${Object.keys(files).length} images for ${s.user.login}: LV ${s.lv} ${s.cls}, ${s.langs.length} languages, ${s.quests.length} quests`);
})().catch(e => { console.error(e); process.exit(1); });
