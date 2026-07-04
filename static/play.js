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
    spider:'<g class="glyph"><ellipse cx="32" cy="37" rx="8.5" ry="10.5"/><circle cx="32" cy="23" r="5.5"/><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M25 31L11 23M24 37H8M25 43L11 51M39 31l14-8M40 37h16M39 43l14 8"/></g></g>'
  };
  const CLSCOL = { A:'#f3ede2', B:'#3fb6e8', C:'#ef6b2b' };
  function symIcon(hero, cls){ return `<svg class="msym" viewBox="0 0 64 64" style="color:${(hero.col||CLSCOL)[cls]}" aria-hidden="true">${hero.sym[cls]}</svg>`; }
  // A dice-requirement string -> symbols. "N-straight"/"suite N" -> badge; A/B/C letters -> icons.
  function renderReq(hero, raw){
    if(!raw) return '';
    const s=String(raw); const st=s.match(/(\d)\s*-?\s*straight|suite\s*(\d)/i);
    if(st) return `<span class="straightbadge">SUITE ${st[1]||st[2]}</span>`;
    const letters=s.match(/[ABC]/g);
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
  };

  // ---- game state ----
  const HUMAN = 'hh', AI_HERO = 'bw';
  let ai;
  if (window.AI_WEIGHTS) { try { ai = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(window.AI_WEIGHTS))); } catch (e) { ai = G.greedyHighestDamagePolicy; } }
  else ai = G.greedyHighestDamagePolicy;

  // Stateful (snapshotable) rng so interactive defense can clone+replay the AI's attack deterministically.
  const rng = G.mulberry32Stateful((Date.now() % 2147483647) || 1);
  // First player is decided at random (like the opening roll). Going SECOND carries the rules'
  // compensation automatically (HH gains 1 Dreadful — handled in createInitialGameState).
  const humanFirst = rng() < 0.5;
  const g = G.newHumanGame(HUMAN, AI_HERO, ai, rng, humanFirst);
  const humanHero = HERO[HUMAN], aiHero = HERO[AI_HERO];

  let phase = 'main1';         // 'upkeep'|'main1'|'roll'|'alter'|'ability'|'main2'|'defense'|'over'
  let dice = [];               // [{v, kept}]
  let attempts = 0, rollsLeft = 2;
  let pendingDefense = null;   // current DefensePrompt while defending against the AI (else null)
  let pendingAttackInfo = null;// AiAttackInfo for the incoming attack being defended
  let defSel = new Set();      // defense dice selected for Better D!'s partial reroll
  let lastDefDice = null;      // your resolved defense dice, shown in the tray after the attack lands
  let gpBonusSel = false;      // Grim Pursuit mode (b) armed for the attack being chosen
  let amSel = new Set();       // attack-modifier cards armed for the attack being chosen
  let tbArmed = false;         // Time Bomb upkeep roll: click-to-roll pacing flag
  let tbShow = null;           // {rolls, dmg, defused} — the TB dice, displayed until you roll
  let altSel = new Set();      // dice selected in the alter phase (click 1-2 dice, then pick a value)

  // ---- coach & game logging ----
  // The AI policy is seat-agnostic, so the SAME object can evaluate YOUR decisions: at each
  // human decision we silently ask "what would the network do here?" and record it. The
  // post-game analysis lists the disagreements — "pourquoi j'ai perdu / qu'aurait joué l'IA".
  const coach = ai;
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
    if (t.dreadful)    out.push(`<span class="tok dread"><span class="dot"></span><b>Dreadful</b> ${t.dreadful}</span>`);
    if (t.grimPursuit) out.push(`<span class="tok grim"><span class="dot"></span><b>Grim</b> ${t.grimPursuit}</span>`);
    if (t.agility)     out.push(`<span class="tok agi"><span class="dot"></span><b>Agility</b> ${t.agility}</span>`);
    if (t.covertOps)   out.push(`<span class="tok covert"><span class="dot"></span><b>Covert</b> ${t.covertOps}</span>`);
    if (t.head)        out.push(`<span class="tok head"><span class="dot" style="background:var(--gold)"></span><b>Haunted Head</b></span>`);
    (p.timeBombs || []).forEach(pos => out.push(`<span class="tok bomb"><span class="dot"></span><b>Time Bomb</b> ${pos}</span>`));
    return out.join('');
  }
  function renderFighter(elId, idx, def, isHuman) {
    const p = g.state.players[idx];
    const pct = Math.max(0, Math.min(100, p.hp * 2));
    const activeCls = (g.state.activePlayerIdx === idx && phase !== 'over') ? ' active' : '';
    // Upgrades in play were invisible ("je ne vois pas si j'ai Cleave II") — show them as chips.
    const hero = G.heroTemplateFor(p.heroId);
    const ups = p.upgradesInPlay.map(id => (G.cardById(hero, id) || { name: id }).name)
      .map(n => `<span class="tok" style="border-color:var(--gold)"><b>${n}</b></span>`).join('');
    $(elId).className = 'fighter ' + (isHuman ? 'you' : 'ai') + activeCls;
    $(elId).innerHTML =
      `<div class="crest">${def.crest}</div>
       <div class="who"><div class="name">${def.name}<small>${isHuman ? 'toi' : 'IA'}</small></div>
         <div class="hpbar"><i style="width:${pct}%"></i><span>${Math.max(0,p.hp)} / 50</span></div></div>
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
      <svg viewBox="0 0 64 64" aria-hidden="true">${hero.sym[c]}</svg><span class="pip">${d.v}</span></button>`;
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
          if (defSel.has(i)) defSel.delete(i); else { if (defSel.size>=2) defSel.delete([...defSel][0]); defSel.add(i); }
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
    // Time Bomb roll: show the actual die/dice until you start your own roll.
    if (tbShow && !dice.length) {
      const verdict = tbShow.dmg>0 ? `💥 EXPLOSE — ${tbShow.dmg} dégâts !` : tbShow.defused>0 ? '✅ désamorcée (6) !' : '⏱️ elle avance d\'un cran…';
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">💣 JET DE TIME BOMB (1-5 avance, 6 désamorce) :</div>` +
        tbShow.rolls.map((v,i)=>dieHTML(humanHero, {v,kept:false}, i, false)).join('') +
        `<div class="empty" style="width:100%"><b>${verdict}</b></div>`;
      return;
    }
    $('tray').innerHTML = dice.length
      ? dice.map((d,i)=>dieHTML(humanHero, d, i, phase==='roll' && attempts>0)).join('')
      : '<div class="empty">Lance les dés pour commencer ton attaque.</div>';
    if (animate) $('tray').querySelectorAll('.die:not(.kept)').forEach(el=>el.classList.add('rolling'));
    if (phase==='roll' && attempts>0) $('tray').querySelectorAll('.die').forEach(el=>{
      el.onclick = () => { const i=+el.dataset.i; dice[i].kept=!dice[i].kept; renderDice(false); renderControls(); };
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
    const show = (phase==='roll' && attempts>0) || phase==='alter';
    if (!show) { $('match').innerHTML=''; return; }
    const best = bestAbility(dice.map(d=>d.v));
    if (!best) { $('match').innerHTML = `<div class="lead">Aucune habileté — relance ou manipule tes dés</div>`; return; }
    const f = formatAbility(humanHero, best.name);
    $('match').innerHTML = `<div class="lead">Meilleure habileté disponible</div><div class="name">${f.name} ${f.req}${best.baseDamage!=null?` · ${best.baseDamage} dmg`:''}</div>`;
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
        <div><div class="an">${f.name}</div><div class="req">${f.req} ${c.defendable?'· défendable':'· indéfendable'}${eff?` · ${eff}`:''}</div></div>
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
        const upId = REF_UPGRADE[a.name];
        const upgraded = upId && self.upgradesInPlay.includes(upId);
        rows.push({ name: a.name + (upgraded ? ' II' : ''), matchName: a.name, req: a.req,
          dmg: upgraded ? (REF_II_DMG[a.name] || a.dmg) : a.dmg, on: isOn(a.name) });
      }
      for (const card of hero.cards) {
        if (card.altAbility && self.upgradesInPlay.includes(card.id)) {
          const alt = card.altAbility;
          const short = alt.boardName.replace(/\s*\([^)]*\)$/, '');
          const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
          // Show the riders too (Cursed Gallop's +1 Grim Pursuit was invisible — reported).
          const eff = abilityEffects(alt.boardName);
          rows.push({ name: `↳ ${short}`, matchName: short, req,
            dmg: `${alt.baseDamage != null ? alt.baseDamage : '—'}${eff?` · ${eff}`:''}`, on: isOn(short) });
        }
      }
      box.innerHTML = rows.map(a=>`<div class="abil${a.on?' on':''}">
        <div><div class="an">${a.name}</div><div class="req">${renderReq(humanHero,a.req)}</div></div><div class="dv">${a.dmg}</div></div>`).join('')
        + defBoxHTML(HUMAN, self);
    }
    renderAiBoard();
  }

  // The DEFENSE box each printed hero board has — name, dice formula, per-symbol effects —
  // II-aware ("je ne vois toujours pas sur le board la défense", reported).
  function defBoxHTML(heroKey, p){
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
      const upId = REF_UPGRADE[a.name];
      const upgraded = upId && ai.upgradesInPlay.includes(upId);
      aiRows.push({ name: a.name + (upgraded ? ' II' : ''), req: a.req,
        dmg: upgraded ? (REF_II_DMG[a.name] || a.dmg) : a.dmg });
    }
    for (const card of aiHeroT.cards) {
      if (card.altAbility && ai.upgradesInPlay.includes(card.id)) {
        const alt = card.altAbility;
        const req = (alt.boardName.match(/\(([^)]+)\)/) || [])[1] || alt.dicePattern;
        aiRows.push({ name: `↳ ${alt.boardName.replace(/\s*\([^)]*\)$/, '')}`, req, dmg: alt.baseDamage != null ? String(alt.baseDamage) : '—' });
      }
    }
    box.innerHTML = aiRows.map(a=>`<div class="abil" style="opacity:.85">
      <div><div class="an">${a.name}</div><div class="req">${renderReq(aiHero,a.req)}</div></div><div class="dv">${a.dmg}</div></div>`).join('')
      + defBoxHTML(AI_HERO, ai);
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
        <div class="ctop"><div class="cname">${c.name||id}</div><div class="cost">${c.cpCost!=null?c.cpCost:'·'}</div></div>
        <div class="ctype">${labelKind(c)}</div><div class="ctext">${c.text||''}</div>${sellBtn}</div>`;
    }).join('');
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
  function renderControls() {
    const c = $('controls'); c.innerHTML='';
    // While it's the AI's turn (except the defense window, which IS yours to act in), never show
    // your action buttons — otherwise a stale Main-Phase panel could be clicked during the AI's turn.
    if (phase!=='defense' && phase!=='defarm' && phase!=='over' && g.state.activePlayerIdx !== g.humanIdx) {
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
      c.appendChild(s);
      c.appendChild(btn('🛡️ Lancer ta défense →','primary', aiDefenseStep));
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
      if (acts.length===0) { const s=document.createElement('span'); s.className='rolls'; s.textContent='Rien à jouer (tu peux vendre des cartes ci-dessous, +1 CP chacune).'; c.appendChild(s); }
      else acts.slice(0,8).forEach(a=>c.appendChild(btn(mainLabel(a),'', ()=>applyMain(a))));
      c.appendChild(phase==='main1' ? btn('Passer aux dés →','gold', toRoll) : btn('Terminer le tour →','gold', finishHumanTurn));
    } else if (phase==='roll') {
      if (attempts===0) { c.appendChild(btn('Lancer les dés','primary', doRoll)); }
      else {
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
      c.appendChild(btn('Choisir l\'habileté →','gold', toAbilityFromAlter));
    } else if (phase==='ability') {
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = cands.length ? 'Choisis une habileté à droite →' : 'Aucune habileté — tu rates ton attaque.';
      c.appendChild(s);
      // Grim Pursuit mode (b): pre-arm +1d6 dmg on the attack you're about to pick.
      const you = g.state.players[g.humanIdx];
      if (cands.length && you.tokens.grimPursuit>0 && !you.grimPursuitBonusUsedThisTurn) {
        const b = btn(`${gpBonusSel?'✅ ':''}Grim Pursuit : lance 5 dés, +1 dégât par Fer (1×/tour · −1 jeton)`, gpBonusSel?'primary':'', ()=>{ gpBonusSel=!gpBonusSel; renderControls(); });
        c.appendChild(b);
      }
      // Attack-modifier cards, armed the same toggle way (Cranial Assist! & co were unplayable
      // by the human before — the attack bridge always answered "none"; user-caught).
      if (cands.length) {
        const AM_LABEL = {
          'cranial-assist': `Cranial Assist! : +3 dégâts${g.state.players[g.aiIdx].tokens.head>0?' (l\'IA a la Tête ✔)':' (SANS effet : l\'IA n\'a pas la Tête)'} · 2 CP`,
          'unescapable': 'Unescapable! : attaque INDÉFENDABLE (−1 Grim Pursuit) · 1 CP',
          'subversion': 'Subversion! : +2 dégâts, +1/upgrade posée ce tour · 1 CP',
          'thundering-hooves': 'Thundering Hooves! : CP → Grim Pursuit (jusqu\'à 3) · 0 CP',
        };
        for (const id of G.humanAttackModifierOptions(g)) {
          c.appendChild(btn(`${amSel.has(id)?'✅ ':''}${AM_LABEL[id]||id}`, amSel.has(id)?'primary':'',
            ()=>{ amSel.has(id)?amSel.delete(id):amSel.add(id); renderControls(); }));
        }
      }
      if (!cands.length) c.appendChild(btn('Continuer','gold', ()=>toMain2()));
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
        if (o.kind==='rerollAll') return true;
        if (o.kind==='alterDie' || o.kind==='rerollDie') return sel.length===1 && o.dieIndex===sel[0];
        if (o.kind==='setDie') {
          if (o.sets.length===1) return sel.length===1 && o.sets[0].dieIndex===sel[0];
          return sel.length===2 && o.sets.every(s2=>sel.includes(s2.dieIndex)) && o.sets[0].value===o.sets[1].value;
        }
        return true; // cards, instants, token moves — always visible
      });
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
  function alterLabel(a){ return actionLabel(a); }
  function mainLabel(a){ return actionLabel(a); }

  // (Vegas Baby! turned out to be wired engine-side as a code special-case — the earlier
  // "unwired" filter was wrong and blocked a working card. All 45 cards are playable.)
  function usableOptions(opts){ return opts; }

  // Effect summary for an ability, built from the verified hero data (resolvedAbilityByBoardName
  // applies the II-upgrade numbers when in play) — "6 dmg" alone hid the token/draw riders
  // (reported: Reap didn't mention +2 Dreadful/draw, The Reaper didn't mention draw 1).
  function abilityEffects(boardName){
    const self = g.state.players[g.humanIdx];
    const a = G.resolvedAbilityByBoardName(G.heroTemplateFor(HUMAN), boardName, self.upgradesInPlay);
    if (!a) return '';
    const out = [];
    const tokenFr = { dreadful:'Dreadful', grimPursuit:'Grim Pursuit', agility:'Agility', covertOps:'Covert Ops', timeBomb:'Time Bomb' };
    for (const [k,n] of Object.entries(a.tokensGrantedToSelf||{})) if (n) out.push(`+${n} ${tokenFr[k]||k}`);
    for (const [k,n] of Object.entries(a.tokensInflictedOnOpponent||{})) if (n) out.push(`inflige ${n} ${tokenFr[k]||k}`);
    if (a.cpGain) out.push(`+${a.cpGain} CP`);
    if (a.cardDraw) out.push(`pioche ${a.cardDraw}`);
    if (a.cardDrawIfHasHead) out.push('pioche 1 (si Tête)');
    if (a.tokensGrantedIfHasHead) for (const [k,n] of Object.entries(a.tokensGrantedIfHasHead)) if (n) out.push(`+${n} ${tokenFr[k]||k} (si Tête)`);
    if (a.bonusRoll) out.push('jet bonus');
    if (a.numberMatchBonus) out.push(`+${Object.values(a.numberMatchBonus.tokensGranted)[0]||1} Dreadful (carré de #)`);
    if (a.searchUpgradesIntoPlay) out.push(`pose ${a.searchUpgradesIntoPlay} upgrade(s) du deck`);
    if (a.advancesAllTimeBombsInPlay) out.push('avance les Time Bombs');
    return out.join(' · ');
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
      else if (id==='samesies'){ const mx=Math.max(...vals); vals.forEach((v,i)=>{ if(v!==mx) out.push({cardId:id, dieIndices:[i], values:[mx]}); }); }
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
    const r = G.humanPlayRollCard(g, ch, dice.map(d=>d.v));
    dice = r.dice.map((v,i)=>({v, kept: dice[i] ? dice[i].kept : false}));
    if (r.extraRollsGranted) rollsLeft += r.extraRollsGranted;
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
    log(`Tu joues <b>${mainLabel(a)}</b>.`); G.humanApplyMain(g,a,mainPhaseNow()); renderAll(); }
  function toRoll(){ phase='roll'; dice=[]; attempts=0; rollsLeft=2; tbShow=null; renderAll(); }
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
    altSel.clear();
    const acts=G.offensiveAlterOptions(g).filter(o=>o.kind!=='pass');
    if(!acts.length){ dice=G.endOffensiveAlter(g).map(v=>({v,kept:false})); phase='ability'; } else phase='alter';
    renderAll(); }
  function applyAlter(a){ log(`Tu joues <b>${alterLabel(a)}</b>.`); dice=G.applyOffensiveAlter(g,a).map(v=>({v,kept:false})); renderAll(); }
  function toAbilityFromAlter(){ altSel.clear(); dice=G.endOffensiveAlter(g).map(v=>({v,kept:false})); phase='ability'; renderAll(); }
  function toMain2(){ phase='main2'; renderAll(); }
  function doRoll(){
    if (attempts===0){ const vals=G.rollOffense(g,null,[]); dice=vals.map(v=>({v,kept:false})); attempts=1; }
    else {
      if(rollsLeft<=0) return;
      try { // coach: compare your keep against the EXACT DP optimum before rerolling
        const adv = G.humanKeepAdvice(g, dice.map(d=>d.v), rollsLeft);
        const mine = dice.filter(d=>d.kept).map(d=>d.v).sort().join(',');
        const dp = adv.kept.slice().sort().join(',');
        if (mine !== dp) coachNote('relance', `gardé [${mine||'rien'}]`, `garder [${dp||'rien'}] (EV ${adv.ev.toFixed(1)})`);
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
    renderDice(true); renderControls(); renderMatch(); renderAbilities();
  }
  function chooseAbility(name){
    try { // coach: which ability would the network have activated on these dice?
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      if (cands.length > 1) coachNote('habileté', name, coach.chooseAbility(g.state, g.humanIdx, cands));
    } catch (e) {}
    log(`Tu attaques avec <b>${name}</b>${gpBonusSel?' (+ dé Grim Pursuit)':''}${amSel.size?` + ${[...amSel].join(' + ')}`:''}.`);
    const hpYou = g.state.players[g.humanIdx].hp, hpAi = g.state.players[g.aiIdx].hp;
    const cand = G.matchedAbilities(g, dice.map(d=>d.v)).find(x=>x.name===name);
    const base = (cand && cand.baseDamage) || 0;
    const logFrom = g.state.log.length;
    G.humanAttack(g, dice.map(d=>d.v), name, gpBonusSel, [...amSel]);
    gpBonusSel = false; amSel.clear();
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
    $('turntag').textContent = 'L\'IA (Black Widow) joue…';
    setTimeout(aiTurn, 550);
  }
  // The AI's turn, decomposed so YOU defend interactively when it attacks (see interactive.ts).
  function aiTurn(){
    const r = G.runAiTurnUpToAttack(g);
    if (g.state.gameOver) { renderAll(); return end(); }
    if (r.done) { renderAll(); return startHumanTurn(); } // AI's turn ended before any attack
    pendingAttackInfo = r.attack;
    // Show the AI's actual dice (g.def.finalDice — set by runAiTurnUpToAttack) so its attack
    // is something you SEE, not a one-line log flash.
    aiDice = (g.def && g.def.finalDice) ? g.def.finalDice.slice() : null;
    if (r.attack.abilityName === null) log(`L'IA rate son attaque (aucune habileté formée).`);
    else log(`⚔️ L'IA t'attaque avec <b>${formatAbility(aiHero, r.attack.abilityName).name}</b>` +
      (r.attack.defendable ? ` (${r.attack.incomingDamage} de base, hors riders/bonus).` : ` — <b>indéfendable</b>.`));
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
    $('turntag').textContent = 'L\'IA (Black Widow) termine son tour…';
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
      case 'rerollAll':return `${cn(a.cardId)} : relance TOUS tes dés de défense${cp(a.cardId)}`;
      case 'moveHead': return `Rolling Pumpkin! : Tête Hantée ${a.toIdx===g.humanIdx?'vers TOI':'vers l\'IA'}`;
      case 'spendGrimPursuitBonus': return 'Grim Pursuit : lance 5 dés, +1 dégât par Fer';
      // Token-manipulation cards enumerate one option PER TARGET — without saying who, they
      // look like duplicates and you can nuke YOUR OWN tokens by accident (reported bug).
      case 'transferToken': return `Transference! : ${a.tokenKind} ${a.fromIdx===g.humanIdx?'⚠️ de TOI vers l\'IA':'de l\'IA vers TOI'}`;
      case 'removeToken': return `Get That Outta Here! : retire 1 ${a.tokenKind} ${a.targetIdx===g.humanIdx?'⚠️ à TOI':'à l\'IA'}`;
      case 'removeAllTokens': return `What Status Effects? : retire TOUS les jetons ${a.targetIdx===g.humanIdx?'⚠️ de TOI':'de l\'IA'}`;
      case 'covertOpsUpgrade': return `Covert Ops : poser ${cn(a.cardId)} GRATUITEMENT`;
      default: return a.kind;
    }
  }
  function defenseLabel(a){ return actionLabel(a); }
  function startHumanTurn(){
    lastDefDice = null;
    const you = g.state.players[g.humanIdx];
    // Click-to-roll pacing: if you carry Time Bombs, YOU press the button that rolls them
    // (they resolve inside beginHumanTurn) instead of it happening invisibly.
    if (you.timeBombs.length > 0 && !tbArmed) {
      phase='tbroll'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll(); return;
    }
    // HH Upkeep = Headless Mayhem: Terrorize (needs >=4 Dreadful) OR move the Haunted Head OR
    // nothing. Offer the prompt whenever ANY real choice exists.
    const canGiveHead = you.heroId==='hh' && you.tokens.head > 0;
    if (G.humanCanTerrorize(g) || canGiveHead) {
      phase='upkeep'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll();
    }
    else doBeginTurn(undefined);
  }
  function doBeginTurn(mayhem){
    if (mayhem !== undefined) {
      try { coachNote('upkeep', mayhem, coach.chooseHeadlessMayhem(g.state, g.humanIdx, G.humanCanTerrorize(g))); } catch (e) {}
    }
    const logBefore = g.state.log.length;
    G.beginHumanTurn(g, mayhem);
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
    phase='main1'; dice=[]; attempts=0; rollsLeft=2; gpBonusSel=false; amSel.clear(); tbArmed=false;
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
    const disagreements = replayLog.filter(r=>!r.agree);
    log(`<b style="font-size:1.08em">📋 ANALYSE DE PARTIE — ${replayLog.length} décision(s) évaluée(s) par l'IA, `+
        `${disagreements.length} désaccord(s)${disagreements.length?' (du plus récent au plus ancien) :':'. Vos lignes concordent.'}</b>`);
    for (const r of disagreements)
      log(`T${r.t} [${r.kind}] — toi : <b>${r.you}</b> · l'IA aurait joué : <b style="color:#ef6b2b">${r.coach}</b>`);
    // Auto-save to localStorage (last 20 games) + download button.
    const gameRecord = {
      date: new Date().toISOString(), result: msg, turns: g.state.turnNumber,
      humanHero: HUMAN, aiHero: AI_HERO, humanFirst: g.humanIdx === 0,
      decisions: replayLog, engineLog: g.state.log,
      finalHp: [g.state.players[0].hp, g.state.players[1].hp],
    };
    try {
      const all = JSON.parse(localStorage.getItem('dt_games') || '[]');
      all.push(gameRecord);
      localStorage.setItem('dt_games', JSON.stringify(all.slice(-20)));
      log(`💾 Partie sauvegardée (${all.length > 20 ? 20 : all.length} en mémoire locale).`);
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
    if ((m = msg.match(/^(.+?) bonus roll: \+(\d+) (?:dmg|dégâts), undefendable=(\w+), \+(\d+) Grim Pursuit/)))
      return `<b>${m[1].replace(/\s*\([A-C]+\)$/,'')}</b> — jet bonus : +${m[2]} dégâts${m[3]==='true'?' · devient <b>indéfendable</b>':''}${+m[4]?` · +${m[4]} Grim Pursuit`:''}`;
    if ((m = msg.match(/^Time Bomb upkeep: (?:rolls \[([\d,]+)\], )?(\d+) self-dmg(?:, (\d+) defused)?/)))
      return `💣 Time Bomb à l'Upkeep${m[1]?` — jet ${m[1]}`:''} : ${m[2]} dégât(s)${m[3]&&+m[3]?` · ${m[3]} désamorcée(s)`:''}`;
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
      if (t !== null) addLog(`<span class="t">T${e.turn}·${isHuman?'Toi':'IA'}</span>${t}`);
    }
    lastLogLen = L.length;
  }
  function addLog(html){ const l=document.createElement('div'); l.className='l'; l.innerHTML=html; logBox.prepend(l); }
  function log(html){ addLog(`<span class="t">→</span>${html}`); }

  function renderAll(){ renderFighters(); renderDice(false); renderControls(); renderMatch(); renderAbilities(); renderHand(); drainEngineLog(); }

  // Upgraded ("II") display numbers for the side panel — the verified card values, so the board
  // stops showing base damage once the II upgrade is in play (user-reported on Reap II).
  const REF_II_DMG = {
    'Cleave':'5–8','Ride Down':'6 ·+3 Grim','Reap':'4 ·+Dread','Sow Despair':'7–10',
    'Horrify':'6 ·+3D+2G','Spectral Assault':'9 +jet',
    'Baton Strike':'6–8',"Widow's Gauntlets":'7 ·+CP','Hacked':'6 ·+Bomb','Grapple':'7 indéf.',
  };
  // Which upgrade card marks each base ability as "II" on the side panel.
  const REF_UPGRADE = {
    'Cleave':'cleave-ii','Ride Down':'ride-down-ii','Reap':'reap-ii','Sow Despair':'sow-despair-ii',
    'Horrify':'horrify-ii','Spectral Assault':'spectral-assault-ii',
    'Baton Strike':'baton-strike-ii',"Widow's Gauntlets":'widows-gauntlets-ii','Hacked':'hacked-ii',
    'Grapple':'grapple-ii','Vengeance':'vengeance-ii','Infiltrate':'infiltrate-ii',
  };
  // Static ability reference (dice pattern -> name/dmg) for the side panel when not choosing.
  const REFERENCE = {
    hh:[ {name:'Cleave',req:'AAA',dmg:'4–7'},{name:'Ride Down',req:'AAABB',dmg:'6 ·+Grim'},
      {name:'Reap',req:'BBBC',dmg:'3 ·+Dread'},{name:'Sow Despair',req:'suite 4',dmg:'7–9'},
      {name:'Horrify',req:'CCCC',dmg:'6 ·+3 Dread'},{name:'Spectral Assault',req:'AAACC',dmg:'8 +jet'},
      {name:'Dreadful Charge',req:'CCCCC',dmg:'14 · ULT'} ],
    bw:[ {name:'Baton Strike',req:'BBB',dmg:'5–7'},{name:'Infiltrate',req:'AABC',dmg:'+Bomb'},
      {name:'Widow\'s Gauntlets',req:'BBBAA',dmg:'6 ·+CP'},{name:'Hacked',req:'suite 4',dmg:'5 ·+Bomb'},
      {name:'Grapple',req:'CCCC',dmg:'6 indéf.'},{name:'Vengeance',req:'suite 5',dmg:'7 +jet'},
      {name:'Widow\'s Bite',req:'CCCCC',dmg:'10 · ULT'} ],
  };

  // ---------- boot ----------
  $('title').innerHTML = `${humanHero.name} <span class="vs">contre</span> ${aiHero.name}`;
  // Tell the truth about which opponent is driving (learned net vs scripted fallback).
  const usingNet = !!window.AI_WEIGHTS && ai !== G.greedyHighestDamagePolicy;
  const aiNote = document.getElementById('ai-note');
  if (aiNote) aiNote.textContent = usingNet
    ? 'Adversaire : réseau entraîné par self-play.'
    : 'Adversaire : IA scriptée (poids entraînés introuvables — ai-weights.js manquant/incompatible).';
  if (g.humanIdx === 0) {
    addLog('<span class="t">Départ</span>Tu commences la partie.');
    startHumanTurn();
  } else {
    addLog('<span class="t">Départ</span>L\'IA commence — tu joues second (Cavalier : +1 Dreadful).');
    $('turntag').textContent = 'L\'IA (Black Widow) commence…';
    renderFighters();
    setTimeout(aiTurn, 500);
  }
})();
