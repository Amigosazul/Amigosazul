// Pixel-art drawing helpers shared by render.js (light theme, for white backgrounds).

const C = {
  black: '#000000', ink: '#10173a', navy: '#1d2b53', purple: '#7e2553', dgreen: '#008751',
  dgrey: '#5f574f', lgrey: '#c2c3c7', red: '#ff004d', orange: '#ffa300', yellow: '#ffec27',
  green: '#00e436', blue: '#29adff', lav: '#83769c', pink: '#ff77a8', peach: '#ffccaa',
  sky1: '#eef9ff', sky2: '#daf2ff', sky3: '#c4e9ff', cloudShade: '#cfe6f3',
  hill: '#bdeab0', hill2: '#95d98a', dirt: '#e3a46b', dirt2: '#c47d43', paper: '#ffffff',
  palePink: '#ffe3ee', paleYellow: '#fff6c2', paleBlue: '#dff3ff', paleGreen: '#dcf8e3', palePurple: '#efe3ff',
  grey: '#5f574f', gold: '#c97a00', slot: '#f3f6fa',
};
const INK = C.navy;

// ---------- 5x7 pixel font ----------
const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'], J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'], N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'], ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'], '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'], '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'], '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'], ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'], ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'], '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'], "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'], '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
};
const canPixel = s => [...String(s).toUpperCase()].every(ch => G[ch]);
const up = s => [...String(s).toUpperCase()].map(ch => (G[ch] ? ch : ' ')).join('');
const textW = (s, k, adv = 6) => s.length * adv * k - (adv - 5) * k;
const fit = (s, k, maxW) => { s = up(s); const n = Math.floor((maxW + k) / (6 * k)); return s.length > n ? s.slice(0, n - 2) + '..' : s; };

function bitmapPath(rows, x, y, k, on = '#') {
  let d = '';
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== on) { c++; continue; }
      let e = c;
      while (e < row.length && row[e] === on) e++;
      d += `M${x + c * k} ${y + r * k}h${(e - c) * k}v${k}h${-(e - c) * k}z`;
      c = e;
    }
  });
  return d;
}
function textPath(str, x, y, k, adv = 6) {
  let d = '';
  [...up(str)].forEach((ch, i) => (d += bitmapPath(G[ch], x + i * adv * k, y, k)));
  return d;
}
const plain = (str, x, y, k, color, cls = '') => `<path${cls ? ` class="${cls}"` : ''} fill="${color}" d="${textPath(str, x, y, k)}"/>`;
// Arcade-logo text: ink outline + drop shadow + fill (wider letter spacing)
function logo(str, x, y, k, fill) {
  const offs = [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, -k], [-k, k], [k, k], [-k, 2 * k], [0, 2 * k], [k, 2 * k]];
  let d = '';
  for (const [dx, dy] of offs) d += textPath(str, x + dx, y + dy, k, 7);
  return `<path fill="${INK}" d="${d}"/><path fill="${fill}" d="${textPath(str, x, y, k, 7)}"/>`;
}
// Non-pixel text (for free text such as descriptions that may contain Chinese)
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FONT = `'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Noto Sans SC','Segoe UI',sans-serif`;
const charW = (ch, size) => (/[⺀-￿]/.test(ch) ? size : size * 0.56);
function clip(s, size, maxW) {
  let w = 0, out = '';
  for (const ch of String(s)) { w += charW(ch, size); if (w > maxW) return out.trimEnd() + '…'; out += ch; }
  return out;
}
const sysText = (s, x, y, size, color, weight = 400) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" shape-rendering="auto">${esc(s)}</text>`;

function sprite(rows, pal, x, y, k) {
  const keys = new Set(rows.join('').replace(/\./g, ''));
  return [...keys].map(ch => `<path fill="${pal[ch]}" d="${bitmapPath(rows, x, y, k, ch)}"/>`).join('');
}
const mirror = half => half.map(r => r + [...r].reverse().join(''));

const ROBOT = mirror([
  '.......R', '.......K', '....KKKK', '...KWWWW', '...KWDDD', '...KWDGD', '...KWDDD', '...KWDGG', '...KWWWW',
  '....KKKK', '.......K', '...KKKKK', '..KBBBBB', '.KWKBBBY', '.KK.KBBB', '....KBBK', '....KKK.',
]);
const ROBOT_PAL = { K: C.black, W: C.lgrey, D: C.ink, G: C.green, B: C.blue, Y: C.yellow, R: C.red };
function robot(x, y, k, cls = 'bob') {
  const body = ROBOT.map((r, i) => (i === 0 ? r.replace(/R/g, '.') : r));
  const light = ROBOT.map((r, i) => (i === 0 ? r : '.'.repeat(r.length)));
  return `<g class="${cls}">${sprite(body, ROBOT_PAL, x, y, k)}<g class="blink">${sprite(light, ROBOT_PAL, x, y, k)}</g></g>`;
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

const STYLE = `<style>
.bob{animation:bob 1.2s infinite}
@keyframes bob{0%,49%{transform:translateY(0)}50%,100%{transform:translateY(-6px)}}
.blink{animation:blink 1s infinite}
@keyframes blink{0%,59%{opacity:1}60%,100%{opacity:0}}
.ray{animation:blink 1.6s infinite}
.grow{transform-box:fill-box;transform-origin:left center;animation:grow 6s steps(1) infinite}
@keyframes grow{0%{transform:scaleX(0)}8%{transform:scaleX(.2)}16%{transform:scaleX(.4)}24%{transform:scaleX(.6)}32%{transform:scaleX(.8)}40%,100%{transform:scaleX(1)}}
.drift{animation:drift 30s linear infinite}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-960px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
const svg = (w, h, body, label, style = STYLE) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${style}${body}</svg>\n`;

const boxD = (x, y, w, h, n) => `M${x + n} ${y}h${w - 2 * n}v${n}h${n}v${h - 2 * n}h${-n}v${n}h${-(w - 2 * n)}v${-n}h${-n}v${-(h - 2 * n)}h${n}z`;
const box = (x, y, w, h, n, fill) => `<path fill="${fill}" d="${boxD(x, y, w, h, n)}"/>`;
// pixel "window": hard drop shadow + ink border + fill. Total footprint is (w+sh) x (h+sh).
const win = (x, y, w, h, fill, sh = 6, bw = 4) =>
  box(x + sh, y + sh, w, h, bw, INK) + box(x, y, w, h, bw, INK) + box(x + bw, y + bw, w - 2 * bw, h - 2 * bw, bw, fill);

const CLOUD = ['....KKKK........', '...KWWWWK.KKK...', '..KWWWWWWKWWWK..', '.KWWWWWWWWWWWWK.', 'KWWWWWWWWWWWWWWK', 'KLLLLLLLLLLLLLLK', '.KKKKKKKKKKKKKK.'];
const cloud = (x, y, k) => sprite(CLOUD, { K: INK, W: C.paper, L: C.cloudShade }, x, y, k);

function sun(cx, cy, k) {
  const R = 5, rows = [];
  for (let y = -R - 1; y <= R; y++) {
    let row = '';
    for (let x = -R - 1; x <= R; x++) { const d = Math.hypot(x + 0.5, y + 0.5); row += d <= R - 1 ? 'Y' : d <= R ? 'O' : d <= R + 1 ? 'K' : '.'; }
    rows.push(row);
  }
  const n = rows.length * k;
  let s = '<g class="ray">';
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const dist = n / 2 + 3 * k, f = dx && dy ? 0.75 : 1;
    s += `<rect x="${Math.round((cx + dx * dist * f) / k) * k - k}" y="${Math.round((cy + dy * dist * f) / k) * k - k}" width="${2 * k}" height="${2 * k}" fill="${C.orange}"/>`;
  }
  return s + '</g>' + sprite(rows, { Y: C.yellow, O: C.orange, K: INK }, cx - n / 2, cy - n / 2, k);
}
function hills(W, base) {
  let s = '';
  const layer = (amp, off, freq, col, edge) => {
    for (let x = 0; x < W; x += 8) {
      const h = Math.round((amp * (0.5 + 0.5 * Math.sin(x / freq + off)) + 10) / 4) * 4;
      s += `<rect x="${x}" y="${base - h}" width="8" height="${h}" fill="${col}"/><rect x="${x}" y="${base - h}" width="8" height="4" fill="${edge}"/>`;
    }
  };
  layer(54, 1.3, 70, C.hill, C.hill2);
  layer(30, 4.1, 46, C.hill2, '#6cc26a');
  return s;
}
function ground(W, y, h, seed) {
  const r = rng(seed);
  let s = `<rect x="0" y="${y}" width="${W}" height="${h}" fill="${C.dirt}"/><rect x="0" y="${y - 4}" width="${W}" height="4" fill="${INK}"/>`;
  s += `<rect x="0" y="${y}" width="${W}" height="8" fill="${C.green}"/><rect x="0" y="${y + 8}" width="${W}" height="4" fill="${C.dgreen}"/>`;
  for (let i = 0; i < W / 12; i++) {
    const x = Math.floor(r() * (W / 4)) * 4, yy = y + 16 + Math.floor(r() * Math.max(1, (h - 20) / 4)) * 4;
    s += `<rect x="${x}" y="${yy}" width="${r() < 0.5 ? 8 : 4}" height="4" fill="${C.dirt2}"/>`;
  }
  return s;
}
function skyBands(x, y, w, h) {
  const bands = [C.sky1, C.sky2, C.sky3], bh = h / bands.length;
  let s = '';
  bands.forEach((c, i) => (s += `<rect x="${x}" y="${Math.round(y + i * bh)}" width="${w}" height="${Math.ceil(bh)}" fill="${c}"/>`));
  for (let i = 1; i < bands.length; i++) {
    const yy = Math.round(y + i * bh);
    for (let xx = x; xx < x + w; xx += 8) s += `<rect x="${xx + (((xx - x) / 8) % 2) * 4}" y="${yy}" width="4" height="4" fill="${bands[i - 1]}"/>`;
  }
  return s;
}

const ICONS = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  gem: ['..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  sword: ['......#', '.....#.', '#...#..', '.#.#...', '..#....', '.#.#...', '#......'],
  chart: ['......#', '......#', '...#..#', '...#..#', '#..#..#', '#..#..#', '#######'],
  hole: ['..###..', '.#...#.', '#..#..#', '#.#.#.#', '#..#..#', '.#...#.', '..###..'],
  star: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  fork: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  fire: ['...#...', '..##...', '..###..', '.#####.', '.##.##.', '##...##', '.#####.'],
  bolt: ['...##', '..##.', '.##..', '#####', '..##.', '.##..', '##...'],
  bug: ['#.#.#', '.###.', '#####', '.###.', '#####', '.###.', '#...#'],
  merge: ['#....', '#....', '#..#.', '#.#..', '##...', '#....', '#....'],
  calendar: ['#######', '#.#.#.#', '#######', '#.#.#.#', '#######', '#.#.#.#', '#######'],
};
const icon = (name, x, y, k, color) => `<path fill="${color}" d="${bitmapPath(ICONS[name], x, y, k)}"/>`;

function header(label, iconName, color, tint, zh) {
  const k = 4, pad = 18, iw = 7 * k, ih = ICONS[iconName].length * k, zw = zh.length * 20 + 18;
  const w = pad + iw + 16 + textW(label, k) + zw + pad, h = 7 * k + 28;
  let b = win(0, 0, w, h, C.paper);
  b += `<rect x="4" y="${h - 12}" width="${w - 8}" height="8" fill="${tint}"/>`;
  b += icon(iconName, pad, (h - ih) / 2 - 2, k, color);
  b += plain(label, pad + iw + 16, (h - 7 * k) / 2 - 2, k, INK);
  b += `<text x="${pad + iw + 16 + textW(label, k) + 16}" y="${h / 2 + 5}" font-family="${FONT}" font-size="19" font-weight="700" fill="${INK}" shape-rendering="auto">${zh}</text>`;
  return svg(w + 6, h + 6, b, `${label} ${zh}`);
}

module.exports = {
  C, INK, G, canPixel, up, textW, fit, bitmapPath, textPath, plain, logo, esc, FONT, clip, sysText, sprite, mirror,
  ROBOT, robot, rng, STYLE, svg, boxD, box, win, cloud, sun, hills, ground, skyBands, ICONS, icon, header,
};
