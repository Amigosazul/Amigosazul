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
    const languages = await rest(r.languages_url); // r.size can lag behind at 0 for fresh repos
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
const SHORT = { TypeScript: 'TS', JavaScript: 'JS', 'Jupyter Notebook': 'JUPYTER', PowerShell: 'PWSH', Dockerfile: 'DOCKER', Markdown: 'MD' };
const shortName = n => SHORT[n] || n;

function derive(d, now) {
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
  const years = (now - Date.parse(user.createdAt)) / (365.25 * 864e5);

  // [name, requirement, unlocked, ribbon colour]
  const achievements = [
    ['STARTER', '1 REPO', repos.length >= 1, C.blue],
    ['BUILDER', '5 REPOS', repos.length >= 5, C.blue],
    ['POLYGLOT', '3 LANGUAGES', langs.length >= 3, C.purple],
    ['STARRED', '1 STAR', stars >= 1, C.orange],
    ['ALLSTAR', '10 STARS', stars >= 10, C.orange],
    ['ON FIRE', '7-DAY RUN', longest >= 7, C.red],
    ['MARATHON', '30-DAY RUN', longest >= 30, C.red],
    ['GRINDER', '100 CONTRIBS', contrib >= 100, C.green],
    ['TEAM UP', 'OPEN A PR', activity.prs >= 1, C.purple],
    ['REPORTER', 'OPEN ISSUE', activity.issues >= 1, C.green],
    ['FAMOUS', '10 FOLLOWERS', user.followers >= 10, C.pink],
    ['VETERAN', '3 YEARS IN', years >= 3, C.pink],
  ];

  const quests = repos.slice(0, 4);
  const displayName = user.name && P.canPixel(user.name) ? user.name : user.login;
  return { ...d, langs, cls, stars, contrib, xp, lv, cur, next, longest, current, quests, displayName, achievements };
}

// Cards are drawn on a 640px canvas (634 + 6px shadow) and shown at that size, so on a
// phone they shrink to roughly half. Text is kept at k>=3 (21px) wherever it matters.
const CW = 634;

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
  b += P.plain('PLAYER 1', tx, 30, 3, C.red);
  b += P.logo(title, tx, 58, k, C.yellow);
  b += P.plain(P.fit(s.cls, 4, 560), tx, 120, 4, INK);
  const year = s.user.createdAt.slice(0, 4), n = s.user.publicRepos, f = s.user.followers;
  b += P.plain(P.fit(`SINCE ${year} / ${n} REPO${n === 1 ? '' : 'S'} / ${f} FAN${f === 1 ? '' : 'S'}`, 3, 680), tx, 164, 3, C.grey);
  const lvText = `LV ${s.lv}`;
  b += P.plain(lvText, tx, 206, 4, INK);
  const bx = tx + P.textW(lvText, 4) + 18, bw = 220, by = 204, bh = 28;
  const p = Math.max(0.02, Math.min(1, (s.xp - s.cur) / (s.next - s.cur)));
  b += P.box(bx - 4, by - 4, bw + 8, bh + 8, 4, INK) + `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${C.paper}"/>`;
  b += `<rect class="grow" x="${bx}" y="${by}" width="${Math.round(bw * p)}" height="${bh}" fill="${C.green}"/><rect class="grow" x="${bx}" y="${by}" width="${Math.round(bw * p)}" height="6" fill="#8dffae"/>`;
  b += P.plain(P.fit(`${s.xp}/${s.next} XP`, 3, W - bx - bw - 40), bx + bw + 16, 208, 3, INK);
  return P.svg(W, H, b, `${s.displayName}: level ${s.lv} ${s.cls}`);
}

function player(s) {
  const u = s.user, w = CW;
  const rows = [
    ['CLASS', s.cls], ['LEVEL', `${s.lv} / ${s.xp} XP`], ['SINCE', u.createdAt.slice(0, 10)],
    ['REPOS', `${u.publicRepos} PUBLIC`], ['FANS', `${u.followers}`], ['FOLLOWS', `${u.following}`],
  ];
  const free = [];
  if (u.location) free.push(['FROM', u.location]);
  if (u.bio) free.push(['BIO', u.bio]);
  const rowH = 38, h = 92 + (rows.length + free.length) * rowH + 10;
  let b = P.win(0, 0, w, h, C.paper);
  // name plate with a small robot
  b += `<rect x="4" y="4" width="${w - 8}" height="68" fill="${C.palePink}"/><rect x="4" y="72" width="${w - 8}" height="4" fill="${INK}"/>`;
  b += P.robot(22, 10, 3, 'bob');
  b += P.plain(P.fit(s.displayName, 5, w - 110), 84, 21, 5, INK);
  const lx = 24, vx = 200;
  let y = 96;
  for (const [label, value] of rows) {
    b += P.plain(label, lx, y, 3, C.grey) + P.plain(P.fit(value, 3, w - vx - 24), vx, y, 3, INK);
    y += rowH;
  }
  for (const [label, value] of free) {
    b += P.plain(label, lx, y, 3, C.grey) + P.sysText(P.clip(value, 22, w - vx - 24), vx, y + 19, 22, INK, 600);
    y += rowH;
  }
  return P.svg(w + 6, h + 6, b, `${s.displayName} · ${s.cls} · level ${s.lv}`);
}

const GEM = ['..KKKKK..', '.KLCCCCK.', 'KLCCCCCCK', 'KCCCCCCDK', '.KCCCCDK.', '..KCCDK..', '...KDK...', '....K....'];
const darken = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
function inventory(s) {
  const w = CW, slot = 100, col = 148, x0 = 24, y0 = 60, rowH = 178;
  const n = s.langs.length > 4 ? 8 : 4;
  const h = y0 + (n / 4) * rowH + (s.langs.length ? 0 : 30);
  let b = P.win(0, 0, w, h, C.paper);
  b += P.plain('LANGUAGES', x0, 24, 3, C.grey);
  for (let i = 0; i < n; i++) {
    const x = x0 + (i % 4) * col, y = y0 + Math.floor(i / 4) * rowH, l = s.langs[i];
    b += P.box(x, y, slot, slot, 4, l ? INK : C.lgrey) + P.box(x + 4, y + 4, slot - 8, slot - 8, 2, C.slot);
    if (!l) continue;
    const c = /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : C.lav;
    b += `<g class="${i === 0 ? 'bob' : ''}">${P.sprite(GEM, { K: INK, L: C.paper, C: c, D: darken(c, 0.6) }, x + 23, y + 22, 6)}</g>`;
    b += P.plain(P.fit(shortName(l.name), 3, col - 8), x, y + slot + 12, 3, INK);
    b += P.plain(l.pct < 1 ? '<1%' : `${l.pct.toFixed(l.pct < 10 ? 1 : 0)}%`, x, y + slot + 42, 3, C.grey);
  }
  if (!s.langs.length) b += P.plain('EMPTY: PUSH SOME PUBLIC CODE', x0, y0 + slot + 20, 3, C.grey);
  return P.svg(w + 6, h + 6, b, 'Languages: ' + (s.langs.map(l => `${l.name} ${l.pct.toFixed(1)}%`).join(', ') || 'none'));
}

const SCROLL = ['.KKKKKKKKKK.', 'KPPPPPPPPPPK', 'KPKKKKKKKKPK', '.KPPPPPPPPK.', '.KPKKKKKPPK.', '.KPPPPPPPPK.',
  '.KPKKKKKKPK.', '.KPPPPPPPPK.', '.KPKKKPPPPK.', 'KPPPPPPPPPPK', 'KPKKKKKKKKPK', '.KKKKKKKKKK.'];
function band(w, left, tag, tagColor, tagBlink) {
  let b = `<rect x="4" y="4" width="${w - 8}" height="44" fill="${C.palePink}"/><rect x="4" y="48" width="${w - 8}" height="4" fill="${INK}"/>`;
  b += P.plain(left, 22, 16, 3, C.red);
  if (tag) {
    const tw = P.textW(tag, 3);
    b += P.box(w - tw - 52, 9, tw + 32, 34, 4, INK) + P.box(w - tw - 48, 13, tw + 24, 26, 2, tagColor);
    b += P.plain(tag, w - tw - 36, 16, 3, INK, tagBlink ? 'blink' : '');
  }
  return b;
}
function quest(r, i, now) {
  const w = CW, h = 222, x = 100;
  let b = P.win(0, 0, w, h, C.paper);
  const active = now - Date.parse(r.pushedAt) < 30 * 864e5;
  b += band(w, `QUEST ${String(i + 1).padStart(2, '0')}`, active ? 'ACTIVE' : 'PAUSED', active ? C.green : C.lgrey, active);
  b += P.sprite(SCROLL, { K: INK, P: C.paleYellow }, 24, 72, 5);
  b += P.plain(P.fit(r.name, 3, w - x - 24), x, 70, 3, INK);
  b += r.description ? P.sysText(P.clip(r.description, 20, w - x - 24), x, 124, 20, C.grey) : P.sysText('No description', x, 124, 20, C.lgrey);
  let bx = x;
  const y = 144;
  if (r.language) {
    b += P.box(bx, y, 20, 20, 2, INK) + `<rect x="${bx + 4}" y="${y + 4}" width="12" height="12" fill="${langColor(r.language)}"/>`;
    b += P.plain(P.fit(r.language, 3, 200), bx + 30, y, 3, INK);
    bx += 30 + P.textW(P.fit(r.language, 3, 200), 3) + 26;
  }
  b += P.icon('star', bx, y, 3, C.orange) + P.plain(String(r.stars), bx + 28, y, 3, INK);
  bx += 28 + P.textW(String(r.stars), 3) + 24;
  b += P.icon('fork', bx, y, 3, C.lav) + P.plain(String(r.forks), bx + 22, y, 3, INK);
  b += P.plain(`UPDATED ${r.pushedAt.slice(0, 10)}`, x, 180, 3, C.grey);
  return P.svg(w + 6, h + 6, b, `Quest ${i + 1}: ${r.name}${r.description ? ' - ' + r.description : ''}`);
}
function emptyQuest() {
  const w = CW, h = 178;
  let b = P.win(0, 0, w, h, C.paper) + band(w, 'QUEST BOARD');
  b += P.sprite(SCROLL, { K: INK, P: C.paleYellow }, 24, 72, 5);
  b += P.plain('NO QUESTS YET', 100, 72, 3, INK);
  b += P.plain('PUBLIC REPOS SHOW UP HERE', 100, 108, 3, C.grey);
  b += P.plain('...', 100, 138, 3, C.grey, 'blink');
  return P.svg(w + 6, h + 6, b, 'No quests yet');
}

function stats(s) {
  const w = CW, tw = 285, th = 92, gap = 16, x0 = 24, y0 = 24;
  const a = s.activity;
  const tiles = [
    ['calendar', C.green, s.contrib, 'CONTRIBS'], ['bolt', C.blue, a.commitsYear, 'COMMITS'],
    ['merge', C.purple, a.prs, 'PULL REQS'], ['bug', C.red, a.issues, 'ISSUES'],
    ['star', C.orange, s.stars, 'STARS'], ['fire', C.red, s.current, 'STREAK NOW'],
    ['fire', C.orange, s.longest, 'MAX STREAK'], ['gem', C.blue, s.xp, 'TOTAL XP'],
  ];
  const rows = tiles.length / 2, ny = y0 + rows * (th + gap);
  const h = ny + 64;
  let b = P.win(0, 0, w, h, C.paper);
  tiles.forEach(([ic, col, val, label], i) => {
    const x = x0 + (i % 2) * (tw + gap), y = y0 + Math.floor(i / 2) * (th + gap);
    b += P.box(x, y, tw, th, 4, C.slot);
    b += P.icon(ic, x + 16, y + 16, 5, col);
    b += P.plain(P.fit(String(val), 5, tw - 90), x + 76, y + 14, 5, INK);
    b += P.plain(P.fit(label, 3, tw - 92), x + 76, y + 60, 3, C.grey);
  });
  b += P.plain('CONTRIBS, COMMITS, STREAKS: LAST 365 DAYS', x0, ny + 2, 2, C.grey);
  b += P.plain('XP = CONTRIB X10 + STAR X50 + REPO X20 + FAN X20', x0, ny + 24, 2, C.grey);
  return P.svg(w + 6, h + 6, b, `Stats: ${s.contrib} contributions, ${s.stars} stars, ${s.current}-day streak`);
}

const MEDAL = ['RR......BB', '.RR....BB.', '..RR..BB..', '...RRBB...', '..KKKKKK..', '.KYYYYYYK.', 'KYYWYYYYOK',
  'KYWYYYYYOK', 'KYYYYYYYOK', 'KYYYYYYOOK', '.KYYYYOOK.', '..KKKKKK..'];
const LOCK = ['.KKK.', 'K...K', 'KKKKK', 'KK.KK', 'KKKKK'];
function achievements(s) {
  const w = CW, col = 200, rowH = 84, x0 = 18, y0 = 72;
  const list = s.achievements, got = list.filter(a => a[2]).length;
  const h = y0 + Math.ceil(list.length / 3) * rowH + 6;
  let b = P.win(0, 0, w, h, C.paper) + band(w, 'TROPHY ROOM', `${got}/${list.length}`, got ? C.yellow : C.lgrey, false);
  list.forEach(([name, req, ok, ribbon], i) => {
    const x = x0 + (i % 3) * col, y = y0 + Math.floor(i / 3) * rowH;
    const pal = ok
      ? { R: ribbon, B: darken(ribbon, 0.7), K: INK, Y: C.yellow, W: C.paper, O: C.orange }
      : { R: C.lgrey, B: C.lgrey, K: C.lgrey, Y: C.slot, W: C.slot, O: C.slot };
    b += ok ? `<g class="${i % 2 ? '' : 'bob'}">${P.sprite(MEDAL, pal, x, y, 4)}</g>` : P.sprite(MEDAL, pal, x, y, 4) + P.sprite(LOCK, { K: C.grey }, x + 13, y + 26, 3);
    b += P.plain(name, x + 50, y + 6, 3, ok ? INK : C.lgrey);
    b += P.plain(req, x + 50, y + 36, 2, ok ? C.grey : C.lgrey);
  });
  return P.svg(w + 6, h + 6, b, `Achievements ${got}/${list.length}: ` + list.filter(a => a[2]).map(a => a[0]).join(', '));
}

const LEVEL = { NONE: '#ebedf0', FIRST_QUARTILE: '#9be9a8', SECOND_QUARTILE: '#40c463', THIRD_QUARTILE: '#30a14e', FOURTH_QUARTILE: '#216e39' };
function blackhole(s) {
  const cal = s.activity.calendar;
  const W = CW + 6, H = 250, CELL = 8, GAP = 3, STEP = CELL + GAP, T = 12;
  const weeks = cal.weeks.slice(-53);
  const gw = weeks.length * STEP - GAP, gx = Math.round((W - 6 - gw) / 2), gy = 76;
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
  const total = cal.totalContributions, label = `${total} CONTRIB${total === 1 ? '' : 'S'} / 365 DAYS`;
  const css = `<style>
.o{transform-origin:${cx}px ${cy}px;animation:orbit ${T}s cubic-bezier(.55,0,.9,.5) infinite}
.c{transform-box:fill-box;transform-origin:center;animation:fall ${T}s cubic-bezier(.55,0,.9,.5) infinite}
@keyframes orbit{0%,16%{transform:rotate(0)}60%,80%{transform:rotate(-420deg)}80.01%,100%{transform:rotate(0)}}
@keyframes fall{0%,16%{transform:translate(0,0) scale(1);opacity:1}60%{transform:translate(var(--dx),var(--dy)) scale(0) rotate(180deg);opacity:1}80%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}80.01%{transform:translate(0,0) scale(1);opacity:0}94%,100%{transform:translate(0,0) scale(1);opacity:1}}
.bh{transform-origin:${cx}px ${cy}px;transform:scale(.6);animation:bh ${T}s ease-in-out infinite}
@keyframes bh{0%,10%{transform:scale(.6)}24%,60%{transform:scale(1)}68%{transform:scale(1.3)}76%{transform:scale(1)}92%,100%{transform:scale(.6)}}
.spin{animation:spin 3s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.glow{animation:glow .5s steps(1) infinite}@keyframes glow{50%{opacity:.55}}
.warn{animation:warn ${T}s steps(1) infinite}@keyframes warn{0%,15%{opacity:0}16%,78%{opacity:1}79%,100%{opacity:0}}
.warn2{animation:blink .6s steps(1) infinite}@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.o,.c,.bh,.spin,.glow,.warn,.warn2{animation:none}.bh{transform:scale(.6)}.warn{opacity:0}}
</style>`;
  let b = P.win(0, 0, W - 6, H - 6, C.paper);
  b += P.plain('CONTRIB MAP', 22, 22, 3, INK);
  const warn = 'HORIZON!';
  b += `<g class="warn">${P.plain(warn, W - 32 - P.textW(warn, 3), 22, 3, C.red, 'warn2')}</g>`;
  b += `<clipPath id="field"><rect x="8" y="${gy - 24}" width="${W - 22}" height="${7 * STEP - GAP + 48}"/></clipPath><g clip-path="url(#field)">`;
  // the hole sits above the cells, so they vanish behind the event horizon; at rest it stays
  // visible at 60% size, which is also what renderers without CSS animation show
  b += cells;
  b += `<g class="bh"><g transform="translate(${cx} ${cy})"><g transform="scale(1 .38)"><g class="spin">${disk}</g></g>`;
  b += `<path fill="${C.lav}" opacity=".7" d="${halo}"/><path class="glow" fill="${C.orange}" d="${ringPx}"/><path fill="#000000" d="${core}"/></g></g></g>`;
  const by = H - 56;
  b += P.plain(label, 22, by, 3, C.grey);
  const lx = W - 32 - (5 * 18 - 4);
  Object.values(LEVEL).forEach((c, i) => (b += `<rect x="${lx + i * 18}" y="${by + 3}" width="14" height="14" fill="${c}"/>`));
  return P.svg(W, H, b, `${total} contributions in the last year`, css);
}

function footer() {
  const W = 960, H = 160, B = 6, GY = 128;
  let b = P.box(0, 0, W, H, 8, INK);
  b += `<clipPath id="fin"><path d="${P.boxD(B, B, W - 2 * B, H - 2 * B, 6)}"/></clipPath><g clip-path="url(#fin)">`;
  b += P.skyBands(0, 0, W, GY) + P.cloud(60, 24, 3) + P.cloud(820, 18, 3) + P.ground(W, GY, H - GY, 29);
  b += P.robot(130, GY - 4 - P.ROBOT.length * 3, 3) + P.robot(W - 130 - 48, GY - 4 - P.ROBOT.length * 3, 3) + '</g>';
  const t1 = 'THANKS FOR PLAYING!';
  b += P.logo(t1, (W - (t1.length * 35 - 10)) / 2, 26, 5, C.yellow);
  b += P.plain('CONTINUE? 9', (W - P.textW('CONTINUE? 9', 3)) / 2, 82, 3, INK, 'blink');
  return P.svg(W, H, b, 'Thanks for playing!');
}

// ---------------- README ----------------
// section headers are shown at 80% so they stay smaller than the cards on a phone
const hdr = (file, alt, files) => `<img src="./assets/${file}" width="${Math.round(/width="(\d+)"/.exec(files[file])[1] * 0.8)}" alt="${alt}" />`;
function readme(s, files) {
  const L = s.user.login;
  const card = (file, alt) => `<img src="./assets/${file}" width="640" alt="${P.esc(alt)}" />`;
  const qs = s.quests.length
    ? s.quests.map((r, i) => `<a href="${r.url}">${card(`quest-${i + 1}.svg`, `QUEST ${i + 1}: ${r.name}`)}</a>`).join('\n')
    : card('quest-none.svg', 'No quests yet');
  return `<!-- Generated by scripts/render.js from live GitHub data. Edit the script, not this file. -->
<div align="center">

<img src="./assets/banner.svg" width="100%" alt="${P.esc(s.displayName)} · LV ${s.lv} ${s.cls}" />

<img src="https://komarev.com/ghpvc/?username=${L}&style=for-the-badge&color=ff77a8&label=VISITORS" alt="visitors" />

</div>

<br />

${hdr('header-player.svg', 'PLAYER INFO · 玩家信息', files)}

${card('player.svg', s.displayName)}

${hdr('header-inventory.svg', 'INVENTORY · 装备栏', files)}

${card('inventory.svg', 'Languages')}

${hdr('header-quests.svg', 'QUEST LOG · 任务日志', files)}

${qs}

${hdr('header-trophies.svg', 'TROPHIES · 成就', files)}

${card('achievements.svg', 'Achievements')}

${hdr('header-stats.svg', 'STATS · 角色属性', files)}

${card('stats.svg', 'Stats')}

${hdr('header-blackhole.svg', 'BLACK HOLE · 贡献黑洞', files)}

${card('blackhole.svg', 'Contribution map being pulled into a pixel black hole')}

<br />

<img src="./assets/footer.svg" width="100%" alt="Thanks for playing!" />
`;
}

// ---------------- main ----------------
(async () => {
  const data = opt('--data') ? JSON.parse(fs.readFileSync(opt('--data'), 'utf8')) : await load();
  if (opt('--save')) fs.writeFileSync(opt('--save'), JSON.stringify(data, null, 1));
  const now = Date.now();
  const s = derive(data, now);
  const dir = path.join(OUT, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^quest-.*\.svg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const files = {
    'banner.svg': banner(s), 'player.svg': player(s), 'inventory.svg': inventory(s), 'stats.svg': stats(s),
    'achievements.svg': achievements(s), 'blackhole.svg': blackhole(s), 'footer.svg': footer(),
    'header-player.svg': P.header('PLAYER INFO', 'heart', C.red, C.palePink, '玩家信息'),
    'header-inventory.svg': P.header('INVENTORY', 'gem', C.blue, C.paleBlue, '装备栏'),
    'header-quests.svg': P.header('QUEST LOG', 'sword', C.orange, C.paleYellow, '任务日志'),
    'header-trophies.svg': P.header('TROPHIES', 'star', C.orange, C.paleYellow, '成就'),
    'header-stats.svg': P.header('STATS', 'chart', C.green, C.paleGreen, '角色属性'),
    'header-blackhole.svg': P.header('BLACK HOLE', 'hole', C.purple, C.palePurple, '贡献黑洞'),
  };
  s.quests.forEach((r, i) => (files[`quest-${i + 1}.svg`] = quest(r, i, now)));
  if (!s.quests.length) files['quest-none.svg'] = emptyQuest();
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), c);
  fs.writeFileSync(path.join(OUT, 'README.md'), readme(s, files));
  const got = s.achievements.filter(a => a[2]).length;
  console.log(`rendered ${Object.keys(files).length} images for ${s.user.login}: LV ${s.lv} ${s.cls}, ${s.langs.length} languages, ${s.quests.length} quests, ${got}/${s.achievements.length} trophies`);
})().catch(e => { console.error(e); process.exit(1); });
