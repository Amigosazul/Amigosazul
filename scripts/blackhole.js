// Renders the contribution calendar as a pixel-art card where every cell
// gets pulled into a black hole, then pops back. No dependencies (Node 18+).
//
//   GITHUB_TOKEN=... node scripts/blackhole.js <user> <out.svg>
//   node scripts/blackhole.js <user> <out.svg> --data contrib.json
const fs = require('fs');

const [user = 'Amigosazul', out = 'assets/blackhole.svg'] = process.argv.slice(2);
const dataIdx = process.argv.indexOf('--data');

const QUERY = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
  totalContributions weeks{contributionDays{date contributionCount contributionLevel weekday}}}}}}`;

async function load() {
  if (dataIdx > -1) return JSON.parse(fs.readFileSync(process.argv[dataIdx + 1], 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required (or pass --data file.json)');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'blackhole-svg' },
    body: JSON.stringify({ query: QUERY, variables: { login: user } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json;
}

// ---------- pixel font (5x7) ----------
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
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'], '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
};
const textW = (s, k) => s.length * 6 * k - k;
function textPath(str, x, y, k) {
  let d = '';
  [...str].forEach((ch, i) => {
    const g = G[ch] || G[' '];
    g.forEach((row, r) => {
      for (let c = 0; c < 5; c++) if (row[c] === '#') {
        let e = c; while (e < 5 && row[e] === '#') e++;
        d += `M${x + i * 6 * k + c * k} ${y + r * k}h${(e - c) * k}v${k}h${-(e - c) * k}z`;
        c = e;
      }
    });
  });
  return d;
}
const boxD = (x, y, w, h, n) => `M${x + n} ${y}h${w - 2 * n}v${n}h${n}v${h - 2 * n}h${-n}v${n}h${-(w - 2 * n)}v${-n}h${-n}v${-(h - 2 * n)}h${n}z`;

const INK = '#1d2b53';
const LEVEL = { NONE: '#ebedf0', FIRST_QUARTILE: '#9be9a8', SECOND_QUARTILE: '#40c463', THIRD_QUARTILE: '#30a14e', FOURTH_QUARTILE: '#216e39' };

function render(cal) {
  const W = 880, H = 270, CELL = 12, GAP = 3, STEP = CELL + GAP;
  const weeks = cal.weeks.slice(-53);
  const gw = weeks.length * STEP - GAP, gx = Math.round((W - gw) / 2), gy = 66;
  const cx = gx + gw / 2, cy = gy + (7 * STEP - GAP) / 2;
  const T = 14; // seconds per cycle
  const maxD = Math.hypot(gw / 2, (7 * STEP) / 2);

  let cells = '';
  weeks.forEach((wk, wi) => wk.contributionDays.forEach(day => {
    const x = gx + wi * STEP, y = gy + day.weekday * STEP;
    const dx = cx - (x + CELL / 2), dy = cy - (y + CELL / 2);
    const delay = ((Math.hypot(dx, dy) / maxD) * 2.6).toFixed(2); // near cells fall in first
    cells += `<g class="o" style="animation-delay:${delay}s"><rect class="c" x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${LEVEL[day.contributionLevel] || LEVEL.NONE}" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;animation-delay:${delay}s"/></g>`;
  }));

  // accretion disk: pixels on a flattened ring, spinning
  const disk = [];
  const cols = ['#ffec27', '#ffa300', '#ff77a8', '#ff004d', '#ffa300', '#ffccaa'];
  for (let ring = 0; ring < 6; ring++) {
    const r = 36 + ring * 8, n = 34 + ring * 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring;
      const s = ring < 3 ? 6 : 4;
      disk.push(`<rect x="${(Math.cos(a) * r - s / 2).toFixed(1)}" y="${(Math.sin(a) * r - s / 2).toFixed(1)}" width="${s}" height="${s}" fill="${cols[(i + ring) % cols.length]}" opacity="${(1 - ring * 0.13).toFixed(2)}"/>`);
    }
  }
  // pixelated core + photon ring
  let core = '', ringPx = '';
  for (let y = -8; y < 8; y++) for (let x = -8; x < 8; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d <= 6) core += `M${x * 4} ${y * 4}h4v4h-4z`;
    else if (d <= 7.4) ringPx += `M${x * 4} ${y * 4}h4v4h-4z`;
  }
  let halo = '';
  for (let y = -11; y < 11; y++) for (let x = -11; x < 11; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d > 9.2 && d <= 10.2 && (x + y) % 2 === 0) halo += `M${x * 4} ${y * 4}h4v4h-4z`;
  }

  const total = cal.totalContributions;
  const label = `${total} CONTRIBUTION${total === 1 ? '' : 'S'} IN THE LAST YEAR`;

  const css = `
.o{transform-origin:${cx}px ${cy}px;animation:orbit ${T}s cubic-bezier(.55,0,.9,.5) infinite}
.c{transform-box:fill-box;transform-origin:center;animation:fall ${T}s cubic-bezier(.55,0,.9,.5) infinite}
@keyframes orbit{0%,35%{transform:rotate(0)}72%,90%{transform:rotate(-420deg)}90.01%,100%{transform:rotate(0)}}
@keyframes fall{0%,35%{transform:translate(0,0) scale(1);opacity:1}72%{transform:translate(var(--dx),var(--dy)) scale(0) rotate(180deg);opacity:1}90%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}90.01%{transform:translate(0,0) scale(1);opacity:0}100%{transform:translate(0,0) scale(1);opacity:1}}
.bh{transform-origin:${cx}px ${cy}px;animation:bh ${T}s ease-in-out infinite}
@keyframes bh{0%,22%{transform:scale(0)}34%{transform:scale(1)}72%{transform:scale(1)}80%{transform:scale(1.25)}88%{transform:scale(1)}96%,100%{transform:scale(0)}}
.spin{animation:spin 3s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.glow{animation:glow .5s steps(1) infinite}
@keyframes glow{50%{opacity:.55}}
.warn{animation:warn ${T}s steps(1) infinite}
@keyframes warn{0%,30%{opacity:0}31%,88%{opacity:1}89%,100%{opacity:0}}
.warn2{animation:blink .6s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.o,.c,.bh,.spin,.glow,.warn,.warn2{animation:none}.bh{transform:scale(0)}.warn{opacity:0}}`;

  let b = '';
  b += `<path fill="${INK}" d="${boxD(6, 6, W - 6, H - 6, 4)}"/>`; // hard shadow
  b += `<path fill="${INK}" d="${boxD(0, 0, W - 6, H - 6, 4)}"/><path fill="#ffffff" d="${boxD(4, 4, W - 14, H - 14, 4)}"/>`;
  b += `<path fill="${INK}" d="${textPath('CONTRIBUTION MAP', 28, 26, 3)}"/>`;
  b += `<g class="warn"><path class="warn2" fill="#ff004d" d="${textPath('! EVENT HORIZON DETECTED', W - 34 - textW('! EVENT HORIZON DETECTED', 2), 30, 2)}"/></g>`;
  b += `<clipPath id="field"><rect x="10" y="${gy - 14}" width="${W - 26}" height="${7 * STEP - GAP + 28}"/></clipPath><g clip-path="url(#field)">`;
  b += `<g class="bh"><g transform="translate(${cx} ${cy})">`;
  b += `<g transform="scale(1 .38)"><g class="spin">${disk.join('')}</g></g>`;
  b += `<path fill="#83769c" opacity=".7" d="${halo}"/><path class="glow" fill="#ffa300" d="${ringPx}"/><path fill="#000000" d="${core}"/>`;
  b += `</g></g>`;
  b += cells + '</g>';
  // bottom: total + legend
  const by = H - 52;
  b += `<path fill="#5f574f" d="${textPath(label, 28, by, 2)}"/>`;
  const lx = W - 34 - (textW('LESS', 2) + 12 + 5 * 16 + 4 + textW('MORE', 2));
  b += `<path fill="#5f574f" d="${textPath('LESS', lx, by, 2)}"/>`;
  Object.values(LEVEL).forEach((c, i) => (b += `<rect x="${lx + textW('LESS', 2) + 12 + i * 16}" y="${by + 1}" width="12" height="12" fill="${c}"/>`));
  b += `<path fill="#5f574f" d="${textPath('MORE', lx + textW('LESS', 2) + 12 + 5 * 16 + 4, by, 2)}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${label}"><title>${user}: ${label}</title><style>${css}</style>${b}</svg>\n`;
}

load().then(json => {
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  const svg = render(cal);
  fs.mkdirSync(require('path').dirname(out), { recursive: true });
  fs.writeFileSync(out, svg);
  console.log(`${out}: ${svg.length} bytes, ${cal.totalContributions} contributions`);
}).catch(e => { console.error(e); process.exit(1); });
