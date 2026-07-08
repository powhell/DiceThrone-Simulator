/* Dice Throne — controller for the play-against-AI UI. Drives the sync interactive engine
   (window.Game, bundled from engine-ts/src/sim/browser.ts) through a small phase state machine.
   You are interactive on your own turn AND on defense: the AI's turn is decomposed so you play your
   defensive cards when it attacks (Game.runAiTurnUpToAttack -> nextDefenseDecision -> resolveAiAttack). */
'use strict';
(function () {
  const G = window.Game;
  if (!G) { document.getElementById('turntag').textContent = 'game-engine.js introuvable'; return; }

  // ---- dice symbols (recreated SVG), per hero, with each hero's face->class thresholds ----
  // All glyphs draw with fill:currentColor (see .glyph in CSS) so the same markup works both as a
  // big die face and as a small inline icon — the container just sets `color`. Carved/cut-out
  // details use the die's cream (#efe7d6) to read as negative space.
  const GLYPH = {
    // Headless Horseman — Axe (Hache), Horseshoe (Fer), Jack-o'-lantern (Frayeur)
    axe:'<g class="glyph"><rect x="29.5" y="13" width="5.5" height="39" rx="2.7" transform="rotate(22 32 32)"/><path d="M38 14c9-1 17 5 17 15-6-4-12-4-17-1-3-4-3-9 0-14z"/></g>',
    shoe:'<g class="glyph"><path d="M21 53V33c0-16 22-16 22 0v20h-8.5V33c0-5.5-5-5.5-5 0v20z"/><g fill="#2c1e46"><circle cx="25.5" cy="47" r="1.9"/><circle cx="38.5" cy="47" r="1.9"/><circle cx="24.5" cy="40" r="1.7"/><circle cx="39.5" cy="40" r="1.7"/></g></g>',
    scare:'<g class="glyph"><rect x="30" y="8" width="4.5" height="10" rx="2" transform="rotate(-8 32 13)"/><ellipse cx="32" cy="39" rx="23" ry="18"/><g fill="#2c1e46"><path d="M20 31l10 5-10 5z"/><path d="M44 31l-10 5 10 5z"/><path d="M20 46l5-2 4 3 3-3 3 3 4-3 5 2-4 7H24z"/></g></g>',
    // Black Widow — Eye (Espionnage), Batons (Bâtons), Spider (Veuve)
    eye:'<g class="glyph"><path d="M6 32c9-13 43-13 52 0-9 13-43 13-52 0z"/><g fill="#2c1e46"><circle cx="32" cy="32" r="9"/></g><circle cx="32" cy="32" r="4.3"/></g>',
    baton:'<g class="glyph"><rect x="11" y="28.5" width="42" height="7" rx="3.5" transform="rotate(-37 32 32)"/><rect x="11" y="28.5" width="42" height="7" rx="3.5" transform="rotate(37 32 32)"/></g>',
    spider:'<g class="glyph"><ellipse cx="32" cy="37" rx="8.5" ry="10.5"/><circle cx="32" cy="23" r="5.5"/><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M25 31L11 23M24 37H8M25 43L11 51M39 31l14-8M40 37h16M39 43l14 8"/></g></g>',
    // Forgemaster — Pick (pioche), Forge (marteau de forge), Anvil (enclume + éclat)
    pick:'<g class="glyph"><rect x="29.5" y="16" width="5" height="36" rx="2.5" transform="rotate(30 32 34)"/><path d="M14 22c10-8 26-8 36 0-4 3-7 6-8 9-9-6-11-6-20 0-1-3-4-6-8-9z"/></g>',
    forgehammer:'<g class="glyph"><rect x="29" y="24" width="6" height="28" rx="3" transform="rotate(38 32 38)"/><rect x="17" y="12" width="26" height="14" rx="4" transform="rotate(38 30 19)"/><path d="M44 44l3 3-2 5-5-2 1-4z"/><path d="M50 38l2 2-1 3-3-1z"/></g>',
    anvil:'<g class="glyph"><path d="M12 26h40c-2 6-8 9-14 10v6c4 1 7 3 8 7H18c1-4 4-6 8-7v-6c-8-1-12-4-14-10z"/><path d="M40 10l4 6-6-1 2 7-7-5 1 6-6-8 8 1-3-6z"/></g>'
  };
  const CLSCOL = { A:'#f3ede2', B:'#3fb6e8', C:'#ef6b2b' };
  function symIcon(hero, cls){ return `<svg class="msym" viewBox="0 0 64 64" style="color:${(hero.col||CLSCOL)[cls]}" aria-hidden="true">${hero.sym[cls]}</svg>`; }
  // A dice-requirement string -> symbols. "N-straight"/"suite N" -> badge; A/B/C letters -> icons.
  function renderReq(hero, raw){
    if(!raw) return '';
    const s=String(raw); const st=s.match(/(\d)\s*-?\s*straight|suite\s*(\d)/i);
    if(st) return `<span class="straightbadge">SUITE ${st[1]||st[2]}</span>`;
    const letters=s.match(/[ABCD]/g); // D = 4e symbole (Pyromancer : Meteor)
    if(letters&&letters.length) return `<span class="patt">${letters.map(c=>symIcon(hero,c)).join('')}</span>`;
    return `<span class="req">${s}</span>`;
  }
  // Engine ability names look like "Spectral Assault (AAACC)" -> clean name + symbol requirement.
  function formatAbility(hero, fullName){
    const m=String(fullName).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { name:m[1], req:renderReq(hero, m[2]) } : { name:fullName, req:'' };
  }
  const HERO = {
    // col = verified die-symbol colors (leaflet). HH die violet; BW die noir.
    // Hero names stay in ENGLISH (the printed card/board names) — user preference.
    hh: { name:'Headless Horseman', crest:'HH', cls:v=>v<=3?'A':v<=5?'B':'C',
      sym:{A:GLYPH.axe,B:GLYPH.shoe,C:GLYPH.scare}, symName:{A:'Hache',B:'Fer',C:'Frayeur'},
      col:{A:'#f3ede2',B:'#3fb6e8',C:'#ef6b2b'} },
    bw: { name:'Black Widow', crest:'BW', cls:v=>v<=2?'A':v<=5?'B':'C',
      sym:{A:GLYPH.eye,B:GLYPH.baton,C:GLYPH.spider}, symName:{A:'Espionnage',B:'Bâtons',C:'Veuve'},
      col:{A:'#9fc93c',B:'#56bcd8',C:'#e2211f'} },
    // Couleurs du dé fm d'après le leaflet V1 : pioche bleu clair, marteau orange, enclume blanc
    fm: { name:'Forgemaster', crest:'FM', cls:v=>v<=3?'A':v<=5?'B':'C',
      sym:{A:GLYPH.pick,B:GLYPH.forgehammer,C:GLYPH.anvil}, symName:{A:'Pioche',B:'Forge',C:'Enclume'},
      col:{A:'#a9d6e8',B:'#f0a03a',C:'#f3ede2'} },
    dr: { name:'Druid', crest:'DR', cls:v=>v<=3?'A':v<=5?'B':'C',
      sym:{A:'<g class="glyph"><path d="M18 20 L28 44 M30 18 L36 44 M44 20 L42 44" stroke-width="4" fill="none"/></g>',
           B:'<g class="glyph"><circle cx="26" cy="24" r="5"/><circle cx="38" cy="24" r="5"/><ellipse cx="32" cy="38" rx="11" ry="9"/></g>',
           C:'<g class="glyph"><path d="M32 14 Q46 28 32 50 Q18 28 32 14 Z M32 20 L32 44" stroke-width="2"/></g>'},
      symName:{A:'Griffe',B:'Patte',C:'Nature'},
      col:{A:'#e8d94a',B:'#b07a4a',C:'#6fcf6f'} },
    th: { name:'Thor', crest:'TH', cls:v=>v<=3?'A':v<=5?'B':'C',
      sym:{A:'<g class="glyph"><rect x="16" y="14" width="30" height="15" rx="3"/><rect x="29" y="29" width="7" height="22" rx="2.5"/></g>',
           B:'<g class="glyph"><path d="M13 47 Q8 20 23 12 Q21 28 28 35 L36 35 Q43 28 41 12 Q56 20 51 47 Q42 39 32 39 Q22 39 13 47 Z"/></g>',
           C:'<g class="glyph"><path d="M37 8 L19 36 L29 36 L25 56 L45 26 L34 26 Z"/></g>'},
      symName:{A:'Marteau',B:'Digne',C:'Tonnerre'},
      col:{A:'#9fc3e8',B:'#e87a7a',C:'#f2d24b'} },
    rv: { name:'Raveness', crest:'RV', cls:v=>v<=3?'A':v<=5?'B':'C',
      sym:{A:'<g class="glyph"><path d="M16 52 L50 12 M50 12 L36 12 M44 19 L30 17 M38 26 L24 23 M16 52 L26 49" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>',
           B:'<g class="glyph"><path d="M56 16 Q30 6 8 32 L22 32 Q18 40 28 38 Q26 46 36 42 Q36 50 46 44 Q54 32 56 16 Z"/></g>',
           C:'<g class="glyph"><path d="M16 22 Q36 10 56 28" fill="none" stroke-width="4" stroke-linecap="round"/><circle cx="37" cy="33" r="9" fill="none" stroke-width="5"/><circle cx="37" cy="33" r="3"/><path d="M8 50 L27 39 L33 49 Z"/></g>'},
      symName:{A:'Talon',B:'Aile',C:'Œil'},
      col:{A:'#e8e26a',B:'#8fd6a0',C:'#e87ab8'} },
    sm: { name:'Spider-Man', crest:'SM', cls:v=>v<=3?'A':v<=5?'B':'C',
      // Thwip = main "thwip" (index+auriculaire levés), Web = toile, Spider = araignée
      sym:{A:'<g class="glyph"><path d="M20 30 L20 14 M28 28 L28 10 M28 28 L36 30 L36 20 M44 30 L44 16 M20 30 Q18 44 28 50 L40 50 Q48 44 44 30 Z" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>',
           B:'<g class="glyph"><path d="M32 8 L32 56 M12 20 L52 44 M52 20 L12 44 M32 8 Q44 20 52 20 M32 8 Q20 20 12 20 M52 44 Q44 44 32 56 M12 44 Q20 44 32 56 M22 26 Q32 20 42 26 M18 38 Q32 46 46 38" fill="none" stroke-width="2.5" stroke-linecap="round"/></g>',
           C:'<g class="glyph"><ellipse cx="32" cy="36" rx="7" ry="11"/><circle cx="32" cy="20" r="5"/><path d="M27 28 L12 16 M27 34 L10 30 M27 40 L12 46 M29 46 L18 58 M37 28 L52 16 M37 34 L54 30 M37 40 L52 46 M35 46 L46 58" fill="none" stroke-width="3.5" stroke-linecap="round"/></g>'},
      symName:{A:'Thwip',B:'Toile',C:'Spider'},
      col:{A:'#7ec8e8',B:'#e8e8e8',C:'#e2211f'} },
    py: { name:'Pyromancer', crest:'PY', cls:v=>v<=3?'A':v===4?'B':v===5?'C':'D',
      // 4 symboles (leaflet) : Flame, Blaze (soleil noir), Fiery Soul (emblème), Meteor
      sym:{A:'<g class="glyph"><path d="M32 8 Q44 22 40 32 Q48 28 46 20 Q56 32 50 44 Q44 54 32 54 Q20 54 14 44 Q10 34 18 24 Q17 32 24 34 Q20 20 32 8 Z"/></g>',
           B:'<g class="glyph"><circle cx="32" cy="32" r="8"/><path d="M32 10 L36 24 L32 20 L28 24 Z M54 32 L40 36 L44 32 L40 28 Z M32 54 L28 40 L32 44 L36 40 Z M10 32 L24 28 L20 32 L24 36 Z M47 17 L38 26 L40 20 L44 22 Z M47 47 L38 38 L44 40 L42 44 Z M17 47 L26 38 L24 44 L20 42 Z M17 17 L26 26 L20 24 L22 20 Z"/></g>',
           C:'<g class="glyph"><path d="M32 6 Q40 18 36 26 Q44 22 44 14 Q54 26 46 40 L54 36 Q50 50 32 56 Q14 50 10 36 L18 40 Q10 26 20 14 Q20 22 28 26 Q24 18 32 6 Z M32 34 Q37 40 32 48 Q27 40 32 34 Z"/></g>',
           D:'<g class="glyph"><ellipse cx="30" cy="34" rx="10" ry="8" transform="rotate(-25 30 34)"/><path d="M44 14 L52 8 M46 20 Q56 16 60 8" fill="none" stroke-width="3.5" stroke-linecap="round"/><path d="M14 52 Q24 50 40 40" fill="none" stroke-width="3.5" stroke-linecap="round"/><path d="M8 44 Q20 44 24 38" fill="none" stroke-width="2.5" stroke-linecap="round"/></g>'},
      symName:{A:'Flame',B:'Blaze',C:'Fiery Soul',D:'Meteor'},
      col:{A:'#f2d24b',B:'#3a3a3a',C:'#c8452a',D:'#e8e2d0'} },
    du: { name:'Duelist', crest:'DU', cls:v=>v<=3?'A':v<=5?'B':'C',
      // Blade = lame courbe, Boot = botte, Pierce = estoc éclaté (violet, leaflet V1)
      sym:{A:'<g class="glyph"><path d="M14 50 L40 14 Q46 8 52 10 Q54 16 48 22 L22 48 Z M20 42 L28 50" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>',
           B:'<g class="glyph"><path d="M24 10 L38 10 L38 32 Q50 34 52 44 L52 50 L16 50 L16 44 Q16 38 24 34 Z M16 44 L38 44" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>',
           C:'<g class="glyph"><path d="M12 52 L44 20 M44 20 L30 22 M44 20 L42 34 M50 8 L38 14 M50 8 L46 20 M56 16 L46 26" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>'},
      symName:{A:'Blade',B:'Boot',C:'Pierce'},
      col:{A:'#7a86e8',B:'#c8a06a',C:'#b45ad2'} },
    se: { name:'Sun Elf', crest:'SE', cls:v=>v<=3?'A':v<=5?'B':'C',
      // Stave = bâton solaire, Charge = triangle à œil, Sun Power = éclat de soleil (dice.png)
      sym:{A:'<g class="glyph"><path d="M30 54 L30 22 M30 22 L20 12 M30 22 L40 12 M24 16 L36 16" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="10" r="3"/></g>',
           B:'<g class="glyph"><path d="M12 16 L52 16 L32 50 Z" fill="none" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="26" r="5"/></g>',
           C:'<g class="glyph"><circle cx="32" cy="32" r="6"/><path d="M32 8 L32 20 M32 44 L32 56 M8 32 L20 32 M44 32 L56 32 M15 15 L24 24 M40 40 L49 49 M49 15 L40 24 M24 40 L15 49" fill="none" stroke-width="4" stroke-linecap="round"/></g>'},
      symName:{A:'Stave',B:'Charge',C:'Sun Power'},
      col:{A:'#7aa8e8',B:'#3a5a9c',C:'#e8543a'} },
    // Naraxus (boss) : son de n'a pas de symboles — la face choisit l'attaque.
    nx: { name:'Naraxus', crest:'NX', cls:v=>'A',
      sym:{A:'<g class="glyph"><circle cx="32" cy="32" r="14"/></g>'}, symName:{A:'Face'},
      col:{A:'#e0ac4e'} },
  };

  // ---- game state ----
  // Sélection des persos par URL : play.html?me=fm&ai=hh (défaut : hh contre bw).
  const _q = new URLSearchParams(location.search);
  const _pick = (v, dflt) => (v==='hh'||v==='bw'||v==='fm'||v==='rv'||v==='dr'||v==='th'||v==='sm'||v==='py'||v==='du'||v==='se') ? v : dflt;
  const HUMAN = _pick(_q.get('me'), 'hh');
  const AI_HERO = (_q.get('ai')==='nx') ? 'nx' : _pick(_q.get('ai'), HUMAN==='bw' ? 'hh' : 'bw');
  const BOSS_HARD = _q.get('hard')==='1';
  let ai;
  // Depuis 2026-07-05 le réseau est entraîné AVEC le Forgemaster (features Forge/armures).
  // v3 (2026-07-06) : layout à 8 héros — des poids d'un ancien layout feraient un forward
  // faux en silence, on vérifie la taille d'entrée avant de s'en servir.
  if (window.AI_WEIGHTS && window.AI_WEIGHTS.sizes && window.AI_WEIGHTS.sizes[0] === G.FEATURE_COUNT) {
    try { ai = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(window.AI_WEIGHTS))); } catch (e) { ai = G.greedyHighestDamagePolicy; }
  } else ai = G.greedyHighestDamagePolicy;

  // Stateful (snapshotable) rng so interactive defense can clone+replay the AI's attack deterministically.
  const rng = G.mulberry32Stateful((Date.now() % 2147483647) || 1);
  // First player is decided at random (like the opening roll). Going SECOND carries the rules'
  // compensation automatically (HH gains 1 Dreadful — handled in createInitialGameState).
  const humanFirst = rng() < 0.5;
  const g = G.newHumanGame(HUMAN, AI_HERO, ai, rng, humanFirst, BOSS_HARD);
  g.state.players[g.humanIdx].humanControlled = true;
  const humanHero = HERO[HUMAN], aiHero = HERO[AI_HERO];

  let phase = 'main1';         // 'upkeep'|'main1'|'roll'|'alter'|'ability'|'main2'|'defense'|'over'
  let dice = [];               // [{v, kept}]
  let attempts = 0, rollsLeft = 2;
  let pendingDefense = null;   // current DefensePrompt while defending against the AI (else null)
  let pendingAttackInfo = null;// AiAttackInfo for the incoming attack being defended
  let defSel = new Set();      // defense dice selected for Better D!'s partial reroll
  let lastDefDice = null;      // your resolved defense dice, shown in the tray after the attack lands
  let gpBonusSel = false;      // Grim Pursuit mode (b) armed for the attack being chosen
  let gbSel = false;           // Thor: Guard Break armé pour l'attaque en cours de choix
  let amSel = new Set();       // attack-modifier cards armed for the attack being chosen
  let aghCpSel = false;        // A Good Haul : Mine SANS révéler (+1 CP) pré-armé
  let scrapMode = null;        // {oreId, mode:'reroll'|'set6'} — clique ensuite le dé visé
  let aiAlterSel = new Set();  // dés de l'IA sélectionnés pendant la fenêtre d'altération (ORP2)
  let tbArmed = false;         // Time Bomb upkeep roll: click-to-roll pacing flag
  let tbShow = null;           // {rolls, dmg, defused} — the TB dice, displayed until you roll
  let altSel = new Set();      // dice selected in the alter phase (click 1-2 dice, then pick a value)
  let samMode = false;         // Samesies! 2-click mode during the roll phase (see below)
  let ttaCharges = 0;          // Try Try Again! : 2e relance séquentielle restante (gratuite)
  let samTarget = null;        // first click = the die to CHANGE; second click = the die to COPY

  // ---- coach & game logging ----
  // The AI policy is seat-agnostic, so the SAME object can evaluate YOUR decisions: at each
  // human decision we silently ask "what would the network do here?" and record it. The
  // post-game analysis lists the disagreements — "pourquoi j'ai perdu / qu'aurait joué l'IA".
  const coach = ai;
  // Coach LIVE (toggle 🎓, persisté) : montre le conseil du DP pendant que tu joues, pas
  // seulement en fin de partie. Cache par (dés, relances) pour ne pas recalculer à chaque rendu.
  let coachLive = (localStorage.getItem('dt_coach_live') ?? '1') !== '0';
  const adviceCache = new Map();

  // Quels plans (attaques) la garde du DP vise — approximation lisible : pour chaque pattern
  // HH, combien de dés manquent par rapport aux dés gardés.
  // Plans de garde par héros : [nom, besoin en A, B, C] (les suites sont gérées à part).
  // [nom, A, B, C, D?] — D = 4e symbole (Pyromancer). Suites gérées à part.
  const PLAN_PATTERNS = {
    hh: [['Ride Down',3,2,0],['Reap',0,3,1],['Cleave',3,0,0],['Spectral Assault',3,0,2],['Horrify',0,0,4]],
    fm: [['Pick Axe',3,0,0],['Furnace',0,4,0],['A Good Haul',1,1,2],['Smelting Time',0,0,4]],
    bw: [['Baton Strike',0,3,0],['Infiltrate',2,1,1],["Widow's Gauntlets",2,3,0],['Grapple',0,0,4]],
    rv: [['Peck',3,0,0],['Raven Sight',2,0,2],['Fowl Friend',0,4,0],['Murder of Crows',2,3,0],['Chamber',0,0,4]],
    dr: [['Ferocity',3,0,0],['Maul',0,4,0],["Nature's Cure",2,0,2],['Wild Realignment',1,2,1],['Protect the Forest',0,0,4]],
    th: [['Hammered',3,0,0],['Mighty Summon',1,2,1],['Chain Lightning',3,0,2],['Odinforce',2,3,0],['Bottled Lightning',0,0,4]],
    sm: [['Punch',3,0,0],['C-C-C-Combo',2,0,2],['Spider-Reflexes',1,2,1],['Wall Crawler',2,3,0],['Venom Punch',0,0,4]],
    py: [['Fireball',3,0,0,0],['Burning Soul',0,0,2,0],['Combustion',1,1,1,1],['Pyroblast',4,0,0,1],['Meteorite',0,0,0,4]],
    du: [['Blade Flurry',3,0,0],['Balestra',2,2,0],['Feint Attack',2,0,2],['En Garde',0,3,1],['Bladestorm',0,0,4]],
    se: [['Light Staff',3,0,0],['Ray Absorption',0,4,0],['Radiant Energy',3,0,2],['Scorching Staff',1,3,0],['Solar Burst',0,0,4]],
  };
  const SUITE_NAME = { hh:'Suite (Sow Despair)', fm:'Suite (Armored Up)', bw:'Suite (Hacked)',
    rv:'Suite (Craven)', dr:"Suite (Forest's Call)", th:'Suite (Lightning Rod)', sm:'Suite (Ensnare)', py:'Suite (Hot Streak)', du:'Suite (Strike)', se:'Suite (Ray of Light)' };
  function planHint(kept){
    const heroCls = humanHero.cls;
    const cnt = k => kept.filter(v=>heroCls(v)===k).length;
    const a=cnt('A'), b=cnt('B'), c=cnt('C'), d=cnt('D');
    const uniq=[...new Set(kept)].sort((x,y)=>x-y);
    const plans=[];
    const need=(na,nb,nc,nd)=>Math.max(0,na-a)+Math.max(0,nb-b)+Math.max(0,nc-c)+Math.max(0,(nd||0)-d);
    for (const [nm,na,nb,nc,nd] of (PLAN_PATTERNS[HUMAN]||[])) plans.push([nm, need(na,nb,nc,nd)]);
    // suites : plus longue fenetre consécutive couverte
    let bestRun=0;
    for(let s0=1;s0<=3;s0++){ let run=0; for(let v=s0;v<s0+4;v++) if(uniq.includes(v)) run++; bestRun=Math.max(bestRun,run); }
    plans.push([SUITE_NAME[HUMAN]||'Suite', 4-bestRun]);
    plans.sort((x,y)=>x[1]-y[1]);
    const top=plans.filter(pl=>pl[1]<=5-kept.length).slice(0,2);
    if(!top.length) return '';
    return 'vise : '+top.map(pl=>pl[1]===0?`${pl[0]} (déjà fait !)`:`${pl[0]} (manque ${pl[1]})`).join(' ou ');
  }
  function adviceKey(useWc){
    const you = g.state.players[g.humanIdx];
    return dice.map(d=>d.v).join(',')+'|'+rollsLeft+'|'+you.tokens.dreadful+'|'+(you.tokens.head>0?1:0)+'|'+(you.tokens.grimPursuit||0)+'|'+you.upgradesInPlay.join('+')+'|'+(useWc?'wc':'raw');
  }
  function liveAdvice(useWildcards = true){
    if (!coachLive || phase!=='roll' || attempts===0 || !dice.length) return null;
    // Hoarding : le solveur gère maintenant 4 dés nativement (DP généralisé) — coach actif.
    // The key must carry the SOLVER STATE too (Dreadful count, Head, upgrades in play — see
    // oracleStateFor): keyed on dice+rerolls alone, a turn-1 answer got replayed all game.
    const key = adviceKey(useWildcards);
    if (!adviceCache.has(key)) {
      try { adviceCache.set(key, G.humanKeepAdvice(g, dice.map(d=>d.v), rollsLeft, useWildcards)); }
      catch(e){ adviceCache.set(key, null); }
    }
    return adviceCache.get(key);
  }
  // Le joueur tient-il une carte de manipulation payable ? (sinon les deux solveurs sont identiques)
  function hasDiceCards(){
    const you = g.state.players[g.humanIdx];
    return [['six-it',1],['tip-it',1],['samesies',1],['so-wild',2],['twice-as-wild',3]]
      .some(([id,cp]) => you.hand.includes(id) && you.cp >= cp);
  }
  const replayLog = [];        // {t, kind, you, coach, agree}
  function coachNote(kind, you, coachPick){
    replayLog.push({ t: g.state.turnNumber, kind, you, coach: coachPick, agree: you === coachPick });
  }

  const $ = id => document.getElementById(id);
  const logBox = $('log');

  // ---------- rendering ----------
  function tokenChips(p, isHuman) {
    const t = p.tokens, out = [];
    out.push(`<span class="tok cp"><span class="dot"></span><b>CP</b> ${p.cp}</span>`);
    if (!isHuman && p.heroId !== 'nx') out.push(`<span class="tok"><b>🂠 Main</b> ${p.hand.length} · <b>Deck</b> ${p.deck.length}</span>`);
    if (t.dreadful)    out.push(`<span class="tok dread"><span class="dot"></span><b>Dreadful</b> ${t.dreadful}</span>`);
    if (t.grimPursuit) out.push(`<span class="tok grim"><span class="dot"></span><b>Grim</b> ${t.grimPursuit}</span>`);
    if (t.agility)     out.push(`<span class="tok agi"><span class="dot"></span><b>Agility</b> ${t.agility}</span>`);
    if (t.covertOps)   out.push(`<span class="tok covert"><span class="dot"></span><b>Covert</b> ${t.covertOps}</span>`);
    if (t.head)        out.push(`<span class="tok head"><span class="dot" style="background:var(--gold)"></span><b>Haunted Head</b></span>`);
    (p.timeBombs || []).forEach(pos => out.push(`<span class="tok bomb"><span class="dot"></span><b>Time Bomb</b> ${pos}</span>`));
    if (p.heroId==='th') {
      out.push(`<span class="tok" style="border-color:#7aa3d0"><b>🔨 Mjölnir</b> ${p.mjolnirAway?'chez l\u2019adversaire':'sur ton board'}</span>`);
    }
    if (t.electrokinesis) out.push(`<span class="tok" style="border-color:#c9b23a"><b>⚡ Electrokinesis</b> ${t.electrokinesis}/4</span>`);
    if (t.guardBreak) out.push(`<span class="tok" style="border-color:#5a8fd0"><b>🛡️⚡ Guard Break</b> ${t.guardBreak}</span>`);
    if (p.heroId==='dr') {
      const F = {druid:'🧙 Druide', cat:'🐆 Chat', bear:'🐻 Ours'};
      out.push(`<span class="tok" style="border-color:#6a8f3f"><b>${F[p.form||'druid']}</b></span>`);
    }
    if (t.shapeShift) out.push(`<span class="tok" style="border-color:#8f6a3f"><b>🔄 Shape Shift</b> ${t.shapeShift}</span>`);
    if (t.regen2 || t.regen1) out.push(`<span class="tok" style="border-color:#3f8f5f"><b>🌿 Regen</b> ${t.regen2?t.regen2+'×②':''}${t.regen2&&t.regen1?' ':''}${t.regen1?t.regen1+'×①':''}</span>`);
    if (t.wound) out.push(`<span class="tok" style="border-color:#b03a3a"><b>🩸 Wound</b> ${t.wound}</span>`);
    if (t.feather) out.push(`<span class="tok" style="border-color:#3f7a4f"><b>🪶 Feather</b> ${t.feather}</span>`);
    if (t.combo) out.push(`<span class="tok" style="border-color:#3a7ab0"><b>👊 Combo</b> (2ᵉ phase d'attaque)</span>`);
    if (p.heroId==='py' || t.fireMastery) out.push(`<span class="tok" style="border-color:#d0542a"><b>🔥 Fire Mastery</b> ${t.fireMastery||0}/${5+(p.fmCapBonus||0)}</span>`);
    if (t.burn) out.push(`<span class="tok" style="border-color:#e8a02a"><b>🔥 Burn</b> (2 dmg/upkeep, persistant)</span>`);
    if (t.knockdown) out.push(`<span class="tok" style="border-color:#c8b03a"><b>💥 Knockdown</b> (2 CP ou saute l'attaque)</span>`);
    if (t.stun) out.push(`<span class="tok" style="border-color:#6a5acd"><b>🌀 Stun</b></span>`);
    if (t.invisibility) out.push(`<span class="tok" style="border-color:#c04a6a"><b>👤 Invisibility</b></span>`);
    if (t.webbed) out.push(`<span class="tok" style="border-color:#9a9a9a"><b>🕸️ Webbed</b> (prochaine attaque normale subie = indéf.)</span>`);
    if (t.hex) out.push(`<span class="tok" style="border-color:#8a4fbf"><b>⬡ Hex</b> (tes 6 = blancs ce tour)</span>`);
    if (t.nevermore) {
      const rvP = g.state.players.find(x=>x.heroId==='rv');
      const dial = rvP ? (rvP.nevermoreDial||0) : 0;
      out.push(`<span class="tok" style="border-color:#4a4a6a"><b>🐦‍⬛ Nevermore</b> cadran ${dial}</span>`);
    }
    if (p.heroId === 'du') {
      // Piste Footwork : 5 positions, -2 (défense) .. +2 (offense), départ Neutral.
      const pos = p.footwork || 0;
      const LBL = { '-2':'🛡️+3 Défensif (prévient 3)', '-1':'🂠 Défensif (pige 1)', '0':'⚖️ Neutral', '1':'⚔️+1 Offensif', '2':'⚔️+3 Offensif' };
      const track = [2,1,0,-1,-2].map(v => v===pos ? '●' : '○').join('');
      out.push(`<span class="tok" style="border-color:#7a86e8"><b>👣 Footwork</b> ${track} ${LBL[String(pos)]}${p.footworkBonusUsedThisTurn?' (bonus consommé ce tour)':''}</span>`);
    }
    if (t.disarm) out.push(`<span class="tok" style="border-color:#c8a03a"><b>🪝 Disarm</b> (upkeep : défausse 1 ou saute l'Income)</span>`);
    if (p.heroId === 'se') {
      const dawn = p.sunDialDawn === true, v = p.sunDial || 0;
      out.push(`<span class="tok" style="border-color:${dawn?'#e8a03a':'#8a6ad2'}"><b>${dawn?'🌅 DAWN':'🌆 DUSK'}</b> cadran ${v}/5${dawn?' (dump = +'+v+' dmg, puis −4)':' (à 5 → DAWN)'}</span>`);
    }
    if (t.chargedGem) out.push(`<span class="tok" style="border-color:#d24a4a"><b>💎 Charged Gem</b> (Main : d6 → CP et/ou 2 dmg)</span>`);
    if (t.sunMarked) out.push(`<span class="tok" style="border-color:#e8891a"><b>☀️ Sun Marked</b> (ton attaquant se soigne de 2, persistant)</span>`);
    if (p.heroId === 'fm') {
      const ORE_SHORT = { 'gold-ore':'Or', 'diamond-ore':'Diamant', 'ultimanium-ore':'Ultimanium' };
      const counts = {};
      (p.forge||[]).forEach(id => counts[id]=(counts[id]||0)+1);
      const forge = Object.entries(counts).map(([id,n])=>`${n}× ${ORE_SHORT[id]||id}`).join(' · ');
      out.push(`<span class="tok" style="border-color:#7a5c1f"><b>⚒️ Forge</b> ${forge||'vide'}</span>`);
      const TIER = ['—','Gold','Diamond','Ultimanium'];
      if (p.armor.helmet>0) out.push(`<span class="tok"><b>🪖 ${TIER[p.armor.helmet]}</b></span>`);
      if (p.armor.shield>0) out.push(`<span class="tok"><b>🛡 ${TIER[p.armor.shield]}</b></span>`);
    }
    return out.join('');
  }
  function renderFighter(elId, idx, def, isHuman) {
    const p = g.state.players[idx];
    const hpMax = p.heroId==='nx' ? 65 : 50;
    const pct = Math.max(0, Math.min(100, p.hp * 100 / hpMax));
    const activeCls = (g.state.activePlayerIdx === idx && phase !== 'over') ? ' active' : '';
    // Upgrades in play were invisible ("je ne vois pas si j'ai Cleave II") — show them as chips.
    const hero = G.heroTemplateFor(p.heroId);
    const ups = p.upgradesInPlay.map(id => (G.cardById(hero, id) || { name: id }).name)
      .map(n => `<span class="tok" style="border-color:var(--gold)"><b>${n}</b></span>`).join('');
    $(elId).className = 'fighter ' + (isHuman ? 'you' : 'ai') + activeCls;
    $(elId).innerHTML =
      `<div class="crest">${def.crest}</div>
       <div class="who"><div class="name">${def.name}<small>${isHuman ? 'toi' : 'IA'}</small></div>
         <div class="hpbar"><i style="width:${pct}%"></i><span${p.hp>hpMax?' style="color:var(--gold);font-weight:700"':''}>${Math.max(0,p.hp)} / ${hpMax}</span></div></div>
       <div class="tokens">${tokenChips(p, isHuman)}${ups}</div>`;
  }
  function renderFighters() {
    renderFighter('ai-strip', g.aiIdx, aiHero, false);
    renderFighter('you-strip', g.humanIdx, humanHero, true);
  }

  function dieHTML(hero, d, i, interactive) {
    const c = hero.cls(d.v);
    return `<button class="die${d.kept?' kept':''}${interactive?'':' disabled'}" data-cls="${c}" data-i="${i}"
      aria-label="Dé ${i+1}: ${hero.symName[c]} (${d.v})">
      <svg viewBox="0 0 64 64" aria-hidden="true" style="color:${(hero.col||{})[c]||'currentColor'}">${hero.sym[c]}</svg><span class="pip">${d.v}</span></button>`;
  }
  // While the AI attacks you, the tray shows ITS dice (BW symbols) instead of your stale ones —
  // set to an array of values during the AI's attack, null otherwise.
  let aiDice = null;
  function renderDice(animate) {
    // Defense-roll window: show YOUR Hallowed/Sabotage dice (the ones your cards can alter) —
    // previously invisible, you were offered "set die 3 to 6" on dice you couldn't see.
    // Dice are CLICKABLE to select which ones Better D! rerolls (a Roll Attempt = up to 5 dice).
    if (phase==='defense' && pendingDefense && pendingDefense.defenseDice) {
      // Defense dice are ALWAYS clickable (select which to modify/reroll) — before, only
      // Better D! unlocked the click, so So Wild!/Tip It! on defense felt unusable (reported).
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">🛡️ TON JET DE DÉFENSE — clique 1-2 dés pour les modifier :</div>` +
        pendingDefense.defenseDice.map((v,i)=>dieHTML(humanHero, {v,kept:defSel.has(i)}, i, true)).join('') +
        `<div class="empty" style="width:100%">${defenseExplain(HUMAN, pendingDefense.defenseDice)}</div>`;
      $('tray').querySelectorAll('.die').forEach(el=>{
        el.onclick = () => { const i=+el.dataset.i;
          // cap 5 (Better D relance jusqu'à 5 dés) — l'ancien cap 2 (paires Twice As Wild)
          // empêchait d'en sélectionner 3 (user-caught, 2e rapport)
          if (defSel.has(i)) defSel.delete(i); else { if (defSel.size>=5) defSel.delete([...defSel][0]); defSel.add(i); }
          renderDice(false); renderControls(); };
      });
      return;
    }
    // After the AI's attack resolved: show YOUR defense dice (they only lived in the journal
    // before — "je peux pas voir mes dés quand je roule ma défense", reported).
    if (lastDefDice && g.state.activePlayerIdx !== g.humanIdx) {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">🛡️ TA DÉFENSE — résultat :</div>` +
        lastDefDice.map((v,i)=>dieHTML(humanHero, {v,kept:false}, i, false)).join('') +
        `<div class="empty" style="width:100%">${defenseExplain(HUMAN, lastDefDice)}</div>`;
      return;
    }
    if (phase==='aialter' && aiDice) {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">⚔️ LE JET FINAL DE L'IA — <b>0 relance restante</b> (ses 3 tentatives sont faites ; elle ne peut plus que répondre avec des cartes, CP : ${g.state.players[g.aiIdx].cp}). Clique 1-2 dés à altérer :</div>` +
        aiDice.map((v,i)=>dieHTML(aiHero, {v,kept:aiAlterSel.has(i)}, i, true)).join('');
      $('tray').querySelectorAll('.die').forEach(el=>{
        el.onclick = () => { const i=+el.dataset.i;
          if (aiAlterSel.has(i)) aiAlterSel.delete(i); else { if (aiAlterSel.size>=2) aiAlterSel.delete([...aiAlterSel][0]); aiAlterSel.add(i); }
          renderDice(false); renderControls(); };
      });
      return;
    }
    if (aiDice) {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">⚔️ L'ATTAQUE de l'IA — ses 5 dés d'attaque (sa défense, elle, roule 3-4 dés) :</div>` +
        aiDice.map((v,i)=>dieHTML(aiHero, {v,kept:false}, i, false)).join('');
      return;
    }
    // Alter phase: dice are clickable to SELECT which to modify (So Wild!/Twice As Wild!/Tip It!)
    if (phase==='alter') {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">Clique 1 ou 2 dés à modifier, puis choisis la valeur :</div>` +
        dice.map((d,i)=>dieHTML(humanHero, {v:d.v, kept:altSel.has(i)}, i, true)).join('');
      $('tray').querySelectorAll('.die').forEach(el=>{
        el.onclick = () => { const i=+el.dataset.i;
          if (altSel.has(i)) altSel.delete(i); else { if (altSel.size>=2) altSel.delete([...altSel][0]); altSel.add(i); }
          renderDice(false); renderControls(); };
      });
      return;
    }
    if (phase==='tbroll') {
      const n = g.state.players[g.humanIdx].timeBombs.length;
      $('tray').innerHTML = `<div class="empty" style="width:100%">💣 Tu portes ${n} Time Bomb — clique « Lancer le dé » à gauche pour voir ton jet.</div>`;
      return;
    }
    // Time Bomb roll: show the actual die/dice until you start your own roll.
    if (tbShow && !dice.length) {
      const verdict = tbShow.dmg>0 ? `💥 EXPLOSE — ${tbShow.dmg} dégâts !` : tbShow.defused>0 ? '✅ désamorcée (6) !' : '⏱️ elle avance d\'un cran…';
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">💣 JET DE TIME BOMB (1-5 avance, 6 désamorce) :</div>` +
        tbShow.rolls.map((v,i)=>dieHTML(humanHero, {v,kept:false}, i, false)).join('') +
        `<div class="empty" style="width:100%"><b>${verdict}</b></div>`;
      return;
    }
    const hoardNote = (g.state.players[g.humanIdx].hoardedDice>0)
      ? `<div class="empty" style="width:100%">🐲 Naraxus te vole ${g.state.players[g.humanIdx].hoardedDice} dé ce tour !</div>` : '';
    $('tray').innerHTML = dice.length
      ? hoardNote + dice.map((d,i)=>dieHTML(humanHero, d, i, phase==='roll' && attempts>0)).join('')
      : hoardNote + '<div class="empty">Lance les dés pour commencer ton attaque.</div>';
    if (animate) $('tray').querySelectorAll('.die:not(.kept)').forEach(el=>el.classList.add('rolling'));
    if (phase==='roll' && attempts>0) $('tray').querySelectorAll('.die').forEach(el=>{
      const i=+el.dataset.i;
      if (samMode && i===samTarget) el.classList.add('samsel');
      el.onclick = () => {
        // Mode Scrap (Diamond relance / Ultimanium ->6) : le clic vise ce dé.
        if (scrapMode) {
          const m = scrapMode; scrapMode = null;
          const nd = G.humanScrapDie(g, m.oreId, dice.map(d=>d.v), i, m.mode);
          if (nd) { dice = nd.map((v,k)=>({v, kept: dice[k] ? dice[k].kept : false}));
            log(`♻️ <b>Scrap ${m.oreId==='diamond-ore'?'Diamond':'Ultimanium'} Ore</b> : dé ${i+1} ${m.mode==='set6'?'→ 6':'relancé'}.`); }
          renderAll(); return;
        }
        // Mode Samesies! : 1er clic = dé à changer, 2e clic = dé dont on copie la valeur.
        if (samMode) {
          // Ordre inversé sur demande user : 1er clic = le dé MODÈLE, 2e = le dé à CHANGER.
          if (samTarget===null) { samTarget=i; }
          else if (i!==samTarget && dice[i].v!==dice[samTarget].v) {
            const src=samTarget; samMode=false; samTarget=null;
            playRollCard({cardId:'samesies', dieIndices:[i], values:[dice[src].v]});
            return;
          } else if (i===samTarget) { samTarget=null; } // re-clic = désélection
          renderDice(false); renderControls(); return;
        }
        dice[i].kept=!dice[i].kept; renderDice(false); renderControls();
      };
    });
  }

  // Scans the RAW engine log from `fromIdx` for the pieces of one attack resolution, so the
  // BILAN lines can show the full arithmetic (base + riders + Grim Pursuit − prevented = total)
  // instead of making the player reverse-engineer it from scattered lines (reported twice).
  function parseCombat(fromIdx){
    const out = { rider:0, gp:0, bonus:0, prevented:0, counter:0 };
    for (let i=fromIdx; i<g.state.log.length; i++){
      const msg = g.state.log[i].message; let x;
      if ((x = msg.match(/ rider: \+(\d+) dmg/))) out.rider += +x[1];
      if ((x = msg.match(/^Grim Pursuit spend \(b\): rolled \[[\d,]+\], \d+ Horseshoe\(s\) -> \+(\d+)/))) out.gp += +x[1];
      if ((x = msg.match(/bonus roll: \+(\d+) dmg/))) out.bonus += +x[1];
      if ((x = msg.match(/(?:Hallowed Reckoning|Sabotage): prevented (\d+), (\d+) dmg back/))) { out.prevented += +x[1]; out.counter += +x[2]; }
    }
    return out;
  }
  function breakdownStr(base, cb){
    const parts = [`${base} base`];
    if (cb.rider) parts.push(`+${cb.rider} rider`);
    if (cb.bonus) parts.push(`+${cb.bonus} jet bonus`);
    if (cb.gp) parts.push(`+${cb.gp} Grim Pursuit`);
    if (cb.prevented) parts.push(`−${cb.prevented} prévenu(s)`);
    return parts.join(' ');
  }

  // What a defense roll DOES, die by die, from the verified defense rules — so the outcome is
  // readable on the board instead of buried in the journal (reported).
  function defenseExplain(heroId, vals){
    if (heroId==='fm'){
      const v=vals[0];
      return v<=3 ? "→ Pioche : Mine ton deck (Ore → Forge ou +1 CP)"
        : v<=5 ? "→ Forge : double l'effet d'UNE armure sur cette attaque"
        : "→ Enclume : double jusqu'à 2 armures différentes";
    }
    if (heroId==='hh'){
      const a=vals.filter(v=>v<=3).length, b=vals.filter(v=>v>=4&&v<=5).length, cc=vals.filter(v=>v===6).length;
      return `→ ${a} contre-dégât(s) (Haches) · ${Math.floor(b/2)} dégât(s) prévenu(s) (par paire de Fers) · +${cc} Dreadful (Frayeurs)`;
    }
    const a=vals.filter(v=>v<=2).length, b=vals.filter(v=>v>=3&&v<=5).length, cc=vals.filter(v=>v===6).length;
    return `→ ${b} contre-dégât(s) (Bâtons) · ${a} dégât(s) prévenu(s) (Espionnage)${cc>=2?' · inflige 1 Time Bomb (paire de Veuves)':''}`;
  }

  function bestAbility(vals) {
    const cands = G.matchedAbilities(g, vals);
    if (!cands.length) return null;
    return cands.reduce((a,b)=>((b.baseDamage||0)>(a.baseDamage||0)?b:a));
  }
  function renderMatch() {
    const adv = liveAdvice();
    if (adv) {
      const stop = adv.kept.length===5 || adv.ev <= adv.keepAllEv + 0.05;
      const hint = stop ? '' : planHint(adv.kept);
      // Demande user : montrer aussi le solveur « dés seuls » quand des cartes de manip
      // gonflent l'EV — pour voir ce que valent le jet ET les cartes séparément.
      let rawLine = '';
      if (hasDiceCards()) {
        const raw = liveAdvice(false);
        if (raw && (Math.abs(raw.ev - adv.ev) >= 0.15 || raw.kept.join(',') !== adv.kept.join(','))) {
          rawLine = `<div class="lead" style="margin-top:4px">🎲 dés seuls : garder [${raw.kept.join(',')||'rien'}] → EV ${raw.ev.toFixed(1)} · tes cartes ajoutent +${Math.max(0, adv.ev - raw.ev).toFixed(1)}</div>`;
        }
      }
      // POURQUOI ce keep (user-caught : « je ne comprends jamais les raisons ») : où la garde
      // atterrit (probabilités), et les gardes quasi égales — un écart < 0,3 EV = même valeur.
      let whyLine = '';
      const top0 = adv.topOptions && adv.topOptions[0];
      if (!stop && top0 && top0.probDist) {
        const lands = Object.entries(top0.probDist).filter(([n])=>n!=='Whiff').sort((x,y)=>y[1]-x[1]).slice(0,3)
          .map(([n,pr])=>`${formatAbility(humanHero,n).name} ${Math.round(pr)}%`);
        const whiff = top0.probDist['Whiff']||0;
        if (lands.length) whyLine = `<div class="lead" style="margin-top:4px">pourquoi : ça atterrit sur ${lands.join(' · ')}${whiff>=8?` · raté ${Math.round(whiff)}%`:''}</div>`;
      }
      let tieLine = '';
      const top1 = adv.topOptions && adv.topOptions[1];
      if (!stop && top1 && (adv.ev - top1.ev) < 0.3 && top1.kept.join(',') !== adv.kept.join(',')) {
        tieLine = `<div class="lead" style="margin-top:2px">≈ égal : garder [${top1.kept.join(',')||'rien'}] (EV ${top1.ev.toFixed(1)}) — les deux sont corrects</div>`;
      }
      // Cas S'ARRÊTER quasi égal à une relance : dire que c'est un pile-ou-face, pas un ordre
      // (user-caught : « il me reste un roll et je pourrais avoir la grande suite »).
      if (stop && top0 && top0.kept.length < 5 && (adv.keepAllEv - top0.ev) < 0.3) {
        const landsS = top0.probDist ? Object.entries(top0.probDist).filter(([n])=>n!=='Whiff').sort((x,y)=>y[1]-x[1]).slice(0,2)
          .map(([n,pr])=>`${formatAbility(humanHero,n).name} ${Math.round(pr)}%`).join(' · ') : '';
        tieLine = `<div class="lead" style="margin-top:2px">≈ égal : relancer en gardant [${top0.kept.join(',')}] (EV ${top0.ev.toFixed(1)}${landsS?` — ${landsS}`:''}) — pile ou face : sûr si t'es en avance, loterie si t'as besoin d'un gros coup</div>`;
      }
      // « s'arrêter » (valeur terminale) ≠ la ligne « garder tout » du tableau (qui conserve
      // l'option de changer d'avis à la relance suivante) — les deux chiffres diffèrent
      // légitimement, le libellé « tout garder » les confondait (user-caught).
      $('match').innerHTML = `<div class="lead">🎓 Coach (solveur exact)</div><div class="name">${
        stop ? `S'ARRÊTER — finir sur ces dés vaut ${adv.keepAllEv.toFixed(1)}`
             : `garder [${adv.kept.join(',')}] → EV ${adv.ev.toFixed(1)} · s'arrêter ici = ${adv.keepAllEv.toFixed(1)}`}</div>${
        hint ? `<div class="lead" style="margin-top:4px">${hint}</div>` : ''}${whyLine}${tieLine}${rawLine}`;
      return;
    }
    const show = (phase==='roll' && attempts>0) || phase==='alter';
    if (!show) { $('match').innerHTML=''; return; }
    const best = bestAbility(dice.map(d=>d.v));
    if (!best) { $('match').innerHTML = `<div class="lead">Aucune habileté — relance ou manipule tes dés</div>`; return; }
    const f = formatAbility(humanHero, best.name);
    $('match').innerHTML = `<div class="lead">Meilleure habileté disponible</div><div class="name">${f.name} ${f.req}${best.baseDamage!=null?` · ${best.baseDamage} dmg`:''}</div>`;
  }

  // Coach side panel: the DP solver's full keep table (top gardes + EV + où chaque garde
  // atterrit en %) — the one-line advice under the dice only showed the single best keep.
  function renderCoachPanel(){
    const panel = document.getElementById('coach-panel');
    if (!panel) return;
    const adv = liveAdvice();
    if (!adv || !adv.topOptions || !adv.topOptions.length) { panel.style.display='none'; return; }
    panel.style.display='';
    const distName = n => n==='Whiff' ? 'Raté (whiff)' : formatAbility(humanHero, n).name;
    // Demande user : DEUX solveurs côte à côte — « dés seuls » vs « avec tes cartes de manip ».
    const dual = hasDiceCards();
    const raw = dual ? liveAdvice(false) : null;
    const rawByKept = new Map((raw && raw.topOptions || []).map(o => [o.kept.join(','), o.ev]));
    const header = dual && raw ? `<div class="evrow" style="opacity:.75"><div class="keep"><small>garde</small></div><div class="ev"><small>🎲 seuls&nbsp;→&nbsp;🃏 avec cartes</small></div></div>` : '';
    const rows = adv.topOptions.map((o,i)=>{
      const icons = o.kept.length
        ? o.kept.map(v=>symIcon(humanHero, humanHero.cls(v))).join('')
        : '<small>tout relancer</small>';
      const dist = Object.entries(o.probDist||{})
        .sort((x,y)=>y[1]-x[1]).filter(e=>e[1]>=3).slice(0,3)
        .map(e=>`${distName(e[0])} ${Math.round(e[1])}%`).join(' · ');
      const rawEv = rawByKept.get(o.kept.join(','));
      const evCell = (dual && rawEv !== undefined && Math.abs(rawEv - o.ev) >= 0.05)
        ? `<span style="opacity:.65">${rawEv.toFixed(1)}</span> → ${o.ev.toFixed(1)}`
        : o.ev.toFixed(1);
      return `<div class="evrow${i===0?' best':''}">
        <div class="keep">${o.kept.length?`[${o.kept.join(',')}] `:''}${icons}${o.isGuaranteed?'<span class="sure">SÛR</span>':''}</div>
        <div class="ev">${evCell}</div>
        ${dist?`<div class="dist">${dist}</div>`:''}</div>`;
    }).join('');
    const rowsOut = header + rows;
    // A2 — LETHAL : un keep SÛR dont les dégâts DIRECTS tuent l'adversaire prime sur l'EV.
    const oppHp = Math.max(0, g.state.players[g.aiIdx].hp);
    const lethal = adv.topOptions.find(o=>o.isGuaranteed && (o.directDamage||0) >= oppHp && oppHp>0);
    let banner = '';
    if (lethal) {
      banner = `<div class="evrow best" style="border-color:#e5534b"><div class="keep">☠️ <b>LETHAL</b> — [${lethal.kept.join(',')}] garanti ${lethal.directDamage} dégâts ≥ ${oppHp} PV : prends le SÛR, ignore l'EV</div></div>`;
    } else {
      // A2 — profil de risque : l'EV moyen ne connaît pas le score.
      const youHp = g.state.players[g.humanIdx].hp;
      const sure = adv.topOptions.find(o=>o.isGuaranteed);
      const best = adv.topOptions[0];
      if (sure && best && !best.isGuaranteed && (best.ev - sure.ev) < 0.5) {
        if (youHp - oppHp >= 10) banner = `<div class="dist" style="padding:2px 8px">📊 Tu mènes de ${youHp-oppHp} PV et l'écart d'EV est mince (${(best.ev-sure.ev).toFixed(1)}) — le SÛR protège ton avance.</div>`;
        else if (oppHp - youHp >= 10) banner = `<div class="dist" style="padding:2px 8px">📊 Tu es mené de ${oppHp-youHp} PV — le pari [${best.kept.join(',')}] est justifié, la variance est ton alliée.</div>`;
      }
    }
    // A3 — cartes de manipulation en main : que vaudrait le jet AVEC la carte ?
    let cardLines = '';
    try {
      const you2 = g.state.players[g.humanIdx];
      const hero2 = G.heroTemplateFor(HUMAN);
      const vals = dice.map(d=>d.v);
      const canPay = id => { const c2=G.cardById(hero2,id); return c2 && you2.hand.includes(id) && you2.cp >= (c2.cpCost||0); };
      const tryVariant = (label, newVals) => {
        const a2 = G.humanKeepAdvice(g, newVals, rollsLeft);
        if (a2 && a2.ev > adv.ev + 0.4) cardLines += `<div class="dist" style="padding:2px 8px">🃏 ${label} → EV ${a2.ev.toFixed(1)} (+${(a2.ev-adv.ev).toFixed(1)})</div>`;
      };
      if (canPay('six-it')) {
        // meilleur candidat : transformer le plus petit dé non-6 en 6
        const i = vals.indexOf(Math.min(...vals.filter(v=>v!==6)));
        if (i>=0) tryVariant(`Six-It! sur le dé ${i+1} (${vals[i]}→6)`, vals.map((v,j)=>j===i?6:v));
      }
      if (canPay('so-wild')) {
        // heuristique : le dé le plus isolé -> valeur majoritaire
        const counts = {}; vals.forEach(v=>counts[v]=(counts[v]||0)+1);
        const mode = +Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
        const i = vals.findIndex(v=>counts[v]===1 && v!==mode);
        if (i>=0) tryVariant(`So Wild! sur le dé ${i+1} (${vals[i]}→${mode})`, vals.map((v,j)=>j===i?mode:v));
      }
    } catch(e) {}
    // Filet de sécurité actif ? Les % d'atterrissage sont AVANT réparation par tes cartes.
    const youW = g.state.players[g.humanIdx];
    const nets = [['twice-as-wild',3,'Twice As Wild'],['six-it',1,'Six-It'],['so-wild',2,'So Wild'],['samesies',1,'Samesies'],['tip-it',1,'Tip It']]
      .filter(([id,c])=>youW.hand.includes(id)&&youW.cp>=c).map(([,,n])=>n);
    const netNote = nets.length
      ? `<div class="dist" style="padding:2px 8px;color:var(--gold)">🃏 Filet actif : ${nets.join(', ')} — l'EV inclut la réparation au jet final, les % « Raté » NON (ils sont avant carte).</div>`
      : '';
    document.getElementById('coach-evs').innerHTML = banner + rowsOut + cardLines + netNote +
      `<div class="dist" style="padding:2px 8px">EV = dégâts + valeur estimée des jetons/pioche. SÛR = habileté déjà garantie sans relance.${dual?' <b>🎲 → 🃏</b> : EV dés seuls → EV en comptant tes cartes de manipulation.':''}</div>`;
  }

  // Board / ability panel: during 'ability' phase, list matched abilities as pickable buttons.
  function renderAbilities() {
    const box = $('abils');
    if (phase==='ability') {
      $('board-title').textContent = 'Choisis ton habileté';
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      if (!cands.length) { box.innerHTML = '<div class="empty">Tes dés ne forment aucune habileté.</div>'; return; }
      box.innerHTML = cands.map(c=>{ const f=formatAbility(humanHero,c.name); const eff=abilityEffects(c.name);
        return `<button class="abil pick" data-name="${c.name.replace(/"/g,'&quot;')}">
        <div><div class="an">${f.name}</div><div class="req">${f.req}${(c.baseDamage>0)?(c.defendable?' · défendable':' · indéfendable'):''}${eff?` · ${eff}`:''}</div></div>
        <div class="dv">${c.baseDamage!=null?c.baseDamage+' dmg':'—'}</div></button>`; }).join('');
      box.querySelectorAll('.abil.pick').forEach(el=>el.onclick=()=>chooseAbility(el.dataset.name));
    } else {
      $('board-title').textContent = 'Habiletés — ' + humanHero.name;
      const cands = ((phase==='roll' && attempts>0) || phase==='alter') ? G.matchedAbilities(g, dice.map(d=>d.v)) : [];
      const isOn = name => cands.some(c=>c.name===name || c.name.startsWith(name+' '));
      const self = g.state.players[g.humanIdx];
      const hero = G.heroTemplateFor(HUMAN);
      // Data-driven board: base abilities (marked ' II' when their upgrade is in play) PLUS the
      // sub-abilities (altAbility) unlocked by upgrades — previously invisible on the panel.
      const rows = [];
      for (const a of REFERENCE[HUMAN]) {
        const up = refUpgradeInfo(a.name, self.upgradesInPlay);
        rows.push({ name: a.name + (up ? up.suffix : ''), matchName: a.name,
          req: (up && up.req) || a.req,
          dmg: (up && up.dmg) || a.dmg, on: isOn(a.name),
          eff: boardRowEffects(HUMAN, g.humanIdx, a.name) });
      }
      for (const card of hero.cards) {
        if (card.altAbility && self.upgradesInPlay.includes(card.id)) {
          const alt = card.altAbility;
          const short = alt.boardName.replace(/\s*\([^)]*\)$/, '');
          const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
          // Show the riders too (Cursed Gallop's +1 Grim Pursuit was invisible — reported).
          rows.push({ name: `↳ ${short}`, matchName: short, req,
            dmg: alt.baseDamage != null ? alt.baseDamage : '—', on: isOn(short),
            eff: abilityEffects(alt.boardName) });
        }
      }
      // rv/dr/th : les sub-habiletés vivent dans hero.altAbilities avec requiresUpgrade(Id)
      // — invisibles jusqu'ici (bug user 2026-07-06 : « je ne vois pas les sub abilités »).
      for (const alt of (hero.altAbilities||[])) {
        const need = alt.requiresUpgradeId || alt.requiresUpgrade;
        if (!need || !self.upgradesInPlay.includes(need)) continue;
        const short = alt.boardName.replace(/\s*\([^)]*\)$/, '');
        const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
        rows.push({ name: `↳ ${short}`, matchName: short, req,
          dmg: alt.baseDamage != null ? alt.baseDamage : '—', on: isOn(short),
          eff: alt.notes || alt.effect || '' });
      }
      box.innerHTML = rows.map(a=>`<div class="abil${a.on?' on':''}">
        <div><div class="an">${a.name}</div><div class="req">${renderReq(humanHero,a.req)}</div>${a.eff?`<div class="eff">${a.eff}</div>`:''}</div><div class="dv">${a.dmg}</div></div>`).join('')
        + defBoxHTML(HUMAN, self);
    }
    renderAiBoard();
    renderEvPanel();
  }

  // 📊 EV par habileté selon TON ÉTAT COURANT (jetons, upgrades, forme, taxe de la défense
  // IA incluse) — demande user 2026-07-07 : « voir les EV en fonction de ce que tu as ».
  // Pour chaque ligne du board, on fabrique un jet de dés qui satisfait juste son pattern et
  // on lit la valeur du solveur (dégâts + valeur des jetons gagnés − taxe défense adverse).
  function synthDiceForReq(req){
    if (!req || req==='—') return null;
    const su = req.match(/suite\s*(\d)/i);
    const cls = humanHero.cls;
    // faces par symbole, dérivées du classifieur du héros (py a 4 symboles)
    const faces = {};
    for (let f=1; f<=6; f++){ const k=cls(f); (faces[k]=faces[k]||[]).push(f); }
    if (su){
      return su[1]==='5' ? [1,2,3,4,5] : [1,2,3,4,4]; // le double 4 évite la grande suite
    }
    const syms = req.replace(/[^A-D]/g,'').split('');
    if (!syms.length) return null;
    const idx = {A:0,B:0,C:0,D:0};
    const out = syms.map(s=>{ const fs=faces[s]||[1]; const v=fs[idx[s]%fs.length]; idx[s]++; return v; });
    // Complète à 5 dés avec des symboles ABSENTS du pattern (faces distinctes) : padder le
    // même symbole gonflerait le tier (AAA -> 5A), et des valeurs répétées créeraient un
    // N-of-a-kind bonus fantôme. Les autres habiletés activées par le pad ne gênent pas —
    // on lit la valeur de la ligne visée uniquement.
    const others = Object.keys(faces).filter(s=>!syms.includes(s));
    let oi = 0;
    while (out.length < 5) {
      const s = others.length ? others[oi % others.length] : syms[0];
      const fs = faces[s] || [1];
      out.push(fs[idx[s] % fs.length]); idx[s]++; oi++;
    }
    return out.slice(0,5);
  }
  function renderEvPanel(){
    const box = document.getElementById('ev-panel');
    if (!box) return;
    try {
      const self=g.state.players[g.humanIdx], opp=g.state.players[g.aiIdx];
      const st = G.oracleStateFor(self, opp);
      const entries=[];
      for (const a of REFERENCE[HUMAN]||[]) {
        const d5 = synthDiceForReq(a.req);
        if (!d5) continue;
        const base = a.name.replace(/\s*\(grande\)\s*$/,'');
        const hits = G.fullAbilityBoard(HUMAN, d5, st)
          .filter(x=>x.matched && (x.name===base || x.name.startsWith(base+' ') || x.name.startsWith(base+'!')))
          .sort((x,y)=>y.value-x.value);
        if (hits.length) entries.push({ name:a.name, req:a.req, ev:hits[0].value });
      }
      if (!entries.length) { box.innerHTML = '<div class="empty">—</div>'; return; }
      entries.sort((x,y)=>y.ev-x.ev);
      const best = entries[0].ev;
      box.innerHTML = entries.map(e=>`<div class="abil${e.ev===best?' on':''}">
        <div><div class="an">${e.ev===best?'⭐ ':''}${e.name}</div><div class="req">${renderReq(humanHero,e.req)}</div></div>
        <div class="dv">${e.ev.toFixed(1)}</div></div>`).join('')
        + `<div class="defbox">EV nette si l'habileté part MAINTENANT : dégâts + valeur des jetons/effets gagnés − ce que la défense ${aiHero.name} va te bouffer. Recalculée avec TES jetons, upgrades et position à chaque changement.</div>`;
    } catch(err){ box.innerHTML = '<div class="empty">—</div>'; }
  }

  // The DEFENSE box each printed hero board has — name, dice formula, per-symbol effects —
  // II-aware ("je ne vois toujours pas sur le board la défense", reported).
  function defBoxHTML(heroKey, p){
    if (heroKey==='th'){
      const up = (p.upgradesInPlay||[]).includes('thunder-wheel-ii');
      return `<div class="defbox"><b>🛡️ Thunder Wheel${up?' II':''}</b><br>
        Lance ${up?4:3} dés : préviens 2 par Digne<br>
        ${up?'CHAQUE paire':'≥2'} Marteaux : navette Mjölnir · +1 EK par Tonnerre</div>`;
    }
    if (heroKey==='dr'){
      const bear = p.form==='bear';
      return `<div class="defbox"><b>🛡️ Thick Hide${bear?' (Ours 🐻)':''}</b><br>
        Lance ${bear?4:2} dés : 1 contre-dégât par Griffe<br>
        ${bear?'Ours : préviens 1 par Patte + 1 par Nature':'(prévention en Bear Form seulement)'}</div>`;
    }
    if (heroKey==='rv'){
      const up = p.upgradesInPlay.includes('nothing-more-ii');
      return `<div class="defbox"><b>🛡️ Nothing More${up?' II':''}</b><br>
        Lance 5 dés : ${up?'1 contre-dégât PAR Talon':'≥2 Talons = 2 contre-dégâts (une fois)'}<br>
        ≥2 Ailes = préviens 2 (une fois) · ≥2 Œils = Active Nevermore</div>`;
    }
    if (heroKey==='py'){
      const t3 = p.upgradesInPlay.includes('molten-armor-iii'), t2 = p.upgradesInPlay.includes('molten-armor-ii');
      return `<div class="defbox"><b>🛡️ Molten Armor${t3?' III':t2?' II':''}</b><br>
        Lance 5 dés : +1 Fire Mastery par Fiery Soul${t3?' et par Meteor':''} · 1 contre-dégât par Flame${t3?' et par Meteor':''}<br>
        ${(t2||t3)?'≥1 Flame ET ≥1 Blaze : inflige Burn · ':''}(aucune prévention)</div>`;
    }
    if (heroKey==='sm'){
      return `<div class="defbox"><b>🛡️ Spider-Sense / Counterpunch</b> (au choix à chaque attaque)<br>
        Spider-Sense : 2 dés — ≥1 Spider = préviens la MOITIÉ (arrondi sup., une fois)<br>
        · peut défausser Invisibility → relance · Counterpunch : 3 dés — 1 contre-dégât par Thwip</div>`;
    }
    if (heroKey==='nx'){
      return `<div class="defbox"><b>🛡️ Dragon Scales</b><br>
        Lance 1 dé : 1 = prévient 1 · 2-5 = prévient 3 · 6 = prévient 5<br>
        (contre tout dégât défendable — l'indéfendable passe TOUT)<br>
        ${g.state.bossHard?'<b>HARD MODE : 2 dés d\'attaque, garde le plus haut</b><br>':''}
        CP infini · 0 carte · 1 dé, 1 tentative (non modifiables) · tu peux altérer son dé</div>`;
    }
    if (heroKey==='fm'){
      return `<div class="defbox"><b>🛡️ Masterwork</b><br>
        Lance 1 dé :<br>
        Pioche = Mine ton deck · Forge = double l'effet d'UNE armure · Enclume = double jusqu'à 2 armures<br>
        (Casque = contre-dégâts 1/2/3 · Bouclier = prévient 1/2 · bouclier Ultimanium : prévient 2 même l'indéfendable, sauf Ultimate)</div>`;
    }
    if (heroKey==='du'){
      const up = (p.upgradesInPlay||[]).includes('retreat-ii');
      return `<div class="defbox"><b>🛡️ Retreat${up?' II':''}</b><br>
        Lance 4 dés : 1 contre-dégât par ${up?'Blade':'2 Blades'}<br>
        CHAQUE Boot/Pierce = 1 step backward OBLIGATOIRE (la position finale donne le bonus défensif : pige 1 / prévient 3, un bonus/tour)</div>`;
    }
    if (heroKey==='se'){
      const up = (p.upgradesInPlay||[]).includes('harness-the-light-ii');
      return `<div class="defbox"><b>🛡️ Harness the Light${up?' II':''}</b><br>
        Lance 3 dés : soigne 1 par Stave (aucune prévention)<br>
        ${up?'Charge (une fois) : cadran +1 · cadran +1 PAR Sun Power · Stave+Charge+Sun Power : +Charged Gem':'2 Charges (une fois) : cadran +1 · Sun Power (une fois) : cadran +1'}</div>`;
    }
    if (heroKey==='hh'){
      const up = p.upgradesInPlay.includes('hallowed-reckoning-ii');
      return `<div class="defbox"><b>🛡️ Hallowed Reckoning${up?' II':''}</b><br>
        Lance ${up?'2':'1'}+Dreadful dés (max 5) :<br>
        Hache = 1 contre-dégât · 2 Fers = 1 prévenu · Frayeur = +1 Dreadful${up?'<br>2 Frayeurs = +1 Grim Pursuit':''}</div>`;
    }
    const up = p.upgradesInPlay.includes('sabotage-ii');
    return `<div class="defbox"><b>🛡️ Sabotage${up?' II':''}</b><br>
      Lance ${up?'4':'3'} dés :<br>
      Bâton = 1 contre-dégât · Espionnage = 1 prévenu · paire de Veuves = Time Bomb<br>
      ≥4 upgrades en jeu : peut tout relancer</div>`;
  }

  // The AI's board in its own LEFT panel (was crammed under yours — bad layout, reported).
  function renderAiBoard(){
    const box = document.getElementById('ai-abils');
    if (!box) return;
    document.getElementById('ai-board-title').textContent = 'Board IA — ' + aiHero.name;
    const ai = g.state.players[g.aiIdx];
    const aiHeroT = G.heroTemplateFor(AI_HERO);
    const aiRows = [];
    for (const a of REFERENCE[AI_HERO]) {
      const up = refUpgradeInfo(a.name, ai.upgradesInPlay);
      aiRows.push({ name: a.name + (up ? up.suffix : ''), req: (up && up.req) || a.req,
        dmg: (up && up.dmg) || a.dmg,
        eff: boardRowEffects(AI_HERO, g.aiIdx, a.name) });
    }
    for (const card of aiHeroT.cards) {
      if (card.altAbility && ai.upgradesInPlay.includes(card.id)) {
        const alt = card.altAbility;
        const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
        aiRows.push({ name: `↳ ${alt.boardName.replace(/\s*\([^)]*\)$/, '')}`, req,
          dmg: alt.baseDamage != null ? String(alt.baseDamage) : '—',
          eff: abilityEffects(alt.boardName, AI_HERO, g.aiIdx) });
      }
    }
    for (const alt of (aiHeroT.altAbilities||[])) {
      const need = alt.requiresUpgradeId || alt.requiresUpgrade;
      if (!need || !ai.upgradesInPlay.includes(need)) continue;
      const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
      aiRows.push({ name: `↳ ${alt.boardName.replace(/\s*\([^)]*\)$/, '')}`, req,
        dmg: alt.baseDamage != null ? String(alt.baseDamage) : '—',
        eff: alt.notes || alt.effect || '' });
    }
    box.innerHTML = aiRows.map(a=>`<div class="abil" style="opacity:.85">
      <div><div class="an">${a.name}</div><div class="req">${renderReq(aiHero,a.req)}</div>${a.eff?`<div class="eff">${a.eff}</div>`:''}</div><div class="dv">${a.dmg}</div></div>`).join('')
      + defBoxHTML(AI_HERO, ai);
  }

  // ---- Vrais scans de cartes (plan C) : mapping cardId -> chemin, modal au clic 🔍 ----
  // fetch() est bloqué en file:// (CORS) — le mapping vient de card-images.js (balise script).
  const CARD_IMG = window.CARD_IMG || {};
  function showCardImage(id, name){
    const src = CARD_IMG[id]; if (!src) return;
    let ov = document.getElementById('card-modal');
    if (!ov) {
      ov = document.createElement('div'); ov.id='card-modal';
      ov.style.cssText='position:fixed;inset:0;background:#000c;display:flex;align-items:center;justify-content:center;z-index:99;cursor:zoom-out';
      ov.onclick = ()=>{ ov.style.display='none'; };
      ov.innerHTML = '<img style="max-height:92vh;max-width:92vw;border-radius:10px;box-shadow:0 12px 60px #000">';
      document.body.appendChild(ov);
    }
    ov.querySelector('img').src = src; ov.querySelector('img').alt = name||id;
    ov.style.display='flex';
  }
  // ---- Tracker deck/défausse (plan #1) : info publique du jeu physique ----
  let cardsDrawerOpen = false;
  function grpCounts(ids){
    const m = new Map();
    for (const id of ids) m.set(id, (m.get(id)||0)+1);
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function cardNameOf(id){
    for (const hk of [HUMAN, AI_HERO]) {
      if (hk==='nx') continue;
      const c = G.cardById(G.heroTemplateFor(hk), id);
      if (c) return c.name || id;
    }
    return id;
  }
  function trackerRows(ids, withProb){
    const total = ids.length;
    if (!total) return '<div class="empty" style="padding:4px 0">vide</div>';
    return grpCounts(ids).map(([id,n])=>{
      const p = withProb ? ` <span style="color:var(--muted)">· ${Math.round(100*n/total)} % au tirage</span>` : '';
      const peek = CARD_IMG[id] ? ` <span class="peek" data-peek="${id}" style="cursor:zoom-in;opacity:.6">🔍</span>` : '';
      return `<div style="padding:2px 0;border-bottom:1px solid #ffffff12">${cardNameOf(id)} <b>×${n}</b>${p}${peek}</div>`;
    }).join('');
  }
  function renderCardsDrawer(){
    let d = document.getElementById('cards-drawer');
    if (!cardsDrawerOpen) { if (d) d.style.display='none'; return; }
    if (!d) {
      d = document.createElement('div'); d.id='cards-drawer';
      d.style.cssText='position:fixed;top:60px;right:10px;width:340px;max-height:80vh;overflow-y:auto;'+
        'background:var(--panel,#221b30);border:1px solid #3a2f52;border-radius:10px;padding:12px;z-index:60;'+
        'font-size:12.5px;box-shadow:0 10px 40px #000a';
      document.body.appendChild(d);
    }
    d.style.display='';
    const you = g.state.players[g.humanIdx], ai = g.state.players[g.aiIdx];
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
        <b>🂠 Cartes (info publique)</b>
        <button class="btn" style="font-size:.7rem;padding:2px 8px" id="cd-close">✕</button></div>
      <div style="margin-top:8px;color:var(--gold);font-weight:600">Ton deck restant (${you.deck.length})</div>
      ${trackerRows(you.deck, true)}
      <div style="margin-top:10px;color:var(--gold);font-weight:600">Ta défausse (${you.discard.length})</div>
      ${trackerRows(you.discard, false)}
      <div style="margin-top:10px;color:var(--gold);font-weight:600">Défausse de l'IA (${ai.discard.length})</div>
      ${trackerRows(ai.discard, false)}
      ${ai.heroId==='nx' ? '' : `<div style="margin-top:8px;color:var(--muted)">Deck IA : ${ai.deck.length} cartes · Main IA : ${ai.hand.length} (cachée)</div>`}`;
    d.querySelector('#cd-close').onclick = ()=>{ cardsDrawerOpen=false; renderCardsDrawer(); };
    d.querySelectorAll('.peek').forEach(el=>{ el.onclick=(e)=>{ e.stopPropagation(); showCardImage(el.dataset.peek); }; });
  }
  function renderHand() {
    const p = g.state.players[g.humanIdx];
    const hero = G.heroTemplateFor(HUMAN);
    const inMain = (phase==='main1' || phase==='main2');
    const playable = new Set(inMain
      ? usableOptions(G.humanMainOptions(g, phase)).filter(o=>o.kind==='playCard'||o.kind==='playInstant').map(o=>o.cardId) : []);
    if (!p.hand.length) { $('hand').innerHTML='<div class="empty">Main vide.</div>'; return; }
    $('hand').innerHTML = p.hand.map((id,idx)=>{
      const c = G.cardById(hero, id) || {name:id, cpCost:0, kind:'', text:''};
      const canPlay = playable.has(id);
      // Official rule: any hand card can be sold for 1 CP during your Main Phases.
      const sellBtn = inMain ? `<button class="btn sell" data-sell="${idx}" style="margin-top:6px;font-size:.72rem;padding:3px 8px">Vendre +1 CP</button>` : '';
      return `<div class="card${canPlay?' playable':''}" data-id="${id}" data-idx="${idx}" ${canPlay?'role="button" tabindex="0"':''}>
        <div class="ctop"><div class="cname">${c.name||id} <span class="peek" data-peek="${id}" title="Voir le vrai scan" style="cursor:zoom-in;opacity:.65">🔍</span></div><div class="cost">${c.cpCost!=null?c.cpCost:'·'}</div></div>
        <div class="ctype">${labelKind(c)}</div><div class="ctext">${c.text||''}</div>${sellBtn}</div>`;
    }).join('');
    $('hand').querySelectorAll('.peek').forEach(el=>{
      el.onclick = (e)=>{ e.stopPropagation(); showCardImage(el.dataset.peek); };
    });
    if (inMain) {
      $('hand').querySelectorAll('.card.playable').forEach(el=>{
        el.onclick = ()=>playMainCard(el.dataset.id);
        el.onkeydown = e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); playMainCard(el.dataset.id); } };
      });
      $('hand').querySelectorAll('button.sell').forEach(el=>{
        el.onclick = (e)=>{
          e.stopPropagation(); // don't also trigger the card's own "play" click
          const cardId = p.hand[+el.dataset.sell];
          const a = G.humanMainOptions(g, mainPhaseNow()).find(o=>o.kind==='sellCard'&&o.cardId===cardId);
          if (a) { log(`Tu vends <b>${(G.cardById(hero,cardId)||{}).name||cardId}</b> (+1 CP).`); G.humanApplyMain(g,a,mainPhaseNow()); renderAll(); }
        };
      });
    }
  }
  function labelKind(c){ return (c.kind==='upgrade'?'Amélioration':c.actionTiming==='instant'?'Instant':c.actionTiming==='mainPhase'?'Main Phase':c.actionTiming==='rollPhase'?'Roll Phase':(c.kind||'')); }

  // ---------- controls per phase ----------
  function btn(label, cls, on, disabled){ const b=document.createElement('button'); b.className='btn'+(cls?' '+cls:'');
    b.textContent=label; if(disabled) b.disabled=true; else b.onclick=on; return b; }
  function nvModeLabel(){
    const m = g.state.players[g.humanIdx].nevermoreMode;
    return m==='absorb' ? '🩸 Absorber' : m==='move' ? '✈️ Déplacer' : '🤖 Auto';
  }
  function addThorBtns(c, ekDraw){
    // ekDraw : la pioche ⚡×4 est une action de MAIN PHASE (leaflet vérifié) — le bouton
    // n'apparaissait qu'en roll/defarm (illégal) et jamais en main (user-caught : « je suis
    // cap EK, avant d'activer mon attaque je voudrais piger, mais je ne peux pas »).
    if (HUMAN!=='th') return;
    const you=g.state.players[g.humanIdx], ai=g.state.players[1-g.humanIdx];
    if (you.hand.length>0){
      const act = you.mjolnirAway ? 'Retrieve (+1 EK)' : 'Throw (1 dmg)';
      c.appendChild(btn(`🔨 ${act} — défausse 1 carte`,'', ()=>{
        const names=you.hand.map((id,i)=>`${i+1}. ${(cardNameOf(id)||id)}`).join('\n');
        const k=parseInt(prompt(`Mjölnir : ${act}\nQuelle carte défausser ?\n${names}`,'1'));
        if(!(k>=1&&k<=you.hand.length)) return;
        const cid=you.hand.splice(k-1,1)[0]; you.discard.push(cid);
        if (you.mjolnirAway){ you.mjolnirAway=false; you.tokens.electrokinesis=Math.min(4,(you.tokens.electrokinesis||0)+1);
          log(`🔨 <b>Retrieve Mjölnir</b> (défausse ${cardNameOf(cid)||cid}) : +1 ⚡EK.`); }
        else { you.mjolnirAway=true; you.thrownThisTurn=(you.thrownThisTurn||0)+1; ai.hp-=1;
          log(`🔨 <b>Throw Mjölnir</b> (défausse ${cardNameOf(cid)||cid}) : 1 dégât isolé indéfendable.`); if (ai.hp<=0){ g.state.gameOver=true; g.state.winner=g.humanIdx; } }
        renderAll();
      }));
    }
    if (ekDraw && (you.tokens.electrokinesis||0)>=4 && !you.ekDrawUsedThisTurn){
      c.appendChild(btn('⚡×4 → pioche 1','', ()=>{
        you.tokens.electrokinesis-=4; you.ekDrawUsedThisTurn=true;
        if (you.deck.length>0){ you.hand.push(you.deck.shift()); }
        log('⚡ <b>Electrokinesis ×4</b> dépensés : pioche 1.');
        renderAll();
      }));
    }
  }
  function addMorphBtns(c){
    if (HUMAN!=='dr') return;
    const you=g.state.players[g.humanIdx];
    // Toggle pré-armé : les SS gagnés PENDANT la résolution (ex. l'Ult donne 2 SS) sont
    // dépensables AVANT la conclusion — armé, le moteur passe Chat dès que possible (+2, Wound).
    if ((you.form||'druid')!=='cat'){
      c.appendChild(btn(`${you.drCatOnAttack?'✅ ':''}🐆 Passer Chat pendant l'attaque dès qu'un SS est dispo (+2, Wound)`, you.drCatOnAttack?'primary':'', ()=>{
        you.drCatOnAttack=!you.drCatOnAttack; renderControls(); }));
    }
    if (!(you.tokens.shapeShift>0)) return;
    const F={druid:'🧙 Druide',cat:'🐆 Chat',bear:'🐻 Ours'};
    for (const f of ['bear','cat','druid']){
      if ((you.form||'druid')===f) continue;
      c.appendChild(btn(`🔄→ ${F[f]} (1 SS)`,'', ()=>{
        you.tokens.shapeShift-=1; you.form=f;
        log(`🔄 Shape Shift : tu passes en <b>${F[f]}</b>.`);
        renderAll();
      }));
    }
  }
  function addFmDefBtns(c){
    // Masterwork face Forge (4-5) : QUELLE armure doubler = ton choix, pré-armé (user-caught :
    // le moteur prenait le bouclier tout seul). Auto = heuristique du gain réel.
    if (HUMAN!=='fm') return;
    const you=g.state.players[g.humanIdx];
    if (!(you.armor && (you.armor.helmet>0 || you.armor.shield>0))) return;
    const lbl = you.fmForgePref==='helmet' ? '🪖 Casque (contre x2)' : you.fmForgePref==='shield' ? '🛡️ Bouclier (prévention x2)' : '🤖 Auto (meilleur gain)';
    c.appendChild(btn(`⚒️ Forge (4-5) double : ${lbl}`,'', ()=>{
      you.fmForgePref = you.fmForgePref===undefined ? 'helmet' : you.fmForgePref==='helmet' ? 'shield' : undefined;
      renderControls();
    }));
  }
  function addSmDefBtns(c){
    // Choix de défense + dépenses d'Invisibility pré-armés AVANT le jet (leçon Guard Break :
    // jamais de décision automatique pour le joueur humain).
    if (HUMAN!=='sm') return;
    const you=g.state.players[g.humanIdx];
    const mode = you.smDefenseMode;
    c.appendChild(btn(`🛡️ Défense : ${mode==='counter'?'👊 Counterpunch (3 dés, contre)':mode==='sense'?'🕷️ Spider-Sense (2 dés, prévention ½)':'🤖 Auto (heuristique)'}`,'', ()=>{
      you.smDefenseMode = mode===undefined ? 'sense' : mode==='sense' ? 'counter' : undefined;
      renderControls();
    }));
    if ((you.tokens.invisibility||0)>0){
      c.appendChild(btn(`${you.smInvisDefendArmed?'✅ ':''}👤 Invisibility : défendre contre l'INDÉFENDABLE (défausse le jeton)`, you.smInvisDefendArmed?'primary':'', ()=>{
        you.smInvisDefendArmed=!you.smInvisDefendArmed; renderControls(); }));
      c.appendChild(btn(`${you.smInvisRerollArmed?'✅ ':''}👤 Invisibility : relance auto si Spider-Sense rate (défausse le jeton)`, you.smInvisRerollArmed?'primary':'', ()=>{
        you.smInvisRerollArmed=!you.smInvisRerollArmed; renderControls(); }));
    }
    if (you.hand.includes('swing-escape') && you.cp>=1){
      c.appendChild(btn(`${you.swingEscapeArmed?'✅ ':''}🕸️ Swing Escape! : Spider-Sense réussit sur Toile (payé 1 CP seulement si ça convertit)`, you.swingEscapeArmed?'primary':'', ()=>{
        you.swingEscapeArmed=!you.swingEscapeArmed; renderControls(); }));
    }
  }
  function addNvToggle(c){
    if (HUMAN!=='rv') return;
    c.appendChild(btn(`🐦‍⬛ Nevermore : ${nvModeLabel()}`,'', ()=>{
      const p=g.state.players[g.humanIdx];
      p.nevermoreMode = p.nevermoreMode===undefined ? 'absorb' : p.nevermoreMode==='absorb' ? 'move' : undefined;
      log(`🐦‍⬛ Stratégie Nevermore : <b>${nvModeLabel()}</b>`);
      renderControls();
    }));
  }
  function renderControls() {
    const c = $('controls'); c.innerHTML='';
    // While it's the AI's turn (except the defense window, which IS yours to act in), never show
    // your action buttons — otherwise a stale Main-Phase panel could be clicked during the AI's turn.
    if (phase!=='defense' && phase!=='defarm' && phase!=='aialter' && phase!=='over' && g.state.activePlayerIdx !== g.humanIdx) {
      const s=document.createElement('span'); s.className='rolls'; s.textContent='L\'IA joue son tour…'; c.appendChild(s); return;
    }
    if (phase==='tbroll') {
      const n = g.state.players[g.humanIdx].timeBombs.length;
      const s=document.createElement('span'); s.className='rolls'; s.textContent=`Tu portes ${n} Time Bomb — lance pour voir si elle avance (1-5) ou se désamorce (6) :`; c.appendChild(s);
      c.appendChild(btn('💣 Lancer le dé de Time Bomb','primary', ()=>{ tbArmed=true; startHumanTurn(); }));
    } else if (phase==='defarm') {
      const a = pendingAttackInfo;
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = a && a.abilityName ? `${formatAbility(aiHero,a.abilityName).name} arrive (${a.defendable?`~${a.incomingDamage} dégâts, défendable`:'indéfendable !'}) :` : 'Attaque entrante :';
      addMorphBtns(c); // 🐻 passer Ours AVANT de lancer ta défense (Shape Shift à tout moment)
      addThorBtns(c); // 🔨 navette Mjölnir possible à tout moment (défausse 1 carte)
      addSmDefBtns(c); // 🕷️ choix Spider-Sense/Counterpunch + dépenses Invisibility pré-armées
      addFmDefBtns(c); // ⚒️ Masterwork Forge : quelle armure doubler (pré-armé)
      if (HUMAN==='du') { // 👣 où tu es AVANT le jet — les reculs de Retreat sont OBLIGATOIRES (règle)
        const youDu=g.state.players[g.humanIdx], posDu=youDu.footwork||0;
        const LBLD={'-2':'🛡️+3 Défensif (prévient 3)','-1':'🂠 Défensif (pige 1)','0':'⚖️ Neutral','1':'⚔️+1 Off.','2':'⚔️+3 Off.'};
        const sD=document.createElement('span'); sD.className='rolls';
        sD.innerHTML=`👣 Position : <b>${LBLD[String(posDu)]}</b>${youDu.footworkBonusUsedThisTurn?' (bonus du tour déjà consommé)':''} — chaque Boot/Pierce de Retreat te recule d'1 (obligatoire), le bonus se calcule sur la position FINALE`;
        c.appendChild(sD);
      }
      c.appendChild(s);
      c.appendChild(btn('🛡️ Lancer ta défense →','primary', aiDefenseStep));
    } else if (phase==='upkeep' && HUMAN==='fm') {
      const ORE_FR={'gold-ore':'Gold Ore','diamond-ore':'Diamond Ore','ultimanium-ore':'Ultimanium Ore'};
      const top3 = G.humanMinePeek(g);
      const hero = G.heroTemplateFor(HUMAN);
      const names = top3.map(id => (ORE_FR[id] || (G.cardById(hero,id)||{}).name || id));
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = `⛏️ The Mines — tu regardes : ${names.join(' · ')}. Choisis :`; c.appendChild(s);
      const seen = new Set();
      top3.forEach(id => {
        if (!ORE_FR[id] || seen.has(id)) return; seen.add(id);
        c.appendChild(btn(`Révéler ${ORE_FR[id]} → la Forge`,'primary', ()=>doBeginTurn(undefined,{kind:'reveal',oreId:id})));
      });
      c.appendChild(btn('Ne rien révéler (+1 CP)','', ()=>doBeginTurn(undefined,{kind:'cp'})));
      c.appendChild(btn('Ne pas miner','gold', ()=>doBeginTurn(undefined,{kind:'skip'})));
    } else if (phase==='upkeep' && (HUMAN==='du'
        // héros non-du porteur de Disarm (inflige par l'IA du) — sauf hh quand son prompt
        // Headless Mayhem prime (dans ce cas rare le Disarm suit l'heuristique moteur)
        || ((g.state.players[g.humanIdx].tokens.disarm||0)>0 && !(HUMAN==='hh' && (G.humanCanTerrorize(g) || g.state.players[g.humanIdx].tokens.head>0))))) {
      const you=g.state.players[g.humanIdx];
      const pos=you.footwork||0;
      const heroDu=G.heroTemplateFor(HUMAN);
      // Disarm : TON choix (défausser 1 carte ou sauter l'Income) — pré-armé avant Reposition.
      if ((you.tokens.disarm||0)>0){
        const s0=document.createElement('span'); s0.className='rolls';
        s0.textContent='🪝 Disarm — défausse 1 carte OU saute ton Income :'; c.appendChild(s0);
        const seenIds=new Set();
        you.hand.forEach(id=>{
          if (seenIds.has(id)) return; seenIds.add(id);
          const nm=(G.cardById(heroDu,id)||{name:id}).name;
          c.appendChild(btn(`${you.duDisarmChoice===id?'✅ ':''}Défausser ${nm}`, you.duDisarmChoice===id?'primary':'', ()=>{
            you.duDisarmChoice=id; if (HUMAN!=='du') doBeginTurn(undefined); else renderControls(); }));
        });
        c.appendChild(btn(`${you.duDisarmChoice==='skip'?'✅ ':''}Sauter l'Income (garde ta main)`, you.duDisarmChoice==='skip'?'primary':'', ()=>{
          you.duDisarmChoice='skip'; if (HUMAN!=='du') doBeginTurn(undefined); else renderControls(); }));
        if (HUMAN!=='du') return;
      }
      // Reposition (passif OBLIGATOIRE) : 1 ou 2 Steps dans UNE direction ; recul d'EXACTEMENT
      // 1 step = +1 Guard Break (dos du leaflet : 2 back = pas de GB).
      const s=document.createElement('span'); s.className='rolls';
      const POS_LBL={'-2':'🛡️+3 Défensif','-1':'🂠 Défensif (pige)','0':'⚖️ Neutral','1':'⚔️+1 Offensif','2':'⚔️+3 Offensif'};
      s.textContent=`👣 Reposition (obligatoire) — tu es en ${POS_LBL[String(pos)]} :`; c.appendChild(s);
      if (pos<2) c.appendChild(btn('⬆ 1 step forward','primary', ()=>{ you.duRepositionDir='forward'; doBeginTurn(undefined); }));
      if (pos<1) c.appendChild(btn('⬆⬆ 2 steps forward','', ()=>{ you.duRepositionDir='forward2'; doBeginTurn(undefined); }));
      if (pos>-2) c.appendChild(btn('⬇ 1 step backward (+1 Guard Break)','', ()=>{ you.duRepositionDir='backward1'; doBeginTurn(undefined); }));
      if (pos>-1) c.appendChild(btn('⬇⬇ 2 steps backward (+1 Guard Break)','', ()=>{ you.duRepositionDir='backward2'; doBeginTurn(undefined); }));
    } else if (phase==='upkeep') {
      const canTz = G.humanCanTerrorize(g);
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = 'Upkeep — Headless Mayhem, choisis :'; c.appendChild(s);
      if (canTz) c.appendChild(btn('Terrorize (−4 Dreadful → 3 dégâts sûrs, reprends la Tête, +1 Grim, +1 CP)','primary', ()=>doBeginTurn('terrorize')));
      // Only offer "give the Head" when you actually HOLD it — otherwise the click is a silent no-op.
      if (g.state.players[g.humanIdx].tokens.head > 0)
        c.appendChild(btn('Donner la Tête à l\'IA (+1 Dreadful à chaque fin de ton tour)','', ()=>doBeginTurn('giveHead')));
      c.appendChild(btn('Ne rien faire','gold', ()=>doBeginTurn('none')));
    } else if (phase==='main1' || phase==='main2') {
      // sellCard options (one per hand card) live on the cards themselves (renderHand), not here —
      // they'd flood this button row.
      const acts = usableOptions(G.humanMainOptions(g, phase)).filter(o=>o.kind!=='pass' && o.kind!=='sellCard');
      if (HUMAN==='fm') {
        const ORE_FR={'gold-ore':'Gold','diamond-ore':'Diamond','ultimanium-ore':'Ultimanium'};
        const you2 = g.state.players[g.humanIdx];
        const ores = you2.hand.filter(id=>ORE_FR[id]);
        if (ores.length) c.appendChild(btn(`⚒️ Poser ${ores.length} Ore sur la Forge`,'primary', ()=>{
          const placed = G.humanForgeOre(g); log(`⚒️ Tu poses <b>${placed.length} Ore</b> sur la Forge.`); renderAll(); }));
        for (const o of G.humanCraftOptions(g).slice(0,4)) {
          const cost = Object.entries(o.ore).map(([id,n])=>`${n} ${ORE_FR[id]||id}`).join(' + ');
          c.appendChild(btn(`🛠️ Crafter ${o.name} (${cost}${o.tier>1?` + pièce tier ${o.tier-1}`:''})`,'primary', ()=>{
            G.humanCraft(g, o.armorId); log(`🛠️ Tu craftes <b>${o.name}</b>.`); renderAll(); }));
        }
      }
      // Sun Elf : dépenser le Charged Gem (Main Phase, d6 -> CP et/ou 2 dmg indéfendables).
      if (HUMAN==='se') {
        const youSe = g.state.players[g.humanIdx];
        if ((youSe.tokens.chargedGem||0)>0) {
          c.appendChild(btn('💎 Dépenser Charged Gem (d6 : 1-2 = +1 CP · 3-4 = 2 dmg · 5-6 = les deux)','primary', ()=>{
            youSe.tokens.chargedGem = 0;
            const face = Math.floor(g.rng()*6)+1;
            const cp = (face<=2||face>=5)?1:0, dmgG = face>=3?2:0;
            if (cp) youSe.cp = Math.min(15, youSe.cp+cp);
            const oppSe = g.state.players[g.aiIdx];
            if (dmgG) oppSe.hp -= dmgG;
            log(`💎 Charged Gem : d6 = <b>${face}</b> → ${[cp?'+1 CP':'',dmgG?dmgG+' dégâts indéfendables':''].filter(Boolean).join(' + ')}.`);
            renderAll();
            if (oppSe.hp<=0) { g.state.winner=g.humanIdx; g.state.gameOver=true; end(); }
          }));
        }
      }
      if (acts.length===0) { const s=document.createElement('span'); s.className='rolls'; s.textContent='Rien à jouer (tu peux vendre des cartes ci-dessous, +1 CP chacune).'; c.appendChild(s); }
      else acts.slice(0,8).forEach(a=>c.appendChild(btn(mainLabel(a),'', ()=>applyMain(a))));
      addFmBtns(c);
      addThorBtns(c, true); // ⚡×4→pioche (Main Phase, leaflet) + navette Mjölnir
      addMorphBtns(c); // 🧙 revenir Druide en fin de tour = Regenerate (user-caught : bouton absent en Main Phase)
      // Combo (sm) : la dépense officielle est « à la conclusion de la Defensive Roll Phase
      // adverse » — dans le flux UI, juste après le BILAN, donc offerte en arrivant en main2.
      const youC = g.state.players[g.humanIdx];
      if (phase==='main2' && HUMAN==='sm' && (youC.tokens.combo||0)>0 && !youC.comboSpentThisTurn && youC.smAttackedThisPhase===true){
        c.appendChild(btn('👊 Combo : Offensive Roll Phase supplémentaire (même cible, 1×/tour)','primary', ()=>{
          youC.tokens.combo=0; youC.comboSpentThisTurn=true;
          log('👊 <b>Combo</b> dépensé : nouvelle Offensive Roll Phase !');
          phase='roll'; dice=[]; attempts=0; rollsLeft=2; renderAll();
        }));
      }
      // Stun (py) : tu l'as infligé pendant ton attaque — retire le jeton et rejoue une
      // Offensive Roll Phase complète contre l'adversaire (jeton vérifié).
      const aiStun = g.state.players[g.aiIdx];
      if (phase==='main2' && (aiStun.tokens.stun||0)>0){
        c.appendChild(btn('🌀 Stun : Offensive Roll Phase supplémentaire contre l\'adversaire','primary', ()=>{
          aiStun.tokens.stun=0;
          log('🌀 <b>Stun</b> retiré : nouvelle Offensive Roll Phase !');
          phase='roll'; dice=[]; attempts=0; rollsLeft=2; renderAll();
        }));
      }
      // Knockdown (py te l'a infligé) : payer 2 CP ou sauter TA phase d'attaque (choix, ruling).
      if (phase==='main1' && (youC.tokens.knockdown||0)>0){
        const pay = btn('💥 Knockdown : payer 2 CP puis attaquer →','primary', ()=>{
          youC.cp-=2; youC.tokens.knockdown=0;
          log('💥 <b>Knockdown</b> : tu paies 2 CP, le jeton est retiré.'); toRoll();
        }, youC.cp<2);
        c.appendChild(pay);
        c.appendChild(btn('💥 Knockdown : sauter ta phase d\'attaque →','gold', ()=>{
          youC.tokens.knockdown=0;
          log('💥 <b>Knockdown</b> : tu sautes ton Offensive Roll Phase, le jeton est retiré.');
          phase='main2'; renderAll();
        }));
      } else {
        c.appendChild(phase==='main1' ? btn('Passer aux dés →','gold', toRoll) : btn('Terminer le tour →','gold', finishHumanTurn));
      }
    } else if (phase==='roll') {
      if (attempts===0) { c.appendChild(btn('Lancer les dés','primary', doRoll)); }
      else {
        addNvToggle(c);
        addMorphBtns(c);
        addThorBtns(c);
        if (ttaCharges > 0) {
          const s0=document.createElement('span'); s0.className='rolls';
          s0.textContent='Try Try Again : 2e relance gratuite (même dé permis) —';
          c.appendChild(s0);
          dice.forEach((d,i)=>c.appendChild(btn(`↻ dé ${i+1} (${d.v})`,'primary',()=>{
            const nv=G.humanFreeRerollDie(g, dice.map(x=>x.v), i);
            log(`Try Try Again : 2e relance du dé ${i+1} — <b>${dice[i].v} → ${nv[i]}</b>.`);
            dice=nv.map((v,j)=>({v, kept: dice[j].kept})); ttaCharges=0; renderAll();
          })));
          c.appendChild(btn('Garder tel quel','',()=>{ ttaCharges=0; renderAll(); }));
          return;
        }
        c.appendChild(btn(rollsLeft>0?'Relancer les non-gardés':'Plus de relance','', doRoll, rollsLeft<=0));
        const s=document.createElement('span'); s.className='rolls'; s.textContent=`Relances : ${rollsLeft} · clic un dé pour le garder`; c.appendChild(s);
        // Grim Pursuit mode (a): out of rerolls, spend 1 token for one more Roll Attempt.
        const you = g.state.players[g.humanIdx];
        if (rollsLeft<=0 && you.tokens.grimPursuit>0 && !you.grimPursuitRerollUsedThisTurn)
          c.appendChild(btn(`Grim Pursuit : +1 relance (1×/tour · −1 jeton, reste ${you.tokens.grimPursuit})`,'primary', ()=>{
            if (G.humanSpendGrimPursuitReroll(g)) { rollsLeft++; log('💜 <b>Grim Pursuit</b> : +1 tentative de jet.'); renderAll(); }
          }));
        // Roller-only Roll Phase cards (Six-It!/Samesies!/Try Try Again!/One More Time!) — the
        // AI reaches these via its oracle hook; the human plays them here, between attempts.
        // Hard cap 6 buttons to avoid flooding the row (the useful targets come first).
        humanRollCardChoices().slice(0,6).forEach(ch=>c.appendChild(btn(rollCardLabel(ch),'', ()=>playRollCard(ch))));
        // Samesies! : mode 2-clics — n'importe quel dé peut copier n'importe quel AUTRE dé
        // (l'énumération "→ max seulement" cachait p.ex. 2→4, bug rapporté).
        const samCard = G.cardById(G.heroTemplateFor(HUMAN), 'samesies');
        if (samCard && you.hand.includes('samesies') && you.cp >= (samCard.cpCost||0)) {
          c.appendChild(btn(`${samMode?'✅ ':''}Samesies! : copie un dé sur un autre · ${samCard.cpCost||0} CP`,
            samMode?'primary':'', ()=>{ samMode=!samMode; samTarget=null; renderDice(false); renderControls(); }));
          if (samMode) {
            const s2=document.createElement('span'); s2.className='rolls';
            s2.textContent = samTarget===null
              ? '→ 1er clic : le dé MODÈLE (celui à copier)'
              : `→ tu copies le ${dice[samTarget].v} — 2e clic : le dé à CHANGER`;
            c.appendChild(s2);
          }
        }
        addFmBtns(c);
        c.appendChild(btn('Continuer →','gold', toAlter));
      }
    } else if (phase==='alter') {
      // Die-selection UX (the old flat list buried the useful combos under 250 buttons —
      // user-reported): click 1-2 dice above, value buttons appear here.
      const you = g.state.players[g.humanIdx];
      const hero = G.heroTemplateFor(HUMAN);
      const cardOK = id => { const cd=G.cardById(hero,id); return cd && you.hand.includes(id) && you.cp >= (cd.cpCost||0); };
      const sel = [...altSel].sort((a,b)=>a-b);
      const anyCard = ['so-wild','twice-as-wild','tip-it'].some(cardOK);
      const s=document.createElement('span'); s.className='rolls';
      if (!anyCard) s.textContent='Aucune carte de manipulation en main.';
      else if (sel.length===0) s.textContent='Clique 1 dé (So Wild!/Tip It!) ou 2 dés (Twice As Wild!) ci-dessus.';
      else if (sel.length===1) s.textContent=`Dé ${sel[0]+1} (${dice[sel[0]].v}) sélectionné — nouvelle valeur :`;
      else s.textContent=`Dés ${sel[0]+1} et ${sel[1]+1} sélectionnés — nouvelle valeur pour les DEUX :`;
      c.appendChild(s);
      addMorphBtns(c); // Shape Shift à tout moment (user-caught : impossible de passer Chat avant l'attaque)
      if (sel.length===1) {
        const i=sel[0], cur=dice[i].v;
        if (cardOK('tip-it')) {
          if (cur<6) c.appendChild(btn(`Tip It! : ${cur}→${cur+1} · 1 CP`,'', ()=>{ altSel.clear(); applyAlter({kind:'alterDie',cardId:'tip-it',dieIndex:i,delta:1}); }));
          if (cur>1) c.appendChild(btn(`Tip It! : ${cur}→${cur-1} · 1 CP`,'', ()=>{ altSel.clear(); applyAlter({kind:'alterDie',cardId:'tip-it',dieIndex:i,delta:-1}); }));
        }
        if (cardOK('so-wild')) for (let v=1; v<=6; v++) if (v!==cur)
          c.appendChild(btn(`So Wild! : ${cur}→${v} · 2 CP`,'', ()=>{ altSel.clear(); applyAlter({kind:'setDie',cardId:'so-wild',sets:[{dieIndex:i,value:v}]}); }));
      } else if (sel.length===2 && cardOK('twice-as-wild')) {
        const [i,j]=sel;
        for (let v=1; v<=6; v++) if (!(dice[i].v===v && dice[j].v===v))
          c.appendChild(btn(`Twice As Wild! : (${dice[i].v},${dice[j].v})→(${v},${v}) · 3 CP`,'primary', ()=>{ altSel.clear(); applyAlter({kind:'setDie',cardId:'twice-as-wild',sets:[{dieIndex:i,value:v},{dieIndex:j,value:v}]}); }));
      }
      addFmBtns(c);
      c.appendChild(btn('Choisir l\'habileté →','gold', toAbilityFromAlter));
    } else if (phase==='ability') {
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = cands.length ? 'Choisis une habileté à droite →' : 'Aucune habileté — tu rates ton attaque.';
      c.appendChild(s);
      addThorBtns(c); // 🔨 Retrieve AVANT l'attaque = +1 EK compté dans Odinforce/Bottled Lightning
      addMorphBtns(c); // 🐆 passer Chat AVANT de résoudre l'attaque = +2 dmg + Wound (user-caught)
      // Grim Pursuit mode (b): pre-arm +1d6 dmg on the attack you're about to pick.
      const you = g.state.players[g.humanIdx];
      // Offered even at 0 Grim Pursuit: "Gain X Grim Pursuit. THEN deal dmg" abilities (Ride
      // Down...) grant tokens BEFORE the attack modifiers fire, so pre-arming at 0 is legal —
      // the engine re-checks you hold >=1 at spend time (user-caught on Ride Down).
      // Shown only when it can actually fire: you hold a token, OR one of the candidate
      // abilities grants Grim Pursuit BEFORE damage (Ride Down...). At turn 1 with 0 tokens
      // and no granting candidate, the button was pure noise (user-caught).
      const gpFromCandidate = cands.some(cd => {
        try { const d = G.resolvedAbilityByBoardName(G.heroTemplateFor(HUMAN), cd.name, you.upgradesInPlay);
              return !!(d && d.tokensGrantedToSelf && d.tokensGrantedToSelf.grimPursuit); } catch (e) { return false; }
      });
      const gpPossible = you.tokens.grimPursuit > 0
        || (amSel.has('thundering-hooves') && you.cp > 0) // CP->GP conversion lands BEFORE the spend
        || gpFromCandidate;
      if (cands.length && gpPossible && !you.grimPursuitBonusUsedThisTurn) {
        const hint = you.tokens.grimPursuit>0 ? '' : " — 0 jeton : ne partira que si l'attaque en donne (ex. Ride Down)";
        const b = btn(`${gpBonusSel?'✅ ':''}Grim Pursuit : lance 5 dés, +1 dégât par Fer (1×/tour · −1 jeton)${hint}`, gpBonusSel?'primary':'', ()=>{ gpBonusSel=!gpBonusSel; renderControls(); });
        c.appendChild(b);
      }
      // Thor/Duelist : Guard Break pré-armé (avant, les jetons partaient AUTOMATIQUEMENT dès
      // 5+ dégâts — heuristique IA appliquée au joueur humain, user-caught). Même jeton.
      if ((HUMAN==='th'||HUMAN==='du') && cands.length && (you.tokens.guardBreak||0)>0) {
        c.appendChild(btn(`${gbSel?'✅ ':''}Guard Break : d6 par jeton, 4-5 = attaque INDÉFENDABLE (arrêt au 1er succès)`,
          gbSel?'primary':'', ()=>{ gbSel=!gbSel; renderControls(); }));
      }
      // Sun Elf : côté DAWN, dumper la valeur du cadran en dégâts sur CETTE attaque (puis −4)
      // — ta décision, pré-armée (jamais automatique).
      if (HUMAN==='se' && cands.length && you.sunDialDawn===true) {
        // La décharge lit le cadran AU MOMENT de l'attaque — APRÈS le « Increase Sun Dial »
        // de l'habileté choisie (user-caught : l'étiquette montrait le cadran d'avant).
        const dialGain = {'Ray Absorption':3,'Solar Burst':2,'Sunbeam':you.upgradesInPlay.includes('sunbeam-ii')?3:2,'Ray of Light':1,'Solar Flare!':3,'Bestow Your Light':4}
        const gains = cands.map(cd=>{ const k=Object.keys(dialGain).find(n=>cd.name.startsWith(n)); return k?dialGain[k]:0; });
        const maxAfter = Math.min(5,(you.sunDial||0)+Math.max(0,...gains,0));
        c.appendChild(btn(`${you.seDawnSpendArmed?'✅ ':''}🌅 DAWN : décharger le cadran sur cette attaque (maintenant ${you.sunDial||0}${maxAfter>(you.sunDial||0)?`, jusqu'à ${maxAfter} si l'habileté le charge d'abord`:''} · cadran −4 ensuite)`,
          you.seDawnSpendArmed?'primary':'', ()=>{ you.seDawnSpendArmed=!you.seDawnSpendArmed; renderControls(); }));
      }
      // Duelist : direction pré-armée des Steps gratuits de l'habileté choisie (le Bonus
      // offensif de la position FINALE s'ajoute à l'attaque — avancer paie tout de suite).
      if (HUMAN==='du' && cands.length) {
        const m = you.duStepsMode ?? 'forward';
        const LBL = { forward:'⬆ Avancer (bonus offensif +1/+3)', backward:'⬇ Reculer (préparer la défense)', none:'⏸ Ne pas bouger' };
        c.appendChild(btn(`👣 Steps de l'habileté : ${LBL[m]}`,'', ()=>{
          you.duStepsMode = m==='forward' ? 'backward' : m==='backward' ? 'none' : 'forward';
          renderControls();
        }));
      }
      // Attack-modifier cards, armed the same toggle way (Cranial Assist! & co were unplayable
      // by the human before — the attack bridge always answered "none"; user-caught).
      if (cands.length) {
        const AM_LABEL = {
          'cranial-assist': `Cranial Assist! : +3 dégâts${g.state.players[g.aiIdx].tokens.head>0?' (l\'IA a la Tête ✔)':' (SANS effet : l\'IA n\'a pas la Tête)'} · 2 CP`,
          'unescapable': 'Unescapable! : attaque INDÉFENDABLE (−1 Grim Pursuit) · 1 CP',
          'subversion': 'Subversion! : +2 dégâts, +1/upgrade posée ce tour · 1 CP',
          'thundering-hooves': 'Thundering Hooves! : CP → Grim Pursuit (jusqu\'à 3) · 0 CP',
          'pick-it-up': `Pick It Up : retire le Disarm adverse, +3 dégâts${g.state.players[g.aiIdx].tokens.disarm>0?' (l\'IA est Disarmed ✔)':' (SANS effet : l\'IA n\'est pas Disarmed)'} · 0 CP`,
          'burst-forward': 'Burst Forward : 1 Step forward AVANT le calcul du bonus · 1 CP',
          'blade-barrage': 'Blade Barrage : lance 5 dés, +1 dégât par Blade (2 Boots → 1 Step) · 2 CP',
        };
        for (const id of G.humanAttackModifierOptions(g, gpFromCandidate)) {
          if (id==='thundering-hooves' && you.cp===0) continue; // rien à convertir

          c.appendChild(btn(`${amSel.has(id)?'✅ ':''}${AM_LABEL[id]||id}`, amSel.has(id)?'primary':'',
            ()=>{ amSel.has(id)?amSel.delete(id):amSel.add(id); renderControls(); }));
        }
        // Ceux en main mais TROP CHERS : grisés avec la raison (user-caught : Cranial Assist
        // 'disparaissait' au tour 1 après avoir payé des cartes de relance — CP insuffisant).
        const heroAM = G.heroTemplateFor(HUMAN);
        for (const id of ['unescapable','cranial-assist','subversion']) {
          const cd = G.cardById(heroAM, id);
          if (!cd || !you.hand.includes(id)) continue;
          if (you.cp >= (cd.cpCost||0)) continue; // déjà listé au-dessus
          const b2 = btn(`${AM_LABEL[id]||id} — coûte ${cd.cpCost} CP, il te reste ${you.cp}`, '', ()=>{});
          b2.disabled = true;
          c.appendChild(b2);
        }
      }
      // A Good Haul : le Mine intégré garde son alternative "ne rien révéler, +1 CP"
      // (mot-clé Mine, validé user). Pré-armé AVANT l'attaque — les 3 cartes ne se
      // regardent qu'à la résolution.
      // A Good Haul : le choix révéler/+1 CP se fait maintenant EN VOYANT les 3 cartes
      // (prompt dans chooseAbility) — le pré-armement aveugle est retiré.
      // Instants jouables MAINTENANT (règle : un Instant s'insère n'importe quand) — cas
      // rapporté : Rolling Pumpkin! pour donner la Tête à l'IA AVANT d'armer Cranial Assist.
      G.humanInstantOptions(g).slice(0,4).forEach(a=>{
        c.appendChild(btn(`⚡ ${actionLabel(a)}`,'', ()=>{
          log(`Tu joues <b>${actionLabel(a)}</b>.`); G.humanApplyInstant(g,a); renderAll(); }));
      });
      addFmBtns(c);
      if (!cands.length) c.appendChild(btn('Continuer','gold', ()=>toMain2()));
    } else if (phase==='aialter') {
      const s0=document.createElement('span'); s0.className='rolls';
      s0.textContent = "Jet FINAL de l'IA (elle ne relancera pas — un dé cassé reste cassé, sauf carte de réponse). Clique ses dés puis joue :";
      c.appendChild(s0);
      const sel=[...aiAlterSel].sort((x,y)=>x-y);
      const show = G.humanAiAlterOptions(g).filter(o=>{
        if (o.kind==='alterDie' || o.kind==='rerollDie') return sel.length===1 && o.dieIndex===sel[0];
        if (o.kind==='setDie') return false; // remplacés par fullWildOptions (6 valeurs)
        return true; // instants & cie
      }).concat(fullWildOptions(sel, aiDice||[]));
      show.slice(0,10).forEach(o=>c.appendChild(btn(actionLabel(o),'primary', ()=>{
        log(`Tu joues <b>${actionLabel(o)}</b> sur le jet de l'IA.`);
        aiDice = G.humanApplyAiAlter(g, o);
        aiAlterSel.clear();
        renderAll();
      })));
      c.appendChild(btn('Laisser ce jet →','gold', ()=>aiTurnAfterAlter()));
    } else if (phase==='defense' && pendingDefense) {
      const a = pendingAttackInfo;
      const isRollWindow = pendingDefense.ctx && pendingDefense.ctx.windowType === 'defenseRoll';
      const rem = pendingDefense.remaining!=null ? `${pendingDefense.remaining} dégâts à encaisser`
        : (a ? `${a.incomingDamage} dégâts entrants` : 'attaque entrante');
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = isRollWindow
        ? `${a&&a.abilityName?formatAbility(aiHero,a.abilityName).name+' — ':''}ton jet de défense est lancé (ci-dessus). Le modifier ?`
        : `${a&&a.abilityName?formatAbility(aiHero,a.abilityName).name+' — ':''}${rem}. Défense :`;
      c.appendChild(s);
      // In the roll window, dice-targeting options are FILTERED by the selected dice (same
      // die-first interaction as the offensive alter phase); cards/instants always show.
      const sel = [...defSel].sort((x,y)=>x-y);
      const show = pendingDefense.options.filter(o=>{
        if (o.kind==='pass') return false;
        if (o.kind==='rerollAll') return sel.length===0; // sans sélection : relance tout
        if (o.kind==='alterDie' || o.kind==='rerollDie') return sel.length===1 && o.dieIndex===sel[0];
        if (o.kind==='setDie') return false; // remplacés par fullWildOptions (6 valeurs)
        return true; // cards, instants, token moves — always visible
      }).concat(fullWildOptions(sel, pendingDefense.defenseDice||[]));
      // Better D! ("up to five dice") : relance les dés SÉLECTIONNÉS — le moteur supporte
      // dieIndices, seule l'UI n'offrait que tout-ou-un-seul (user-caught : impossible d'en
      // relancer 3).
      const bd = pendingDefense.options.find(o=>o.kind==='rerollAll' && o.cardId==='better-d');
      if (bd && sel.length>=1 && !show.some(o=>o.kind==='rerollAll')) show.push({kind:'rerollAll', cardId:'better-d', dieIndices:sel});
      show.slice(0,10).forEach(o=>{
        if (o.kind==='rerollAll') {
          const n = defSel.size;
          const label = n>0 ? `Better D! : relance les ${n} dé(s) sélectionné(s)` : 'Better D! : relance TOUS tes dés';
          c.appendChild(btn(label,'primary', ()=>onDefenseChoice(n>0 ? {...o, dieIndices:[...defSel]} : o)));
        }
        else c.appendChild(btn(defenseLabel(o),'primary', ()=>onDefenseChoice(o)));
      });
      c.appendChild(btn(isRollWindow?'Garder ce jet →':'Encaisser (ne rien jouer) →','gold', ()=>onDefenseChoice({kind:'pass'})));
    }
  }
  // Boutons fm "at any time" : The Mines (3 CP -> pioche 1, 1x/tour) + Scrap des Ore de la
  // Forge (effet puis DEFAUSSE — user-caught : le Scrap n'était pas déclenchable).
  function addFmBtns(c){
    if (HUMAN!=='fm' || g.state.activePlayerIdx!==g.humanIdx) return;
    const you = g.state.players[g.humanIdx];
    if (you.cp >= 3 && !you.minesDrawUsedThisTurn && you.deck.length)
      c.appendChild(btn("⛏️ The Mines : 3 CP → pioche 1 (1×/tour)","", ()=>{
        if (G.humanMinesDraw(g)) { log("⛏️ <b>The Mines</b> : 3 CP → pioche 1."); renderAll(); } }));
    const onForge = new Set(you.forge);
    const inRoll = phase==='roll' && attempts>0;
    if (onForge.has('gold-ore')) {
      c.appendChild(btn("♻️ Scrap Gold : soigne 1","", ()=>{ if(G.humanScrap(g,'gold-ore','heal')){ log("♻️ <b>Scrap Gold Ore</b> : +1 PV."); renderAll(); } }));
      c.appendChild(btn("♻️ Scrap Gold : +1 CP","", ()=>{ if(G.humanScrap(g,'gold-ore','cp')){ log("♻️ <b>Scrap Gold Ore</b> : +1 CP."); renderAll(); } }));
    }
    if (onForge.has('diamond-ore')) {
      c.appendChild(btn("♻️ Scrap Diamond : +1 CP","", ()=>{ if(G.humanScrap(g,'diamond-ore','cp')){ log("♻️ <b>Scrap Diamond Ore</b> : +1 CP."); renderAll(); } }));
      if (inRoll) c.appendChild(btn(`${scrapMode&&scrapMode.oreId==='diamond-ore'?'✅ ':''}♻️ Scrap Diamond : relance un dé (clique-le)`, scrapMode&&scrapMode.oreId==='diamond-ore'?'primary':'', ()=>{
        scrapMode = scrapMode&&scrapMode.oreId==='diamond-ore' ? null : {oreId:'diamond-ore', mode:'reroll'}; renderDice(false); renderControls(); }));
    }
    if (onForge.has('ultimanium-ore')) {
      c.appendChild(btn("♻️ Scrap Ultimanium : pioche 2","", ()=>{ if(G.humanScrap(g,'ultimanium-ore','draw2')){ log("♻️ <b>Scrap Ultimanium Ore</b> : pioche 2."); renderAll(); } }));
      if (inRoll) c.appendChild(btn(`${scrapMode&&scrapMode.oreId==='ultimanium-ore'?'✅ ':''}♻️ Scrap Ultimanium : un dé → 6 (clique-le)`, scrapMode&&scrapMode.oreId==='ultimanium-ore'?'primary':'', ()=>{
        scrapMode = scrapMode&&scrapMode.oreId==='ultimanium-ore' ? null : {oreId:'ultimanium-ore', mode:'set6'}; renderDice(false); renderControls(); }));
    }
  }
  // Le moteur n'énumère qu'un jeu réduit de valeurs (6 + majorité) dans les fenêtres —
  // on synthétise les 6 valeurs complètes pour So Wild!/Twice As Wild! (user-caught :
  // "Twice As Wild inutilisable, pas assez de choix"). applyWindowAction valide main+CP.
  function fullWildOptions(sel, srcDice){
    const you = g.state.players[g.humanIdx];
    const hero = G.heroTemplateFor(HUMAN);
    const ok = id => { const cd=G.cardById(hero,id); return cd && you.hand.includes(id) && you.cp >= (cd.cpCost||0); };
    const out=[];
    if (sel.length===1 && ok('so-wild')) {
      for (let v=1;v<=6;v++) if (v!==srcDice[sel[0]])
        out.push({kind:'setDie', cardId:'so-wild', sets:[{dieIndex:sel[0], value:v}]});
    }
    if (sel.length===2 && ok('twice-as-wild')) {
      for (let v=1;v<=6;v++) if (!(srcDice[sel[0]]===v && srcDice[sel[1]]===v))
        out.push({kind:'setDie', cardId:'twice-as-wild', sets:[{dieIndex:sel[0], value:v},{dieIndex:sel[1], value:v}]});
    }
    return out;
  }
  function alterLabel(a){ return actionLabel(a); }
  function mainLabel(a){ return actionLabel(a); }

  // (Vegas Baby! turned out to be wired engine-side as a code special-case — the earlier
  // "unwired" filter was wrong and blocked a working card. All 45 cards are playable.)
  function usableOptions(opts){ return opts; }

  // Effect summary for an ability, built from the verified hero data (resolvedAbilityByBoardName
  // applies the II-upgrade numbers when in play) — "6 dmg" alone hid the token/draw riders
  // (reported: Reap didn't mention +2 Dreadful/draw, The Reaper didn't mention draw 1).
  // Works for EITHER seat (heroKey/playerIdx) so the AI's board gets the same treatment.
  function abilityEffects(boardName, heroKey = HUMAN, playerIdx = g.humanIdx){
    const p = g.state.players[playerIdx];
    const hero = HERO[heroKey];
    const a = G.resolvedAbilityByBoardName(G.heroTemplateFor(heroKey), boardName, p.upgradesInPlay);
    if (!a) return '';
    const out = [];
    const tokenFr = { dreadful:'Dreadful', grimPursuit:'Grim Pursuit', agility:'Agility', covertOps:'Covert Ops', timeBomb:'Time Bomb',
      feather:'Plume', hex:'Hex', nevermore:'Nevermore', shapeShift:'Shape Shift', regen2:'Regenerate ②', regen1:'Regenerate ①',
      wound:'Wound', electrokinesis:'⚡EK', guardBreak:'Guard Break' };
    if (a.defendable === false) out.push('indéfendable');
    for (const [k,n] of Object.entries(a.tokensGrantedToSelf||{})) if (n) out.push(`+${n} ${tokenFr[k]||k}`);
    for (const [k,n] of Object.entries(a.tokensInflictedOnOpponent||{})) if (n) out.push(`inflige ${n} ${tokenFr[k]||k}`);
    if (a.cpGain) out.push(`+${a.cpGain} CP`);
    if (a.cardDraw) out.push(`pioche ${a.cardDraw}`);
    if (a.drawCards) out.push(`pioche ${a.drawCards}`);
    if (a.feathersToMax) out.push('Plumes au MAX');
    if (a.activateNevermore) out.push(`Activation Nevermore ×${a.activateNevermore}`);
    if (a.healSelf) out.push(`soigne ${a.healSelf}`);
    // Head-conditional riders show the CURRENT status, not just the condition (user hit Reap
    // expecting the draw without holding the Head).
    const hasHead = p.tokens.head > 0;
    const you = playerIdx === g.humanIdx;
    if (a.cardDrawIfHasHead) out.push(hasHead ? 'pioche 1 (Tête ✔)' : `✘ pas de pioche (exige la Tête — ${you?'tu ne l\'as pas':'elle ne l\'a pas'})`);
    if (a.tokensGrantedIfHasHead) for (const [k,n] of Object.entries(a.tokensGrantedIfHasHead)) if (n)
      out.push(hasHead ? `+${n} ${tokenFr[k]||k} (Tête ✔)` : `✘ +${n} ${tokenFr[k]||k} seulement avec la Tête`);
    // Bonus roll spelled out from the data (was a mute "jet bonus"): dice count + what each
    // symbol does, in the hero's own symbol names.
    if (a.bonusRoll) {
      const br = a.bonusRoll;
      const n = String(br.diceCount||'')
        .replace(/1 per Dreadful token, up to 5 total/,'1 dé/Dreadful, max 5')
        .replace(/(\d+) \((\d+) with ([^)]+)\)/,'$1 dés ($2 avec $3)');
      const det = [];
      if (br.addRolledValueAsDamage) det.push('+valeur du dé en dégâts');
      for (const [sym,d] of Object.entries(br.perSymbolDamage||{})) det.push(`+${d} dégât/${hero.symName[sym]||sym}`);
      if (br.undefendableOnSymbolPair) det.push(`2 ${hero.symName[br.undefendableOnSymbolPair]}s = indéfendable`);
      for (const [sym,t] of Object.entries(br.perSymbolTokens||{})) det.push(`+${t.amount} ${tokenFr[t.token]||t.token}/${hero.symName[sym]||sym}`);
      if (br.dice) { // schéma Raveness (Murder of Crows)
        if (br.damagePerTalon) det.push(`+${br.damagePerTalon} dégât/Talon`);
        if (br.featherPerWing) det.push(`+${br.featherPerWing} Plume/Aile`);
        if (br.activateNevermorePerEye) det.push('Œil = Activation Nevermore');
      }
      out.push(`jet bonus (${br.dice||n}) : ${det.join(' · ')}`);
    }
    if (!out.length && (a.effect || a.notes)) out.push(a.effect || a.notes);
    if (a.numberMatchBonus) {
      // Cleave II lowers the number-match threshold 4-of-a-kind -> 3 (engine special-case).
      const three = heroKey==='hh' && p.upgradesInPlay.includes('cleave-ii');
      const kind = three?'brelan':'carré';
      if (a.numberMatchBonus.cpGain) out.push(`+${a.numberMatchBonus.cpGain} CP (${kind} de mêmes #)`);
      const tg = Object.values(a.numberMatchBonus.tokensGranted||{})[0];
      if (tg) out.push(`+${tg} Dreadful (${kind} de mêmes #)`);
    }
    // Forgemaster
    if (a.minesDeck) out.push(a.revealAllMinedOre ? 'Mine (TOUS les Ore trouvés → Forge)' : 'Mine ton deck');
    if (a.searchOreToForge) out.push(`va chercher ${a.searchOreToForge} Ore du deck → Forge`);
    if (a.thresholdBonusArmor) {
      const cur = (p.armor?((p.armor.helmet>0?1:0)+(p.armor.shield>0?1:0)):0);
      out.push(`+${a.thresholdBonusArmor.bonusDamage} dégâts si ≥${a.thresholdBonusArmor.armorAtLeast} armures${cur>=a.thresholdBonusArmor.armorAtLeast?' ✔':''}`);
    }
    if (a.bonusDamagePerUpgrade) out.push(`+${a.bonusDamagePerUpgrade} dégât/upgrade (${p.upgradesInPlay.length} en jeu)`);
    if (a.thresholdBonus) out.push(`+${a.thresholdBonus.bonusDamage} dégâts si ≥${a.thresholdBonus.upgradesAtLeast} upgrades${p.upgradesInPlay.length>=a.thresholdBonus.upgradesAtLeast?' ✔':''}`);
    if (a.cpGainIfUpgradesAtLeast) out.push(`+${a.cpGainIfUpgradesAtLeast.cpGain} CP si ≥${a.cpGainIfUpgradesAtLeast.upgradesAtLeast} upgrades${p.upgradesInPlay.length>=a.cpGainIfUpgradesAtLeast.upgradesAtLeast?' ✔':''}`);
    if (a.searchUpgradesIntoPlay) out.push(`pose ${a.searchUpgradesIntoPlay} upgrade(s) du deck`);
    if (a.advancesAllTimeBombsInPlay) out.push('avance les Time Bombs');
    return out.join(' · ');
  }

  // Effects line for a side-panel row ("Cleave", "Sow Despair"...) — one REFERENCE row can
  // cover several board abilities (Cleave 3A/4A/5A, Sow Despair S/L): dedupe identical
  // effects, tag them (S:/L:) when the variants differ.
  function boardRowEffects(heroKey, playerIdx, matchName){
    const t = G.heroTemplateFor(heroKey);
    const abs = t.abilities.filter(x => x.boardName === matchName || x.boardName.startsWith(matchName + ' '));
    if (!abs.length) return '';
    const effs = abs.map(x => ({
      tag: x.boardName.slice(matchName.length).replace(/\([^)]*\)/,'').trim(),
      eff: abilityEffects(x.boardName, heroKey, playerIdx),
    }));
    const uniq = [...new Set(effs.map(e => e.eff))];
    if (uniq.length === 1) return uniq[0];
    return effs.filter(e => e.eff).map(e => e.tag ? `${e.tag}: ${e.eff}` : e.eff).join(' — ');
  }

  // ---------- roller-only Roll Phase cards (human path) ----------
  const ROLLER_CARDS = ['six-it','samesies','try-try-again','one-more-time'];
  function humanRollCardChoices(){
    const you = g.state.players[g.humanIdx]; const hero = G.heroTemplateFor(HUMAN);
    const vals = dice.map(d=>d.v); const out = [];
    for (const id of ROLLER_CARDS){
      const card = G.cardById(hero, id);
      if (!card || !you.hand.includes(id) || you.cp < (card.cpCost||0)) continue;
      if (id==='one-more-time') out.push({cardId:id});
      else if (id==='six-it') vals.forEach((v,i)=>{ if(v!==6) out.push({cardId:id, dieIndices:[i], values:[6]}); });
      else if (id==='try-try-again'){
        // Only offer rerolling UNKEPT dice (rerolling a die you chose to keep makes no sense),
        // lowest values first — keeps the button row short.
        const idx = vals.map((v,i)=>({v,i})).filter(x=>!dice[x.i].kept).sort((x,y)=>x.v-y.v).slice(0,2);
        for (const x of idx) out.push({cardId:id, dieIndices:[x.i]});
      }
      // samesies: PAS énuméré ici — l'ancien code n'offrait que "→ valeur max" (bug rapporté :
      // impossible de copier un 4 sur un 2). Géré par le mode 2-clics (samMode) dans
      // renderControls/renderDice, qui couvre toutes les paires comme le moteur.
    }
    return out;
  }
  function rollCardLabel(ch){
    const hero=G.heroTemplateFor(HUMAN); const c=G.cardById(hero,ch.cardId)||{};
    const cost=c.cpCost?` · ${c.cpCost} CP`:'';
    const i=(ch.dieIndices||[])[0];
    if (ch.cardId==='one-more-time') return `One More Time! : +1 tentative de jet${cost}`;
    if (ch.cardId==='try-try-again') return `Try Try Again! : relance le dé ${i+1} (${dice[i].v})${cost}`;
    return `${c.name} : dé ${i+1} (${dice[i].v}→${ch.values[0]})${cost}`;
  }
  function playRollCard(ch){
    const lbl = rollCardLabel(ch); // label reads the CURRENT dice — compute before they change
    samMode=false; samTarget=null; // les dés changent : toute sélection Samesies devient invalide
    const r = G.humanPlayRollCard(g, ch, dice.map(d=>d.v));
    dice = r.dice.map((v,i)=>({v, kept: dice[i] ? dice[i].kept : false}));
    if (r.extraRollsGranted) rollsLeft += r.extraRollsGranted;
    if (ch.cardId==='try-try-again') ttaCharges = 1; // "up to two dice", séquentiel (règle vérifiée)
    log(`Tu joues <b>${lbl}</b>.`);
    renderAll();
  }

  // ---------- actions ----------
  function mainPhaseNow(){ return phase==='main2' ? 'main2' : 'main1'; }
  function playMainCard(id){ const a=G.humanMainOptions(g,mainPhaseNow()).find(o=>(o.kind==='playCard'||o.kind==='playInstant')&&o.cardId===id); if(a) applyMain(a); }
  function applyMain(a){
    try { // coach: with the same options on the table, what would the network play?
      const opts = G.humanMainOptions(g, mainPhaseNow());
      if (opts.length > 1) {
        const pick = coach.decide(g.state, g.humanIdx, { ctx: { windowType:'mainPhase', phase: mainPhaseNow() }, options: opts });
        coachNote('main', mainLabel(a), pick.kind==='pass'?'passer':mainLabel(pick));
      }
    } catch (e) {}
    // Warm Up! (py) : « spend CP as desired » — le choix appartient au joueur, jamais auto.
    if (a.kind==='playCard' && a.cardId==='warm-up') {
      const you=g.state.players[g.humanIdx];
      const k=parseInt(prompt(`Warm Up! : +1 Fire Mastery, puis +1 FM par CP dépensé.\nCombien de CP dépenser ? (0 à ${you.cp})`,'0'));
      you.warmUpCpChoice = (k>=0 && k<=you.cp) ? k : 0;
    }
    log(`Tu joues <b>${mainLabel(a)}</b>.`); G.humanApplyMain(g,a,mainPhaseNow()); renderAll(); }
  function toRoll(){ phase='roll'; dice=[]; attempts=0; rollsLeft=2; tbShow=null; samMode=false; samTarget=null; ttaCharges=0; renderAll(); }
  function toAlter(){
    try { // coach: stopping with rerolls left, when the DP says rerolling is worth more?
      if (phase==='roll' && rollsLeft > 0) {
        const adv = G.humanKeepAdvice(g, dice.map(d=>d.v), rollsLeft);
        if (adv.kept.length < 5 && adv.ev > adv.keepAllEv + 0.3)
          coachNote('relance', `s'arrêter (EV ${adv.keepAllEv.toFixed(1)})`,
            `relancer en gardant [${adv.kept.join(',')}] (EV ${adv.ev.toFixed(1)})`);
      }
    } catch (e) {}
    G.beginOffensiveAlter(g, dice.map(d=>d.v));
    altSel.clear(); samMode=false; samTarget=null;
    const acts=G.offensiveAlterOptions(g).filter(o=>o.kind!=='pass');
    if(!acts.length){
      const logFrom2 = g.state.log.length;
      const before = dice.map(d=>d.v).join(',');
      dice=G.endOffensiveAlter(g).map(v=>({v,kept:false}));
      const after = dice.map(d=>d.v).join(',');
      if (before !== after) {
        const plays2 = aiAlterPlays(logFrom2);
        log(`⚠️ L'IA joue <b>${plays2.join(' + ')||'une altération'}</b> sur ton jet : <b>${before}</b> → <b>${after}</b>`);
        // Droit de réplique AUSSI sur ce chemin (user-caught : à 0 CP, aucune carte
        // d'altération jouable -> on passait ici et la relance n'était jamais offerte).
        if (rollsLeft > 0) {
          log(`↩️ Il te reste ${rollsLeft} relance(s) — tu peux répliquer.`);
          phase='roll'; renderAll(); return;
        }
      }
      phase='ability';
    } else phase='alter';
    renderAll(); }
  function applyAlter(a){ log(`Tu joues <b>${alterLabel(a)}</b>.`); dice=G.applyOffensiveAlter(g,a).map(v=>({v,kept:false})); renderAll(); }
  // Quelles cartes l'IA vient de jouer dans la fenêtre (extraites du log moteur frais).
  function aiAlterPlays(logFrom){
    const out=[];
    for (let i=logFrom;i<g.state.log.length;i++){
      const m=g.state.log[i];
      if (m.playerIdx!==g.aiIdx) continue;
      let x;
      if ((x=m.message.match(/^(.+?!):/))) out.push(x[1]);
    }
    return [...new Set(out)];
  }
  function toAbilityFromAlter(){
    altSel.clear();
    const logFrom = g.state.log.length;
    const before = dice.map(d=>d.v).join(',');
    dice=G.endOffensiveAlter(g).map(v=>({v,kept:false}));
    const after = dice.map(d=>d.v).join(',');
    var aiPlays = aiAlterPlays(logFrom);
    if (before !== after) {
      log(`⚠️ L'IA joue <b>${aiPlays.join(' + ')||'une altération'}</b> sur ton jet : <b>${before}</b> → <b>${after}</b>`);
      // Droit de réplique (règle confirmée user) : s'il te reste des relances, tu retournes
      // en phase de jet ; sinon tu peux au moins répondre avec tes cartes de manipulation.
      if (rollsLeft > 0) {
        log(`↩️ Il te reste ${rollsLeft} relance(s) — tu peux répliquer.`);
        phase='roll'; renderAll(); return;
      }
      G.beginOffensiveAlter(g, dice.map(d=>d.v));
      const acts=G.offensiveAlterOptions(g).filter(o=>o.kind!=='pass');
      if (acts.length) { phase='alter'; renderAll(); return; }
      dice=G.endOffensiveAlter(g).map(v=>({v,kept:false}));
    }
    phase='ability'; renderAll(); }
  function toMain2(){ phase='main2'; renderAll(); }
  function doRoll(){
    samMode=false; samTarget=null; scrapMode=null;
    if (attempts===0){ const vals=G.rollOffense(g,null,[]); dice=vals.map(v=>({v,kept:false})); attempts=1; }
    else {
      if(rollsLeft<=0) return;
      try { // coach: compare your keep against the EXACT DP optimum before rerolling
        const adv = liveAdvice() || G.humanKeepAdvice(g, dice.map(d=>d.v), rollsLeft);
        const mine = dice.filter(d=>d.kept).map(d=>d.v).sort().join(',');
        const dp = adv.kept.slice().sort().join(',');
        if (mine !== dp) coachNote('relance', `gardé [${mine||'rien'}]`, `garder [${dp||'rien'}] (EV ${adv.ev.toFixed(1)})`);
        // full-hand record (agree or not) so post-game docs can replay every keep decision
        replayLog.push({ t: g.state.turnNumber, kind: 'roll-data', agree: mine===dp,
          you: `main [${dice.map(d=>d.v).join(',')}] gardé [${mine||'rien'}]`,
          coach: `garder [${dp||'rien'}] (EV ${adv.ev.toFixed(1)}, tout-garder ${adv.keepAllEv.toFixed(1)}, relances ${rollsLeft})` });
      } catch (e) {}
      const keptValues = dice.filter(d=>d.kept).map(d=>d.v);
      const vals=G.rollOffense(g, dice.map(d=>d.v), dice.map(d=>d.kept));
      // The engine sorts the result, losing positions — re-mark the kept dice BY VALUE so your
      // locks survive the reroll (before: every reroll silently unmarked everything).
      const pool = keptValues.slice();
      dice = vals.map(v=>{ const k=pool.indexOf(v); if(k>=0){ pool.splice(k,1); return {v,kept:true}; } return {v,kept:false}; });
      rollsLeft--;
    }
    log(`Tu lances : <b>${dice.map(d=>humanHero.symName[humanHero.cls(d.v)]).join(', ')}</b>`);
    renderDice(true); renderControls(); renderMatch(); renderCoachPanel(); renderAbilities();
  }
  function chooseAbility(name, fmMineChoice){
    // A Good Haul (mot-clé Mine) : tu regardes les 3 cartes du dessus AVANT de choisir
    // révéler/encaisser — l'ordre du deck est dans l'état, on te les montre (fidélité).
    if (name.startsWith('A Good Haul') && fmMineChoice === undefined) {
      const you = g.state.players[g.humanIdx];
      const top3 = you.deck.slice(0, 3);
      const hero = G.heroTemplateFor(HUMAN);
      const isOre = id => /-ore$/.test(id);
      const lbl = top3.map(id => (G.cardById(hero,id)||{name:id}).name + (isOre(id)?' ⛏️':'')).join(' · ');
      const nOre = top3.filter(isOre).length;
      const c=$('controls'); c.innerHTML='';
      const s0=document.createElement('span'); s0.className='rolls';
      s0.textContent=`⛏️ A Good Haul — tu regardes : ${lbl || '(deck vide)'} . Choisis :`;
      c.appendChild(s0);
      c.appendChild(btn(`Révéler ${nOre} Ore → la Forge`,'primary', ()=>chooseAbility(name, {kind:'all'})));
      c.appendChild(btn('Ne rien révéler (+1 CP)','', ()=>chooseAbility(name, {kind:'cp'})));
      return;
    }
    try { // coach: which ability would the network have activated on these dice?
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      if (cands.length > 1) coachNote('habileté', name, coach.chooseAbility(g.state, g.humanIdx, cands));
    } catch (e) {}
    log(`Tu attaques avec <b>${name}</b>${gpBonusSel?' (+ dé Grim Pursuit)':''}${gbSel?' (+ Guard Break)':''}${amSel.size?` + ${[...amSel].join(' + ')}`:''}.`);
    const hpYou = g.state.players[g.humanIdx].hp, hpAi = g.state.players[g.aiIdx].hp;
    const cand = G.matchedAbilities(g, dice.map(d=>d.v)).find(x=>x.name===name);
    const base = (cand && cand.baseDamage) || 0;
    const logFrom = g.state.log.length;
    G.humanAttack(g, dice.map(d=>d.v), name, gpBonusSel, [...amSel],
      fmMineChoice && fmMineChoice.kind==='cp' ? {kind:'cp'} : undefined, gbSel);
    gpBonusSel = false; gbSel = false; amSel.clear(); aghCpSel = false;
    const cb = parseCombat(logFrom);
    const dealt = hpAi - g.state.players[g.aiIdx].hp, taken = hpYou - g.state.players[g.humanIdx].hp;
    log(`<b style="font-size:1.05em">⚔️ BILAN ATTAQUE — ${breakdownStr(base, cb)} = ${Math.max(0,dealt)} infligés`+
        `${taken>0?` · sa défense t'en renvoie ${taken}`:''} (IA ${hpAi}→${g.state.players[g.aiIdx].hp} PV, toi ${hpYou}→${g.state.players[g.humanIdx].hp})</b>`);
    renderAll();
    if (g.state.gameOver) return end();
    toMain2();
  }
  function finishHumanTurn(){
    G.endHumanTurn(g);
    renderAll();
    if (g.state.gameOver) return end();
    $('turntag').textContent = `L'IA (${aiHero.name}) joue…`;
    setTimeout(aiTurn, 550);
  }
  // The AI's turn, decomposed so YOU defend interactively when it attacks (see interactive.ts).
  function nvRollWindow(afterFn, beforeTurnOf){
    let face = G.humanNevermoreRollStart(g);
    phase='nvroll';
    const render = ()=>{
      renderAll();
      const c=$('controls'); c.innerHTML='';
      const you=g.state.players[g.humanIdx];
      const s0=document.createElement('span'); s0.className='rolls';
      s0.textContent=`🐦‍⬛ Nevermore Die Roll : ${face} — (1:Hex · 2:Activ.×2 · 3:Activ. · 4:défausse · 5:vol CP · 6:retour sans soin)`;
      c.appendChild(s0);
      if (HUMAN==='rv' && beforeTurnOf==='ai') {
        if (you.hand.includes('cull') && you.cp>=1)
          for (let v=1;v<=6;v++){ if (v!==face) c.appendChild(btn(`Cull! → ${v} · 1 CP`,'', ((vv)=>()=>{ face=G.humanNevermoreCull(g,vv); render(); })(v))); }
        if ((you.tokens.feather||0)>=2){
          if (face<6) c.appendChild(btn('🪶×2 : +1','', ()=>{ face=G.humanNevermoreFeatherShift(g,face,1); render(); }));
          if (face>1) c.appendChild(btn('🪶×2 : −1','', ()=>{ face=G.humanNevermoreFeatherShift(g,face,-1); render(); }));
        }
        if ((you.tokens.feather||0)>=1) c.appendChild(btn('🪶×1 : relancer','', ()=>{ face=G.humanNevermoreFeatherReroll(g,face); render(); }));
      }
      const finish=(discardId)=>{ G.humanNevermoreFinish(g, face, discardId); renderAll(); afterFn(); };
      if (beforeTurnOf==='human' && face===4 && you.hand.length){
        const hero=G.heroTemplateFor(HUMAN);
        you.hand.forEach(id=>{
          const cd=G.cardById(hero,id)||{name:id};
          c.appendChild(btn(`Défausser ${cd.name}`,'primary', ()=>finish(id)));
        });
      } else {
        c.appendChild(btn('Résoudre →','gold', ()=>finish()));
      }
    };
    render();
  }
  function aiTurn(){
    if (G.nevermoreRollDue(g,'ai')) return nvRollWindow(()=>aiTurnInner(),'ai');
    aiTurnInner();
  }
  function aiTurnInner(){
    const r0 = G.runAiTurnUpToAlter(g);
    if (g.state.gameOver) { renderAll(); return end(); }
    if (r0.done) { renderAll(); return startHumanTurn(); }
    aiDice = r0.dice.slice();
    aiAlterSel.clear();
    // Fenêtre ORP2 : tes cartes d'altération sur SES dés (user-caught : Helping Hand injouable).
    if (G.humanAiAlterOptions(g).length) {
      phase='aialter';
      $('turntag').textContent = "Le jet de l'IA — fenêtre d'altération";
      log(`⚔️ L'IA a lancé <b>${r0.dice.join(', ')}</b> — tu peux altérer son jet.`);
      renderAll();
      return;
    }
    aiTurnAfterAlter();
  }
  function aiTurnAfterAlter(){
    aiAlterSel.clear();
    const r = G.finishAiAlter(g);
    if (g.state.gameOver) { renderAll(); return end(); }
    if (r.done) { renderAll(); return startHumanTurn(); }
    pendingAttackInfo = r.attack;
    // Show the AI's actual dice (g.def.finalDice — set by runAiTurnUpToAttack) so its attack
    // is something you SEE, not a one-line log flash.
    aiDice = (g.def && g.def.finalDice) ? g.def.finalDice.slice() : null;
    if (r.attack.abilityName === null) log(`L'IA rate son attaque (aucune habileté formée).`);
    else log(`⚔️ L'IA t'attaque avec <b>${formatAbility(aiHero, r.attack.abilityName).name}</b>` +
      (r.attack.incomingDamage === 0 ? ` — <b>0 dégât</b> (utilitaire) : rien à défendre.`
        : r.attack.defendable ? ` (${r.attack.incomingDamage} de base, hors riders/bonus).` : ` — <b>indéfendable</b>.`));
    // 0 dégât de base (Infiltrate...) : pas d'attaque à défendre, pas de pause "Lancer ta
    // défense" (le moteur n'ouvrira pas de jet ; si l'IA gonfle à >0 avec un modificateur,
    // aiDefenseStep re-proposera quand même la fenêtre — le probe décide).
    // Thundering Roar (Naraxus) : TU choisis la carte a defausser avant la resolution.
    const youH = g.state.players[g.humanIdx];
    if (r.attack.abilityName === 'Thundering Roar' && youH.hand.length) {
      phase='roardiscard';
      $('turntag').textContent = 'Thundering Roar — choisis ta défausse';
      const c=$('controls'); renderAll(); c.innerHTML='';
      const s1=document.createElement('span'); s1.className='rolls';
      s1.textContent='🐲 Thundering Roar : défausse 1 carte de TON choix (puis 8 indéfendables) :';
      c.appendChild(s1);
      const heroT=G.heroTemplateFor(HUMAN);
      youH.hand.forEach(id=>{
        const cd=G.cardById(heroT,id)||{name:id};
        c.appendChild(btn(`Défausser ${cd.name}`,'', ()=>{
          G.humanSetRoarDiscard(g, id);
          log(`🐲 Tu choisis de défausser <b>${cd.name}</b>.`);
          phase='defarm'; aiDefenseStep();
        }));
      });
      return;
    }
    if (r.attack.abilityName !== null && r.attack.incomingDamage === 0) {
      $('turntag').textContent = 'L\'IA joue son tour…';
      renderAll();
      return aiDefenseStep();
    }
    // Click-to-roll pacing: YOU press the button that rolls your defense (reported: invisible).
    phase='defarm';
    $('turntag').textContent = 'Défense — l\'IA t\'attaque';
    renderAll();
  }
  // Probe the next defense decision; if none, resolve the attack for real and finish the AI's turn.
  function aiDefenseStep(){
    const prompt = G.nextDefenseDecision(g);
    defSel = new Set(); // fresh window, fresh Better D! selection
    if (!prompt) { pendingDefense = null; return resolveAiAttackAndFinish(); }
    pendingDefense = prompt;
    phase = 'defense';
    $('turntag').textContent = 'Défense — l\'IA t\'attaque';
    renderAll();
  }
  function onDefenseChoice(action){
    try { // coach: what would the network have done in this defense window?
      if (pendingDefense && pendingDefense.options.length > 1) {
        const pick = coach.decide(g.state, g.humanIdx, { ctx: pendingDefense.ctx, options: pendingDefense.options });
        coachNote('défense', action.kind==='pass'?'passer':defenseLabel(action), pick.kind==='pass'?'passer':defenseLabel(pick));
      }
    } catch (e) {}
    // Even a pass goes through the script + re-probe: passing the ROLL window must still let
    // the CARDS window come up next (the old "pass = resolve everything now" shortcut silently
    // skipped every later defense window).
    if (action.kind !== 'pass') log(`🛡️ Défense : tu joues <b>${defenseLabel(action)}</b>.`);
    G.chooseDefense(g, action);
    aiDefenseStep();
  }
  function resolveAiAttackAndFinish(){
    const hpYou = g.state.players[g.humanIdx].hp, hpAi = g.state.players[g.aiIdx].hp;
    const logFrom = g.state.log.length;
    G.resolveAiAttack(g);
    // Big readable recap with the FULL arithmetic — "l'IA annonce 7 mais ça fait 9" was the
    // Vengeance rider adding damage with no visible accounting (reported).
    const cb = parseCombat(logFrom);
    // Grab your defense dice from the fresh log to display them in the tray.
    for (let i=logFrom; i<g.state.log.length; i++){
      const dm = g.state.log[i].message.match(/^Defense dice: ([\d,]+)/);
      if (dm && g.state.log[i].playerIdx === g.humanIdx) lastDefDice = dm[1].split(',').map(Number);
    }
    const base = pendingAttackInfo ? pendingAttackInfo.incomingDamage : 0;
    const you2 = g.state.players[g.humanIdx].hp, ai2 = g.state.players[g.aiIdx].hp;
    const taken = hpYou - you2, countered = hpAi - ai2;
    log(`<b style="font-size:1.05em">🛡️ BILAN DÉFENSE — ${breakdownStr(base, cb)} = ${Math.max(0,taken)} encaissés`+
        `${countered>0?` · tu renvoies ${countered} dégât(s)`:''} (toi ${hpYou}→${you2} PV, IA ${hpAi}→${ai2} PV)</b>`);
    renderAll();                                   // shows your Hallowed/Sabotage roll + damage in the log
    if (g.state.gameOver) return end();
    $('turntag').textContent = `L'IA (${aiHero.name}) termine son tour…`;
    setTimeout(()=>{
      G.finishAiTurn(g); pendingAttackInfo = null; aiDice = null; renderAll();
      if (g.state.gameOver) return end();
      startHumanTurn();
    }, 700);
  }
  // One human-readable label for ANY window action — no raw engine kinds ("setDie") ever
  // reach a button or the log.
  function actionLabel(a){
    const hero=G.heroTemplateFor(HUMAN);
    const card=id=>G.cardById(hero,id)||{};
    const cn=id=>card(id).name||id;
    const cp=id=>card(id).cpCost?` · ${card(id).cpCost} CP`:'';
    switch(a.kind){
      case 'playCard': case 'playInstant': {
        const c=card(a.cardId);
        // Effect summary: drop the timing prefix ("Instant Action. …") — it's noise on a button;
        // the first real sentence after it is what the card DOES.
        const eff=(c.text||'').replace(/^(Instant|Main Phase|Roll Phase) Action[.:]\s*/i,'').split(/\.\s/)[0];
        return `${c.name||a.cardId}${c.cpCost?` (${c.cpCost} CP)`:''}${eff?` — ${eff.slice(0,60)}`:''}`;
      }
      case 'setDie': {
        // Say WHICH die each option targets (old→new). Source of truth for the current values:
        // your defense dice when defending, the AI's dice during its attack, else your own roll.
        const src = (pendingDefense && pendingDefense.defenseDice) || aiDice || dice.map(d=>d.v);
        const part = a.sets.map(s=>`dé ${s.dieIndex+1}${src&&src[s.dieIndex]!=null?` (${src[s.dieIndex]}→${s.value})`:` →${s.value}`}`).join(' · ');
        return `${cn(a.cardId)} : ${part}${cp(a.cardId)}`;
      }
      case 'alterDie': {
        const src = (pendingDefense && pendingDefense.defenseDice) || aiDice || dice.map(d=>d.v);
        const old = src && src[a.dieIndex];
        return `${cn(a.cardId)} : dé ${a.dieIndex+1}${old!=null?` (${old}→${old+a.delta})`:` ${a.delta>0?'+1':'−1'}`}${cp(a.cardId)}`;
      }
      case 'rerollDie':return `${cn(a.cardId)} : relance le dé ${a.dieIndex+1}${cp(a.cardId)}`;
      case 'rerollAll':return a.dieIndices ? `${cn(a.cardId)} : relance les ${a.dieIndices.length} dé(s) sélectionné(s)${cp(a.cardId)}` : `${cn(a.cardId)} : relance TOUS tes dés de défense${cp(a.cardId)}`;
      case 'moveHead': return `Rolling Pumpkin! : Tête Hantée ${a.toIdx===g.humanIdx?'vers TOI':'vers l\'IA'}`;
      case 'spendGrimPursuitBonus': return 'Grim Pursuit : lance 5 dés, +1 dégât par Fer';
      // Token-manipulation cards enumerate one option PER TARGET — without saying who, they
      // look like duplicates and you can nuke YOUR OWN tokens by accident (reported bug).
      case 'transferToken': return `Transference! : ${a.tokenKind} ${a.fromIdx===g.humanIdx?'⚠️ de TOI vers l\'IA':'de l\'IA vers TOI'}`;
      case 'removeToken': return `Get That Outta Here! : retire 1 ${a.tokenKind} ${a.targetIdx===g.humanIdx?'⚠️ à TOI':'à l\'IA'}`;
      case 'removeAllTokens': return `What Status Effects? : retire TOUS les jetons ${a.targetIdx===g.humanIdx?'⚠️ de TOI':'de l\'IA'}`;
      case 'covertOpsUpgrade': return `Covert Ops : poser ${cn(a.cardId)} GRATUITEMENT`;
      case 'covertOpsSearch': return 'Covert Ops (b) : regarde le top 3 — si AUCUN upgrade, va en chercher un dans le deck';
      default: return a.kind;
    }
  }
  function defenseLabel(a){ return actionLabel(a); }
  function startHumanTurn(){
    if (G.nevermoreRollDue(g,'human')) return nvRollWindow(()=>startHumanTurnInner(),'human');
    startHumanTurnInner();
  }
  function startHumanTurnInner(){
    lastDefDice = null;
    // Ton attaque du tour PRÉCÉDENT est finie : ses dés n'ont plus rien à faire à l'écran.
    // (Ils restaient affichés pendant le prompt Time Bomb/upkeep et masquaient le jet de
    // bombe — la cause du 'je ne vois pas le fking roll', reproduite au screenshot.)
    dice = []; attempts = 0;
    const you = g.state.players[g.humanIdx];
    // Click-to-roll pacing: if you carry Time Bombs, YOU press the button that rolls them
    // (they resolve inside beginHumanTurn) instead of it happening invisibly.
    if (you.timeBombs.length > 0 && !tbArmed) {
      phase='tbroll'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll(); return;
    }
    // HH Upkeep = Headless Mayhem: Terrorize (needs >=4 Dreadful) OR move the Haunted Head OR
    // nothing. Offer the prompt whenever ANY real choice exists.
    const canGiveHead = you.heroId==='hh' && you.tokens.head > 0;
    if (you.heroId==='hh' && (G.humanCanTerrorize(g) || canGiveHead)) {
      phase='upkeep'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll();
    }
    else if (you.heroId==='fm' && you.deck.length > 0) {
      // The Mines : le choix (révéler quel Ore / +1 CP / ne pas miner) t'appartient.
      phase='upkeep'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll();
    }
    else if (you.heroId==='du' || (you.tokens.disarm||0)>0) {
      // Duelist : Reposition OBLIGATOIRE (direction/steps = ton choix) ; Disarm : défausser
      // 1 carte ou sauter l'Income — tes décisions, jamais automatiques.
      phase='upkeep'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll();
    }
    else doBeginTurn(undefined);
  }
  function doBeginTurn(mayhem, fmMine){
    if (mayhem !== undefined) {
      try { coachNote('upkeep', mayhem, coach.chooseHeadlessMayhem(g.state, g.humanIdx, G.humanCanTerrorize(g))); } catch (e) {}
    }
    const logBefore = g.state.log.length;
    G.beginHumanTurn(g, mayhem, fmMine);
    aiDice = null;
    // Your upkeep Time Bomb roll happens inside beginHumanTurn — surface it loudly instead of
    // letting it drown in the journal (reported: "je ne vois pas quand je roule pour la bombe").
    for (let i=logBefore; i<g.state.log.length; i++) {
      const m = g.state.log[i].message.match(/^Time Bomb upkeep: (?:rolls \[([\d,]+)\], )?(\d+) self-dmg(?:, (\d+) defused)?/);
      if (m) {
        const jets = m[1] ? `tu lances ${m[1]} — ` : '';
        const dmg = +m[2], defused = +(m[3]||0);
        // Shown as REAL dice in the tray too (tbShow), not just this journal line.
        if (m[1]) tbShow = { rolls: m[1].split(',').map(Number), dmg, defused };
        log(`<b style="font-size:1.05em">💣 TIME BOMB — ${jets}${dmg>0?`elle explose : tu prends ${dmg} dégâts !`:defused>0?`désamorcée (6) !`:`elle avance d'un cran…`}</b>`);
      }
    }
    if (g.state.gameOver) { renderAll(); return end(); }
    phase='main1'; dice=[]; attempts=0; rollsLeft=2; gpBonusSel=false; gbSel=false; amSel.clear(); aghCpSel=false; tbArmed=false;
    $('turntag').textContent = `Ton tour · tour ${g.state.turnNumber}`;
    renderAll();
  }

  function end(){
    phase='over';
    aiDice = null; pendingDefense = null; lastDefDice = null;
    const w = g.state.winner;
    const msg = w===g.humanIdx ? '🏆 Victoire !' : w===null ? '⚔️ Match nul (double KO)' : '☠️ Défaite';
    $('controls').innerHTML=''; $('tray').innerHTML='';
    const b=document.createElement('div'); b.className='banner'; b.textContent=msg + ` — au tour ${g.state.turnNumber}`;
    $('tray').replaceWith(b); b.id='tray';
    $('turntag').textContent='Partie terminée';
    renderFighters();

    // ---- post-game coach analysis + persistence ----
    const disagreements = replayLog.filter(r=>!r.agree && r.kind!=='roll-data');
    log(`<b style="font-size:1.08em">📋 ANALYSE DE PARTIE — ${replayLog.length} décision(s) évaluée(s) par l'IA, `+
        `${disagreements.length} désaccord(s)${disagreements.length?' (du plus récent au plus ancien) :':'. Vos lignes concordent.'}</b>`);
    for (const r of disagreements)
      log(`T${r.t} [${r.kind}] — toi : <b>${r.you}</b> · l'IA aurait joué : <b style="color:#ef6b2b">${r.coach}</b>`);
    // Auto-save to localStorage (last 20 games) + download button.
    const gameRecord = {
      date: new Date().toISOString(), result: msg, turns: g.state.turnNumber,
      humanHero: HUMAN, aiHero: AI_HERO, humanFirst: g.humanIdx === 0,
      bossHard: !!BOSS_HARD, aiVersion: (window.AI_WEIGHTS_VERSION||'inconnue'),
      decisions: replayLog, engineLog: g.state.log,
      finalHp: [g.state.players[0].hp, g.state.players[1].hp],
    };
    try {
      const all = JSON.parse(localStorage.getItem('dt_games') || '[]');
      all.push(gameRecord);
      localStorage.setItem('dt_games', JSON.stringify(all.slice(-200))); // 200 pour la page stats
      log(`💾 Partie sauvegardée (${Math.min(all.length,200)} en mémoire locale — <a href='stats.html' style='color:var(--gold)'>📈 voir tes stats</a>).`);
    } catch (e) {}
    const dl = document.createElement('button');
    dl.className = 'btn gold'; dl.textContent = '💾 Télécharger cette partie (JSON)';
    dl.style.marginTop = '8px';
    dl.onclick = () => {
      const blob = new Blob([JSON.stringify(gameRecord, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dicethrone_${gameRecord.date.replace(/[:.]/g,'-')}.json`;
      a.click();
    };
    b.after(dl);
  }

  // ---------- log ----------
  // The engine logs terse English debug lines ("Chose ability: X", "HP: self=44, opp=27") —
  // raw, they read as a broken/bilingual UI. Translate the known shapes to player-facing
  // French; anything unmatched passes through untouched (better odd than hidden).
  function diceWords(hero, list){ return String(list).split(/[,\s]+/).filter(Boolean)
    .map(v=>hero.symName[hero.cls(+v)]||v).join(', '); }
  function translateLog(msg, isHuman, hero){
    let m;
    if ((m = msg.match(/^Final dice: ([\d,\s]+)$/)))
      return `Dés finaux : <b>${diceWords(hero, m[1])}</b> (${m[1]})`;
    if ((m = msg.match(/^Chose ability: (.+)$/)))
      return `${isHuman?'Tu choisis':'Choisit'} <b>${formatAbility(hero, m[1]).name}</b>`;
    if (/^HP: self=/.test(msg)) return null; // pure debug line — drop from the player log
    if ((m = msg.match(/^Hallowed Reckoning: prevented (\d+), (\d+) dmg back, \+(\d+) Dreadful, \+(\d+) Grim Pursuit/)))
      return `🛡️ <b>Hallowed Reckoning</b> : ${m[1]} dégât(s) prévenu(s) · ${m[2]} contre-dégât(s) · +${m[3]} Dreadful · +${m[4]} Grim Pursuit`;
    if ((m = msg.match(/^Sabotage: prevented (\d+), (\d+) dmg back, (\d+) TB inflicted/)))
      return `🛡️ <b>Sabotage</b> : ${m[1]} dégât(s) prévenu(s) · ${m[2]} contre-dégât(s)${+m[3]?` · ${m[3]} Time Bomb posée(s)`:''}`;
    // --- Duelist ---
    if ((m = msg.match(/^Retreat( II)?: (\d+) dmg back, (\d+) forced step\(s\) backward \(position (-?\d+)\)/))) {
      const POS={'-2':'🛡️+3 Défensif','-1':'🂠 pige','0':'Neutral','1':'+1 Off.','2':'+3 Off.'};
      return `🛡️ <b>Retreat${m[1]||''}</b> : ${m[2]} contre-dégât(s) · recule de ${m[3]} (→ ${POS[m[4]]||m[4]}) — joue tes cartes, le bonus se calcule après`;
    }
    if ((m = msg.match(/^Footwork Defensive Bonus: prevented (\d+) \(position (-?\d+)\)/)))
      return `👣 <b style="color:#5fbd8a">BONUS DÉFENSIF : ${m[1]} dégâts PRÉVENUS</b> (position finale ${m[2]})`;
    if ((m = msg.match(/^Footwork Defensive Bonus: drew (\d+) \(position (-?\d+)\)/)))
      return `👣 <b>BONUS DÉFENSIF : pige ${m[1]} carte</b> (position finale ${m[2]})`;
    if ((m = msg.match(/^I Hate Waiting: (\d+) step\(s\) backward \(position (-?\d+)\)/)))
      return `🂠 <b>I Hate Waiting</b> : recule de ${m[1]} (position ${m[2]})`;
    if ((m = msg.match(/^Reposition: (\d+) step\(s\) (forward|backward) \(position (-?\d+)\)(, \+1 Guard Break)?/)))
      return `👣 <b>Reposition</b> : ${m[1]} step ${m[2]==='forward'?'AVANT':'ARRIÈRE'} (position ${m[3]})${m[4]?' · <b>+1 Guard Break</b>':''}`;
    if ((m = msg.match(/^Offensive Bonus: \+(\d+) dmg/)))
      return `⚔️ <b>Bonus offensif Footwork : +${m[1]} dégâts</b> sur cette attaque`;
    if ((m = msg.match(/^Disarm: discarded (.+), token removed/)))
      return `🪝 <b>Disarm</b> : défausse <b>${m[1]}</b> (jeton retiré)`;
    if (/^Income Phase skipped \(Disarm\)/.test(msg)) return `🪝 <b>Disarm</b> : saute la phase de revenu (pas de CP, pas de pioche)`;
    // --- Sun Elf ---
    if ((m = msg.match(/^Sun Dial \(DUSK\): \+1 \(now (\d+)\)( — FLIPS to DAWN)?/)))
      return `🌆 <b>Sun Dial</b> +1 → ${m[1]}/5${m[2]?' · <b style="color:#e8a03a">FLIP CÔTÉ DAWN 🌅</b>':''}`;
    if ((m = msg.match(/^Sun Dial \(DAWN\): \+(\d+) dmg, dial -(\d+)( — FLIPS to DUSK)?/)))
      return `🌅 <b>DAWN déchargé : +${m[1]} dégâts</b> · cadran −${m[2]}${m[3]?' · flip côté DUSK 🌆':''}`;
    if ((m = msg.match(/^(.+?): Sun Dial \+(\d+)(.*?)\(now (\d+)\)/)))
      return `☀️ <b>${m[1]}</b> : cadran +${m[2]} → ${m[4]}/5${/FLIPS to DAWN/.test(m[3])?' · <b style="color:#e8a03a">FLIP CÔTÉ DAWN 🌅</b>':''}`;
    if ((m = msg.match(/^Harness the Light( II)?: prevented 0, healed (\d+)(.*)$/))) {
      let out = `🛡️ <b>Harness the Light${m[1]||''}</b> : soigne ${m[2]}`;
      const dial = (m[3]||'').match(/Sun Dial \+(\d+)/); if (dial) out += ` · cadran +${dial[1]}`;
      if (/FLIPS to DAWN/.test(m[3]||'')) out += ' · <b style="color:#e8a03a">FLIP CÔTÉ DAWN 🌅</b>';
      if (/\+Charged Gem/.test(m[3]||'')) out += ' · +💎 Charged Gem';
      return out;
    }
    if ((m = msg.match(/^Sun Marked: attacker heals (\d+)/)))
      return `☀️ <b>Sun Marked</b> : l'attaquant se soigne de ${m[1]}`;
    if ((m = msg.match(/^Charged Gem: rolled (\d+) -> (.+)$/)))
      return `💎 <b>Charged Gem</b> : d6 = ${m[1]} → ${m[2].replace('+1 CP','+1 CP').replace(/(\d+) isolated undefendable dmg/,'$1 dégâts indéfendables')}`;
    if ((m = msg.match(/^Guard Break: spent (\d+), rolls \[([\d,]+)\] — (attack is UNDEFENDABLE|failed)/)))
      return `🛡️⚡ <b>Guard Break</b> : dépense ${m[1]}, d6 [${m[2]}] — ${m[3]==='failed'?'raté (l\'attaque reste défendable)':'<b style="color:#e8a03a">attaque INDÉFENDABLE</b>'}`;
    if (/^Start Player skips/.test(msg)) return 'Le premier joueur saute sa première phase de revenu (règle officielle).';
    if ((m = msg.match(/^\+1 CP, drew (\d+) card/))) return `+1 CP · pioche ${m[1]} carte(s)`;
    if ((m = msg.match(/^Played (.+?) for (\d+) CP(?: \((.*)\))?/))) {
      const parts = (m[3]||'').replace(/drew (\d+)/,'pioche $1').replace(/(\d+) dmg to opponent/,'$1 dégâts à l\'adversaire');
      return `Joue <b>${m[1]}</b> (${m[2]} CP)${parts&&!/no effect|TODO/.test(parts)?` — ${parts}`:''}`;
    }
    if ((m = msg.match(/^Sold (\d+) card/))) return `Vend ${m[1]} carte(s) (+${m[1]} CP)`;
    if ((m = msg.match(/^Sold (.+?) \(\+1 CP\)/))) {
      const c = G.cardById(G.heroTemplateFor(isHuman?HUMAN:AI_HERO), m[1]);
      return `Vend <b>${(c&&c.name)||m[1]}</b> (+1 CP)`;
    }
    if ((m = msg.match(/^Better D!: rerolled (\d+) dice ([\d,]+)->([\d,]+)/)))
      return `<b>Better D!</b> : relance ${m[1]} dé(s) — ${m[2]} → <b>${m[3]}</b>`;
    if ((m = msg.match(/^Terrorize/i))) return `💀 <b>Terrorize</b> — 3 dégâts sûrs, reprend la Tête, +1 Grim Pursuit, +1 CP`;
    if ((m = msg.match(/^Time Bomb (advanced|detonated|defused)/i)))
      return m[1]==='detonated' ? '💣 <b>Time Bomb explose</b> — 4 dégâts indéfendables'
        : m[1]==='defused' ? '💣 Time Bomb désamorcée (6 !)' : '💣 La Time Bomb avance…';
    if ((m = msg.match(/^(.+?): rerolled all dice ([\d,]+)->([\d,]+)/)))
      return `<b>${m[1]}</b> : relance tout — ${m[2]} → <b>${m[3]}</b>`;
    if ((m = msg.match(/^(.+?): set (\d+) dice to \[([\d,]+)\]/)))
      return `<b>${m[1]}</b> : fixe ${m[2]} dé(s) à <b>${m[3]}</b>`;
    if ((m = msg.match(/^(.+?): rerolled (\d+) dice$/))) return `<b>${m[1]}</b> : relance ${m[2]} dé(s)`;
    if ((m = msg.match(/^(.+?): rerolled die (\d+) (\d)->(\d)/))) return `<b>${m[1]}</b> : relance le dé ${m[2]} — <b>${m[3]} → ${m[4]}</b>`;
    if (/^One More Time!/.test(msg)) return `<b>One More Time!</b> : +1 tentative de jet`;
    if (/^Grim Pursuit \(mode a\)/.test(msg)) return `<b>Grim Pursuit</b> : +1 tentative de jet`;
    if ((m = msg.match(/^Grim Pursuit spend \(b\): rolled \[([\d,]+)\], (\d+) Horseshoe/)))
      return `💜 <b>Grim Pursuit</b> : lance ${diceWords(humanHero, m[1])} → ${m[2]} Fer(s) = <b>+${m[2]} dégâts</b>`;
    if ((m = msg.match(/^(.+?) rider: \+(\d+) (?:dmg|dégâts)(?:, (\d+) TB inflicted)?(?:, \+(\d+) Covert Ops)?/)))
      return `<b>Rider ${m[1]}</b> : +${m[2]} dégâts${m[3]&&+m[3]?` · ${m[3]} Time Bomb posée(s)`:''}${m[4]&&+m[4]?` · +${m[4]} Covert Ops`:''}`;
    if ((m = msg.match(/^Dice after alteration: ([\d,\s]+)$/)))
      return `Dés après altération : <b>${m[1]}</b>`;
    if ((m = msg.match(/^(.+?): set dice ([\d,]+)->([\d,]+)/)))
      return `<b>${m[1]}</b> : change les dés ${m[2]} → <b>${m[3]}</b>`;
    if ((m = msg.match(/^(.+?) bonus roll(?: \[([\d,]*)\])?: \+(\d+) (?:dmg|dégâts), undefendable=(\w+), \+(\d+) Grim Pursuit/))) {
      const faces = m[2] ? m[2].split(',').map(Number) : [];
      const det = faces.length
        ? ` — dés [${faces.join(',')}] : ${faces.filter(v=>v<=3).length} Hache(s), ${faces.filter(v=>v===4||v===5).length} Fer(s), ${faces.filter(v=>v===6).length} Frayeur(s)`
        : '';
      return `<b>${m[1].replace(/\s*\([A-C]+\)$/,'')}</b> — jet bonus (1 dé/Dreadful)${det} → +${m[3]} dégâts${m[4]==='true'?' · devient <b>indéfendable</b> (2+ Fers)':''}${+m[5]?` · +${m[5]} Grim Pursuit`:''}`;
    }
    if ((m = msg.match(/^Time Bomb upkeep: (?:rolls \[([\d,]+)\], )?(\d+) self-dmg(?:, (\d+) defused)?/)))
      return `💣 Time Bomb à l'Upkeep${m[1]?` — jet ${m[1]}`:''} : ${m[2]} dégât(s)${m[3]&&+m[3]?` · ${m[3]} désamorcée(s)`:''}`;
    if ((m = msg.match(/^The Mines: mined — revealed (.+) to The Forge/)))
      return `⛏️ <b>The Mines</b> : mine — révèle <b>${m[1]}</b> → la Forge`;
    if (/^The Mines: mined — no reveal/.test(msg)) return `⛏️ <b>The Mines</b> : mine — rien révélé, +1 CP`;
    if (/^The Mines: chose not to mine/.test(msg)) return `⛏️ <b>The Mines</b> : tu choisis de ne pas miner`;
    if (/^Scrap: /.test(msg)) return null; // l'UI logge déjà la version française
    if (/^The Mines: spent 3 CP/.test(msg)) return null; // idem
    if ((m = msg.match(/^The Forge: placed (.+) from hand/))) return `⚒️ <b>The Forge</b> : pose ${m[1]} depuis la main`;
    if ((m = msg.match(/^Crafted (\w+) \(tier (\d) (helmet|shield)\)/)))
      return `🛠️ <b>Craft</b> : ${m[1].replace(/_/g,' ')} (${m[3]==='helmet'?'casque':'bouclier'} tier ${m[2]})`;
    if ((m = msg.match(/^Masterwork \(Pick\): mined —(?: saw \[([^\]]*)\],)? revealed (.+) to The Forge/)))
      return `🛡️ <b>Masterwork</b> (Pioche) : mine — vu [${m[1]||'?'}], révèle <b>${m[2]}</b> → la Forge`;
    if ((m = msg.match(/^Masterwork \(Pick\): mined —(?: saw \[([^\]]*)\],)? no reveal/))) return `🛡️ <b>Masterwork</b> (Pioche) : mine — vu [${m[1]||'?'}], rien révélé, +1 CP`;
    if ((m = msg.match(/^Masterwork: face (\d), prevented (\d+), (\d+) dmg back(?: \(doubled ([^)]+)\))?/)))
      return `🛡️ <b>Masterwork</b> : dé ${m[1]} — ${m[2]} prévenu(s) · ${m[3]} contre-dégât(s)${m[4]?` · <b>doublé ${m[4].replace('helmet','casque').replace('shield','bouclier').replace('+',' + ')}</b>`:''}`;
    if ((m = msg.match(/^Ultimanium Shield: prevented (\d+)/)))
      return `🛡️ <b>Bouclier Ultimanium</b> : ${m[1]} prévenu(s) sur une attaque indéfendable`;
    if ((m = msg.match(/^(.+?): tutored (.+) to The Forge, deck shuffled/)))
      return `<b>${m[1].replace(/\s*\([A-C5-]+\)$/,'')}</b> : va chercher <b>${m[2]}</b> → la Forge (deck mélangé)`;
    if ((m = msg.match(/^(.+?): mined — revealed (.+) to The Forge/)))
      return `<b>${m[1].replace(/\s*\([A-C]+\)$/,'')}</b> : mine — révèle <b>${m[2]}</b> → la Forge`;
    if ((m = msg.match(/^(.+?): Mjolnir x(\d+) \((\d+) throw = (\d+) dmg, (\d+) retrieve = \+(\d+) EK\)/))) return `🔨 <b>${m[1]}</b> : Mjölnir ×${m[2]} — ${m[3]} lancer(s) (${m[4]} dégât·s isolés), ${m[5]} retour(s) (+${m[6]} ⚡EK)`;
    if ((m = msg.match(/^Thunder Wheel( II)?: prevented (\d+), (\d+) Mjolnir move\(s\)(?: \((\d+) dmg back\))?, \+(\d+) EK/))) return `🛡️ <b>Thunder Wheel${m[1]||''}</b> : prévient ${m[2]}${m[3]!=='0'?`, navette Mjölnir${m[4]?` (${m[4]} dégât en retour)`:''}`:''}${m[5]!=='0'?`, +${m[5]} ⚡EK`:''}`;
    if ((m = msg.match(/^Guard Break: spent (\d+), rolls \[([\d,]+)\] — (.+)$/))) return `🛡️⚡ <b>Guard Break</b> : ${m[1]} jeton(s), dés [${m[2]}] — ${m[3].includes('UNDEFENDABLE')?'<b>attaque INDÉFENDABLE !</b>':'raté'}`;
    if ((m = msg.match(/^Chain Lightning: rolled \[([\d,]+)\] -> (\d+) dmg \+ (\d+) collateral/))) return `⚡ <b>Chain Lightning</b> : [${m[1]}] → ${m[2]} dégâts + ${m[3]} collatéral`;
    // Jet Odinforce en FACES lisibles (1-3 🔨 Marteau, 4-5 🙌 Digne, 6 ⚡ Tonnerre) —
    // les chiffres bruts « [6,1,1,6,2] » ne disaient rien à l'user (user-caught).
    const thFaces = s => { const d=s.split(',').map(Number);
      const h=d.filter(v=>v<=3).length, w=d.filter(v=>v===4||v===5).length, t=d.filter(v=>v===6).length;
      return `[${d.map(v=>v<=3?'🔨':v<=5?'🙌':'⚡').join(' ')}] = ${h} Marteau·x, ${w} Digne·s, ${t} Tonnerre·s`; };
    if ((m = msg.match(/^Odinforce roll \[([\d,]+)\]/))) return `<b>Odinforce</b> : jet ${thFaces(m[1])}`;
    if ((m = msg.match(/^Odinforce II re-roll -> \[([\d,]+)\]/))) return `<b>Odinforce II</b> : relance → ${thFaces(m[1])}`;
    if ((m = msg.match(/^Odinforce: (\d+) base \+ (\d+) EK$/))) return `<b>Odinforce</b> : ${m[1]} base + ${m[2]} ⚡EK = <b>${+m[1]+ +m[2]} dégâts</b>`;
    if ((m = msg.match(/^Bottled Lightning: (\d+) base \+ (\d+) EK$/))) return `<b>Bottled Lightning</b> : ${m[1]} base + ${m[2]} ⚡EK = <b>${+m[1]+ +m[2]} dégâts</b>`;
    if ((m = msg.match(/^(.+?): attack total (\d+) dmg( \(undefendable\))?$/))) return `⚔️ <b>${m[1].replace(/\s*\([^)]*\)$/,'')}</b> : attaque de <b>${m[2]} dégâts</b>${m[3]?' (indéfendable)':''}`;
    if ((m = msg.match(/^Odinforce: (.+)$/))) return `<b>Odinforce</b> : ${m[1].replace('+1 CP (2+ Worthy)','+1 CP (2+ Dignes)').replace(/\+(\d+) EK \(Thunder\)/,'+$1 ⚡EK (Tonnerre)')}`;
    if ((m = msg.match(/^Mighty Summon: (.+)$/))) return `<b>Mighty Summon</b> : ${m[1].replace('Heal','soigne').replace('(Mjolnir home)','(Mjölnir chez toi)').replace(/Retrieve -> (\d+) collateral/,'Retrieve → $1 collatéral')}`;
    if ((m = msg.match(/^Hammered: (.+)$/))) return `<b>Hammered</b> : ${m[1].replace('Mjolnir thrown (1 dmg)','Mjölnir lancé (1 dégât)').replace(/(\d)-of-a-kind -> \+1 EK/,'$1 identiques → +1 ⚡EK')}`;
    if ((m = msg.match(/^(Bottled Lightning|Lightning Rod|Boom Boom!|Asgardian Brawn|Stormbreak!|Power Trip!|Time to Hammer!|Invulnerability!|Indomitable Will!): (.+)$/))) return `<b>${m[1]}</b> : ${m[2]}`;
    if (/^Electrokinesis x4 spent: drew 1/.test(msg)) return `⚡ <b>Electrokinesis ×4</b> dépensés → pioche 1`;
    if ((m = msg.match(/^Shape Shift -> (\w+) Form \((\w+)\)/))) return `🔄 Shape Shift → <b>${{bear:'Ours 🐻',cat:'Chat 🐆',druid:'Druide 🧙'}[m[1].toLowerCase()]||m[1]}</b> (${m[2]==='attack'?'attaque':'défense'})`;
    if ((m = msg.match(/^Regenerate: healed (\d+)/))) return `🌿 <b>Regenerate</b> : soigne ${m[1]}`;
    if ((m = msg.match(/^Wound: (\d+) dmg, rolls \[([\d,]+)\], (\d+) removed/))) return `🩸 <b>Wound</b> : ${m[1]} dégât(s), dés [${m[2]}], ${m[3]} retiré(s)`;
    if ((m = msg.match(/^Thick Hide( \(Bear\))?: prevented (\d+), (\d+) dmg back/))) return `🛡️ <b>Thick Hide${m[1]?' (Ours)':''}</b> : prévient ${m[2]}, ${m[3]} contre-dégât(s)`;
    if ((m = msg.match(/^Maul roll \[([\d,]+)\]( \(Bear re-roll\))?: -> (\d+) dmg/))) return `🐻 <b>Maul</b> : [${m[1]}]${m[2]?' (relance Ours)':''} → ${m[3]} dégâts`;
    if ((m = msg.match(/^Maul roll \[([\d,]+)\](.*) -> (\d+) dmg/))) return `🐻 <b>Maul</b> : [${m[1]}]${m[2]?' (relance Ours)':''} → ${m[3]} dégâts`;
    if (/^Cat Form: \+2 dmg, Wound inflicted/.test(msg)) return `🐆 <b>Chat</b> : +2 dégâts, 🩸 Wound infligé`;
    if (/^Druid Form: gained Regenerate/.test(msg)) return `🧙 <b>Druide</b> : +Regenerate ② (fin de tour)`;
    if ((m = msg.match(/^Ferocity: (\d)-of-a-kind -> Wound inflicted/))) return `<b>Ferocity</b> : ${m[1]} identiques → 🩸 Wound`;
    if ((m = msg.match(/^(Forest's \w+|Protect the Forest|Wrath of Nature|Wild Realignment|Nature's Cure|Savage Maul|Rainfall): (.+)$/))) return `<b>${m[1]}</b> : ${m[2]}`;
    // --- Pyromancer ---
    if (/^Burn: received 2 dmg/.test(msg)) return `🔥 <b>Burn</b> : 2 dégâts à l'upkeep (persistant)`;
    if ((m = msg.match(/^Fire Mastery cool off: -1 \(now (\d+)\)/))) return `🔥 <b>Cool off</b> : −1 Fire Mastery (reste ${m[1]})`;
    if (/^Knockdown: paid 2 CP/.test(msg)) return `💥 <b>Knockdown</b> : paie 2 CP, jeton retiré`;
    if (/^Knockdown: cannot pay/.test(msg)) return `💥 <b>Knockdown</b> : pas les 2 CP — <b>saute son Offensive Roll Phase</b>, jeton retiré`;
    if (/^Stun: token removed — additional/.test(msg)) return `🌀 <b>Stun</b> retiré → <b>Offensive Roll Phase supplémentaire</b> !`;
    if (/^Stun: no defense possible/.test(msg)) return `🌀 <b>Stun</b> : aucune défense possible — les dégâts passent`;
    if ((m = msg.match(/^(.+?): \+(\d+) Fire Mastery \(now (\d+)\/(\d+)\)/))) return `🔥 <b>${m[1]}</b> : +${m[2]} Fire Mastery (${m[3]}/${m[4]})`;
    if ((m = msg.match(/^(.+?): (burn|knockdown|stun) (inflicted|already on opponent.*)$/))) {
      const T={burn:'🔥 Burn',knockdown:'💥 Knockdown',stun:'🌀 Stun'};
      return `<b>${m[1]}</b> : ${T[m[2]]} ${m[3]==='inflicted'?'infligé':'déjà sur l\'adversaire (stack 1)'}`;
    }
    if ((m = msg.match(/^Combustion: removed (\d+) Fire Mastery -> (\d+) undefendable dmg/))) return `<b>Combustion</b> : brûle ${m[1]} Fire Mastery → <b>${m[2]} dégâts indéfendables</b>`;
    if ((m = msg.match(/^Burning Soul II?: Fire Mastery stack limit \+1 \(now (\d+)\)/))) return `<b>Burning Soul II</b> : stack limit Fire Mastery +1 (max ${m[1]})`;
    if ((m = msg.match(/^Burning Soul: (\d+) collateral dmg/))) return `<b>Burning Soul</b> : ${m[1]} dégât(s) collatéraux (indéfendables)`;
    if ((m = msg.match(/^Pyroblast roll \[([\d,]+)\]/))) return `<b>Pyroblast</b> : dé(s) bonus [${m[1]}] (1-3 = +3 dégâts · 4 = Burn · 5 = +2 FM · 6 = Knockdown)`;
    if ((m = msg.match(/^Pyroblast III re-roll -> \[([\d,]+)\]/))) return `<b>Pyroblast III</b> : relance → [${m[1]}]`;
    if ((m = msg.match(/^Meteorite: (\d+) collateral dmg/))) return `<b>Meteorite</b> : ${m[1]} dégâts collatéraux`;
    if ((m = msg.match(/^Meteorite: (\d+) undefendable dmg/))) return `<b>Meteorite</b> : <b>${m[1]} dégâts indéfendables</b> (1 par Fire Mastery)`;
    if ((m = msg.match(/^Molten Armor( I+)?: prevented 0, (\d+) dmg back, \+(\d+) Fire Mastery(, Burn inflicted on attacker)?(, Burn already on attacker)?/)))
      return `🛡️ <b>Molten Armor${m[1]||''}</b> : ${m[2]} contre-dégât(s), +${m[3]} 🔥FM${m[4]?', <b>Burn infligé à l\'attaquant</b>':''}${m[5]?', Burn déjà sur l\'attaquant':''}`;
    if ((m = msg.match(/^Warm Up!: \+(\d+) Fire Mastery \((\d+) CP spent\)/))) return `<b>Warm Up!</b> : +${m[1]} 🔥Fire Mastery (${m[2]} CP dépensés)`;
    if ((m = msg.match(/^Fire Up!: Fire Mastery stack limit \+1 \(now (\d+)\), \+(\d+) Fire Mastery/))) return `<b>Fire Up!</b> : stack limit +1 (max ${m[1]}), +${m[2]} 🔥FM`;
    if ((m = msg.match(/^Blazing Soul: Fire Mastery stack limit \+1 \(now (\d+)\)/))) return `<b>Blazing Soul</b> : stack limit Fire Mastery +1 (max ${m[1]})`;
    if ((m = msg.match(/^Huzzah!: rolled (\d) -> (.+)$/))) return `🎲 <b>Huzzah!</b> : ${m[1]} → ${m[2].replace('dmg','dégâts').replace('Burn inflicted','Burn infligé').replace('Fire Mastery','🔥FM').replace('Knockdown inflicted','Knockdown infligé')}`;
    if ((m = msg.match(/^Red Hot!: \+(\d+) dmg/))) return `<b>Red Hot!</b> : +${m[1]} dégâts (1 par 🔥FM)`;
    // --- Spider-Man ---
    if (/^Defensive Ability: Spider-Sense/.test(msg)) return `🛡️ Défense choisie : <b>Spider-Sense</b> (2 dés — Spider = préviens ½)`;
    if (/^Defensive Ability: Counterpunch/.test(msg)) return `🛡️ Défense choisie : <b>Counterpunch</b> (3 dés — 1 contre-dégât par Thwip)`;
    if ((m = msg.match(/^Spider-Sense: Invisibility spent -> additional Roll Attempt \[([\d,]+)\]/))) return `👤 <b>Invisibility</b> dépensée : Spider-Sense relance → [${m[1]}]`;
    if (/^Swing Escape!: Spider-Sense succeeds on Web/.test(msg)) return `🕸️ <b>Swing Escape!</b> : Spider-Sense réussit sur Toile au lieu de Spider (1 CP)`;
    if ((m = msg.match(/^Spider-Sense( \(Swing Escape\))?: prevented (\d+)/))) return `🛡️ <b>Spider-Sense${m[1]?' + Swing Escape':''}</b> : ${m[2]==='0'?'raté — rien prévenu':`préviens <b>${m[2]}</b> (moitié arrondie sup.)`}`;
    if ((m = msg.match(/^Counterpunch: prevented 0, (\d+) dmg back/))) return `🛡️ <b>Counterpunch</b> : ${m[1]} contre-dégât(s), rien prévenu`;
    if (/^Webbed: incoming attack becomes UNDEFENDABLE/.test(msg)) return `🕸️ <b>Webbed</b> : l'attaque devient <b>INDÉFENDABLE</b> — jeton retiré`;
    if (/^Invisibility spent: defending/.test(msg)) return `👤 <b>Invisibility</b> dépensée : tu DÉFENDS contre l'attaque indéfendable`;
    if (/^Combo spent: additional Offensive Roll Phase/.test(msg)) return `👊 <b>Combo</b> dépensé : Offensive Roll Phase supplémentaire !`;
    if ((m = msg.match(/^Spider-Reflexes: rolled \[([\d,]+)\] -> (\d+) dmg/))) return `<b>Spider-Reflexes</b> : 2d6 [${m[1]}] → <b>${m[2]} dégâts</b>`;
    if ((m = msg.match(/^(.+?): Webbed inflicted/))) return `🕸️ <b>${m[1]}</b> : inflige <b>Webbed</b> (2 dégâts isolés indéfendables)`;
    if ((m = msg.match(/^(.+?): opponent already Webbed/))) return `🕸️ <b>${m[1]}</b> : déjà Webbed (stack 1) — sans effet`;
    if ((m = msg.match(/^(.+?): gained Invisibility/))) return `👤 <b>${m[1]}</b> : gagne <b>Invisibility</b>`;
    if ((m = msg.match(/^(.+?): Invisibility already held/))) return `👤 <b>${m[1]}</b> : Invisibility déjà en main (stack 1)`;
    if ((m = msg.match(/^(.+?): gained Combo/))) return `👊 <b>${m[1]}</b> : gagne <b>Combo</b>`;
    if ((m = msg.match(/^(.+?): Combo already held/))) return `👊 <b>${m[1]}</b> : Combo déjà en main (stack 1)`;
    if ((m = msg.match(/^Booyah!: rolled (\d) \((\w+)\) -> (.+)$/))) return `🎲 <b>Booyah!</b> : ${m[1]} (${({Thwip:'Thwip',Web:'Toile',Spider:'Spider'})[m[2]]||m[2]}) → ${m[3].replace('gained Invisibility','+Invisibility 👤').replace('Invisibility already held','Invisibility déjà en main').replace('Webbed inflicted (2 iso dmg)','Webbed infligé 🕸️ (2 dégâts isolés)').replace('opponent already Webbed','déjà Webbed — sans effet').replace('gained Combo','+Combo 👊').replace('Combo already held','Combo déjà en main')}`;
    if (/^Milkshake Me!: healed 3/.test(msg)) return `🥤 <b>Milkshake Me!</b> : soigne 3`;
    if (/^Cha-Ching!: \+2 CP/.test(msg)) return `💰 <b>Cha-Ching!</b> : +2 CP`;
    if (/^Ambush!: Invisibility discarded/.test(msg)) return `👤⚔️ <b>Ambush!</b> : Invisibility défaussée → +3 dégâts`;
    if ((m = msg.match(/^Nice Try!: Invisibility discarded, prevented (\d+)/))) return `👤🛡️ <b>Nice Try!</b> : Invisibility défaussée → préviens ${m[1]}`;
    if (/^Invisible Punch!: 3 dmg back/.test(msg)) return `👊 <b>Invisible Punch!</b> : 3 dégâts en retour (prévention Spider-Sense)`;
    if (/^Ensnare \(large\): drew 1/.test(msg)) return `<b>Ensnare</b> (grande suite) : pioche 1`;
    if ((m = msg.match(/^Nevermore Die Roll: (\d)(.*)$/))) {
      const suites={' — gains Hex (6s are blanks this turn)':' — tu gagnes Hex (tes 6 sont blancs ce tour)',
        ' — must discard 1 of choice':' — tu dois défausser 1 carte',
        ' — dial to 0, Nevermore returns (no heal)':' — cadran à 0, Nevermore repart (sans soin)'};
      let tail=m[2];
      for (const k in suites) if (tail===k) tail=suites[k];
      tail=tail.replace(/ — Raveness activates Nevermore x(\d)/,' — la Raveness active Nevermore ×$1')
               .replace(/ — loses (\d) CP to the Raveness/,' — tu perds $1 CP au profit de la Raveness');
      return `🐦‍⬛ <b>Nevermore</b> (dé d'upkeep) : ${m[1]}${tail}`;
    }
    if ((m = msg.match(/^Nevermore absorbs: dial (\d), 1 undefendable dmg/))) return `🐦‍⬛ Nevermore <b>absorbe</b> : cadran ${m[1]}, 1 dégât indéfendable isolé`;
    if (/^Nevermore flies to the opponent/.test(msg)) return `🐦‍⬛ Nevermore s'envole chez l'adversaire`;
    if ((m = msg.match(/^Nevermore returns to the Raveness: healed (\d+)/))) return `🐦‍⬛ Nevermore revient : <b>soigne ${m[1]}</b>, cadran à 0`;
    if ((m = msg.match(/^Nevermore: discarded (.+)$/))) return `🐦‍⬛ Nevermore : défausse <b>${m[1]}</b>`;
    if ((m = msg.match(/^Hex: (\d) die\/dice showing 6 are blank/))) return `⬡ <b>Hex</b> : ${m[1]} dé(s) à 6 comptent comme BLANCS ce tour`;
    if (/^Hex removed/.test(msg)) return `⬡ Hex retiré (fin du tour)`;
    if ((m = msg.match(/^(Craven|Beguile|Aviary|Fowl Friend[^:]*|Murder of Crows[^:]*): (.+)$/))) return `<b>${m[1]}</b> : ${m[2].replace('drew 1','pioche 1').replace('Feather','Feather 🪶')}`;
    if (/^Pluck: Hex inflicted/.test(msg)) return `<b>Pluck</b> : ⬡ Hex infligé (ses 6 = blancs)`;
    if (/^Fantastic Terrors: Hex inflicted/.test(msg)) return `<b>Fantastic Terrors</b> : ⬡ Hex infligé`;
    if ((m = msg.match(/^Nothing More( II)?: prevented (\d+), (\d+) dmg back(.*)$/))) return `🛡️ <b>Nothing More${m[1]||''}</b> : prévient ${m[2]}, ${m[3]} contre-dégât(s)${m[4]?' · Active Nevermore':''}`;
    if ((m = msg.match(/^Peck: (\d)-of-a-kind -> Activate Nevermore/))) return `<b>Peck</b> : ${m[1]} identiques → Active Nevermore`;
    if ((m = msg.match(/^Naraxus: rolled \[([\d,]+)\] -> (.+) \((\d)\)/)))
      return `🐲 <b>Naraxus</b> lance [${m[1]}] → <b>${m[2]}</b>`;
    if ((m = msg.match(/^Swoop: removed (\w+)/))) return `🐲 Swoop : retire son jeton ${m[1]}`;
    if (/^Swoop: healed 4/.test(msg)) return `🐲 Swoop : se soigne de 4`;
    if ((m = msg.match(/^Ember Spark: milled (\d+)/))) return `🐲 Ember Spark : ${m[1]} carte(s) de ton deck à la défausse`;
    if ((m = msg.match(/^Gashing Bite: rolled \[([\d,]+)\] -> (\d+) dmg/))) return `🐲 Gashing Bite : lance [${m[1]}] → <b>${m[2]} dégâts</b>`;
    if (/^Hoarding: stole 1 die/.test(msg)) return `🐲 Hoarding : te <b>vole un dé</b> jusqu'à la fin de ton tour`;
    if ((m = msg.match(/^Thundering Roar: hero discarded (.+)/))) return `🐲 Thundering Roar : tu défausses <b>${m[1]}</b>`;
    if ((m = msg.match(/^Dragon's Might: trigger roll (\d)( -> SWOOP!)?/))) return `🐲 Dragon's Might : dé ${m[1]}${m[2]?' → <b>SWOOP bonus !</b>':''}`;
    if ((m = msg.match(/^Dragon Scales: face (\d), prevented (\d+)/))) return `🐲 <b>Dragon Scales</b> : dé ${m[1]} — prévient ${m[2]}`;
    if ((m = msg.match(/^Hoarding: -1 defense die/))) return `🐲 Le dé volé manque à ta défense`;
    if ((m = msg.match(/^Dragon's Hoard: (.+)/))) return `💰 Trésor du Dragon : ${m[1]==='drew 1'?'pioche 1':'+2 CP'}`;
    if ((m = msg.match(/^Defense dice: ([\d,]+)/)))
      return `🛡️ Dés de défense : <b>${diceWords(isHuman?humanHero:aiHero, m[1])}</b> (${m[1]})`;
    if ((m = msg.match(/^Agility spent: rolled (\d+), (halved damage|no effect)/)))
      return `🌀 <b>Agility</b> : jet ${m[1]} → ${m[2]==='halved damage'?'<b>dégâts divisés par 2</b> (1-3 réussit)':'raté (4-6), jeton perdu'}`;
    if ((m = msg.match(/^(.+?): removed (\w+) from p\d/))) return `<b>${m[1]}</b> : retire un jeton ${m[2]}`;
    if ((m = msg.match(/^(.+?): transferred (\w+)/))) return `<b>${m[1]}</b> : transfère un jeton ${m[2]}`;
    if ((m = msg.match(/(\d+) dmg/))) return msg.replace(/(\d+) dmg/g, '$1 dégâts');
    return msg;
  }
  let lastLogLen = 0;
  function drainEngineLog(){
    const L = g.state.log;
    for (let i=lastLogLen; i<L.length; i++){ const e=L[i];
      const isHuman = e.playerIdx===g.humanIdx;
      const t = translateLog(e.message, isHuman, isHuman?humanHero:aiHero);
      if (t !== null) addLog(`<span class="t">${isHuman?'Toi':'IA'}</span>${t}`, `Tour ${e.turn}`, isHuman?'you':'ai');
    }
    lastLogLen = L.length;
  }
  // Journal CHRONOLOGIQUE (user-caught : le prepend affichait tout « à l'envers ») — les
  // lignes s'ajoutent en bas, un bandeau doré sépare chaque tour, et on suit le fil en bas
  // sauf si tu as remonté lire plus haut.
  let lastLogHdr = '';
  function addLog(html, hdr, who){
    const follow = logBox.scrollTop + logBox.clientHeight >= logBox.scrollHeight - 40;
    if (hdr && hdr !== lastLogHdr) {
      const h=document.createElement('div'); h.className='lh'; h.textContent=hdr;
      logBox.appendChild(h); lastLogHdr=hdr;
    }
    const l=document.createElement('div');
    l.className='l' + (who==='you'?' you-line':who==='ai'?' ai-line':'');
    l.innerHTML=html; logBox.appendChild(l);
    if (follow) logBox.scrollTop = logBox.scrollHeight;
  }
  function log(html){ addLog(html, undefined, 'you'); }

  function renderAll(){ renderFighters(); renderDice(false); renderControls(); renderMatch(); renderCoachPanel(); renderAbilities(); renderHand(); renderCardsDrawer(); drainEngineLog(); }

  // Upgraded ("II") display numbers for the side panel — the verified card values, so the board
  // stops showing base damage once the II upgrade is in play (user-reported on Reap II).
  const REF_II_DMG = {
    'Cleave':'5–8','Ride Down':'6 ·+3 Grim','Reap':'4 ·+Dread','Sow Despair':'7–10',
    'Horrify':'6 ·+3D+2G','Spectral Assault':'9 +jet',
    'Baton Strike':'6–8',"Widow's Gauntlets":'7 ·+CP','Hacked':'6 ·+Bomb','Grapple':'7 indéf.',
    // Raveness
    'Peck':'6-8 ·3-kind: Activ.','Raven Sight':'3 indéf. ·Activ.×2','Craven':'9 ·+2 Feather',
    'Beguile':'9 ·+3 F ·Activ.×2','Fowl Friend':'pioche+MAX F ·Activ.×3',
    'Murder of Crows':'6 +jet 5 ·F/Aile','Chamber':'7 indéf. ·Activ.×3',
    // Druid
    'Ferocity':'5-7 ·3-kind: Wound','Maul':'2d6 ·reroll (Ours)','Protect the Forest':'8 indéf. ·+Regen+SS',
    // Thor (Hammered a deux paliers — ':iii' = Hammered III)
    'Hammered':'5/6/7 ·🔨 T/R ·4-kind: EK','Hammered:iii':'5/6/8 ·🔨 T/R ·3-kind: EK',
    'Mighty Summon':'+2 GB ·Heal 3 ·EK/coll. 4','Chain Lightning':'4d6: 2 meilleurs +3 coll.',
    'Odinforce':'6 +5d6 effets ·relance ·+EK','Bottled Lightning':'8+EK ·🔨×3 ·+2 GB',
    'Lightning Rod':'9 ·🔨 ·+1 EK','Thunder Bolt':'12 ·🔨 ·+2 EK',
    // Spider-Man
    'Punch':'5/6/7 ·4-kind: Combo','C-C-C-Combo':'6 ·+Combo (+alt Web Shot BBC)',
    'Ensnare':'6 ·+Webbed','Ensnare (grande)':'pioche ·9 ·+Webbed',
    'Venom Punch':'8 indéf. ·+Invis. (+alt Combo Up CCC)',
    // Pyromancer (Pyroblast a deux paliers — ':iii' = Pyroblast III)
    'Fireball':'4/6/8 ·+2 FM','Burning Soul':'+Burn à SSS ·cap+1 à SSSS',
    'Combustion':'-4 FM max → 4/jeton indéf.','Pyroblast':'6 +2d6 effets','Pyroblast:iii':'6 +2d6 effets ·relance 1',
    'Hot Streak':'+2 FM ·6 +1/FM (+alt Scorch AABB)','Ignite':'+2 FM ·Burn ·5 +2/FM (+alt Blazing Soul BBCC)',
    'Meteorite':'+2 FM ·Stun ·1/FM indéf. +3 coll. (+alt Meteoroid DDD)',
    // Duelist
    'Blade Flurry':'5/6/7 ·3-kind: 1 Step','Balestra':'≤2 Steps ·8 (+alt Fancy Feet BBB)',
    'Feint Attack':'+2 GB ·1 Step ·3 indéf.','Bladestorm':'+2 GB ·Disarm ·≤2 Steps ·9 (+alt Bladewind CCC)',
    // Sun Elf
    'Light Staff':'5/6/7 ·3-kind: cadran +1','Scorching Staff':'5 +2d6: +2/Stave ·cadran ·gem',
    'Radiant Energy':'Sun Marked ·6 (+alt Praise the Sun AAAC)',
    'Solar Burst':'cadran +2 ·Gem+Marked ·7 indéf. (+alt Bestow CCC)',
    'Sunbeam':'cadran +3 ·9 (+alt Soaking BCCC)',
  };
  // Exigence modifiée par l'upgrade (seul cas connu : Fowl Friend II passe à BBB — ruling user)
  const REF_II_REQ = { 'Fowl Friend':'BBB', 'Radiant Energy':'AACC' };
  // Which upgrade card marks each base ability as "II" on the side panel.
  const REF_UPGRADE = {
    'Cleave':'cleave-ii','Ride Down':'ride-down-ii','Reap':'reap-ii','Sow Despair':'sow-despair-ii',
    'Horrify':'horrify-ii','Spectral Assault':'spectral-assault-ii',
    'Baton Strike':'baton-strike-ii',"Widow's Gauntlets":'widows-gauntlets-ii','Hacked':'hacked-ii',
    'Grapple':'grapple-ii','Vengeance':'vengeance-ii','Infiltrate':'infiltrate-ii',
    'Peck':'peck-ii','Raven Sight':'raven-sight-ii','Craven':'craven-ii','Beguile':'beguile-ii',
    'Fowl Friend':'fowl-friend-ii','Murder of Crows':'murder-of-crows-ii','Chamber':'chamber-ii',
    'Ferocity':'ferocity-ii','Maul':'maul-ii','Protect the Forest':'protect-the-forest-ii',
    'Hammered':['hammered-ii','hammered-iii'],'Mighty Summon':'mighty-summon-ii',
    'Chain Lightning':'chain-lightning-ii','Odinforce':'odinforce-ii',
    'Bottled Lightning':'bottled-lightning-ii','Lightning Rod':'lightning-rod-ii','Thunder Bolt':'thunder-bolt-ii',
    'Punch':'punch-ii','C-C-C-Combo':'combo-ii','Ensnare':'ensnare-ii','Ensnare (grande)':'ensnare-ii','Venom Punch':'venom-punch-ii',
    'Fireball':'fireball-ii','Burning Soul':'burning-soul-ii','Combustion':'combustion-ii',
    'Pyroblast':['pyroblast-ii','pyroblast-iii'],'Hot Streak':'hot-streak-ii','Ignite':'ignite-ii','Meteorite':'meteorite-ii',
    'Blade Flurry':'blade-flurry-ii','Balestra':'balestra-ii','Feint Attack':'feint-attack-ii','Bladestorm':'bladestorm-ii',
    'Light Staff':'light-staff-ii','Scorching Staff':'scorching-staff-ii','Radiant Energy':'radiant-energy-ii',
    'Solar Burst':'solar-burst-ii','Sunbeam':'sunbeam-ii',
  };
  // Résout le tier actif d'une habileté (gère les paliers multiples type Hammered II/III).
  function refUpgradeInfo(name, upgradesInPlay){
    const ids = REF_UPGRADE[name];
    const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
    const active = list.filter(id => upgradesInPlay.includes(id)).pop();
    if (!active) return null;
    const iii = active.endsWith('-iii');
    return { suffix: iii ? ' III' : ' II',
             dmg: (iii && REF_II_DMG[name + ':iii']) || REF_II_DMG[name] || null,
             req: REF_II_REQ[name] || null };
  }
  // Static ability reference (dice pattern -> name/dmg) for the side panel when not choosing.
  const REFERENCE = {
    hh:[ {name:'Cleave',req:'AAA',dmg:'4–7'},{name:'Ride Down',req:'AAABB',dmg:'6 ·+Grim'},
      {name:'Reap',req:'BBBC',dmg:'3 ·+Dread'},{name:'Sow Despair',req:'suite 4',dmg:'7–9'},
      {name:'Horrify',req:'CCCC',dmg:'6 ·+3 Dread'},{name:'Spectral Assault',req:'AAACC',dmg:'8 +jet'},
      {name:'Dreadful Charge',req:'CCCCC',dmg:'14 · ULT'} ],
    fm:[ {name:'Pick Axe',req:'AAA',dmg:'5–7'},{name:'Furnace',req:'BBBB',dmg:'5 +1d6'},
      {name:'Smelting Time',req:'CCCC',dmg:'9 indéf.'},{name:'A Good Haul',req:'ABCC',dmg:'8 ·Mine'},
      {name:'Armored Up',req:'suite 4',dmg:'7–10'},{name:'Final Touches!',req:'CCCCC',dmg:'14 · ULT'} ],
    dr:[ {name:'Ferocity',req:'AAA+',dmg:'4-6 ·4-kind: Wound'},
      {name:'Maul',req:'BBBB',dmg:'2d6 (Bear: reroll)'},
      {name:"Nature's Cure",req:'AACC',dmg:'5 ·+Regen 2'},
      {name:'Wild Realignment',req:'ABBC',dmg:'+1CP +2 SS ·pioche'},
      {name:"Forest's Call",req:'SUITE 4',dmg:'6 ·+SS'},
      {name:"Forest's Answer",req:'SUITE 5',dmg:'7 +dé bonus'},
      {name:'Protect the Forest',req:'CCCC',dmg:'6 indéf. ·+Regen+SS'},
      {name:'Wrath of Nature',req:'CCCCC',dmg:'12 ·ULT'} ],
    th:[ {name:'Hammered',req:'AAA+',dmg:'4-7 ·Throw 🔨'},
      {name:'Mighty Summon',req:'ABBC',dmg:'+2 GB ·Heal 2 ·EK/coll.'},
      {name:'Chain Lightning',req:'AAACC',dmg:'3d6: 2 meilleurs +2 coll.'},
      {name:'Odinforce',req:'AABBB',dmg:'5 +5d6 effets +EK dmg'},
      {name:'Bottled Lightning',req:'CCCC',dmg:'7+EK ·🔨×2 ·+2 GB'},
      {name:'Lightning Rod',req:'SUITE 4',dmg:'7 (9 si 🔨 chez lui)'},
      {name:'Thunder Bolt',req:'SUITE 5',dmg:'10 ·🔨 ·+2 EK'},
      {name:'For Asgard!',req:'CCCCC',dmg:'14 ·ULT ·🔨×4'} ],
    rv:[ {name:'Peck',req:'AAA+',dmg:'5-7 ·4-kind: Activ.'},
      {name:'Raven Sight',req:'AACC',dmg:'3 indéf. ·Activ.'},
      {name:'Craven',req:'SUITE 4',dmg:'8 ·+1 Feather'},
      {name:'Beguile',req:'SUITE 5',dmg:'9 ·+2 F ·Activ.'},
      {name:'Fowl Friend',req:'BBBB',dmg:'pioche+4 F ·Activ.x2'},
      {name:'Murder of Crows',req:'AABBB',dmg:'5 +jet 4'},
      {name:'Chamber',req:'CCCC',dmg:'7 indéf. ·Activ.x2'},
      {name:'Fantastic Terrors',req:'CCCCC',dmg:'13 ·Hex ·ULT'} ],
    sm:[ {name:'Punch',req:'AAA+',dmg:'4/5/6'},
      {name:'C-C-C-Combo',req:'AACC',dmg:'5 ·+Combo'},
      {name:'Spider-Reflexes',req:'ABBC',dmg:'2d6 = dmg ·≤5: Combo'},
      {name:'Wall Crawler',req:'AABBB',dmg:'7 ·+Invisibility'},
      {name:'Ensnare',req:'SUITE 4',dmg:'5 ·+Webbed'},
      {name:'Ensnare (grande)',req:'SUITE 5',dmg:'pioche ·8 ·+Webbed'},
      {name:'Venom Punch',req:'CCCC',dmg:'7 indéf. ·+Invis.'},
      {name:'Venom Shockwave',req:'CCCCC',dmg:'13 ·Invis.+Webbed ·ULT'} ],
    py:[ {name:'Fireball',req:'AAA+',dmg:'4/6/8 ·+1 FM'},
      {name:'Burning Soul',req:'CC',dmg:'+2 FM/S ·1 coll./S'},
      {name:'Combustion',req:'ABCD',dmg:'-4 FM max → 3/jeton indéf.'},
      {name:'Pyroblast',req:'AAAAD',dmg:'6 +1d6 effets'},
      {name:'Hot Streak',req:'SUITE 4',dmg:'+2 FM ·5 +1/FM'},
      {name:'Ignite',req:'SUITE 5',dmg:'+2 FM ·4 +2/FM'},
      {name:'Meteorite',req:'DDDD',dmg:'+2 FM ·Stun ·1/FM indéf. +2 coll.'},
      {name:'Scorch the Earth',req:'DDDDD',dmg:'12 ·Knockdown+Burn ·ULT'} ],
    se:[ {name:'Light Staff',req:'AAA+',dmg:'4/5/7 ·4-kind: cadran +1'},
      {name:'Ray Absorption',req:'BBBB',dmg:'cadran +3 ·soin 2 ·+Gem'},
      {name:'Radiant Energy',req:'AAACC',dmg:'Sun Marked ·6'},
      {name:'Scorching Staff',req:'ABBB',dmg:'5 +1d6 effets'},
      {name:'Ray of Light',req:'SUITE 4',dmg:'cadran +1 ·7'},
      {name:'Sunbeam',req:'SUITE 5',dmg:'cadran +2 ·9'},
      {name:'Solar Burst',req:'CCCC',dmg:'cadran +2 ·Gem OU Marked ·8'},
      {name:'Solar Flare',req:'CCCCC',dmg:'10 ·cadran +3 ·Gem+Marked ·ULT'} ],
    du:[ {name:'Blade Flurry',req:'AAA+',dmg:'4/5/6 ·4-kind: 1 Step'},
      {name:'Balestra',req:'AABB',dmg:'≤2 Steps ·6'},
      {name:'Feint Attack',req:'AACC',dmg:'+GB ·1 Step ·2 indéf.'},
      {name:'En Garde',req:'CBBB',dmg:'8 +4d6: Pierce→Disarm'},
      {name:'Strike',req:'SUITE 4',dmg:'7'},
      {name:'Strike (grande)',req:'SUITE 5',dmg:'1 Step ·10'},
      {name:'Bladestorm',req:'CCCC',dmg:'+GB ·Disarm ·≤2 Steps ·8'},
      {name:'Master of the Blade',req:'CCCCC',dmg:'11 ·2 GB ·Disarm ·≤4 Steps ·ULT'} ],
    nx:[ {name:'1 · Swoop',req:'—',dmg:'3 indéf. ·soin 4 ·-1 statut'},
      {name:'2 · Ember Spark',req:'—',dmg:'8 ·mill 3'},
      {name:'3 · Gashing Bite',req:'—',dmg:'4d6: top2'},
      {name:'4 · Hoarding',req:'—',dmg:'9 ·vole 1 dé'},
      {name:'5 · Thundering Roar',req:'—',dmg:'8 indéf. ·défausse 1'},
      {name:'6 · Dragon\'s Might',req:'—',dmg:'10 ·Swoop 5-6'} ],
    bw:[ {name:'Baton Strike',req:'BBB',dmg:'5–7'},{name:'Infiltrate',req:'AABC',dmg:'+Bomb'},
      {name:'Widow\'s Gauntlets',req:'BBBAA',dmg:'6 ·+CP'},{name:'Hacked',req:'suite 4',dmg:'5 ·+Bomb'},
      {name:'Grapple',req:'CCCC',dmg:'6 indéf.'},{name:'Vengeance',req:'suite 5',dmg:'7 +jet'},
      {name:'Widow\'s Bite',req:'CCCCC',dmg:'10 · ULT'} ],
  };

  // ---------- boot ----------
  $('title').innerHTML = `${humanHero.name} <span class="vs">contre</span> ${aiHero.name}`;
  // Sélecteurs de persos visibles dans la barre du haut (nouvelle partie au changement).
  (function(){
    const mast = document.querySelector('.mast');
    const box = document.createElement('span');
    const opt = (v,cur)=>['hh','bw','fm','rv','dr','th','sm','py','du','se'].map(h=>`<option value="${h}"${h===cur?' selected':''}>${HERO[h].name}</option>`).join('');
    const aiCur = AI_HERO==='nx' ? (BOSS_HARD?'nxh':'nx') : AI_HERO;
    const optAi = ['hh','bw','fm','rv','dr','th','sm','py','du','se'].map(h=>`<option value="${h}"${h===aiCur?' selected':''}>${HERO[h].name}</option>`).join('')
      + `<option value="nx"${aiCur==='nx'?' selected':''}>🐲 Naraxus (boss)</option>`
      + `<option value="nxh"${aiCur==='nxh'?' selected':''}>🐲 Naraxus (HARD)</option>`;
    box.innerHTML = `<label style="font-size:11px;color:var(--muted)">Toi <select id="pick-me" class="btn" style="padding:3px 6px;font-size:.75rem">${opt('me',HUMAN)}</select></label>
      <label style="font-size:11px;color:var(--muted)"> IA <select id="pick-ai" class="btn" style="padding:3px 6px;font-size:.75rem">${optAi}</select></label>`;
    mast.appendChild(box);
    const go = ()=>{ const me=document.getElementById('pick-me').value; let ai2=document.getElementById('pick-ai').value;
      const hard = ai2==='nxh' ? '&hard=1' : ''; if (ai2==='nxh') ai2='nx';
      if (me!==HUMAN || ai2!==AI_HERO || (ai2==='nx' && (hard==='&hard=1')!==BOSS_HARD)) location.href = `play.html?me=${me}&ai=${ai2}${hard}`; };
    document.getElementById('pick-me').onchange = go;
    document.getElementById('pick-ai').onchange = go;
  })();
  (function(){
    const tag = $('turntag');
    const tg = document.createElement('button');
    tg.className='btn'; tg.style.cssText='margin-left:10px;font-size:.72rem;padding:3px 10px';
    const paint = ()=>{ tg.textContent = coachLive ? '🎓 Coach live : ON' : '🎓 Coach live : OFF'; tg.style.opacity = coachLive?'1':'.55'; };
    paint();
    tg.onclick = ()=>{ coachLive=!coachLive; localStorage.setItem('dt_coach_live', coachLive?'1':'0'); paint(); renderMatch(); renderCoachPanel(); };
    tag.parentNode.insertBefore(tg, tag);
    // Export de TOUTES les parties sauvegardées (localStorage en garde 20) — le bouton de fin
    // de partie n'exportait que la dernière (user-caught).
    const st = document.createElement('a');
    st.className='btn'; st.href='stats.html'; st.textContent='📈 Stats';
    st.style.cssText='margin-left:6px;font-size:.72rem;padding:3px 10px;text-decoration:none';
    tag.parentNode.insertBefore(st, tag);
    const cd = document.createElement('button');
    cd.className='btn'; cd.textContent='🂠 Cartes';
    cd.style.cssText='margin-left:6px;font-size:.72rem;padding:3px 10px';
    cd.onclick = ()=>{ cardsDrawerOpen=!cardsDrawerOpen; renderCardsDrawer(); };
    tag.parentNode.insertBefore(cd, tag);
    const ex = document.createElement('button');
    ex.className='btn'; ex.style.cssText='margin-left:6px;font-size:.72rem;padding:3px 10px';
    const histo = ()=>{ try { return JSON.parse(localStorage.getItem('dt_games')||'[]'); } catch(e){ return []; } };
    ex.textContent = `💾 Historique (${histo().length})`;
    ex.onclick = ()=>{
      const all = histo();
      if (!all.length) { ex.textContent='💾 Historique (vide)'; return; }
      const blob = new Blob([JSON.stringify(all, null, 1)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dicethrone_historique_${all.length}parties_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    };
    tag.parentNode.insertBefore(ex, tag);
  })();
  // Tell the truth about which opponent is driving (learned net vs scripted fallback).
  const usingNet = !!window.AI_WEIGHTS && ai !== G.greedyHighestDamagePolicy;
  const aiNote = document.getElementById('ai-note');
  if (aiNote) aiNote.textContent = usingNet
    ? 'Adversaire : réseau entraîné par self-play.'
    : 'Adversaire : IA scriptée (poids entraînés introuvables — ai-weights.js manquant/incompatible).';
  if (AI_HERO === 'nx') {
    addLog(`<span class="t">Départ</span>🐲 <b>Naraxus${BOSS_HARD?' (HARD)':''}</b> — 65 PV. Il joue TOUJOURS en premier. Vole le Trésor du Dragon :`);
    phase='hoard';
    $('turntag').textContent = 'Dragon\'s Hoard — choisis ton butin';
    renderFighters();
    const c=$('controls'); c.innerHTML='';
    c.appendChild(btn('💰 Piocher 1 carte','primary', ()=>{ G.humanDragonsHoard(g,'draw'); log('💰 Trésor : pioche 1.'); setTimeout(aiTurn,300); }));
    c.appendChild(btn('💰 Gagner 2 CP','primary', ()=>{ G.humanDragonsHoard(g,'cp'); log('💰 Trésor : +2 CP.'); setTimeout(aiTurn,300); }));
  } else if (g.humanIdx === 0) {
    addLog('<span class="t">Départ</span>Tu commences la partie.');
    startHumanTurn();
  } else {
    addLog(`<span class="t">Départ</span>L'IA commence — tu joues second${HUMAN==='hh'?' (Cavalier : +1 Dreadful)':''}.`);
    $('turntag').textContent = `L'IA (${aiHero.name}) commence…`;
    renderFighters();
    setTimeout(aiTurn, 500);
  }
})();
