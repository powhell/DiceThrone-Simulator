// Génère une TRACE WEB lisible de 3 parties : un tour = une carte, dés en pastilles, chaque
// relance visible, décisions de l'IA surlignées, couleurs par joueur. Sortie = HTML autonome.
// Usage : node calibration/dump_games_html.mjs [--out <fichier.html>]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const pol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const OUT = argVal('out', path.join(root, 'calibration/trace_3_parties.html'))

const GAMES = [['th', 'sm', 3], ['th', 'fm', 2], ['th', 'se', 1]]
const HERO_NAMES = { th: 'Thor', sm: 'Spider-Man', fm: 'Forgemaster', se: 'Sun Elf', hh: 'Headless Horseman', bw: 'Black Widow', rv: 'Raveness', dr: 'Druid', py: 'Pyromancer', du: 'Duelist', nx: 'Naraxus' }

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Remplace les groupes de dés [1,3,4,5,6] par des pastilles colorées (1-3 marteau, 4-5 digne, 6 tonnerre).
function diceChips(msg) {
  return esc(msg).replace(/\[(\d(?:,\d){0,4})\]/g, (m, grp) => {
    const chips = grp.split(',').map(d => {
      const v = +d
      const cls = v <= 3 ? 'd-a' : v <= 5 ? 'd-b' : 'd-c'
      return `<span class="die ${cls}">${v}</span>`
    }).join('')
    return `<span class="dice">${chips}</span>`
  })
}

// Classe visuelle d'une ligne selon son contenu (pour surligner les moments-clés).
function lineKind(phase, msg) {
  if (msg.startsWith('=====')) return 'turnhead'
  if (msg.startsWith('Roll (relances')) return 'roll'
  if (msg.startsWith('Final dice')) return 'finaldice'
  if (msg.startsWith('Chose ability')) return 'decision'
  if (/attack total|attack is UNDEFENDABLE|dmg \(undefendable\)/.test(msg)) return 'attack'
  if (phase === 'defense') return 'defense'
  if (msg.startsWith('HP:')) return 'endturn'
  if (/^Played |shuttle|: \+|drew|Gain|Heal|EK|Guard Break|CP/.test(msg)) return 'effect'
  return 'other'
}

function renderGame(heroA, heroB, seed) {
  const r = G.runMatch(heroA, heroB, seed, [pol, pol])
  const st = r.finalState
  const nameOf = i => HERO_NAMES[st.players[i].heroId] ?? st.players[i].heroId
  const winner = r.winner === null ? (st.gameOver ? 'Match nul (double KO)' : 'Temps écoulé') : `${nameOf(r.winner)} gagne`
  const winClass = r.winner === 0 ? 'win-a' : r.winner === 1 ? 'win-b' : 'win-draw'

  // Regrouper par tour
  const turns = []
  let cur = null
  for (const e of st.log) {
    if (e.message.startsWith('=====')) { cur = { turn: e.turn, activeIdx: e.playerIdx, header: e.message, events: [] }; turns.push(cur) }
    else if (cur) cur.events.push(e)
    else { cur = { turn: e.turn, activeIdx: e.playerIdx, header: null, events: [e] }; turns.push(cur) }
  }

  const turnHtml = turns.map(t => {
    // Parse l'en-tête : "===== TH turn — th HP50 CP2 mjolnir:home | vs sm HP50 CP2 (hand 4)"
    const active = HERO_NAMES[st.players[t.activeIdx].heroId] ?? st.players[t.activeIdx].heroId
    let sideA = '', sideB = ''
    if (t.header) {
      const body = t.header.replace('=====', '').trim()
      const m = body.match(/—\s*(.*?)\s*\|\s*vs\s*(.*)/)
      if (m) { sideA = m[1]; sideB = m[2] }
    }
    const evHtml = t.events.map(e => {
      const kind = lineKind(e.phase, e.message)
      const isActive = e.playerIdx === t.activeIdx
      const hero = st.players[e.playerIdx].heroId
      // Réécrit "HP: self=X, opp=Y" en noms ABSOLUS (self/opp changeaient de sens chaque tour).
      let msg = e.message
      const hp = msg.match(/^HP: self=(-?\d+), opp=(-?\d+)/)
      if (hp) {
        const selfH = st.players[e.playerIdx].heroId, oppH = st.players[(1 - e.playerIdx)].heroId
        msg = `PV: ${selfH}=${hp[1]}, ${oppH}=${hp[2]}`
      }
      return `<div class="ev ${kind} ${isActive ? 'act' : 'opp'}">`
        + `<span class="who">${hero}</span>`
        + `<span class="ph">${esc(e.phase)}</span>`
        + `<span class="msg">${diceChips(msg)}</span></div>`
    }).join('')
    return `<div class="turn">`
      + `<div class="turnbar"><span class="tnum">Tour ${t.turn}</span><span class="tactive">${esc(active)} joue</span>`
      + `<span class="tstate"><b>${esc(sideA)}</b><span class="vs">vs</span>${esc(sideB)}</span></div>`
      + `<div class="events">${evHtml}</div></div>`
  }).join('')

  return `<section class="game">
    <div class="ghead ${winClass}">
      <div class="gtitle">${esc(nameOf(0))} <span class="vs2">vs</span> ${esc(nameOf(1))}</div>
      <div class="gmeta"><span class="res">${esc(winner)}</span> · ${r.turns} tours · PV finaux ${esc(nameOf(0))} ${st.players[0].hp} / ${esc(nameOf(1))} ${st.players[1].hp} · seed ${seed}</div>
    </div>
    ${turnHtml}
  </section>`
}

const body = GAMES.map(([a, b, s]) => renderGame(a, b, s)).join('\n')

const html = `<title>Trace de parties — Thor</title>
<style>
  :root{ --bg:#eef1f8;--sur:#fff;--sur2:#f5f7fc;--ink:#1a2033;--soft:#55607d;--faint:#8791ab;--line:#dde2ef;
    --accent:#128aa0;--gold:#b7822a;--good:#1f9e78;--warn:#cf7a12;--crit:#d63a54;
    --da:#e7edf7;--dab:#12507a;--db:#fbeed9;--dbb:#8a5a10;--dc:#e6f6f2;--dcb:#0f7a5e; }
  @media(prefers-color-scheme:dark){:root{ --bg:#0f1420;--sur:#171d2e;--sur2:#131828;--ink:#e6eaf5;--soft:#a3adca;--faint:#6f7a99;--line:#262f45;
    --accent:#38d6ef;--gold:#e6b23c;--good:#34d3a6;--warn:#f0a83a;--crit:#ff5d73;
    --da:#1b2740;--dab:#7fb8e6;--db:#2e2413;--dbb:#e6b23c;--dc:#123027;--dcb:#34d3a6; }}
  :root[data-theme="light"]{ --bg:#eef1f8;--sur:#fff;--sur2:#f5f7fc;--ink:#1a2033;--soft:#55607d;--faint:#8791ab;--line:#dde2ef;--accent:#128aa0;--gold:#b7822a;--good:#1f9e78;--warn:#cf7a12;--crit:#d63a54;--da:#e7edf7;--dab:#12507a;--db:#fbeed9;--dbb:#8a5a10;--dc:#e6f6f2;--dcb:#0f7a5e; }
  :root[data-theme="dark"]{ --bg:#0f1420;--sur:#171d2e;--sur2:#131828;--ink:#e6eaf5;--soft:#a3adca;--faint:#6f7a99;--line:#262f45;--accent:#38d6ef;--gold:#e6b23c;--good:#34d3a6;--warn:#f0a83a;--crit:#ff5d73;--da:#1b2740;--dab:#7fb8e6;--db:#2e2413;--dbb:#e6b23c;--dc:#123027;--dcb:#34d3a6; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5;font-size:15px}
  .wrap{max-width:920px;margin:0 auto;padding:28px 18px 80px}
  h1{font-size:26px;letter-spacing:-.02em;margin:0 0 6px}
  .sub{color:var(--soft);margin:0 0 18px;font-size:14px;max-width:66ch}
  .legend{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:12.5px;color:var(--soft);margin:0 0 22px;padding:12px 14px;background:var(--sur2);border:1px solid var(--line);border-radius:12px}
  .legend .die{margin-right:5px}
  .legend b{color:var(--ink)}
  .game{margin:26px 0;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--sur);box-shadow:0 8px 24px rgba(20,30,60,.06)}
  .ghead{padding:16px 20px;border-bottom:1px solid var(--line);background:var(--sur2)}
  .gtitle{font-size:19px;font-weight:800;letter-spacing:-.01em}
  .vs2,.vs{color:var(--faint);font-weight:600;margin:0 6px;font-size:.85em}
  .gmeta{font-size:13px;color:var(--soft);margin-top:4px}
  .res{font-weight:700}
  .win-a .res{color:var(--gold)} .win-b .res{color:var(--accent)} .win-draw .res{color:var(--warn)}
  .turn{border-top:1px solid var(--line)}
  .turn:first-of-type{border-top:none}
  .turnbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 20px;background:linear-gradient(90deg,var(--sur2),transparent);position:sticky;top:0}
  .tnum{font-weight:800;font-size:13px;letter-spacing:.02em}
  .tactive{font-size:12px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
  .tstate{margin-left:auto;font-size:12px;color:var(--soft);font-family:ui-monospace,Consolas,monospace}
  .tstate b{color:var(--ink)}
  .events{padding:6px 14px 12px}
  .ev{display:grid;grid-template-columns:36px 92px 1fr;gap:10px;align-items:baseline;padding:3px 6px;border-radius:7px;font-size:13.5px}
  .ev .who{font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--faint);font-weight:700}
  .ev .ph{font-size:10.5px;color:var(--faint);font-family:ui-monospace,Consolas,monospace}
  .ev.act{border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 6%,transparent)}
  .ev.opp{border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 5%,transparent)}
  .ev.decision .msg{font-weight:800;color:var(--accent)}
  .ev.finaldice .msg{font-weight:700}
  .ev.attack .msg{font-weight:700;color:var(--crit)}
  .ev.endturn{margin-top:4px;background:var(--sur2)!important;border-left-color:var(--faint)!important}
  .ev.endturn .msg{font-weight:700}
  .ev.roll .msg{color:var(--soft)}
  .msg{word-break:break-word}
  .dice{display:inline-flex;gap:4px;vertical-align:middle;margin:0 2px}
  .die{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border-radius:6px;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums}
  .die.d-a{background:var(--da);color:var(--dab)} .die.d-b{background:var(--db);color:var(--dbb)} .die.d-c{background:var(--dc);color:var(--dcb)}
  footer{margin-top:30px;color:var(--faint);font-size:12.5px;text-align:center}
</style>
<div class="wrap">
  <h1>Trace de 3 parties — Thor</h1>
  <p class="sub">Chaque tour, chaque relance et chaque décision de l'IA. Les dés d'un jet qui ne changent pas au jet suivant sont ceux que le solveur a gardés. Bordure <b style="color:var(--gold)">dorée</b> = joueur actif, <b style="color:var(--accent)">cyan</b> = adversaire.</p>
  <div class="legend">
    <span><span class="die d-a">2</span> Marteau (1-3)</span>
    <span><span class="die d-b">4</span> Digne (4-5)</span>
    <span><span class="die d-c">6</span> Tonnerre (6)</span>
    <span><b style="color:var(--accent)">Chose ability</b> = décision d'attaque de l'IA</span>
    <span><b style="color:var(--crit)">attack total</b> = dégâts lancés</span>
  </div>
  ${body}
  <footer>Généré par calibration/dump_games_html.mjs · policy réseau (value-greedy) des deux côtés</footer>
</div>`

fs.writeFileSync(OUT, html)
console.log(`Écrit : ${OUT}`)
