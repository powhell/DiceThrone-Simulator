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
    hh: { name:'Cavalier Sans Tête', crest:'HH', cls:v=>v<=3?'A':v<=5?'B':'C',
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
    $(elId).className = 'fighter ' + (isHuman ? 'you' : 'ai') + activeCls;
    $(elId).innerHTML =
      `<div class="crest">${def.crest}</div>
       <div class="who"><div class="name">${def.name}<small>${isHuman ? 'toi' : 'IA'}</small></div>
         <div class="hpbar"><i style="width:${pct}%"></i><span>${Math.max(0,p.hp)} / 50</span></div></div>
       <div class="tokens">${tokenChips(p, isHuman)}</div>`;
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
    if (phase==='defense' && pendingDefense && pendingDefense.defenseDice) {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">🛡️ TON JET DE DÉFENSE — tu peux le modifier :</div>` +
        pendingDefense.defenseDice.map((v,i)=>dieHTML(humanHero, {v,kept:false}, i, false)).join('');
      return;
    }
    if (aiDice) {
      $('tray').innerHTML =
        `<div class="empty" style="width:100%">L'IA a lancé :</div>` +
        aiDice.map((v,i)=>dieHTML(aiHero, {v,kept:false}, i, false)).join('');
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
      box.innerHTML = cands.map(c=>{ const f=formatAbility(humanHero,c.name); return `<button class="abil pick" data-name="${c.name.replace(/"/g,'&quot;')}">
        <div><div class="an">${f.name}</div><div class="req">${f.req} ${c.defendable?'· défendable':'· indéfendable'}</div></div>
        <div class="dv">${c.baseDamage!=null?c.baseDamage+' dmg':'—'}</div></button>`; }).join('');
      box.querySelectorAll('.abil.pick').forEach(el=>el.onclick=()=>chooseAbility(el.dataset.name));
    } else {
      $('board-title').textContent = 'Habiletés — ' + humanHero.name;
      const cands = ((phase==='roll' && attempts>0) || phase==='alter') ? G.matchedAbilities(g, dice.map(d=>d.v)) : [];
      const isOn = name => cands.some(c=>c.name===name || c.name.startsWith(name+' '));
      const board = REFERENCE[HUMAN];
      box.innerHTML = board.map(a=>`<div class="abil${isOn(a.name)?' on':''}">
        <div><div class="an">${a.name}</div><div class="req">${renderReq(humanHero,a.req)}</div></div><div class="dv">${a.dmg}</div></div>`).join('');
    }
  }

  function renderHand() {
    const p = g.state.players[g.humanIdx];
    const hero = G.heroTemplateFor(HUMAN);
    const inMain = (phase==='main1' || phase==='main2');
    const playable = new Set(inMain
      ? usableOptions(G.humanMainOptions(g, phase)).filter(o=>o.kind==='playCard'||o.kind==='playInstant').map(o=>o.cardId) : []);
    if (!p.hand.length) { $('hand').innerHTML='<div class="empty">Main vide.</div>'; return; }
    $('hand').innerHTML = p.hand.map(id=>{
      const c = G.cardById(hero, id) || {name:id, cpCost:0, kind:'', text:''};
      const canPlay = playable.has(id);
      return `<div class="card${canPlay?' playable':''}" data-id="${id}" ${canPlay?'role="button" tabindex="0"':''}>
        <div class="ctop"><div class="cname">${c.name||id}</div><div class="cost">${c.cpCost!=null?c.cpCost:'·'}</div></div>
        <div class="ctype">${labelKind(c)}</div><div class="ctext">${c.text||''}</div></div>`;
    }).join('');
    if (inMain) $('hand').querySelectorAll('.card.playable').forEach(el=>{
      el.onclick = ()=>playMainCard(el.dataset.id);
      el.onkeydown = e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); playMainCard(el.dataset.id); } };
    });
  }
  function labelKind(c){ return (c.kind==='upgrade'?'Amélioration':c.actionTiming==='instant'?'Instant':c.actionTiming==='mainPhase'?'Main Phase':c.actionTiming==='rollPhase'?'Roll Phase':(c.kind||'')); }

  // ---------- controls per phase ----------
  function btn(label, cls, on, disabled){ const b=document.createElement('button'); b.className='btn'+(cls?' '+cls:'');
    b.textContent=label; if(disabled) b.disabled=true; else b.onclick=on; return b; }
  function renderControls() {
    const c = $('controls'); c.innerHTML='';
    // While it's the AI's turn (except the defense window, which IS yours to act in), never show
    // your action buttons — otherwise a stale Main-Phase panel could be clicked during the AI's turn.
    if (phase!=='defense' && phase!=='over' && g.state.activePlayerIdx !== g.humanIdx) {
      const s=document.createElement('span'); s.className='rolls'; s.textContent='L\'IA joue son tour…'; c.appendChild(s); return;
    }
    if (phase==='upkeep') {
      const canTz = G.humanCanTerrorize(g);
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = 'Upkeep — Headless Mayhem, choisis :'; c.appendChild(s);
      if (canTz) c.appendChild(btn('Terrorize (−4 Dreadful → 3 dégâts sûrs, reprends la Tête, +1 Grim, +1 CP)','primary', ()=>doBeginTurn('terrorize')));
      // Only offer "give the Head" when you actually HOLD it — otherwise the click is a silent no-op.
      if (g.state.players[g.humanIdx].tokens.head > 0)
        c.appendChild(btn('Donner la Tête à l\'IA (+1 Dreadful à chaque fin de ton tour)','', ()=>doBeginTurn('giveHead')));
      c.appendChild(btn('Ne rien faire','gold', ()=>doBeginTurn('none')));
    } else if (phase==='main1' || phase==='main2') {
      const acts = usableOptions(G.humanMainOptions(g, phase)).filter(o=>o.kind!=='pass');
      if (acts.length===0) { const s=document.createElement('span'); s.className='rolls'; s.textContent='Rien à jouer.'; c.appendChild(s); }
      else acts.slice(0,8).forEach(a=>c.appendChild(btn(mainLabel(a),'', ()=>applyMain(a))));
      c.appendChild(phase==='main1' ? btn('Passer aux dés →','gold', toRoll) : btn('Terminer le tour →','gold', finishHumanTurn));
    } else if (phase==='roll') {
      if (attempts===0) { c.appendChild(btn('Lancer les dés','primary', doRoll)); }
      else {
        c.appendChild(btn(rollsLeft>0?'Relancer les non-gardés':'Plus de relance','', doRoll, rollsLeft<=0));
        const s=document.createElement('span'); s.className='rolls'; s.textContent=`Relances : ${rollsLeft} · clic un dé pour le garder`; c.appendChild(s);
        c.appendChild(btn('Continuer →','gold', toAlter));
      }
    } else if (phase==='alter') {
      const acts = usableOptions(G.offensiveAlterOptions(g)).filter(o=>o.kind!=='pass');
      if (acts.length===0) { const s=document.createElement('span'); s.className='rolls'; s.textContent='Aucune carte de manipulation en main.'; c.appendChild(s); }
      else acts.slice(0,8).forEach(a=>c.appendChild(btn(alterLabel(a),'', ()=>applyAlter(a))));
      c.appendChild(btn('Choisir l\'habileté →','gold', toAbilityFromAlter));
    } else if (phase==='ability') {
      const cands = G.matchedAbilities(g, dice.map(d=>d.v));
      const s=document.createElement('span'); s.className='rolls';
      s.textContent = cands.length ? 'Choisis une habileté à droite →' : 'Aucune habileté — tu rates ton attaque.';
      c.appendChild(s);
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
      pendingDefense.options.filter(o=>o.kind!=='pass').slice(0,8)
        .forEach(o=>c.appendChild(btn(defenseLabel(o),'primary', ()=>onDefenseChoice(o))));
      c.appendChild(btn(isRollWindow?'Garder ce jet →':'Encaisser (ne rien jouer) →','gold', ()=>onDefenseChoice({kind:'pass'})));
    }
  }
  function alterLabel(a){ return actionLabel(a); }
  function mainLabel(a){ return actionLabel(a); }

  // Cards whose engine effect is not wired yet (effect: null in the data) — clicking them
  // would "play" for CP with zero game impact, which reads as a broken game. Never offer them.
  const UNWIRED_CARD_IDS = new Set(['vegas-baby']);
  function usableOptions(opts){
    return opts.filter(o=>!((o.kind==='playCard'||o.kind==='playInstant') && UNWIRED_CARD_IDS.has(o.cardId)));
  }

  // ---------- actions ----------
  function mainPhaseNow(){ return phase==='main2' ? 'main2' : 'main1'; }
  function playMainCard(id){ const a=G.humanMainOptions(g,mainPhaseNow()).find(o=>(o.kind==='playCard'||o.kind==='playInstant')&&o.cardId===id); if(a) applyMain(a); }
  function applyMain(a){ log(`Tu joues <b>${mainLabel(a)}</b>.`); G.humanApplyMain(g,a,mainPhaseNow()); renderAll(); }
  function toRoll(){ phase='roll'; dice=[]; attempts=0; rollsLeft=2; renderAll(); }
  function toAlter(){ G.beginOffensiveAlter(g, dice.map(d=>d.v));
    const acts=G.offensiveAlterOptions(g).filter(o=>o.kind!=='pass');
    if(!acts.length){ dice=G.endOffensiveAlter(g).map(v=>({v,kept:false})); phase='ability'; } else phase='alter';
    renderAll(); }
  function applyAlter(a){ log(`Tu joues <b>${alterLabel(a)}</b>.`); dice=G.applyOffensiveAlter(g,a).map(v=>({v,kept:false})); renderAll(); }
  function toAbilityFromAlter(){ dice=G.endOffensiveAlter(g).map(v=>({v,kept:false})); phase='ability'; renderAll(); }
  function toMain2(){ phase='main2'; renderAll(); }
  function doRoll(){
    if (attempts===0){ const vals=G.rollOffense(g,null,[]); dice=vals.map(v=>({v,kept:false})); attempts=1; }
    else {
      if(rollsLeft<=0) return;
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
    log(`Tu attaques avec <b>${name}</b>.`);
    G.humanAttack(g, dice.map(d=>d.v), name);
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
    renderAll();
    if (r.attack.abilityName === null) log(`L'IA rate son attaque (aucune habileté formée).`);
    else log(`⚔️ L'IA t'attaque avec <b>${formatAbility(aiHero, r.attack.abilityName).name}</b>` +
      (r.attack.defendable ? ` (~${r.attack.incomingDamage} dégâts).` : ` — <b>indéfendable</b>.`));
    setTimeout(aiDefenseStep, 600); // let the dice be seen before the defense prompt appears
  }
  // Probe the next defense decision; if none, resolve the attack for real and finish the AI's turn.
  function aiDefenseStep(){
    const prompt = G.nextDefenseDecision(g);
    if (!prompt) { pendingDefense = null; return resolveAiAttackAndFinish(); }
    pendingDefense = prompt;
    phase = 'defense';
    $('turntag').textContent = 'Défense — l\'IA t\'attaque';
    renderAll();
  }
  function onDefenseChoice(action){
    // Even a pass goes through the script + re-probe: passing the ROLL window must still let
    // the CARDS window come up next (the old "pass = resolve everything now" shortcut silently
    // skipped every later defense window).
    if (action.kind !== 'pass') log(`🛡️ Défense : tu joues <b>${defenseLabel(action)}</b>.`);
    G.chooseDefense(g, action);
    aiDefenseStep();
  }
  function resolveAiAttackAndFinish(){
    G.resolveAiAttack(g);
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
      case 'spendGrimPursuitBonus': return 'Grim Pursuit : +1d6 dégâts';
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
    // HH Upkeep = Headless Mayhem: Terrorize (needs >=4 Dreadful) OR move the Haunted Head OR
    // nothing. The old gate only opened the prompt when Terrorize was available — which made
    // "give the Head" impossible most turns (reported bug). Offer the prompt whenever ANY real
    // choice exists: Terrorize eligible, or you hold your own Head (so you can send it).
    const you = g.state.players[g.humanIdx];
    const canGiveHead = you.heroId==='hh' && you.tokens.head > 0;
    if (G.humanCanTerrorize(g) || canGiveHead) {
      phase='upkeep'; $('turntag').textContent = `Ton Upkeep · tour ${g.state.turnNumber+1}`; renderAll();
    }
    else doBeginTurn(undefined);
  }
  function doBeginTurn(mayhem){
    const logBefore = g.state.log.length;
    G.beginHumanTurn(g, mayhem);
    aiDice = null;
    // Your upkeep Time Bomb roll happens inside beginHumanTurn — surface it loudly instead of
    // letting it drown in the journal (reported: "je ne vois pas quand je roule pour la bombe").
    for (let i=logBefore; i<g.state.log.length; i++) {
      const m = g.state.log[i].message.match(/^Time Bomb upkeep: (\d+) self-dmg(?:, (\d+) defused)?/);
      if (m) {
        const dmg = +m[1], defused = +(m[2]||0);
        log(`<b style="font-size:1.05em">💣 TIME BOMB — ${dmg>0?`elle explose : tu prends ${dmg} dégâts !`:defused>0?`désamorcée (tu as fait 6) !`:`elle avance d'un cran…`}</b>`);
      }
    }
    if (g.state.gameOver) { renderAll(); return end(); }
    phase='main1'; dice=[]; attempts=0; rollsLeft=2;
    $('turntag').textContent = `Ton tour · tour ${g.state.turnNumber}`;
    renderAll();
  }

  function end(){
    phase='over';
    aiDice = null; pendingDefense = null; // a late renderAll must never repaint dice over the banner
    const w = g.state.winner;
    const msg = w===g.humanIdx ? '🏆 Victoire !' : w===null ? '⚔️ Match nul (double KO)' : '☠️ Défaite';
    $('controls').innerHTML=''; $('tray').innerHTML='';
    const b=document.createElement('div'); b.className='banner'; b.textContent=msg + ` — au tour ${g.state.turnNumber}`;
    $('tray').replaceWith(b); b.id='tray';
    $('turntag').textContent='Partie terminée';
    renderFighters();
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
    if ((m = msg.match(/^Dice after alteration: ([\d,\s]+)$/)))
      return `Dés après altération : <b>${m[1]}</b>`;
    if ((m = msg.match(/^(.+?): set dice ([\d,]+)->([\d,]+)/)))
      return `<b>${m[1]}</b> : change les dés ${m[2]} → <b>${m[3]}</b>`;
    if ((m = msg.match(/^(.+?) bonus roll: \+(\d+) (?:dmg|dégâts), undefendable=(\w+), \+(\d+) Grim Pursuit/)))
      return `<b>${m[1].replace(/\s*\([A-C]+\)$/,'')}</b> — jet bonus : +${m[2]} dégâts${m[3]==='true'?' · devient <b>indéfendable</b>':''}${+m[4]?` · +${m[4]} Grim Pursuit`:''}`;
    if ((m = msg.match(/^Time Bomb upkeep: (\d+) self-dmg(?:, (\d+) defused)?/)))
      return `💣 Time Bomb à l'Upkeep : ${m[1]} dégât(s)${m[2]&&+m[2]?` · ${m[2]} désamorcée(s)`:''}`;
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
