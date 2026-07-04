"use strict";
var Game = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/sim/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    MAX_TURNS: () => MAX_TURNS,
    TRANSFERABLE_TOKENS: () => TRANSFERABLE_TOKENS,
    abilityByBoardName: () => abilityByBoardName,
    applyAttackModifierCard: () => applyAttackModifierCard,
    applyOffensiveAlter: () => applyOffensiveAlter,
    applyWindowAction: () => applyWindowAction,
    beginHumanTurn: () => beginHumanTurn,
    beginOffensiveAlter: () => beginOffensiveAlter,
    buildFullDeck: () => buildFullDeck,
    bwHero: () => bwHero,
    cardById: () => cardById,
    chooseDefense: () => chooseDefense,
    commonCards: () => commonCards,
    countToken: () => countToken,
    createInitialGameState: () => createInitialGameState,
    createInitialPlayer: () => createInitialPlayer,
    createNetwork: () => createNetwork,
    createValueGreedyPolicy: () => createValueGreedyPolicy,
    emptyBag: () => emptyBag,
    endHumanTurn: () => endHumanTurn,
    endOffensiveAlter: () => endOffensiveAlter,
    enumerateWindowActions: () => enumerateWindowActions,
    finalizeDefenseRoll: () => finalizeDefenseRoll,
    finalizePendingAttackDamage: () => finalizePendingAttackDamage,
    finishAiTurn: () => finishAiTurn,
    forward: () => forward,
    fromJSON: () => fromJSON,
    greedyHighestDamagePolicy: () => greedyHighestDamagePolicy,
    hasHead: () => hasHead,
    heroTemplateFor: () => heroTemplateFor,
    hhHero: () => hhHero,
    humanApplyMain: () => humanApplyMain,
    humanAttack: () => humanAttack,
    humanCanTerrorize: () => humanCanTerrorize,
    humanMainOptions: () => humanMainOptions,
    humanSpendGrimPursuitReroll: () => humanSpendGrimPursuitReroll,
    matchedAbilities: () => matchedAbilities,
    mulberry32: () => mulberry32,
    mulberry32Stateful: () => mulberry32Stateful,
    newHumanGame: () => newHumanGame,
    nextDefenseDecision: () => nextDefenseDecision,
    offensiveAlterOptions: () => offensiveAlterOptions,
    oracleStateFor: () => oracleStateFor,
    playCard: () => playCard,
    playDiscardPhase: () => playDiscardPhase,
    playTurn: () => playTurn,
    playUpkeepPhase: () => playUpkeepPhase,
    resolveAbilityPhase: () => resolveAbilityPhase,
    resolveAiAttack: () => resolveAiAttack,
    resolveDefense: () => resolveDefense,
    resolveMatchedAbilities: () => resolveMatchedAbilities,
    resolvedAbilityByBoardName: () => resolvedAbilityByBoardName,
    rollDice: () => rollDice,
    rollOffense: () => rollOffense,
    runAiTurn: () => runAiTurn,
    runAiTurnUpToAttack: () => runAiTurnUpToAttack,
    runMatch: () => runMatch,
    runOffensiveRoll: () => runOffensiveRoll,
    shuffle: () => shuffle,
    toJSON: () => toJSON
  });

  // src/sim/rng.ts
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mulberry32Stateful(seed) {
    const rng = function() {
      rng.state = rng.state + 1831565813 | 0;
      let t = Math.imul(rng.state ^ rng.state >>> 15, 1 | rng.state);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    rng.state = seed >>> 0;
    return rng;
  }
  function rollDie(rng) {
    return Math.floor(rng() * 6) + 1;
  }
  function rollDice(n, rng) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(rollDie(rng));
    return out;
  }
  function shuffle(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // src/sim/tokens.ts
  var TRANSFERABLE_TOKENS = ["dreadful", "grimPursuit", "agility", "timeBomb"];
  function countToken(p, kind) {
    return kind === "timeBomb" ? p.timeBombs.length : p.tokens[kind];
  }
  function emptyBag() {
    return { dreadful: 0, grimPursuit: 0, agility: 0, covertOps: 0, head: 0 };
  }
  function hasHead(p) {
    return p.tokens.head > 0;
  }

  // src/sim/decision.ts
  var MAX_WINDOW_ACTIONS = 100;
  function resolveResponseWindow(state, participants, ctx, rng, policies, enumerate, apply) {
    let passesInARow = 0;
    let turn = 0;
    let actionsTaken = 0;
    while (passesInARow < participants.length) {
      const p = participants[turn % participants.length];
      const options = enumerate(state, p, ctx);
      const action = options.length === 1 ? options[0] : policies[p].decide(state, p, { ctx, options });
      if (action.kind === "pass") {
        passesInARow += 1;
        turn += 1;
      } else {
        apply(state, p, action, ctx, rng);
        passesInARow = 0;
        turn = 0;
        if (++actionsTaken >= MAX_WINDOW_ACTIONS) break;
      }
    }
  }

  // src/core/dice.ts
  var OUTCOMES = [];
  for (let n = 0; n <= 5; n++) {
    if (n === 0) {
      OUTCOMES[n] = [[]];
      continue;
    }
    const cur = [];
    for (const sub of OUTCOMES[n - 1]) {
      for (let face = 1; face <= 6; face++) {
        cur.push([face, ...sub]);
      }
    }
    OUTCOMES[n] = cur;
  }
  function enumerateOutcomes(n) {
    return OUTCOMES[n];
  }

  // src/core/evaluator.ts
  var evMemo = /* @__PURE__ */ new Map();
  var distMemo = /* @__PURE__ */ new Map();
  function cacheKey(cfg, kept, rollsRemaining, state) {
    return `${cfg.id}|${kept.join(",")}|${rollsRemaining}|${cfg.stateKey(state)}`;
  }
  function evalState(cfg, kept, rollsRemaining, state) {
    if (rollsRemaining === 0) {
      if (kept.length !== 5) throw new Error(`evalState: need 5 dice at rolls=0, got ${kept.length}`);
      return cfg.bestAbilityValue(kept, state);
    }
    const key = cacheKey(cfg, kept, rollsRemaining, state);
    const cached = evMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = 5 - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    let totalEv = 0;
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      totalEv += prob * _bestKeepEv(cfg, full, rollsRemaining - 1, state);
    }
    evMemo.set(key, totalEv);
    return totalEv;
  }
  function _bestKeepEv(cfg, full, rollsRemaining, state) {
    if (rollsRemaining === 0) return evalState(cfg, full, 0, state);
    let best = -Infinity;
    for (let mask = 0; mask < 32; mask++) {
      const kept = [];
      for (let i = 0; i < 5; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(cfg, kept, rollsRemaining, state);
      if (ev > best) best = ev;
    }
    return best;
  }
  function _optimalKeep(cfg, full, rollsRemaining, state) {
    if (rollsRemaining === 0) return full;
    let bestEv = -Infinity;
    let bestKept = full;
    for (let mask = 0; mask < 32; mask++) {
      const kept = [];
      for (let i = 0; i < 5; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(cfg, kept, rollsRemaining, state);
      if (ev > bestEv) {
        bestEv = ev;
        bestKept = kept;
      }
    }
    return bestKept;
  }
  function _abilityDist(cfg, kept, rollsRemaining, state) {
    if (rollsRemaining === 0) {
      if (kept.length !== 5) throw new Error("Need 5 dice at rolls=0");
      return { [cfg.bestAbilityName(kept, state)]: 1 };
    }
    const key = cacheKey(cfg, kept, rollsRemaining, state);
    const cached = distMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = 5 - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    const dist = {};
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      const bestKept = _optimalKeep(cfg, full, rollsRemaining - 1, state);
      const sub = _abilityDist(cfg, bestKept, rollsRemaining - 1, state);
      for (const [name, p] of Object.entries(sub)) {
        dist[name] = (dist[name] ?? 0) + prob * p;
      }
    }
    distMemo.set(key, dist);
    return dist;
  }
  function calculateOptimalKeep(cfg, dice, rollsRemaining, state) {
    const sorted = [...dice].sort((a, b) => a - b);
    const currentEv = cfg.bestAbilityValue(sorted, state);
    const directMap = cfg.directDamageByName?.(state) ?? null;
    const annotateDirect = (opt) => {
      if (!directMap) return opt;
      let max = 0;
      for (const [name, p] of Object.entries(opt.probDist)) {
        if (p <= 0) continue;
        const d = directMap[name] ?? 0;
        if (d > max) max = d;
      }
      opt.directDamage = max;
      return opt;
    };
    if (rollsRemaining === 0) {
      const dist = _abilityDist(cfg, sorted, 0, state);
      return {
        currentEv,
        topOptions: [annotateDirect({
          kept: sorted,
          ev: currentEv,
          probDist: _distToPercent(dist)
        })],
        abilities: cfg.buildAbilityBoard(sorted, state)
      };
    }
    const seenKeys = /* @__PURE__ */ new Set();
    const options = [];
    for (let mask = 0; mask < 32; mask++) {
      const kept = [];
      for (let i = 0; i < 5; i++) {
        if (mask & 1 << i) kept.push(sorted[i]);
      }
      kept.sort((a, b) => a - b);
      const kKey = kept.join(",");
      if (seenKeys.has(kKey)) continue;
      seenKeys.add(kKey);
      const ev = evalState(cfg, kept, rollsRemaining, state);
      const dist = _abilityDist(cfg, kept, rollsRemaining, state);
      options.push(annotateDirect({ kept, ev, probDist: _distToPercent(dist) }));
    }
    options.sort((a, b) => b.ev - a.ev);
    let topOptions = options.slice(0, 5);
    if (cfg.hasMatchedAbility(sorted, state) && rollsRemaining > 0) {
      const keepAllKey = sorted.join(",");
      const existing = topOptions.find((o) => o.kept.join(",") === keepAllKey);
      if (existing) {
        existing.isGuaranteed = true;
      } else {
        const keepAllOpt = options.find((o) => o.kept.join(",") === keepAllKey);
        keepAllOpt.isGuaranteed = true;
        topOptions = [...topOptions, keepAllOpt];
      }
    }
    return {
      currentEv,
      topOptions,
      abilities: cfg.buildAbilityBoard(sorted, state)
    };
  }
  function _distToPercent(dist) {
    const out = {};
    for (const [name, p] of Object.entries(dist)) {
      out[name] = Math.round(p * 1e4) / 100;
    }
    return out;
  }

  // src/characters/horseman/constants.ts
  var GRIM_PURSUIT_AVG_DMG = 1.66;
  var CARD_DRAW_VALUE = 2;
  var SPECTRAL_ASSAULT_BASE = 8;
  var SPECTRAL_ASSAULT_BASE_UPGRADED = 9;
  var SPECTRAL_ASSAULT_PER_DREADFUL = 1.5;
  var DREADFUL_CHARGE_VALUE = 15;
  var DREADFUL_CHARGE_DREADFUL_GIVEN = 4;
  var CLEAVE_3A = 4;
  var CLEAVE_4A = 5;
  var CLEAVE_5A = 7;
  var CLEAVE_3A_UPGRADED = 5;
  var CLEAVE_4A_UPGRADED = 6;
  var CLEAVE_5A_UPGRADED = 8;
  var REAP_UNDEFENDABLE = 3;
  var REAP_UNDEFENDABLE_UPGRADED = 4;
  var REAP_DREADFUL_GIVEN = 2;
  var RIDE_DOWN_BASE = 6;
  var RIDE_DOWN_GRIM_PURSUIT = 2;
  var RIDE_DOWN_GRIM_PURSUIT_UPGRADED = 3;
  var SOW_SMALL_DMG = 7;
  var SOW_SMALL_DREADFUL = 1;
  var SOW_SMALL_DREADFUL_UPGRADED = 2;
  var SOW_LARGE_DMG = 9;
  var SOW_LARGE_DMG_UPGRADED = 10;
  var SOW_LARGE_DREADFUL = 2;
  var SOW_LARGE_DREADFUL_UPGRADED = 3;
  var HORRIFY_BASE_UNDEFENDABLE = 6;
  var HORRIFY_DREADFUL_GIVEN = 3;
  var HORRIFY_GRIM_PURSUIT_UPGRADED = 2;
  var WHIFF_PURSUIT_TOKENS = 1;
  var GHOSTLY_CHARGE_DMG = 2;
  var GHOSTLY_CHARGE_GRIM_PURSUIT = 2;
  var CURSED_GALLOP_DMG = 1;
  var CURSED_GALLOP_GRIM_PURSUIT = 1;
  var THE_REAPER_DMG = 4;
  var THE_REAPER_DREADFUL_GIVEN = 3;
  var HAUNTED_STRIKE_DMG = 4;
  var SPOOKY_DMG = 7;
  var SPOOKY_GRIM_PURSUIT = 2;

  // src/characters/horseman/dreadful.ts
  var MARGINAL_VALUE = [3, 3, 3, 5, 0.5];
  function dreadfulValueOfGaining(current, gained) {
    let total = 0;
    for (let i = 0; i < gained; i++) {
      const idx = current + i;
      if (idx >= MARGINAL_VALUE.length) break;
      total += MARGINAL_VALUE[idx];
    }
    return total;
  }

  // src/characters/horseman/abilities.ts
  function hhFaceToSymbol(face) {
    if (face <= 3) return "A";
    if (face <= 5) return "B";
    return "C";
  }
  function classify(dice) {
    const counts = { A: 0, B: 0, C: 0 };
    for (const face of dice) counts[hhFaceToSymbol(face)]++;
    return counts;
  }
  function hasStraight(dice, length) {
    const unique = new Set(dice);
    for (let start = 1; start <= 7 - length; start++) {
      let found = true;
      for (let i = 0; i < length; i++) {
        if (!unique.has(start + i)) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  }
  function getCandidates(dice, dreadful, hasHead2, upgradeIds = []) {
    const { A: a, B: b, C: c } = classify(dice);
    const out = [];
    const has = (id) => upgradeIds.includes(id);
    if (has("cleave-ii") && a >= 2 && b >= 1 && c >= 1) {
      const val = GHOSTLY_CHARGE_DMG + GHOSTLY_CHARGE_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
      out.push(["Ghostly Charge", val, GHOSTLY_CHARGE_DMG]);
    }
    if (has("ride-down-ii") && b >= 3) {
      const val = CURSED_GALLOP_DMG + CURSED_GALLOP_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
      out.push(["Cursed Gallop", val, CURSED_GALLOP_DMG]);
    }
    if (has("reap-ii") && b >= 3 && c >= 2) {
      const val = THE_REAPER_DMG + dreadfulValueOfGaining(dreadful, THE_REAPER_DREADFUL_GIVEN) + CARD_DRAW_VALUE;
      out.push(["The Reaper", val, THE_REAPER_DMG]);
    }
    if (has("spectral-assault-ii") && a >= 2 && c >= 2) {
      out.push(["Haunted Strike", HAUNTED_STRIKE_DMG, HAUNTED_STRIKE_DMG]);
    }
    if (has("horrify-ii") && c >= 3) {
      const val = SPOOKY_DMG + SPOOKY_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
      out.push(["Spooky", val, SPOOKY_DMG]);
    }
    if (c >= 5) {
      const base = DREADFUL_CHARGE_VALUE;
      out.push(["Dreadful Charge", base + dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN), base]);
    }
    if (c >= 4) {
      const base = HORRIFY_BASE_UNDEFENDABLE;
      const horrifyUpgraded = has("horrify-ii");
      let val = base + dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN);
      if (horrifyUpgraded) val += HORRIFY_GRIM_PURSUIT_UPGRADED * GRIM_PURSUIT_AVG_DMG;
      else if (hasHead2) val += GRIM_PURSUIT_AVG_DMG;
      out.push(["Horrify", val, base]);
    }
    if (a >= 3 && c >= 2) {
      const base = has("spectral-assault-ii") ? SPECTRAL_ASSAULT_BASE_UPGRADED : SPECTRAL_ASSAULT_BASE;
      const val = base + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL;
      out.push(["Spectral Assault", val, base]);
    }
    const cleaveUpgraded = has("cleave-ii");
    if (a >= 5) {
      const dmg = cleaveUpgraded ? CLEAVE_5A_UPGRADED : CLEAVE_5A;
      out.push(["Cleave 5A", dmg, dmg]);
    } else if (a === 4) {
      const dmg = cleaveUpgraded ? CLEAVE_4A_UPGRADED : CLEAVE_4A;
      out.push(["Cleave 4A", dmg, dmg]);
    } else if (a === 3) {
      const dmg = cleaveUpgraded ? CLEAVE_3A_UPGRADED : CLEAVE_3A;
      out.push(["Cleave 3A", dmg, dmg]);
    }
    if (a >= 3 && b >= 2) {
      const grimPursuit = has("ride-down-ii") ? RIDE_DOWN_GRIM_PURSUIT_UPGRADED : RIDE_DOWN_GRIM_PURSUIT;
      const val = RIDE_DOWN_BASE + grimPursuit * GRIM_PURSUIT_AVG_DMG;
      out.push(["Ride Down", val, RIDE_DOWN_BASE]);
    }
    if (b >= 3 && c >= 1) {
      const dmg = has("reap-ii") ? REAP_UNDEFENDABLE_UPGRADED : REAP_UNDEFENDABLE;
      let val = dmg + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN);
      if (hasHead2) val += CARD_DRAW_VALUE;
      out.push(["Reap", val, dmg]);
    }
    const sowUpgraded = has("sow-despair-ii");
    if (hasStraight(dice, 5)) {
      const dmg = sowUpgraded ? SOW_LARGE_DMG_UPGRADED : SOW_LARGE_DMG;
      const dreadfulGiven = sowUpgraded ? SOW_LARGE_DREADFUL_UPGRADED : SOW_LARGE_DREADFUL;
      const val = dmg + dreadfulValueOfGaining(dreadful, dreadfulGiven);
      out.push(["Sow Despair L", val, dmg]);
    }
    if (hasStraight(dice, 4)) {
      const dreadfulGiven = sowUpgraded ? SOW_SMALL_DREADFUL_UPGRADED : SOW_SMALL_DREADFUL;
      const val = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, dreadfulGiven);
      out.push(["Sow Despair S", val, SOW_SMALL_DMG]);
    }
    const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG;
    out.push(["Whiff", whiffVal, whiffVal]);
    return out;
  }
  function bestAbilityValue(dice, dreadful, hasHead2, upgradeIds = []) {
    return Math.max(...getCandidates(dice, dreadful, hasHead2, upgradeIds).map(([, v]) => v));
  }
  function bestAbilityName(dice, dreadful, hasHead2, upgradeIds = []) {
    const cands = getCandidates(dice, dreadful, hasHead2, upgradeIds);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard(dice, dreadful, hasHead2, upgradeIds = []) {
    const matchedSet = new Set(getCandidates(dice, dreadful, hasHead2, upgradeIds).map(([name]) => name));
    const has = (id) => upgradeIds.includes(id);
    const cleaveUpgraded = has("cleave-ii");
    const sowUpgraded = has("sow-despair-ii");
    const horrifyUpgraded = has("horrify-ii");
    const cleave5Dmg = cleaveUpgraded ? CLEAVE_5A_UPGRADED : CLEAVE_5A;
    const cleave4Dmg = cleaveUpgraded ? CLEAVE_4A_UPGRADED : CLEAVE_4A;
    const cleave3Dmg = cleaveUpgraded ? CLEAVE_3A_UPGRADED : CLEAVE_3A;
    const reapDmg = has("reap-ii") ? REAP_UNDEFENDABLE_UPGRADED : REAP_UNDEFENDABLE;
    const rideDownGrimPursuit = has("ride-down-ii") ? RIDE_DOWN_GRIM_PURSUIT_UPGRADED : RIDE_DOWN_GRIM_PURSUIT;
    const sowLDmg = sowUpgraded ? SOW_LARGE_DMG_UPGRADED : SOW_LARGE_DMG;
    const sowLDreadful = sowUpgraded ? SOW_LARGE_DREADFUL_UPGRADED : SOW_LARGE_DREADFUL;
    const sowSDreadful = sowUpgraded ? SOW_SMALL_DREADFUL_UPGRADED : SOW_SMALL_DREADFUL;
    const spectralAssaultBase = has("spectral-assault-ii") ? SPECTRAL_ASSAULT_BASE_UPGRADED : SPECTRAL_ASSAULT_BASE;
    const dc = dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN);
    const horrifyGain = dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN);
    let horrifyVal = HORRIFY_BASE_UNDEFENDABLE + horrifyGain;
    if (horrifyUpgraded) horrifyVal += HORRIFY_GRIM_PURSUIT_UPGRADED * GRIM_PURSUIT_AVG_DMG;
    else if (hasHead2) horrifyVal += GRIM_PURSUIT_AVG_DMG;
    let reapVal = reapDmg + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN);
    if (hasHead2) reapVal += CARD_DRAW_VALUE;
    const sowLVal = sowLDmg + dreadfulValueOfGaining(dreadful, sowLDreadful);
    const sowSVal = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, sowSDreadful);
    const rdVal = RIDE_DOWN_BASE + rideDownGrimPursuit * GRIM_PURSUIT_AVG_DMG;
    const saVal = spectralAssaultBase + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL;
    const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG;
    const ghostlyChargeVal = GHOSTLY_CHARGE_DMG + GHOSTLY_CHARGE_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
    const cursedGallopVal = CURSED_GALLOP_DMG + CURSED_GALLOP_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
    const theReaperVal = THE_REAPER_DMG + dreadfulValueOfGaining(dreadful, THE_REAPER_DREADFUL_GIVEN) + CARD_DRAW_VALUE;
    const spookyVal = SPOOKY_DMG + SPOOKY_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG;
    const entries = [
      { name: "Dreadful Charge (CCCCC)", value: DREADFUL_CHARGE_VALUE + dc, baseDamage: DREADFUL_CHARGE_VALUE, matched: matchedSet.has("Dreadful Charge") },
      { name: "Horrify (CCCC)", value: horrifyVal, baseDamage: HORRIFY_BASE_UNDEFENDABLE, matched: matchedSet.has("Horrify") },
      { name: "Spectral Assault (AAACC)", value: saVal, baseDamage: spectralAssaultBase, matched: matchedSet.has("Spectral Assault") },
      { name: "Cleave 5A (AAAAA)", value: cleave5Dmg, baseDamage: cleave5Dmg, matched: matchedSet.has("Cleave 5A") },
      { name: "Cleave 4A (AAAA)", value: cleave4Dmg, baseDamage: cleave4Dmg, matched: matchedSet.has("Cleave 4A") },
      { name: "Cleave 3A (AAA)", value: cleave3Dmg, baseDamage: cleave3Dmg, matched: matchedSet.has("Cleave 3A") },
      { name: "Ride Down (AAABB)", value: rdVal, baseDamage: RIDE_DOWN_BASE, matched: matchedSet.has("Ride Down") },
      { name: "Reap (BBBC)", value: reapVal, baseDamage: reapDmg, matched: matchedSet.has("Reap") },
      { name: "Sow Despair L (5-straight)", value: sowLVal, baseDamage: sowLDmg, matched: matchedSet.has("Sow Despair L") },
      { name: "Sow Despair S (4-straight)", value: sowSVal, baseDamage: SOW_SMALL_DMG, matched: matchedSet.has("Sow Despair S") },
      { name: "Whiff", value: whiffVal, baseDamage: whiffVal, matched: matchedSet.has("Whiff") }
    ];
    if (has("cleave-ii")) {
      entries.push({ name: "Ghostly Charge (AABC)", value: ghostlyChargeVal, baseDamage: GHOSTLY_CHARGE_DMG, matched: matchedSet.has("Ghostly Charge") });
    }
    if (has("ride-down-ii")) {
      entries.push({ name: "Cursed Gallop (BBB)", value: cursedGallopVal, baseDamage: CURSED_GALLOP_DMG, matched: matchedSet.has("Cursed Gallop") });
    }
    if (has("reap-ii")) {
      entries.push({ name: "The Reaper (BBBCC)", value: theReaperVal, baseDamage: THE_REAPER_DMG, matched: matchedSet.has("The Reaper") });
    }
    if (has("spectral-assault-ii")) {
      entries.push({ name: "Haunted Strike (AACC)", value: HAUNTED_STRIKE_DMG, baseDamage: HAUNTED_STRIKE_DMG, matched: matchedSet.has("Haunted Strike") });
    }
    if (has("horrify-ii")) {
      entries.push({ name: "Spooky (CCC)", value: spookyVal, baseDamage: SPOOKY_DMG, matched: matchedSet.has("Spooky") });
    }
    return entries;
  }

  // src/characters/horseman/config.ts
  var hhConfig = {
    id: "hh",
    faceToSymbol(face) {
      return hhFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      return bestAbilityValue(dice, state.dreadful, state.hasHead, state.upgradeIds);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName(dice, state.dreadful, state.hasHead, state.upgradeIds);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard(dice, state.dreadful, state.hasHead, state.upgradeIds);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates(dice, state.dreadful, state.hasHead, state.upgradeIds);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      return `${state.dreadful}|${state.hasHead ? 1 : 0}|${upgrades}`;
    }
  };

  // src/characters/black_widow/constants.ts
  var BATON_STRIKE_3B = 5;
  var BATON_STRIKE_4B = 6;
  var BATON_STRIKE_5B = 7;
  var BATON_STRIKE_3B_UPGRADED = 6;
  var BATON_STRIKE_4B_UPGRADED = 7;
  var BATON_STRIKE_5B_UPGRADED = 8;
  var INFILTRATE_BASE_DMG = 0;
  var INFILTRATE_TB_INFLICTED = 1;
  var INFILTRATE_AGILITY_GAIN = 1;
  var GAUNTLETS_BASE_DMG = 6;
  var GAUNTLETS_BASE_DMG_UPGRADED = 7;
  var GAUNTLETS_CP_GAIN = 1;
  var HACKED_BASE_DMG = 5;
  var HACKED_BASE_DMG_UPGRADED = 6;
  var HACKED_THRESHOLD_UPGRADES = 3;
  var HACKED_THRESHOLD_BONUS = 2;
  var HACKED_TB_INFLICTED = 1;
  var GRAPPLE_BASE_DMG = 6;
  var GRAPPLE_BASE_DMG_UPGRADED = 7;
  var GRAPPLE_AGILITY_GAIN = 1;
  var GRAPPLE_CP_THRESHOLD_UPGRADES = 2;
  var GRAPPLE_CP_GAIN = 1;
  var VENGEANCE_BASE_DMG = 7;
  var VENGEANCE_AGILITY_GAIN = 1;
  var VENGEANCE_RIDER_DICE = 4;
  var WIDOWS_BITE_BASE_DMG = 10;
  var WIDOWS_BITE_TB_INFLICTED = 1;
  var RRT_THRESHOLD_UPGRADES = 5;
  var RRT_ALL_ATTACK_BONUS = 1;
  var AGILITY_VALUE = 2;
  var CP_TO_DMG_EQUIV = 1.5;
  var COVERT_OPS_VALUE = 1.5;
  var WHIFF_VALUE = 0;
  var COVERT_MISSION_DMG = 0;
  var RECON_DMG = 0;
  var RECON_UPGRADE_SEARCH_VALUE = 4;
  var SPY_GAME_DMG = 6;
  var SUBVERT_DMG = 0;

  // src/characters/black_widow/timebomb.ts
  var TB_VALUE_LOW = 2.8;
  var TB_VALUE_HIGH = 3.36;
  var TB_STACK_CAP = 2;
  function tbMarginalValue(upgrades, currentTB) {
    if (currentTB >= TB_STACK_CAP) return 0;
    return upgrades >= 6 ? TB_VALUE_HIGH : TB_VALUE_LOW;
  }
  function tbGainValue(upgrades, currentTB, gained) {
    let total = 0;
    for (let i = 0; i < gained; i++) {
      total += tbMarginalValue(upgrades, currentTB + i);
    }
    return total;
  }

  // src/characters/black_widow/abilities.ts
  function bwFaceToSymbol(face) {
    if (face <= 2) return "A";
    if (face <= 5) return "B";
    return "C";
  }
  function classify2(dice) {
    const counts = { A: 0, B: 0, C: 0 };
    for (const face of dice) counts[bwFaceToSymbol(face)]++;
    return counts;
  }
  function hasStraight2(dice, length) {
    const unique = new Set(dice);
    for (let start = 1; start <= 7 - length; start++) {
      let ok = true;
      for (let i = 0; i < length; i++) {
        if (!unique.has(start + i)) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }
  function vengeanceRiderEV(upgrades, tbOnOpp, n = VENGEANCE_RIDER_DICE) {
    const riderDmg = n * 0.5;
    const pNoA = Math.pow(2 / 3, n);
    const tbEV = (1 - pNoA) * tbGainValue(upgrades, tbOnOpp, Math.min(1, 2 - tbOnOpp));
    const pC = 1 / 6;
    const pFewerThanTwoC = Math.pow(1 - pC, n) + n * pC * Math.pow(1 - pC, n - 1);
    const covertOpsEV = (1 - pFewerThanTwoC) * COVERT_OPS_VALUE;
    return riderDmg + tbEV + covertOpsEV;
  }
  function getCandidates2(dice, upgrades, tbOnOpp, upgradeIds = []) {
    const { A: a, B: b, C: c } = classify2(dice);
    const out = [];
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    const has = (id) => upgradeIds.includes(id);
    if (has("widows-gauntlets-ii") && a >= 2 && b >= 2) {
      const tb = tbGainValue(upgrades, tbOnOpp, 1);
      out.push(["Covert Mission", COVERT_MISSION_DMG + tb + rrt, COVERT_MISSION_DMG]);
    }
    if (has("grapple-ii") && c >= 3) {
      const val = RECON_DMG + AGILITY_VALUE + RECON_UPGRADE_SEARCH_VALUE + rrt;
      out.push(["Recon", val, RECON_DMG]);
    }
    if (has("infiltrate-ii") && a >= 2 && b >= 1 && c >= 2) {
      const val = SPY_GAME_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt;
      out.push(["Spy Game", val, SPY_GAME_DMG]);
    }
    if (has("vengeance-ii") && a >= 1 && b >= 3) {
      const val = SUBVERT_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt;
      out.push(["Subvert", val, SUBVERT_DMG]);
    }
    const batonStrikeUpgraded = has("baton-strike-ii");
    if (b >= 5) {
      const dmg = batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B;
      out.push(["Baton Strike 5B", dmg + rrt, dmg]);
    } else if (b === 4) {
      const dmg = batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B;
      out.push(["Baton Strike 4B", dmg + rrt, dmg]);
    } else if (b === 3) {
      const dmg = batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B;
      out.push(["Baton Strike 3B", dmg + rrt, dmg]);
    }
    if (a >= 2 && b >= 1 && c >= 1) {
      const tb = tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED);
      const agility = INFILTRATE_AGILITY_GAIN * AGILITY_VALUE;
      out.push(["Infiltrate", INFILTRATE_BASE_DMG + tb + agility + rrt, INFILTRATE_BASE_DMG]);
    }
    if (b >= 3 && a >= 2) {
      const gauntletsDmg = has("widows-gauntlets-ii") ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG;
      const val = gauntletsDmg + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt;
      out.push(["Widow's Gauntlets", val, gauntletsDmg]);
    }
    if (hasStraight2(dice, 4)) {
      const hackedDmg = has("hacked-ii") ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG;
      const thresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
      const tb = tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED);
      out.push(["Hacked", hackedDmg + thresh + tb + rrt, hackedDmg]);
    }
    if (c >= 4) {
      const grappleUpgraded = has("grapple-ii");
      const grappleDmg = grappleUpgraded ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG;
      const cpGain = grappleUpgraded || upgrades >= GRAPPLE_CP_THRESHOLD_UPGRADES ? GRAPPLE_CP_GAIN * CP_TO_DMG_EQUIV : 0;
      const val = grappleDmg + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + cpGain + rrt;
      out.push(["Grapple", val, grappleDmg]);
    }
    if (hasStraight2(dice, 5)) {
      const rider = vengeanceRiderEV(upgrades, tbOnOpp);
      const agility = VENGEANCE_AGILITY_GAIN * AGILITY_VALUE;
      out.push(["Vengeance", VENGEANCE_BASE_DMG + rider + agility + rrt, VENGEANCE_BASE_DMG]);
    }
    if (c >= 5) {
      const tb = tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED);
      out.push(["Widow's Bite", WIDOWS_BITE_BASE_DMG + tb + rrt, WIDOWS_BITE_BASE_DMG]);
    }
    out.push(["Whiff", WHIFF_VALUE, WHIFF_VALUE]);
    return out;
  }
  function bestAbilityValue2(dice, upgrades, tbOnOpp, upgradeIds = []) {
    return Math.max(...getCandidates2(dice, upgrades, tbOnOpp, upgradeIds).map(([, v]) => v));
  }
  function bestAbilityName2(dice, upgrades, tbOnOpp, upgradeIds = []) {
    const cands = getCandidates2(dice, upgrades, tbOnOpp, upgradeIds);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function directDamageByName(upgrades, _tbOnOpp, upgradeIds = []) {
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    const has = (id) => upgradeIds.includes(id);
    const batonStrikeUpgraded = has("baton-strike-ii");
    const gauntletsDmg = has("widows-gauntlets-ii") ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG;
    const hackedDmg = has("hacked-ii") ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG;
    const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
    const grappleDmg = has("grapple-ii") ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG;
    const vengeanceRiderDmg = VENGEANCE_RIDER_DICE * 0.5;
    return {
      "Baton Strike 3B": (batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B) + rrt,
      "Baton Strike 4B": (batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B) + rrt,
      "Baton Strike 5B": (batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B) + rrt,
      "Infiltrate": INFILTRATE_BASE_DMG + rrt,
      "Widow's Gauntlets": gauntletsDmg + upgrades + rrt,
      "Hacked": hackedDmg + hackedThresh + rrt,
      "Grapple": grappleDmg + upgrades + rrt,
      "Vengeance": VENGEANCE_BASE_DMG + vengeanceRiderDmg + rrt,
      "Widow's Bite": WIDOWS_BITE_BASE_DMG + rrt,
      "Whiff": 0,
      "Covert Mission": COVERT_MISSION_DMG + rrt,
      "Recon": RECON_DMG + rrt,
      "Spy Game": SPY_GAME_DMG + rrt,
      "Subvert": SUBVERT_DMG + rrt
    };
  }
  function buildAbilityBoard2(dice, upgrades, tbOnOpp, upgradeIds = []) {
    const matched = new Set(getCandidates2(dice, upgrades, tbOnOpp, upgradeIds).map(([n]) => n));
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    const has = (id) => upgradeIds.includes(id);
    const batonStrikeUpgraded = has("baton-strike-ii");
    const batonStrike5Dmg = batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B;
    const batonStrike4Dmg = batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B;
    const batonStrike3Dmg = batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B;
    const gauntletsDmg = has("widows-gauntlets-ii") ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG;
    const hackedDmg = has("hacked-ii") ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG;
    const grappleDmg = has("grapple-ii") ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG;
    const infiltrateVal = INFILTRATE_BASE_DMG + tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED) + INFILTRATE_AGILITY_GAIN * AGILITY_VALUE + rrt;
    const gauntletsVal = gauntletsDmg + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt;
    const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
    const hackedVal = hackedDmg + hackedThresh + tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED) + rrt;
    const grappleCpGain = has("grapple-ii") || upgrades >= GRAPPLE_CP_THRESHOLD_UPGRADES ? GRAPPLE_CP_GAIN * CP_TO_DMG_EQUIV : 0;
    const grappleVal = grappleDmg + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + grappleCpGain + rrt;
    const vengeanceVal = VENGEANCE_BASE_DMG + vengeanceRiderEV(upgrades, tbOnOpp) + VENGEANCE_AGILITY_GAIN * AGILITY_VALUE + rrt;
    const biteVal = WIDOWS_BITE_BASE_DMG + tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED) + rrt;
    const covertMissionVal = COVERT_MISSION_DMG + tbGainValue(upgrades, tbOnOpp, 1) + rrt;
    const reconVal = RECON_DMG + AGILITY_VALUE + RECON_UPGRADE_SEARCH_VALUE + rrt;
    const spyGameVal = SPY_GAME_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt;
    const subvertVal = SUBVERT_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt;
    const entries = [
      { name: "Widow's Bite (CCCCC)", value: biteVal, baseDamage: WIDOWS_BITE_BASE_DMG, matched: matched.has("Widow's Bite") },
      { name: "Grapple (CCCC)", value: grappleVal, baseDamage: grappleDmg, matched: matched.has("Grapple") },
      { name: "Widow's Gauntlets (BBBAA)", value: gauntletsVal, baseDamage: gauntletsDmg, matched: matched.has("Widow's Gauntlets") },
      { name: "Vengeance (5-straight)", value: vengeanceVal, baseDamage: VENGEANCE_BASE_DMG, matched: matched.has("Vengeance") },
      { name: "Hacked (4-straight)", value: hackedVal, baseDamage: hackedDmg, matched: matched.has("Hacked") },
      { name: "Infiltrate (AABC)", value: infiltrateVal, baseDamage: INFILTRATE_BASE_DMG, matched: matched.has("Infiltrate") },
      { name: "Baton Strike 5B (BBBBB)", value: batonStrike5Dmg + rrt, baseDamage: batonStrike5Dmg, matched: matched.has("Baton Strike 5B") },
      { name: "Baton Strike 4B (BBBB)", value: batonStrike4Dmg + rrt, baseDamage: batonStrike4Dmg, matched: matched.has("Baton Strike 4B") },
      { name: "Baton Strike 3B (BBB)", value: batonStrike3Dmg + rrt, baseDamage: batonStrike3Dmg, matched: matched.has("Baton Strike 3B") },
      { name: "Whiff", value: WHIFF_VALUE, baseDamage: WHIFF_VALUE, matched: matched.has("Whiff") }
    ];
    if (has("widows-gauntlets-ii")) {
      entries.push({ name: "Covert Mission", value: covertMissionVal, baseDamage: COVERT_MISSION_DMG, matched: matched.has("Covert Mission") });
    }
    if (has("grapple-ii")) {
      entries.push({ name: "Recon", value: reconVal, baseDamage: RECON_DMG, matched: matched.has("Recon") });
    }
    if (has("infiltrate-ii")) {
      entries.push({ name: "Spy Game", value: spyGameVal, baseDamage: SPY_GAME_DMG, matched: matched.has("Spy Game") });
    }
    if (has("vengeance-ii")) {
      entries.push({ name: "Subvert", value: subvertVal, baseDamage: SUBVERT_DMG, matched: matched.has("Subvert") });
    }
    return entries;
  }

  // src/characters/black_widow/config.ts
  var bwConfig = {
    id: "bw",
    faceToSymbol(face) {
      return bwFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      return bestAbilityValue2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgradeIds = (state.upgradeIds ?? []).slice().sort().join(",");
      return `${state.upgrades}|${state.tbOnOpp}|${upgradeIds}`;
    },
    directDamageByName(state) {
      return directDamageByName(state.upgrades, state.tbOnOpp, state.upgradeIds);
    }
  };

  // src/sim/oracle.ts
  function cfgFor(heroId) {
    return heroId === "hh" ? hhConfig : bwConfig;
  }
  function runOffensiveRoll(heroId, initialOracleState, rng, beforeReroll) {
    const dice = rollDice(5, rng).sort((a, b) => a - b);
    return completeOffensiveRoll(heroId, initialOracleState, dice, 2, rng, beforeReroll);
  }
  function completeOffensiveRoll(heroId, initialOracleState, initialDice, initialRollsRemaining, rng, beforeReroll) {
    const cfg = cfgFor(heroId);
    let oracleState = initialOracleState;
    let dice = initialDice.slice().sort((a, b) => a - b);
    let rollsRemaining = initialRollsRemaining;
    while (true) {
      if (beforeReroll) {
        const update = beforeReroll({ rollsRemaining, dice });
        oracleState = update.oracleState;
        dice = update.dice.slice().sort((a, b) => a - b);
        rollsRemaining += update.extraRollsGranted ?? 0;
      }
      if (rollsRemaining <= 0) break;
      const result = calculateOptimalKeep(cfg, dice, rollsRemaining, oracleState);
      const kept = result.topOptions[0].kept;
      if (kept.length === 5) {
        rollsRemaining = 0;
        continue;
      }
      const nReroll = 5 - kept.length;
      const rerolled = rollDice(nReroll, rng);
      dice = [...kept, ...rerolled].sort((a, b) => a - b);
      rollsRemaining -= 1;
    }
    return dice;
  }

  // src/sim/data/characters/hh/hero.json
  var hero_default = {
    id: "hh",
    name: "Headless Horseman",
    diceAnatomy: "AAABBC (face 1-3 = A/Axe, 4-5 = B/Horseshoe, 6 = C/Scare)",
    startingHp: null,
    cpIncomePerTurn: null,
    setupNotes: "Begin the game with the Haunted Head on your Hero Board. If you are NOT the first player to begin the game, gain 1 Dreadful (Hero Setup, leaflet).",
    source: "VERIFIED against photos in characters/headless_horseman/{board,leaflet,cards}/ (deposited 2026-07-01). Read directly by Claude via the Read tool. 7 upgrade cards + 7 standalone unique-action cards = 14 hero cards total. 5 of the upgrades also unlock a second dice-triggered ability once in play (altAbility field) \u2014 these share the parent upgrade's CP cost, they are NOT separate cards.",
    tokens: [
      { id: "dreadful", name: "Dreadful", startingCount: 0, stackCap: 5, description: "Positive Status Effect. Boosts various abilities, including when you can Terrorize an opponent (need >=4)." },
      { id: "grimPursuit", name: "Grim Pursuit", startingCount: 0, stackCap: 3, description: "Positive Status Effect. Spend 1 to either: (a) perform an additional Roll Attempt during your Offensive Roll Phase, or (b) after attacking, roll 1 die and add that many dmg as an Attack Modifier. Each effect usable once per turn." }
    ],
    flags: [
      { id: "hauntedHead", name: "Haunted Head", startingValue: true, description: "Companion token. At the conclusion of your turn, if an opponent has it, gain 1 Dreadful. Move it via Terrorize, Rolling Pumpkin, or when Terrorized." }
    ],
    abilities: [
      { id: "cleave_3a", boardName: "Cleave 3A (AAA)", dicePattern: "AAA", baseDamage: 4, defendable: true, numberMatchBonus: { ofAKind: 4, tokensGranted: { dreadful: 1 } }, upgradedBy: { upgradeId: "cleave-ii", baseDamage: 5 }, notes: "Base card requires 4-of-a-kind BY FACE VALUE (not just 3 A symbols) to grant the Dreadful bonus. Cleave II upgrade lowers this to 3-of-a-kind.", verified: true },
      { id: "cleave_4a", boardName: "Cleave 4A (AAAA)", dicePattern: "AAAA", baseDamage: 5, defendable: true, numberMatchBonus: { ofAKind: 4, tokensGranted: { dreadful: 1 } }, upgradedBy: { upgradeId: "cleave-ii", baseDamage: 6 }, verified: true },
      { id: "cleave_5a", boardName: "Cleave 5A (AAAAA)", dicePattern: "AAAAA", baseDamage: 7, defendable: true, numberMatchBonus: { ofAKind: 4, tokensGranted: { dreadful: 1 } }, upgradedBy: { upgradeId: "cleave-ii", baseDamage: 8 }, verified: true },
      { id: "reap", boardName: "Reap (BBBC)", dicePattern: "BBBC", baseDamage: 3, defendable: false, tokensGrantedToSelf: { dreadful: 2 }, cardDrawIfHasHead: true, upgradedBy: { upgradeId: "reap-ii", baseDamage: 4 }, verified: true },
      { id: "ride_down", boardName: "Ride Down (AAABB)", dicePattern: "AAABB", baseDamage: 6, defendable: true, tokensGrantedToSelf: { grimPursuit: 2 }, upgradedBy: { upgradeId: "ride-down-ii", tokensGrantedToSelf: { grimPursuit: 3 } }, verified: true },
      { id: "sow_despair_s", boardName: "Sow Despair S (4-straight)", dicePattern: "4-straight", baseDamage: 7, defendable: true, tokensGrantedToSelf: { dreadful: 1 }, upgradedBy: { upgradeId: "sow-despair-ii", tokensGrantedToSelf: { dreadful: 2 } }, verified: true },
      { id: "sow_despair_l", boardName: "Sow Despair L (5-straight)", dicePattern: "5-straight", baseDamage: 9, defendable: true, tokensGrantedToSelf: { dreadful: 2 }, upgradedBy: { upgradeId: "sow-despair-ii", baseDamage: 10, tokensGrantedToSelf: { dreadful: 3 } }, verified: true },
      { id: "horrify", boardName: "Horrify (CCCC)", dicePattern: "CCCC", baseDamage: 6, defendable: false, tokensGrantedToSelf: { dreadful: 3 }, tokensGrantedIfHasHead: { grimPursuit: 1 }, upgradedBy: { upgradeId: "horrify-ii", tokensGrantedToSelf: { dreadful: 3, grimPursuit: 2 } }, notes: "Real rule is a CHOICE: gain 3 Dreadful OR gain Grim Pursuit (count not printed on card, inferred 1 by convention); if you have the Haunted Head, do BOTH instead. The flat tokensGrantedToSelf/tokensGrantedIfHasHead fields here assume the Head-owner (both) case \u2014 engine logic still needs the XOR branch for the no-Head case. Horrify II drops the choice entirely: always both, with Grim Pursuit bumped 1->2.", verified: true },
      { id: "spectral_assault", boardName: "Spectral Assault (AAACC)", dicePattern: "AAACC", baseDamage: 8, defendable: true, tokensGrantedToSelf: { dreadful: 1 }, bonusRoll: { diceCount: "1 per Dreadful token, up to 5 total", perSymbolDamage: { A: 1 }, undefendableOnSymbolPair: "B", perSymbolTokens: { C: { token: "grimPursuit", amount: 1 } } }, upgradedBy: { upgradeId: "spectral-assault-ii", baseDamage: 9 }, notes: "Full text: 'Gain Dreadful. Then deal 8 dmg and roll 1 die per Dreadful (up to 5 total): Add 1 dmg per Axe. On 2 Horseshoe, this Attack becomes undefendable. Gain 1 Grim Pursuit per Scare.' Matches Spectral Assault II exactly except base dmg 8 vs 9.", verified: true },
      { id: "dreadful_charge", boardName: "Dreadful Charge (CCCCC)", dicePattern: "CCCCC", baseDamage: 14, defendable: false, tokensGrantedToSelf: { dreadful: 4 }, notes: "ULTIMATE. Card text: 'Dice may be altered to prevent an Ultimate. Otherwise, no action of any kind may be performed by any opponent until the ability fully completes.' Treated as undefendable since the opponent cannot take the 'action' of defending.", verified: true }
    ],
    passives: [
      { id: "headless_mayhem", name: "Headless Mayhem", trigger: "Upkeep Phase (your choice, one of the two)", text: "During your Upkeep Phase, choose one: Terrorize an opponent (requires >=4 Dreadful; see Terrorize) -or- move the Haunted Head to a chosen player (gain 1 Dreadful if moved to an opponent). Separately (always active): if your Offensive Roll Phase does not successfully deal at least 1 dmg, gain 1 Grim Pursuit.", verified: true },
      { id: "terrorize", name: "Terrorize", trigger: "Chosen during Upkeep Phase, requires >=4 Dreadful tokens", text: "Terrorize an opponent: remove 4 Dreadful tokens from yourself, move the Haunted Head to your own Hero Board (if not already there), deal 3 undefendable dmg to a chosen opponent (isolated damage source), gain 1 Grim Pursuit and 1 CP.", verified: true }
    ],
    defense: {
      name: "Hallowed Reckoning",
      diceCount: "1 + current Dreadful count, up to 5 total",
      text: "Defense Roll 1-5: Roll 1 die plus 1 more for each Dreadful (up to 5 total). Deal 1 dmg per Axe rolled (counter-damage to the attacker). For every 2 Horseshoe rolled, prevent 1 incoming dmg. Gain 1 Dreadful per Scare rolled. (Hallowed Reckoning II upgrade: starts at 2 dice instead of 1, still capped at 5 total, and adds: on 2 Scare, also gain 1 Grim Pursuit.)",
      verified: true
    },
    cards: [
      {
        id: "cleave-ii",
        name: "Cleave II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "cleave",
        text: "3A: Deal 5 dmg. 4A: Deal 6 dmg. 5A: Deal 8 dmg. On 3-of-a-kind (#'s), gain Dreadful.",
        effect: { other: "replaces base Cleave numbers (4/5/7 -> 5/6/8) and lowers the number-match bonus threshold from 4-of-a-kind to 3-of-a-kind" },
        altAbility: { id: "ghostly_charge", boardName: "Ghostly Charge (AABC)", dicePattern: "AABC (2 Axe, 1 Horseshoe, 1 Scare)", baseDamage: 2, defendable: false, tokensGrantedToSelf: { grimPursuit: 2 }, notes: "Card says 'pure' dmg, not 'undefendable' like other HH abilities \u2014 may bypass even prevention effects, verify the distinction. Unlocked once Cleave II is in play.", verified: true },
        verified: true
      },
      {
        id: "ride-down-ii",
        name: "Ride Down II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "ride_down",
        text: "AAABB: Gain 3 Grim Pursuit. Then deal 6 dmg.",
        effect: { damage: 6, tokensGrantedToSelf: { grimPursuit: 3 } },
        altAbility: { id: "cursed_gallop", boardName: "Cursed Gallop (BBB)", dicePattern: "BBB", baseDamage: 1, defendable: false, tokensGrantedToSelf: { grimPursuit: 1 }, notes: "Unlocked once Ride Down II is in play.", verified: true },
        verified: true
      },
      { id: "sow-despair-ii", name: "Sow Despair II", kind: "upgrade", cpCost: 2, upgradeSlot: "sow_despair", text: "Small Straight: Gain 2 Dreadful, Deal 7 dmg. Large Straight: Gain 3 Dreadful, Deal 10 dmg.", effect: { other: "small: dreadful 1->2, dmg stays 7. large: dreadful 2->3, dmg 9->10" }, notes: "Photo did not show a second alt-ability card in frame \u2014 unconfirmed whether one exists.", verified: true },
      {
        id: "reap-ii",
        name: "Reap II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "reap",
        text: "BBBC: Gain 2 Dreadful. Deal 4 undefendable dmg. If you have the Haunted Head, draw 1.",
        effect: { damage: 4, tokensGrantedToSelf: { dreadful: 2 }, cardDraw: 1 },
        altAbility: { id: "the_reaper", boardName: "The Reaper (BBBCC)", dicePattern: "BBBCC (3 Horseshoe, 2 Scare)", baseDamage: 4, defendable: false, tokensGrantedToSelf: { dreadful: 3 }, cardDraw: 1, notes: "Unlocked once Reap II is in play.", verified: true },
        verified: true
      },
      { id: "hallowed-reckoning-ii", name: "Hallowed Reckoning II", kind: "upgrade", cpCost: 2, upgradeSlot: "hallowed_reckoning", text: "Defense Roll 2-5: Roll 2 plus 1 more for each Dreadful (up to 5 total). Deal 1 dmg per Axe. For every 2 Horseshoe, prevent 1 dmg. Gain 1 Dreadful per Scare. On 2 Scare, gain Grim Pursuit.", effect: null, notes: "Photo did not show a second alt-ability card in frame \u2014 unconfirmed whether one exists.", verified: true },
      {
        id: "spectral-assault-ii",
        name: "Spectral Assault II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "spectral_assault",
        text: "AAACC: Gain Dreadful. Then deal 9 dmg and roll 1 die per Dreadful (up to 5 total): Add 1 dmg per Axe. On 2 Horseshoe, undefendable. Gain 1 Grim Pursuit per Scare.",
        effect: { damage: 9 },
        altAbility: { id: "haunted_strike", boardName: "Haunted Strike (AACC)", dicePattern: "AACC (2 Axe, 2 Scare)", baseDamage: 4, defendable: false, notes: "Unlocked once Spectral Assault II is in play.", verified: true },
        verified: true
      },
      {
        id: "horrify-ii",
        name: "Horrify II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "horrify",
        text: "CCCC: Gain 3 Dreadful and 2 Grim Pursuit. Then deal 6 undefendable dmg.",
        effect: { damage: 6, tokensGrantedToSelf: { dreadful: 3, grimPursuit: 2 } },
        altAbility: { id: "spooky", boardName: "Spooky (CCC)", dicePattern: "CCC", baseDamage: 7, defendable: true, tokensGrantedToSelf: { grimPursuit: 2 }, notes: "Unlocked once Horrify II is in play.", verified: true },
        verified: true
      },
      { id: "dark-surprise", name: "Dark Surprise!", kind: "action", cpCost: 2, actionTiming: "instant", text: "Instant Action. Gain 2 Dreadful.", effect: { tokensGrantedToSelf: { dreadful: 2 } }, verified: true },
      { id: "unescapable", name: "Unescapable!", kind: "action", cpCost: 1, actionTiming: "rollPhase", text: "Roll Phase Action, Attack Modifier. Remove a Grim Pursuit to make this Attack undefendable.", effect: { other: "cost: 1 CP + spend 1 Grim Pursuit token" }, verified: true },
      { id: "spirited-reprisal", name: "Spirited Reprisal!", kind: "action", cpCost: 1, actionTiming: "rollPhase", text: "Roll Phase Action. Play only after being Attacked. If you have the Haunted Head, prevent 3 incoming dmg.", effect: { other: "no effect if you don't have the Head" }, verified: true },
      { id: "cranial-assist", name: "Cranial Assist!", kind: "action", cpCost: 2, actionTiming: "rollPhase", text: "Roll Phase Action, Attack Modifier. If your opponent has the Haunted Head, add 3 dmg.", effect: { other: "conditional on OPPONENT holding the Head, not self" }, verified: true },
      { id: "dancing-pumpkin", name: "Dancing Pumpkin!", kind: "action", cpCost: 2, actionTiming: "mainPhase", text: "Main Phase Action. If you have the Haunted Head, gain 2 Dreadful. Otherwise, gain 2 Grim Pursuit.", effect: null, verified: true },
      { id: "thundering-hooves", name: "Thundering Hooves!", kind: "action", cpCost: 0, actionTiming: "rollPhase", text: "Roll Phase Action. Spend up to 3 CP. Then gain 1 Grim Pursuit per CP spent.", effect: { other: "0 CP to play the card itself; converts up to 3 additional CP into Grim Pursuit 1:1" }, verified: true },
      { id: "rolling-pumpkin", name: "Rolling Pumpkin!", kind: "action", cpCost: 0, actionTiming: "instant", text: "Instant Action. Move the Haunted Head to a chosen player.", effect: null, verified: true }
    ]
  };

  // src/sim/data/characters/bw/hero.json
  var hero_default2 = {
    id: "bw",
    name: "Black Widow",
    diceAnatomy: "AABBBC (face 1-2 = A/Espionage, 3-5 = B/Batons, 6 = C/Widow)",
    startingHp: null,
    cpIncomePerTurn: null,
    source: "VERIFIED against photos of the physical board/leaflet/cards in characters/Black_Widow/{board,leaflet,cards}/, cross-checked on static/verify.html. 2026-07-01. Fixed two real bugs found in the pre-existing (guide-derived) engine code during this pass: Widow's Gauntlets dice pattern was encoded backwards (AAABB instead of the correct BBBAA), and Agility was applying its damage-halving unconditionally instead of requiring a 1-3 roll (leaflet: 'Spend & roll 1-3 to avoid 1/2 damage'). Also corrected Grapple's base damage (6, was 5) and added its conditional CP gain, and fixed Vengeance's rider dice to use BW's A/B/C symbol classification instead of raw face value.",
    tokens: [
      { id: "covertOps", name: "Covert Ops", startingCount: 3, stackCap: 3, description: "Unique Status Effect. Spend once per turn during your Main Phase to either (a) put an Ability Upgrade from your hand into play, or (b) look at the top 3 cards of your deck \u2014 if none are Ability Upgrades you may reveal them and search your deck for one to add to hand (then shuffle), otherwise put them back in any order. May not be transferred or removed by any means." },
      { id: "agility", name: "Agility", startingCount: 0, stackCap: 2, description: "Positive Status Effect. Spend & roll 1 die when receiving damage: on 1-3, prevent 1/2 incoming dmg (rounded up); on 4-6, no effect (wasted), unless Elude! is played on a 5-6 result, which instead ignores all incoming dmg." },
      { id: "timeBomb", name: "Time Bomb", startingCount: 0, stackCap: 2, description: "Negative Status Effect inflicted on opponents. Starts on the 0:02 side (0:01 if the inflictor has >=6 Ability Upgrades in play). Each Upkeep Phase the afflicted player rolls 1 die: 1-5 advances the token (0:02->0:01, or 0:01-> detonate for 4 undefendable dmg and remove); 6 defuses it (removed, no dmg)." }
    ],
    flags: [],
    abilities: [
      { id: "baton_strike_3b", boardName: "Baton Strike 3B (BBB)", dicePattern: "BBB", baseDamage: 5, defendable: true, upgradedBy: { upgradeId: "baton-strike-ii", baseDamage: 6 }, verified: true },
      { id: "baton_strike_4b", boardName: "Baton Strike 4B (BBBB)", dicePattern: "BBBB", baseDamage: 6, defendable: true, upgradedBy: { upgradeId: "baton-strike-ii", baseDamage: 7 }, verified: true },
      { id: "baton_strike_5b", boardName: "Baton Strike 5B (BBBBB)", dicePattern: "BBBBB", baseDamage: 7, defendable: true, upgradedBy: { upgradeId: "baton-strike-ii", baseDamage: 8 }, verified: true },
      { id: "infiltrate", boardName: "Infiltrate (AABC)", dicePattern: "AABC", baseDamage: 0, defendable: true, tokensGrantedToSelf: { agility: 1 }, tokensInflictedOnOpponent: { timeBomb: 1 }, advancesAllTimeBombsInPlay: true, notes: "Text order (verified): 'Gain Agility. Advance all Time Bomb tokens. Then inflict Time Bomb.' \u2014 the newly-inflicted TB is NOT advanced this turn. Infiltrate II reverses the order ('inflict, then advance'), so its newly-inflicted TB IS advanced the same turn. Advance-all-in-play not yet wired in turn.ts (TODO(user)).", verified: true },
      { id: "widows_gauntlets", boardName: "Widow's Gauntlets (BBBAA)", dicePattern: "BBBAA", baseDamage: 6, defendable: true, cpGain: 1, bonusDamagePerUpgrade: 1, upgradedBy: { upgradeId: "widows-gauntlets-ii", baseDamage: 7 }, notes: "Dice pattern is 3 Batons + 2 Espionage. An earlier draft of this engine had it backwards (3 Espionage + 2 Batons) \u2014 corrected 2026-07-01 after cross-checking the base board photo twice against the Widow's Gauntlets II card photo. Widow's Gauntlets II also bumps its own base dmg 6->7 (on top of unlocking Covert Mission).", verified: true },
      { id: "hacked", boardName: "Hacked (4-straight)", dicePattern: "Small Straight (4 consecutive)", baseDamage: 5, defendable: true, tokensInflictedOnOpponent: { timeBomb: 1 }, thresholdBonus: { upgradesAtLeast: 3, bonusDamage: 2 }, upgradedBy: { upgradeId: "hacked-ii", baseDamage: 6 }, notes: 'Hacked II bumps base dmg 5->6; the existing >=3-upgrades +2 threshold bonus still applies on top, matching the printed "deal 8 dmg instead".', verified: true },
      { id: "grapple", boardName: "Grapple (CCCC)", dicePattern: "CCCC", baseDamage: 6, defendable: false, tokensGrantedToSelf: { agility: 1 }, bonusDamagePerUpgrade: 1, cpGainIfUpgradesAtLeast: { upgradesAtLeast: 2, cpGain: 1 }, upgradedBy: { upgradeId: "grapple-ii", baseDamage: 7, cpGain: 1 }, notes: "Undefendable. Base damage is 6 (an earlier draft had 5.0 \u2014 corrected 2026-07-01). Grapple II makes the CP gain unconditional instead of requiring >=2 upgrades, and also bumps its own base dmg 6->7 (on top of unlocking Recon).", verified: true },
      { id: "vengeance", boardName: "Vengeance (5-straight)", dicePattern: "Large Straight (5 consecutive)", baseDamage: 7, defendable: true, tokensGrantedToSelf: { agility: 1 }, bonusRoll: { diceCount: "4 (5 with Vengeance II)", perSymbolDamage: { B: 1 } }, notes: "Rider (verified): roll 4 dice (5 with Vengeance II), +1 dmg per Batons(B). On any Espionage(A) rolled, inflict 1 Time Bomb (boolean, not scaled by count). On a Widow-pair (>=2 C), gain 1 Covert Ops. An earlier draft checked raw face===1 for TB and awarded dmg for every other face, and didn't model the Covert Ops gain at all \u2014 all fixed in hero/bw.rules.ts's resolveVengeanceRider.", verified: true },
      { id: "widows_bite", boardName: "Widow's Bite (CCCCC)", dicePattern: "CCCCC", baseDamage: 10, defendable: false, tokensInflictedOnOpponent: { timeBomb: 1 }, searchUpgradesIntoPlay: 2, notes: "Ultimate. Confirmed undefendable: 'Dice may be altered to prevent an Ultimate. Otherwise, no action of any kind may be performed by any opponent until the ability fully completes' \u2014 identical convention to HH's Dreadful Charge. Deck search into play not yet wired (TODO(user), needs deck/hand modeling).", verified: true }
    ],
    passives: [
      { id: "red_room_training", name: "Red Room Training", trigger: "Passive (always active)", text: "Begin the game with 3 Covert Ops. You may play Ability Upgrades during any Roll Phase. If you have at least 5 Ability Upgrades in play, add 1 dmg to all of your Attacks.", verified: true }
    ],
    defense: {
      name: "Sabotage",
      diceCount: "3 (4 with Sabotage II)",
      text: "Deal 1 dmg per Batons(B) rolled to the attacker. Prevent 1 dmg per Espionage(A) rolled. On a Widow-pair (>=2 C), inflict Time Bomb on the attacker. If you have at least 4 Ability Upgrades in play, you may re-roll any of these dice (same threshold on both versions \u2014 Sabotage II only adds a 4th die).",
      verified: true
    },
    cards: [
      { id: "baton-strike-ii", name: "Baton Strike II", kind: "upgrade", cpCost: 1, upgradeSlot: "baton_strike", text: "Deal 6/7/8 dmg for 3/4/5 Batons (up from 5/6/7). When this card is played, force an opponent to reveal their hand to you.", effect: null, verified: true },
      { id: "widows-gauntlets-ii", name: "Widow's Gauntlets II", kind: "upgrade", cpCost: 2, upgradeSlot: "widows_gauntlets", text: "Gain 1 CP. Deal 7 dmg. Add 1 dmg per Ability Upgrade you have in play.", effect: null, altAbility: { id: "covert-mission", boardName: "Covert Mission", dicePattern: "AABB", baseDamage: 0, defendable: true, tokensInflictedOnOpponent: { timeBomb: 1 }, notes: "Inflict Time Bomb on up to two different chosen opponents (engine is 1v1, so modeled as inflicting on the single opponent).", verified: true }, verified: true },
      { id: "red-room-training-ii", name: "Red Room Training II", kind: "upgrade", cpCost: 2, upgradeSlot: "red_room_training", text: "Whenever you play an Ability Upgrade card, draw 1 (excluding this card). You may play Ability Upgrades during any Roll Phase. If you have at least 5 Ability Upgrades in play, add 1 dmg to all of your Attacks.", effect: null, verified: true },
      { id: "grapple-ii", name: "Grapple II", kind: "upgrade", cpCost: 2, upgradeSlot: "grapple", text: "Gain 1 CP and Agility. Deal 7 undefendable dmg. Add 1 dmg per Ability Upgrade you have in play.", effect: null, altAbility: { id: "recon", boardName: "Recon", dicePattern: "CCC", baseDamage: 0, defendable: true, tokensGrantedToSelf: { agility: 1 }, searchUpgradesIntoPlay: 1, notes: "Gain Agility. Search your deck for an Ability Upgrade and put it into play. Then shuffle your deck.", verified: true }, verified: true },
      { id: "hacked-ii", name: "Hacked II", kind: "upgrade", cpCost: 1, upgradeSlot: "hacked", text: "Small Straight. A chosen opponent is inflicted with Time Bomb. Deal 6 dmg. If you have at least 3 Ability Upgrades in play, deal 8 dmg instead.", effect: null, verified: true },
      { id: "sabotage-ii", name: "Sabotage II", kind: "upgrade", cpCost: 2, upgradeSlot: "sabotage", text: "Defense Roll 4. Deal 1xBatons dmg. Prevent 1xEspionage dmg. On Widow-Widow, inflict Time Bomb. If you have at least 4 Ability Upgrades in play, you may re-roll any of these dice.", effect: null, verified: true },
      { id: "infiltrate-ii", name: "Infiltrate II", kind: "upgrade", cpCost: 2, upgradeSlot: "infiltrate", text: "Gain Agility. Inflict Time Bomb. Then advance all Time Bomb tokens.", effect: null, altAbility: { id: "spy-game", boardName: "Spy Game", dicePattern: "AABCC", baseDamage: 6, defendable: false, tokensGrantedToSelf: { covertOps: 1, agility: 1 }, notes: "Gain Covert Ops & Agility. Deal 6 undefendable dmg.", verified: true }, verified: true },
      { id: "vengeance-ii", name: "Vengeance II", kind: "upgrade", cpCost: 2, upgradeSlot: "vengeance", text: "Large Straight. Gain Agility. Deal 7 dmg & roll 5: Add 1xBatons dmg. On Espionage, inflict Time Bomb. On Widow-Widow, gain Covert Ops.", effect: null, altAbility: { id: "subvert", boardName: "Subvert", dicePattern: "ABBB", baseDamage: 0, defendable: true, tokensGrantedToSelf: { covertOps: 1, agility: 1 }, notes: "Gain Covert Ops & Agility.", verified: true }, verified: true },
      { id: "recoil", name: "Recoil!", kind: "action", cpCost: 0, actionTiming: "rollPhase", text: "Roll Phase Action. Play only after being Attacked. Roll 2 dice: On Espionage, gain 1 CP. On Widow, prevent 1/2 incoming dmg (rounded up).", effect: null, verified: true },
      { id: "subversion", name: "Subversion!", kind: "action", cpCost: 1, actionTiming: "rollPhase", text: "Roll Phase Action, Attack Modifier. Add 2 dmg. Add an additional 1 dmg for each Ability Upgrade played this turn.", effect: { damage: 2 }, verified: true },
      { id: "assemble", name: "Assemble!", kind: "action", cpCost: 1, actionTiming: "instant", text: "Instant Action. Gain 2 Agility.", effect: { tokensGrantedToSelf: { agility: 2 } }, verified: true },
      { id: "elude", name: "Elude!", kind: "action", cpCost: 1, actionTiming: "rollPhase", text: "Roll Phase Action. If the outcome of an Agility die roll is 5-6, you may play this card to ignore all incoming dmg (this card can be played after your dice have been rolled).", effect: null, verified: true },
      { id: "undercover-mission", name: "Undercover Mission!", kind: "action", cpCost: 2, actionTiming: "mainPhase", text: "Main Phase Action. A chosen opponent gains Time Bomb. If you have at least 4 Ability Upgrades in play, gain Agility.", effect: { tokensInflictedOnOpponent: { timeBomb: 1 } }, verified: true },
      { id: "cunning", name: "Cunning!", kind: "action", cpCost: 2, actionTiming: "mainPhase", text: "Main Phase Action. Look at the top 5 cards of your deck. Reveal all Ability Upgrades to your opponent and then add them to your hand. Put all remaining cards back in any order.", effect: null, verified: true }
    ]
  };

  // src/sim/data/common-cards.json
  var common_cards_default = {
    source: "VERIFIED against photos in characters/common/ (deposited 2026-07-01, read directly by Claude). 17 cards found \u2014 close to the ~18 figure estimated via web search (BGG thread 'Analyzing the core cards of Dice Throne'), likely complete or missing at most 1. Shared identically across all heroes (each hero's box prints its own physical copies, card-back ID differs but text/effect is the same). actionTiming added 2026-07-01 from the same text already transcribed below (Roll Phase Action / Main Phase Action / Instant Action prefix).",
    cards: [
      { id: "six-it", name: "Six-It!", kind: "action", cpCost: 1, text: "Roll Phase Action. Change the value of one of your dice to a 6.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "better-d", name: "Better D!", kind: "action", cpCost: 0, text: "Roll Phase Action. A chosen player may perform an additional Roll Attempt of up to five dice during their Defensive Roll Phase.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "transference", name: "Transference!", kind: "action", cpCost: 2, text: "Main Phase Action. Transfer 1 status effect token from a chosen player to another chosen player.", effect: null, actionTiming: "mainPhase", verified: true },
      { id: "so-wild", name: "So Wild!", kind: "action", cpCost: 2, text: "Roll Phase Action. Change the value of any one die.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "vegas-baby", name: "Vegas Baby!", kind: "action", cpCost: 0, text: "Main Phase Action. Roll 1 die: Gain 1/2 the value as CP (rounded up).", effect: null, actionTiming: "mainPhase", verified: true },
      { id: "triple-up", name: "Triple Up!", kind: "action", cpCost: 2, text: "Instant Action. Draw 3.", effect: { cardDraw: 3 }, actionTiming: "instant", verified: true },
      { id: "what-status-effects", name: "What Status Effects?", kind: "action", cpCost: 2, text: "Main Phase Action. Remove all status effect tokens from a chosen player.", effect: null, actionTiming: "mainPhase", verified: true },
      { id: "get-that-outta-here", name: "Get That Outta Here!", kind: "action", cpCost: 1, text: "Main Phase Action. Remove a status effect token from a chosen player.", effect: null, actionTiming: "mainPhase", verified: true },
      { id: "twice-as-wild", name: "Twice As Wild!", kind: "action", cpCost: 3, text: "Roll Phase Action. Change the values of any two dice.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "try-try-again", name: "Try, Try Again!", kind: "action", cpCost: 1, text: "Roll Phase Action. You or a chosen teammate may re-roll up to two dice (can be the same die twice in a row or two different dice).", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "tip-it", name: "Tip It!", kind: "action", cpCost: 1, text: "Instant Action. Increase or decrease any die by the value of 1 (a value of 1 cannot be decreased and a value of 6 cannot be increased).", effect: null, actionTiming: "instant", verified: true },
      { id: "getting-paid", name: "Getting Paid!", kind: "action", cpCost: 0, text: "Instant Action. Gain 2 CP.", effect: { cpGain: 2 }, actionTiming: "instant", verified: true },
      { id: "samesies", name: "Samesies!", kind: "action", cpCost: 1, text: "Roll Phase Action. Change the value of one of your dice to be identical to the value of another one of your dice (that was rolled within the same phase and for the same purpose).", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "double-up", name: "Double Up!", kind: "action", cpCost: 1, text: "Instant Action. Draw 2.", effect: { cardDraw: 2 }, actionTiming: "instant", verified: true },
      { id: "helping-hand", name: "Helping Hand!", kind: "action", cpCost: 1, text: "Roll Phase Action. Select one of your opponent's dice and force them to re-roll it.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "one-more-time", name: "One More Time!", kind: "action", cpCost: 1, text: "Roll Phase Action. A chosen player may perform an additional Roll Attempt of up to five dice during their Offensive Roll Phase.", effect: null, actionTiming: "rollPhase", verified: true },
      { id: "not-this-time", name: "Not This Time!", kind: "action", cpCost: 1, text: "Roll Phase Action. A chosen player prevents 6 incoming dmg.", effect: null, actionTiming: "rollPhase", verified: true }
    ]
  };

  // src/sim/data/load.ts
  var hhHero = hero_default;
  var bwHero = hero_default2;
  var commonCards = common_cards_default;
  function heroTemplateFor(heroId) {
    return heroId === "hh" ? hhHero : bwHero;
  }
  function abilityByBoardName(hero, boardName) {
    const base = hero.abilities.find((a) => a.boardName === boardName);
    if (base) return base;
    for (const card of hero.cards) {
      if (card.altAbility?.boardName === boardName) return card.altAbility;
    }
    return void 0;
  }
  function cardById(hero, cardId) {
    return hero.cards.find((c) => c.id === cardId) ?? commonCards.cards.find((c) => c.id === cardId);
  }
  function resolvedAbilityByBoardName(hero, boardName, upgradeIds) {
    const base = abilityByBoardName(hero, boardName);
    if (!base?.upgradedBy) return base;
    if (!upgradeIds.includes(base.upgradedBy.upgradeId)) return base;
    return {
      ...base,
      baseDamage: base.upgradedBy.baseDamage ?? base.baseDamage,
      tokensGrantedToSelf: base.upgradedBy.tokensGrantedToSelf ?? base.tokensGrantedToSelf,
      cpGain: base.upgradedBy.cpGain ?? base.cpGain,
      // Grapple II makes the CP gain unconditional — drop the >=N-upgrades gate so applyBWAbility
      // doesn't also grant it a second time via cpGainIfUpgradesAtLeast.
      cpGainIfUpgradesAtLeast: base.upgradedBy.cpGain != null ? void 0 : base.cpGainIfUpgradesAtLeast
    };
  }

  // src/sim/ability-resolver.ts
  function resolveMatchedAbilities(heroId, dice, oracleState) {
    const template = heroTemplateFor(heroId);
    const upgradeIds = oracleState.upgradeIds ?? [];
    const board = heroId === "hh" ? hhConfig.buildAbilityBoard(dice, oracleState) : bwConfig.buildAbilityBoard(dice, oracleState);
    return board.filter((e) => e.matched && e.name !== "Whiff").map((e) => {
      const data = resolvedAbilityByBoardName(template, e.name, upgradeIds);
      return {
        name: e.name,
        baseDamage: data?.baseDamage ?? e.baseDamage,
        defendable: data?.defendable ?? true
      };
    });
  }

  // src/sim/data/config.ts
  var STARTING_HP = 50;
  var STARTING_CP = 2;
  var CP_CAP = 15;
  var CP_INCOME_PER_TURN = 1;
  var STARTING_HAND_SIZE = 4;
  var MAX_HAND_SIZE = 6;
  var HEAL_CAP_ABOVE_STARTING = 10;
  var BW_STARTING_COVERT_OPS = 3;

  // src/sim/cp.ts
  function grantCp(self, amount) {
    self.cp = Math.min(CP_CAP, self.cp + Math.max(0, amount));
  }

  // src/sim/hero/hh.rules.ts
  var DREADFUL_CAP = 5;
  var GRIM_PURSUIT_CAP = 3;
  var TERRORIZE_DREADFUL_COST = 4;
  var TERRORIZE_DAMAGE = 3;
  var TERRORIZE_CP = 1;
  var TERRORIZE_GRIM_PURSUIT = 1;
  function createInitialHHTokens(hasHead2) {
    return { ...emptyBag(), head: hasHead2 ? 1 : 0 };
  }
  function hasNumberMatch(dice, ofAKind) {
    const counts = /* @__PURE__ */ new Map();
    for (const face of dice) counts.set(face, (counts.get(face) ?? 0) + 1);
    for (const n of counts.values()) if (n >= ofAKind) return true;
    return false;
  }
  function resolveSpectralAssaultBonusRoll(self, rng) {
    const tokens = self.tokens;
    const dice = rollDice(Math.min(DREADFUL_CAP, tokens.dreadful), rng);
    let a = 0, b = 0, c = 0;
    for (const face of dice) {
      const s = hhFaceToSymbol(face);
      if (s === "A") a += 1;
      else if (s === "B") b += 1;
      else c += 1;
    }
    return { bonusDamage: a, undefendable: b >= 2, grimPursuitGained: c };
  }
  function grantDreadful(self, amount) {
    const tokens = self.tokens;
    tokens.dreadful = Math.min(DREADFUL_CAP, tokens.dreadful + Math.max(0, amount));
  }
  function grantGrimPursuit(self, amount) {
    const tokens = self.tokens;
    tokens.grimPursuit = Math.min(GRIM_PURSUIT_CAP, tokens.grimPursuit + Math.max(0, amount));
  }
  function spendGrimPursuit(self, amount) {
    const tokens = self.tokens;
    tokens.grimPursuit = Math.max(0, tokens.grimPursuit - amount);
  }
  function spendGrimPursuitForBonusDamage(self, rng) {
    const tokens = self.tokens;
    if (tokens.grimPursuit <= 0) return 0;
    tokens.grimPursuit -= 1;
    return rollDie(rng);
  }
  function canTerrorize(self) {
    return self.tokens.dreadful >= TERRORIZE_DREADFUL_COST;
  }
  function resolveTerrorize(self) {
    const tokens = self.tokens;
    tokens.dreadful -= TERRORIZE_DREADFUL_COST;
    tokens.head = 1;
    grantGrimPursuit(self, TERRORIZE_GRIM_PURSUIT);
    grantCp(self, TERRORIZE_CP);
    return { damageToOpponent: TERRORIZE_DAMAGE, cpGained: TERRORIZE_CP };
  }
  function endOfTurnHeadCheck(self) {
    const tokens = self.tokens;
    if (tokens.head > 0) return false;
    grantDreadful(self, 1);
    return true;
  }
  function rollHallowedDice(self, rng, upgraded) {
    const tokens = self.tokens;
    const baseDice = upgraded ? 2 : 1;
    return rollDice(Math.min(DREADFUL_CAP, baseDice + tokens.dreadful), rng);
  }
  function hallowedEffects(self, dice, upgraded) {
    let a = 0, b = 0, c = 0;
    for (const face of dice) {
      const s = hhFaceToSymbol(face);
      if (s === "A") a += 1;
      else if (s === "B") b += 1;
      else c += 1;
    }
    grantDreadful(self, c);
    let grimPursuitGained = 0;
    if (upgraded && c >= 2) {
      grimPursuitGained = 1;
      grantGrimPursuit(self, grimPursuitGained);
    }
    return {
      damagePrevented: Math.floor(b / 2),
      counterDamageToAttacker: a,
      dreadfulGained: c,
      grimPursuitGained
    };
  }

  // src/sim/hero/bw.rules.ts
  var TIME_BOMB_STACK_CAP = 2;
  var TIME_BOMB_DETONATE_DAMAGE = 4;
  var SABOTAGE_REROLL_UPGRADE_THRESHOLD = 4;
  var AGILITY_CAP = 2;
  var COVERT_OPS_CAP = 3;
  function createInitialBWTokens() {
    return { ...emptyBag(), covertOps: BW_STARTING_COVERT_OPS };
  }
  function inflictTimeBomb(target, inflictorUpgrades, amount) {
    const startPos = inflictorUpgrades >= 6 ? "0:01" : "0:02";
    let inflicted = 0;
    for (let i = 0; i < amount; i++) {
      if (target.timeBombs.length >= TIME_BOMB_STACK_CAP) break;
      target.timeBombs.push(startPos);
      inflicted += 1;
    }
    return inflicted;
  }
  function advanceAllTimeBombs(target) {
    let detonations = 0;
    const survivors = [];
    for (const pos of target.timeBombs) {
      if (pos === "0:02") survivors.push("0:01");
      else {
        detonations += 1;
        target.hp -= TIME_BOMB_DETONATE_DAMAGE;
      }
    }
    target.timeBombs = survivors;
    return detonations;
  }
  function tickTimeBombsUpkeep(self, rng) {
    let selfDamage = 0;
    let defused = 0;
    const survivors = [];
    for (const pos of self.timeBombs) {
      const roll = rollDie(rng);
      if (roll === 6) {
        defused += 1;
        continue;
      }
      if (pos === "0:02") {
        survivors.push("0:01");
      } else {
        selfDamage += TIME_BOMB_DETONATE_DAMAGE;
      }
    }
    self.timeBombs = survivors;
    self.hp -= selfDamage;
    return { selfDamage, defused };
  }
  function spendAgilityToHalveDamage(self, incomingDamage, rng) {
    const tokens = self.tokens;
    if (tokens.agility <= 0) return { remainingDamage: incomingDamage, roll: 0, succeeded: false };
    tokens.agility -= 1;
    const roll = rollDie(rng);
    if (roll >= 4) return { remainingDamage: incomingDamage, roll, succeeded: false };
    return { remainingDamage: incomingDamage - Math.ceil(incomingDamage / 2), roll, succeeded: true };
  }
  function resolveRecoil(incomingDamage, rng) {
    const dice = [rollDie(rng), rollDie(rng)];
    const hasEspionage = dice.some((f) => bwFaceToSymbol(f) === "A");
    const hasWidow = dice.some((f) => bwFaceToSymbol(f) === "C");
    return {
      cpGained: hasEspionage ? 1 : 0,
      damagePrevented: hasWidow ? Math.ceil(incomingDamage / 2) : 0
    };
  }
  function grantAgility(self, amount, cap = AGILITY_CAP) {
    const tokens = self.tokens;
    tokens.agility = Math.min(cap, tokens.agility + amount);
  }
  function grantCovertOps(self, amount, cap = COVERT_OPS_CAP) {
    const tokens = self.tokens;
    tokens.covertOps = Math.min(cap, tokens.covertOps + amount);
  }
  function resolveVengeanceRider(self, opponent, rng, diceCount = 4) {
    const dice = rollDice(diceCount, rng);
    let a = 0, bonusDamage = 0, c = 0;
    for (const face of dice) {
      const s = bwFaceToSymbol(face);
      if (s === "A") a += 1;
      else if (s === "B") bonusDamage += 1;
      else c += 1;
    }
    const tbInflictedOnOpponent = a > 0 ? inflictTimeBomb(opponent, self.upgradesInPlay.length, 1) : 0;
    const covertOpsGained = c >= 2 ? 1 : 0;
    if (covertOpsGained > 0) grantCovertOps(self, covertOpsGained);
    return { bonusDamage, tbInflictedOnOpponent, covertOpsGained };
  }
  function rollSabotageDice(defender, rng, policy, gameState, defenderIdx, upgraded = false) {
    const diceCount = upgraded ? 4 : 3;
    let dice = rollDice(diceCount, rng);
    if (defender.upgradesInPlay.length >= SABOTAGE_REROLL_UPGRADE_THRESHOLD) {
      if (policy.chooseSabotageReroll(gameState, defenderIdx, dice)) dice = rollDice(diceCount, rng);
    }
    return dice;
  }
  function countSabotage(dice) {
    let a = 0, b = 0, c = 0;
    for (const face of dice) {
      const s = bwFaceToSymbol(face);
      if (s === "A") a += 1;
      else if (s === "B") b += 1;
      else c += 1;
    }
    return { damageToAttacker: b, damagePrevented: a, tbInflictedOnAttacker: c >= 2 ? 1 : 0 };
  }
  function resolveSabotage(defender, _attackerUpgrades, rng, policy, gameState, defenderIdx, upgraded = false) {
    return countSabotage(rollSabotageDice(defender, rng, policy, gameState, defenderIdx, upgraded));
  }
  function rrtAttackBonus(upgradesInPlay) {
    return upgradesInPlay.length >= 5 ? 1 : 0;
  }

  // src/sim/turn.ts
  function log(state, playerIdx, phase, message) {
    state.log.push({ turn: state.turnNumber, playerIdx, phase, message });
  }
  function oracleStateFor(player, opponent) {
    if (player.heroId === "hh") {
      const t = player.tokens;
      return { dreadful: t.dreadful, hasHead: t.head > 0, upgradeIds: player.upgradesInPlay };
    }
    return { upgrades: player.upgradesInPlay.length, tbOnOpp: opponent.timeBombs.length, upgradeIds: player.upgradesInPlay };
  }
  function checkGameOver(state) {
    const [p0, p1] = state.players;
    if (p0.hp <= 0 && p1.hp <= 0) {
      state.winner = null;
      state.gameOver = true;
      return true;
    }
    if (p0.hp <= 0) {
      state.winner = 1;
      state.gameOver = true;
      return true;
    }
    if (p1.hp <= 0) {
      state.winner = 0;
      state.gameOver = true;
      return true;
    }
    return false;
  }
  function queueDamage(state, targetIdx, amount) {
    if (amount > 0) state.pendingDamage[targetIdx] += amount;
  }
  function flushDamage(state) {
    state.players[0].hp -= state.pendingDamage[0];
    state.players[1].hp -= state.pendingDamage[1];
    state.pendingDamage = [0, 0];
  }
  function finalizePendingAttackDamage(state) {
    const pa = state.pendingAttack;
    if (pa) {
      queueDamage(state, pa.defenderIdx, pa.remaining);
      state.pendingAttack = null;
    }
    flushDamage(state);
  }
  function playUpkeepPhase(state, playerIdx, rng, policy) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    self.upgradesPlayedThisTurn = 0;
    self.grimPursuitBonusUsedThisTurn = false;
    self.covertOpsUsedThisTurn = false;
    self.grimPursuitRerollUsedThisTurn = false;
    if (self.heroId === "hh") {
      const eligible = canTerrorize(self);
      const choice = policy.chooseHeadlessMayhem(state, playerIdx, eligible);
      if (choice === "terrorize" && eligible) {
        opp.tokens.head = 0;
        const r = resolveTerrorize(self);
        opp.hp -= r.damageToOpponent;
        log(state, playerIdx, "upkeep", `Terrorize: ${r.damageToOpponent} dmg to opponent, +${r.cpGained} CP, reclaimed Head`);
      } else if (choice === "giveHead") {
        self.tokens.head = 0;
        opp.tokens.head = 1;
        log(state, playerIdx, "upkeep", "Gave the Haunted Head to the opponent");
      }
    }
    const tb = tickTimeBombsUpkeep(self, rng);
    if (tb.selfDamage > 0 || tb.defused > 0) {
      log(state, playerIdx, "upkeep", `Time Bomb upkeep: ${tb.selfDamage} self-dmg, ${tb.defused} defused`);
    }
  }
  function playIncomePhase(state, playerIdx, rng) {
    if (playerIdx === 0 && state.turnNumber === 1) {
      log(state, playerIdx, "income", "Start Player skips their first Income Phase");
      return;
    }
    const self = state.players[playerIdx];
    grantCp(self, CP_INCOME_PER_TURN);
    drawCards(self, 1, rng);
    log(state, playerIdx, "income", `+${CP_INCOME_PER_TURN} CP, drew 1 card (hand=${self.hand.length})`);
  }
  function drawCards(self, count, rng) {
    for (let i = 0; i < count; i++) {
      if (self.deck.length === 0) {
        if (self.discard.length === 0) return;
        self.deck = shuffle(self.discard, rng);
        self.discard = [];
      }
      self.hand.push(self.deck.shift());
    }
  }
  function playDiscardPhase(state, playerIdx, policy) {
    const self = state.players[playerIdx];
    const toSell = policy.chooseCardsToDiscard(state, playerIdx, MAX_HAND_SIZE);
    for (const cardId of toSell) {
      const idx = self.hand.indexOf(cardId);
      if (idx === -1) continue;
      self.hand.splice(idx, 1);
      self.discard.push(cardId);
      grantCp(self, 1);
    }
    if (toSell.length > 0) {
      log(state, playerIdx, "discard", `Sold ${toSell.length} card(s) for +${toSell.length} CP (hand=${self.hand.length})`);
    }
  }
  function playCard(state, playerIdx, phase, cardId, rng) {
    const self = state.players[playerIdx];
    if (!self.hand.includes(cardId)) {
      log(state, playerIdx, phase, `Card "${cardId}" not in hand, skipped`);
      return;
    }
    const hero = heroTemplateFor(self.heroId);
    const card = cardById(hero, cardId);
    if (!card) {
      log(state, playerIdx, phase, `Unknown card "${cardId}", skipped`);
      return;
    }
    if (!isCardPlayableNow(card, phase, self.heroId)) {
      log(state, playerIdx, phase, `TODO(user): ${card.name} (${card.actionTiming ?? "Roll Phase Action, dice manipulation"}) not wired for phase "${phase}" \u2014 skipped`);
      return;
    }
    if (card.kind === "upgrade") playUpgradeCard(state, playerIdx, phase, card, hero);
    else playActionCard(state, playerIdx, phase, card, rng);
  }
  function isCardPlayableNow(card, phase, heroId) {
    if (card.kind === "upgrade") return phase === "main1" || phase === "main2" || phase === "roll" && heroId === "bw";
    if (card.actionTiming === "instant") return true;
    if (card.actionTiming === "mainPhase") return phase === "main1" || phase === "main2";
    return false;
  }
  function placeUpgradeIntoPlay(self, card, hero) {
    const existingId = self.upgradesInPlay.find((id) => cardById(hero, id)?.upgradeSlot === card.upgradeSlot);
    self.hand.splice(self.hand.indexOf(card.id), 1);
    if (existingId) self.upgradesInPlay = self.upgradesInPlay.filter((id) => id !== existingId);
    self.upgradesInPlay.push(card.id);
    self.upgradesPlayedThisTurn += 1;
    return existingId;
  }
  function playUpgradeCard(state, playerIdx, phase, card, hero) {
    const self = state.players[playerIdx];
    if (!card.upgradeSlot) {
      log(state, playerIdx, phase, `TODO(user): ${card.name} has no upgradeSlot data yet, skipped`);
      return;
    }
    const existingId = self.upgradesInPlay.find((id) => cardById(hero, id)?.upgradeSlot === card.upgradeSlot);
    const existingCard = existingId ? cardById(hero, existingId) : void 0;
    const fullCost = card.cpCost ?? 0;
    const cost = existingCard ? Math.max(0, fullCost - (existingCard.cpCost ?? 0)) : fullCost;
    if (self.cp < cost) {
      log(state, playerIdx, phase, `Not enough CP to play ${card.name} (needs ${cost}, have ${self.cp})`);
      return;
    }
    self.cp -= cost;
    placeUpgradeIntoPlay(self, card, hero);
    log(state, playerIdx, phase, `Played upgrade ${card.name} for ${cost} CP${existingCard ? ` (upgraded from ${existingCard.name})` : ""}`);
  }
  function applyCovertOpsUpgrade(state, playerIdx, cardId) {
    const self = state.players[playerIdx];
    const hero = heroTemplateFor(self.heroId);
    const card = cardById(hero, cardId);
    if (!card || card.kind !== "upgrade" || !card.upgradeSlot) return;
    if (self.tokens.covertOps <= 0 || self.covertOpsUsedThisTurn || !self.hand.includes(cardId)) return;
    self.tokens.covertOps -= 1;
    self.covertOpsUsedThisTurn = true;
    const existingId = placeUpgradeIntoPlay(self, card, hero);
    log(state, playerIdx, "main1", `Covert Ops: put ${card.name} into play free${existingId ? ` (upgraded from ${cardById(hero, existingId)?.name})` : ""}`);
  }
  function grantTokenToSelf(self, kind, amount) {
    switch (kind) {
      case "dreadful":
        grantDreadful(self, amount);
        break;
      case "grimPursuit":
        grantGrimPursuit(self, amount);
        break;
      case "agility":
        grantAgility(self, amount);
        break;
      case "covertOps":
        grantCovertOps(self, amount);
        break;
      case "timeBomb":
        break;
    }
  }
  function playActionCard(state, playerIdx, phase, card, rng) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const cost = card.cpCost ?? 0;
    if (self.cp < cost) {
      log(state, playerIdx, phase, `Not enough CP to play ${card.name} (needs ${cost}, have ${self.cp})`);
      return;
    }
    self.cp -= cost;
    self.hand.splice(self.hand.indexOf(card.id), 1);
    self.discard.push(card.id);
    if (card.id === "dancing-pumpkin") {
      if (hasHead(self)) {
        grantDreadful(self, 2);
        log(state, playerIdx, phase, "Dancing Pumpkin!: +2 Dreadful (Haunted Head)");
      } else {
        grantGrimPursuit(self, 2);
        log(state, playerIdx, phase, "Dancing Pumpkin!: +2 Grim Pursuit");
      }
      return;
    }
    if (card.id === "vegas-baby") {
      const v = rollDie(rng);
      const gain = Math.ceil(v / 2);
      grantCp(self, gain);
      log(state, playerIdx, phase, `Vegas Baby!: rolled ${v}, +${gain} CP`);
      return;
    }
    if (card.id === "undercover-mission") {
      const n = inflictTimeBomb(opp, self.upgradesInPlay.length, 1);
      const gotAgility = self.upgradesInPlay.length >= 4;
      if (gotAgility) grantAgility(self, 1);
      log(state, playerIdx, phase, `Undercover Mission!: ${n} Time Bomb inflicted${gotAgility ? ", +1 Agility (>=4 upgrades)" : ""}`);
      return;
    }
    if (card.id === "cunning") {
      const heroT = heroTemplateFor(self.heroId);
      const top = self.deck.slice(0, 5);
      const upgrades = top.filter((id) => cardById(heroT, id)?.kind === "upgrade");
      const rest = top.filter((id) => cardById(heroT, id)?.kind !== "upgrade");
      self.hand.push(...upgrades);
      self.deck = [...rest, ...self.deck.slice(5)];
      log(state, playerIdx, phase, `Cunning!: took ${upgrades.length} Ability Upgrade(s) to hand from the top 5`);
      return;
    }
    const eff = card.effect;
    if (!eff) {
      log(state, playerIdx, phase, `Played ${card.name} for ${cost} CP \u2014 TODO(user): effect not structured yet, no game-state change applied`);
      return;
    }
    const parts = [];
    if (eff.cpGain) {
      grantCp(self, eff.cpGain);
      parts.push(`+${eff.cpGain} CP`);
    }
    if (eff.cardDraw) {
      drawCards(self, eff.cardDraw, rng);
      parts.push(`drew ${eff.cardDraw}`);
    }
    if (eff.damage) {
      opp.hp -= eff.damage;
      parts.push(`${eff.damage} dmg to opponent`);
    }
    if (eff.tokensGrantedToSelf) {
      for (const [kind, amount] of Object.entries(eff.tokensGrantedToSelf)) {
        if (amount) {
          grantTokenToSelf(self, kind, amount);
          parts.push(`+${amount} ${kind}`);
        }
      }
    }
    if (eff.tokensInflictedOnOpponent?.timeBomb && self.heroId === "bw") {
      const n = inflictTimeBomb(opp, self.upgradesInPlay.length, eff.tokensInflictedOnOpponent.timeBomb);
      if (n > 0) parts.push(`${n} TB inflicted`);
    }
    log(state, playerIdx, phase, `Played ${card.name} for ${cost} CP (${parts.length > 0 ? parts.join(", ") : "no effect"})`);
  }
  function playOffensiveRollPhase(state, playerIdx, rng, policy) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const beforeReroll = (step) => {
      if (self.heroId === "bw") {
        const cardIds = policy.chooseMidRollCards(state, playerIdx, step.dice, step.rollsRemaining);
        for (const id of cardIds) playCard(state, playerIdx, "roll", id, rng);
      }
      let dice = step.dice;
      let extraRollsGranted = 0;
      const eligible = eligibleRollManipulationCardIds(self);
      if (eligible.length > 0) {
        const choices = policy.chooseRollManipulationCards(state, playerIdx, dice, step.rollsRemaining, eligible);
        for (const choice of choices) {
          const r = applyRollManipulationCard(state, playerIdx, choice, dice, rng);
          dice = r.dice;
          extraRollsGranted += r.extraRollsGranted;
        }
      }
      if (step.rollsRemaining === 0 && self.heroId === "hh" && self.tokens.grimPursuit >= 1 && !self.grimPursuitRerollUsedThisTurn && policy.chooseGrimPursuitReroll?.(state, playerIdx, dice)) {
        spendGrimPursuit(self, 1);
        self.grimPursuitRerollUsedThisTurn = true;
        extraRollsGranted += 1;
        log(state, playerIdx, "roll", "Grim Pursuit (mode a): +1 additional Roll Attempt");
      }
      return { oracleState: oracleStateFor(self, opp), dice, extraRollsGranted };
    };
    const finalDice = runOffensiveRoll(self.heroId, oracleStateFor(self, opp), rng, beforeReroll);
    log(state, playerIdx, "roll", `Final dice: ${finalDice.join(",")}`);
    return finalDice;
  }
  function resolveOffensiveAlterWindow(state, rollerIdx, dice, rng, policies) {
    const oppIdx = 1 - rollerIdx;
    state.pendingRoll = { rollerIdx, dice: [...dice] };
    resolveResponseWindow(state, [rollerIdx, oppIdx], { windowType: "offensiveRoll" }, rng, policies, enumerateWindowActions, applyWindowAction);
    const finalDice = state.pendingRoll.dice;
    state.pendingRoll = null;
    if (finalDice.join(",") !== dice.join(",")) log(state, rollerIdx, "roll", `Dice after alteration: ${finalDice.join(",")}`);
    return finalDice;
  }
  var ROLL_MANIPULATION_CARD_IDS = ["one-more-time", "try-try-again", "six-it", "so-wild", "twice-as-wild", "samesies"];
  function eligibleRollManipulationCardIds(self) {
    const hero = heroTemplateFor(self.heroId);
    return ROLL_MANIPULATION_CARD_IDS.filter((id) => self.hand.includes(id) && self.cp >= (cardById(hero, id)?.cpCost ?? 0));
  }
  function applyRollManipulationCard(state, playerIdx, choice, dice, rng) {
    const self = state.players[playerIdx];
    const hero = heroTemplateFor(self.heroId);
    const card = cardById(hero, choice.cardId);
    if (!card || !self.hand.includes(choice.cardId) || self.cp < (card.cpCost ?? 0)) return { dice, extraRollsGranted: 0 };
    self.cp -= card.cpCost ?? 0;
    self.hand.splice(self.hand.indexOf(choice.cardId), 1);
    self.discard.push(choice.cardId);
    if (choice.cardId === "one-more-time") {
      log(state, playerIdx, "roll", "One More Time!: +1 additional Roll Attempt");
      return { dice, extraRollsGranted: 1 };
    }
    const newDice = dice.slice();
    const indices = choice.dieIndices ?? [];
    if (choice.cardId === "try-try-again") {
      for (const i of indices) newDice[i] = rollDie(rng);
      log(state, playerIdx, "roll", `Try, Try Again!: rerolled ${indices.length} dice`);
      return { dice: newDice, extraRollsGranted: 0 };
    }
    const values = choice.values ?? [];
    indices.forEach((i, k) => {
      newDice[i] = values[k];
    });
    log(state, playerIdx, "roll", `${card.name}: set ${indices.length} dice to [${values.join(",")}]`);
    return { dice: newDice, extraRollsGranted: 0 };
  }
  function playMainPhase(state, playerIdx, phase, policies, rng) {
    const oppIdx = 1 - playerIdx;
    resolveResponseWindow(state, [playerIdx, oppIdx], { windowType: "mainPhase", phase }, rng, policies, enumerateWindowActions, applyWindowAction);
  }
  var INSTANT_SELFBUFF_IDS = ["getting-paid", "double-up", "triple-up", "dark-surprise", "assemble"];
  var MAIN_PHASE_ACTION_IDS = ["dancing-pumpkin", "vegas-baby", "undercover-mission", "cunning"];
  function anyoneHasHead(state) {
    return state.players[0].tokens.head > 0 || state.players[1].tokens.head > 0;
  }
  function hasAnyTransferable(p) {
    return TRANSFERABLE_TOKENS.some((k) => countToken(p, k) > 0);
  }
  function pushCrossPlayerOptions(state, canAfford, options) {
    if (canAfford("transference")) {
      for (const from of [0, 1]) {
        const to = 1 - from;
        for (const k of TRANSFERABLE_TOKENS) {
          if (countToken(state.players[from], k) > 0) {
            options.push({ kind: "transferToken", cardId: "transference", tokenKind: k, fromIdx: from, toIdx: to });
          }
        }
      }
    }
    if (canAfford("get-that-outta-here")) {
      for (const t of [0, 1]) {
        for (const k of TRANSFERABLE_TOKENS) {
          if (countToken(state.players[t], k) > 0) {
            options.push({ kind: "removeToken", cardId: "get-that-outta-here", tokenKind: k, targetIdx: t });
          }
        }
      }
    }
    if (canAfford("what-status-effects")) {
      for (const t of [0, 1]) {
        if (hasAnyTransferable(state.players[t])) options.push({ kind: "removeAllTokens", cardId: "what-status-effects", targetIdx: t });
      }
    }
  }
  function pushSetDieOptions(dice, canAfford, options) {
    const values = [1, 2, 3, 4, 5, 6];
    if (canAfford("so-wild")) {
      dice.forEach((_, i) => {
        for (const v of values) options.push({ kind: "setDie", cardId: "so-wild", sets: [{ dieIndex: i, value: v }] });
      });
    }
    if (canAfford("twice-as-wild")) {
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          for (const vi of values) for (const vj of values) {
            options.push({ kind: "setDie", cardId: "twice-as-wild", sets: [{ dieIndex: i, value: vi }, { dieIndex: j, value: vj }] });
          }
        }
      }
    }
  }
  function enumerateWindowActions(state, playerIdx, ctx) {
    const options = [{ kind: "pass" }];
    const player = state.players[playerIdx];
    const hero = heroTemplateFor(player.heroId);
    const canAfford = (id) => player.hand.includes(id) && player.cp >= (cardById(hero, id)?.cpCost ?? 0);
    for (const id of INSTANT_SELFBUFF_IDS) if (canAfford(id)) options.push({ kind: "playInstant", cardId: id });
    if (canAfford("rolling-pumpkin") && anyoneHasHead(state)) {
      for (const to of [0, 1]) options.push({ kind: "moveHead", cardId: "rolling-pumpkin", toIdx: to });
    }
    if (ctx.windowType === "mainPhase") {
      if (playerIdx === state.activePlayerIdx) {
        for (const cardId of player.hand) {
          const card = cardById(hero, cardId);
          if (!card || card.kind !== "upgrade" || card.cpCost == null) continue;
          const existingId = player.upgradesInPlay.find((id) => cardById(hero, id)?.upgradeSlot === card.upgradeSlot);
          const existingCost = existingId ? cardById(hero, existingId)?.cpCost ?? 0 : 0;
          const cost = Math.max(0, card.cpCost - existingCost);
          if (cost <= player.cp) options.push({ kind: "playCard", cardId });
        }
        if (player.tokens.covertOps > 0 && !player.covertOpsUsedThisTurn) {
          for (const cardId of player.hand) {
            const card = cardById(hero, cardId);
            if (card?.kind === "upgrade" && card.upgradeSlot) options.push({ kind: "covertOpsUpgrade", cardId });
          }
        }
        for (const id of MAIN_PHASE_ACTION_IDS) if (canAfford(id)) options.push({ kind: "playInstant", cardId: id });
        for (const cardId of player.hand) options.push({ kind: "sellCard", cardId });
        pushCrossPlayerOptions(state, canAfford, options);
      }
    } else if (ctx.windowType === "defense") {
      const pa = state.pendingAttack;
      if (pa && pa.remaining > 0 && playerIdx === pa.defenderIdx) {
        for (const cardId of eligibleDefensiveCardIds(player, ctx.eludeEligible ?? false)) {
          options.push({ kind: "playCard", cardId });
        }
      }
    } else if (ctx.windowType === "offensiveRoll" || ctx.windowType === "defenseRoll") {
      const pr = state.pendingRoll;
      if (pr) {
        if (canAfford("tip-it")) {
          pr.dice.forEach((v, i) => {
            if (v < 6) options.push({ kind: "alterDie", cardId: "tip-it", dieIndex: i, delta: 1 });
            if (v > 1) options.push({ kind: "alterDie", cardId: "tip-it", dieIndex: i, delta: -1 });
          });
        }
        if (playerIdx !== pr.rollerIdx && canAfford("helping-hand")) {
          pr.dice.forEach((_, i) => options.push({ kind: "rerollDie", cardId: "helping-hand", dieIndex: i }));
        }
        if (ctx.windowType === "defenseRoll" && playerIdx === pr.rollerIdx && canAfford("better-d")) {
          options.push({ kind: "rerollAll", cardId: "better-d" });
        }
        pushSetDieOptions(pr.dice, canAfford, options);
      }
    }
    return options;
  }
  function applyWindowAction(state, playerIdx, action, ctx, rng) {
    if (action.kind === "pass") return;
    if (action.kind === "playCard") {
      if (ctx.windowType === "defense") {
        const pa = state.pendingAttack;
        if (pa) pa.remaining = applyDefensiveCard(state, pa.defenderIdx, action.cardId, pa.remaining, rng);
        return;
      }
      playCard(state, playerIdx, ctx.phase ?? "main1", action.cardId, rng);
      return;
    }
    if (action.kind === "playInstant") {
      const card = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId);
      if (card) playActionCard(state, playerIdx, ctx.phase ?? "main2", card, rng);
      return;
    }
    if (action.kind === "sellCard") {
      const self = state.players[playerIdx];
      const i = self.hand.indexOf(action.cardId);
      if (i < 0) return;
      self.hand.splice(i, 1);
      self.discard.push(action.cardId);
      grantCp(self, 1);
      log(state, playerIdx, ctx.phase ?? "main1", `Sold ${action.cardId} (+1 CP)`);
      return;
    }
    if (action.kind === "transferToken") {
      applyTransferToken(state, playerIdx, action, rng);
      return;
    }
    if (action.kind === "removeToken") {
      applyRemoveToken(state, playerIdx, action);
      return;
    }
    if (action.kind === "removeAllTokens") {
      applyRemoveAllTokens(state, playerIdx, action);
      return;
    }
    if (action.kind === "moveHead") {
      applyMoveHead(state, playerIdx, action);
      return;
    }
    if (action.kind === "covertOpsUpgrade") {
      applyCovertOpsUpgrade(state, playerIdx, action.cardId);
      return;
    }
    if (action.kind === "spendGrimPursuitBonus") return;
    const pr = state.pendingRoll;
    if (!pr || !spendActionCard(state, playerIdx, action.cardId)) return;
    if (action.kind === "setDie") {
      const before = pr.dice.join(",");
      for (const s of action.sets) pr.dice[s.dieIndex] = s.value;
      log(state, playerIdx, "roll", `${action.cardId === "so-wild" ? "So Wild!" : "Twice As Wild!"}: set dice ${before}->${pr.dice.join(",")}`);
      return;
    }
    if (action.kind === "rerollAll") {
      const before = pr.dice.join(",");
      const targets = action.dieIndices ?? pr.dice.map((_, i) => i);
      for (const i of targets) if (i >= 0 && i < pr.dice.length) pr.dice[i] = 1 + Math.floor(rng() * 6);
      log(state, playerIdx, "roll", `Better D!: rerolled ${targets.length} dice ${before}->${pr.dice.join(",")}`);
      return;
    }
    const old = pr.dice[action.dieIndex];
    if (action.kind === "alterDie") {
      pr.dice[action.dieIndex] = Math.max(1, Math.min(6, old + action.delta));
      log(state, playerIdx, "roll", `Tip It!: die ${action.dieIndex + 1} ${old}->${pr.dice[action.dieIndex]}`);
    } else if (action.kind === "rerollDie") {
      pr.dice[action.dieIndex] = 1 + Math.floor(rng() * 6);
      log(state, playerIdx, "roll", `Helping Hand!: rerolled die ${action.dieIndex + 1} ${old}->${pr.dice[action.dieIndex]}`);
    }
  }
  function grantTransferable(to, kind, pos) {
    if (kind === "timeBomb") {
      if (to.timeBombs.length < TIME_BOMB_STACK_CAP) to.timeBombs.push(pos ?? "0:02");
    } else if (kind === "dreadful") grantDreadful(to, 1);
    else if (kind === "grimPursuit") grantGrimPursuit(to, 1);
    else grantAgility(to, 1);
  }
  function removeTransferable(from, kind) {
    if (kind === "timeBomb") return from.timeBombs.pop();
    from.tokens[kind] = Math.max(0, from.tokens[kind] - 1);
    return void 0;
  }
  function applyTransferToken(state, playerIdx, action, _rng) {
    const from = state.players[action.fromIdx];
    if (countToken(from, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return;
    const pos = removeTransferable(from, action.tokenKind);
    grantTransferable(state.players[action.toIdx], action.tokenKind, pos);
    log(state, playerIdx, ctxPhaseless, `Transference!: moved ${action.tokenKind} from p${action.fromIdx} to p${action.toIdx}`);
  }
  function applyRemoveToken(state, playerIdx, action) {
    const target = state.players[action.targetIdx];
    if (countToken(target, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return;
    removeTransferable(target, action.tokenKind);
    log(state, playerIdx, ctxPhaseless, `Get That Outta Here!: removed ${action.tokenKind} from p${action.targetIdx}`);
  }
  function applyRemoveAllTokens(state, playerIdx, action) {
    if (!spendActionCard(state, playerIdx, action.cardId)) return;
    const target = state.players[action.targetIdx];
    target.tokens.dreadful = 0;
    target.tokens.grimPursuit = 0;
    target.tokens.agility = 0;
    target.timeBombs = [];
    log(state, playerIdx, ctxPhaseless, `What Status Effects?: removed all status tokens from p${action.targetIdx}`);
  }
  function applyMoveHead(state, playerIdx, action) {
    if (!(state.players[0].tokens.head > 0 || state.players[1].tokens.head > 0) || !spendActionCard(state, playerIdx, action.cardId)) return;
    state.players[0].tokens.head = 0;
    state.players[1].tokens.head = 0;
    state.players[action.toIdx].tokens.head = 1;
    log(state, playerIdx, ctxPhaseless, `Rolling Pumpkin!: moved the Haunted Head to p${action.toIdx}`);
  }
  var ctxPhaseless = "main2";
  function spendActionCard(state, playerIdx, cardId) {
    const player = state.players[playerIdx];
    const card = cardById(heroTemplateFor(player.heroId), cardId);
    if (!card || !player.hand.includes(cardId) || player.cp < (card.cpCost ?? 0)) return false;
    player.cp -= card.cpCost ?? 0;
    player.hand.splice(player.hand.indexOf(cardId), 1);
    player.discard.push(cardId);
    return true;
  }
  function resolveDefense(state, attackerIdx, incomingDamage, rng, policies) {
    const attacker = state.players[attackerIdx];
    const defenderIdx = 1 - attackerIdx;
    const defender = state.players[defenderIdx];
    const policy = policies[defenderIdx];
    let hallowedUpgraded = false;
    let defenseDice;
    if (defender.heroId === "bw") {
      defenseDice = rollSabotageDice(defender, rng, policy, state, defenderIdx, defender.upgradesInPlay.includes("sabotage-ii"));
    } else {
      hallowedUpgraded = defender.upgradesInPlay.includes("hallowed-reckoning-ii");
      defenseDice = rollHallowedDice(defender, rng, hallowedUpgraded);
    }
    state.pendingRoll = { rollerIdx: defenderIdx, dice: defenseDice };
    state.pendingDefenseRoll = { attackerIdx, incomingDamage };
    resolveResponseWindow(state, [attackerIdx, defenderIdx], { windowType: "defenseRoll" }, rng, policies, enumerateWindowActions, applyWindowAction);
    const finalDefenseDice = state.pendingRoll.dice;
    state.pendingRoll = null;
    state.pendingDefenseRoll = null;
    finalizeDefenseRoll(state, attackerIdx, incomingDamage, finalDefenseDice, rng, policies);
  }
  function finalizeDefenseRoll(state, attackerIdx, incomingDamage, finalDefenseDice, rng, policies) {
    const defenderIdx = 1 - attackerIdx;
    const attacker = state.players[attackerIdx];
    const defender = state.players[defenderIdx];
    let damagePrevented = 0;
    if (defender.heroId === "bw") {
      const r = countSabotage(finalDefenseDice);
      damagePrevented = r.damagePrevented;
      if (r.damageToAttacker > 0) queueDamage(state, attackerIdx, r.damageToAttacker);
      if (r.tbInflictedOnAttacker > 0) inflictTimeBomb(attacker, defender.upgradesInPlay.length, r.tbInflictedOnAttacker);
      log(state, defenderIdx, "defense", `Sabotage: prevented ${r.damagePrevented}, ${r.damageToAttacker} dmg back, ${r.tbInflictedOnAttacker} TB inflicted`);
    } else {
      const hallowedUpgraded = defender.upgradesInPlay.includes("hallowed-reckoning-ii");
      const r = hallowedEffects(defender, finalDefenseDice, hallowedUpgraded);
      damagePrevented = r.damagePrevented;
      if (r.counterDamageToAttacker > 0) queueDamage(state, attackerIdx, r.counterDamageToAttacker);
      log(state, defenderIdx, "defense", `Hallowed Reckoning${hallowedUpgraded ? " II" : ""}: prevented ${r.damagePrevented}, ${r.counterDamageToAttacker} dmg back, +${r.dreadfulGained} Dreadful, +${r.grimPursuitGained} Grim Pursuit`);
    }
    let remaining = Math.max(0, incomingDamage - damagePrevented);
    let eludeEligible = false;
    if (defender.heroId === "bw" && defender.tokens.agility > 0 && remaining > 0) {
      const r = spendAgilityToHalveDamage(defender, remaining, rng);
      remaining = r.remainingDamage;
      log(state, defenderIdx, "defense", `Agility spent: rolled ${r.roll}, ${r.succeeded ? "halved damage" : "no effect"}`);
      eludeEligible = !r.succeeded && r.roll >= 5;
    }
    state.pendingAttack = { attackerIdx, defenderIdx, remaining };
    resolveResponseWindow(
      state,
      [attackerIdx, defenderIdx],
      { windowType: "defense", eludeEligible },
      rng,
      policies,
      enumerateWindowActions,
      applyWindowAction
    );
    finalizePendingAttackDamage(state);
  }
  var DEFENSIVE_CARD_IDS = ["not-this-time", "spirited-reprisal", "recoil"];
  function eligibleDefensiveCardIds(defender, eludeEligible) {
    const hero = heroTemplateFor(defender.heroId);
    const ids = DEFENSIVE_CARD_IDS.filter((id) => defender.hand.includes(id));
    if (eludeEligible && defender.hand.includes("elude")) ids.push("elude");
    return ids.filter((id) => defender.cp >= (cardById(hero, id)?.cpCost ?? 0));
  }
  function applyDefensiveCard(state, defenderIdx, cardId, remaining, rng) {
    const defender = state.players[defenderIdx];
    const hero = heroTemplateFor(defender.heroId);
    const card = cardById(hero, cardId);
    if (!card || !defender.hand.includes(cardId) || defender.cp < (card.cpCost ?? 0)) return remaining;
    defender.cp -= card.cpCost ?? 0;
    defender.hand.splice(defender.hand.indexOf(cardId), 1);
    defender.discard.push(cardId);
    if (cardId === "not-this-time") {
      const prevented = Math.min(remaining, 6);
      log(state, defenderIdx, "defense", `Not This Time!: prevented ${prevented} dmg`);
      return remaining - prevented;
    }
    if (cardId === "spirited-reprisal") {
      if (!hasHead(defender)) {
        log(state, defenderIdx, "defense", "Spirited Reprisal!: no effect (no Haunted Head)");
        return remaining;
      }
      const prevented = Math.min(remaining, 3);
      log(state, defenderIdx, "defense", `Spirited Reprisal!: prevented ${prevented} dmg (Haunted Head)`);
      return remaining - prevented;
    }
    if (cardId === "recoil") {
      const r = resolveRecoil(remaining, rng);
      if (r.cpGained > 0) grantCp(defender, r.cpGained);
      log(state, defenderIdx, "defense", `Recoil!: prevented ${r.damagePrevented} dmg, +${r.cpGained} CP`);
      return remaining - r.damagePrevented;
    }
    if (cardId === "elude") {
      log(state, defenderIdx, "defense", `Elude!: ignored all ${remaining} incoming dmg`);
      return 0;
    }
    return remaining;
  }
  var ATTACK_MODIFIER_CARD_IDS = ["unescapable", "cranial-assist", "subversion", "thundering-hooves"];
  function eligibleAttackModifierCardIds(self) {
    const hero = heroTemplateFor(self.heroId);
    return ATTACK_MODIFIER_CARD_IDS.filter((id) => {
      if (!self.hand.includes(id)) return false;
      const card = cardById(hero, id);
      if (!card || self.cp < (card.cpCost ?? 0)) return false;
      if (id === "unescapable" && self.tokens.grimPursuit < 1) return false;
      return true;
    });
  }
  function applyAttackModifierCard(state, playerIdx, cardId, current) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const hero = heroTemplateFor(self.heroId);
    const card = cardById(hero, cardId);
    if (!card || !self.hand.includes(cardId) || self.cp < (card.cpCost ?? 0)) return current;
    self.cp -= card.cpCost ?? 0;
    self.hand.splice(self.hand.indexOf(cardId), 1);
    self.discard.push(cardId);
    if (cardId === "unescapable") {
      spendGrimPursuit(self, 1);
      log(state, playerIdx, "resolveAttack", "Unescapable!: spent 1 Grim Pursuit, attack is now undefendable");
      return { ...current, undefendable: true };
    }
    if (cardId === "cranial-assist") {
      const oppHasHead = hasHead(opp);
      log(state, playerIdx, "resolveAttack", oppHasHead ? "Cranial Assist!: +3 dmg (opponent holds the Head)" : "Cranial Assist!: no effect (opponent lacks the Head)");
      return { ...current, dmg: current.dmg + (oppHasHead ? 3 : 0) };
    }
    if (cardId === "subversion") {
      const bonus = 2 + self.upgradesPlayedThisTurn;
      log(state, playerIdx, "resolveAttack", `Subversion!: +${bonus} dmg (${self.upgradesPlayedThisTurn} Ability Upgrade(s) played this turn)`);
      return { ...current, dmg: current.dmg + bonus };
    }
    if (cardId === "thundering-hooves") {
      const spend = Math.min(3, self.cp);
      self.cp -= spend;
      grantGrimPursuit(self, spend);
      log(state, playerIdx, "resolveAttack", `Thundering Hooves!: spent ${spend} CP for +${spend} Grim Pursuit`);
      return current;
    }
    return current;
  }
  function applyAttackModifiers(state, playerIdx, policy, initial, rng) {
    const self = state.players[playerIdx];
    let result = initial;
    const eligible = eligibleAttackModifierCardIds(self);
    if (eligible.length > 0) {
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligible);
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result);
    }
    if (self.heroId === "hh" && self.tokens.grimPursuit >= 1 && !self.grimPursuitBonusUsedThisTurn) {
      if (policy.chooseGrimPursuitSpend?.(state, playerIdx, result.dmg)) {
        const bonus = spendGrimPursuitForBonusDamage(self, rng);
        if (bonus > 0) {
          self.grimPursuitBonusUsedThisTurn = true;
          result = { ...result, dmg: result.dmg + bonus };
          log(state, playerIdx, "resolveAttack", `Grim Pursuit spend (b): rolled ${bonus}, +${bonus} dmg`);
        }
      }
    }
    return result;
  }
  function applyWhiffPassive(state, playerIdx) {
    const self = state.players[playerIdx];
    if (self.heroId === "hh") {
      grantGrimPursuit(self, 1);
      log(state, playerIdx, "resolveAttack", "Whiff: +1 Grim Pursuit");
    }
  }
  function applyHHAbility(state, playerIdx, name, dice, rng, policies) {
    const policy = policies[playerIdx];
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const data = resolvedAbilityByBoardName(heroTemplateFor("hh"), name, self.upgradesInPlay);
    if (!data) {
      log(state, playerIdx, "resolveAttack", `Unknown ability "${name}" \u2014 no data, skipped`);
      return;
    }
    const tokens = self.tokens;
    let dmg = data.baseDamage ?? 0;
    if (data.baseDamage == null) log(state, playerIdx, "resolveAttack", `${name}: baseDamage TODO(user) \u2014 0 dmg applied`);
    const horrifyUpgraded = self.upgradesInPlay.includes("horrify-ii");
    if (name.startsWith("Horrify")) {
      if (tokens.head > 0 || horrifyUpgraded) {
        if (data.tokensGrantedToSelf?.dreadful) grantDreadful(self, data.tokensGrantedToSelf.dreadful);
        const grimPursuit = horrifyUpgraded ? data.tokensGrantedToSelf?.grimPursuit : data.tokensGrantedIfHasHead?.grimPursuit;
        if (grimPursuit) grantGrimPursuit(self, grimPursuit);
      } else {
        const choice = policy.chooseHorrifyBonus(state, playerIdx);
        if (choice === "dreadful" && data.tokensGrantedToSelf?.dreadful) grantDreadful(self, data.tokensGrantedToSelf.dreadful);
        else if (data.tokensGrantedIfHasHead?.grimPursuit) grantGrimPursuit(self, data.tokensGrantedIfHasHead.grimPursuit);
        log(state, playerIdx, "resolveAttack", `Horrify: chose ${choice} (no Haunted Head)`);
      }
    } else {
      if (data.tokensGrantedToSelf?.dreadful) grantDreadful(self, data.tokensGrantedToSelf.dreadful);
      if (data.tokensGrantedToSelf?.grimPursuit) grantGrimPursuit(self, data.tokensGrantedToSelf.grimPursuit);
    }
    let undefendableOverride = false;
    if (data.bonusRoll) {
      const r = resolveSpectralAssaultBonusRoll(self, rng);
      dmg += r.bonusDamage;
      if (r.undefendable) undefendableOverride = true;
      if (r.grimPursuitGained > 0) grantGrimPursuit(self, r.grimPursuitGained);
      log(state, playerIdx, "resolveAttack", `${name} bonus roll: +${r.bonusDamage} dmg, undefendable=${r.undefendable}, +${r.grimPursuitGained} Grim Pursuit`);
    }
    if (data.numberMatchBonus) {
      const ofAKind = self.upgradesInPlay.includes("cleave-ii") ? 3 : data.numberMatchBonus.ofAKind;
      if (hasNumberMatch(dice, ofAKind)) {
        if (data.numberMatchBonus.tokensGranted.dreadful) grantDreadful(self, data.numberMatchBonus.tokensGranted.dreadful);
        log(state, playerIdx, "resolveAttack", `${name}: ${ofAKind}-of-a-kind bonus triggered`);
      }
    }
    const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: undefendableOverride }, rng);
    dmg = modified.dmg;
    undefendableOverride = modified.undefendable;
    if ((data.defendable ?? true) && !undefendableOverride) resolveDefense(state, playerIdx, dmg, rng, policies);
    else {
      queueDamage(state, 1 - playerIdx, dmg);
      flushDamage(state);
    }
    if (tokens.head > 0 && data.cardDrawIfHasHead) {
      drawCards(self, 1, rng);
      log(state, playerIdx, "resolveAttack", `${name}: drew 1 card (Haunted Head)`);
    }
    if (data.cardDraw) {
      drawCards(self, data.cardDraw, rng);
      log(state, playerIdx, "resolveAttack", `${name}: drew ${data.cardDraw} card(s)`);
    }
  }
  function applyBWAbility(state, playerIdx, name, rng, policies) {
    const policy = policies[playerIdx];
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const data = resolvedAbilityByBoardName(heroTemplateFor("bw"), name, self.upgradesInPlay);
    if (!data) {
      log(state, playerIdx, "resolveAttack", `Unknown ability "${name}" \u2014 no data, skipped`);
      return;
    }
    let dmg = data.baseDamage ?? 0;
    if (data.bonusDamagePerUpgrade) dmg += data.bonusDamagePerUpgrade * self.upgradesInPlay.length;
    if (data.thresholdBonus && self.upgradesInPlay.length >= data.thresholdBonus.upgradesAtLeast) {
      dmg += data.thresholdBonus.bonusDamage;
    }
    dmg += rrtAttackBonus(self.upgradesInPlay);
    if (name.startsWith("Vengeance")) {
      const riderDice = self.upgradesInPlay.includes("vengeance-ii") ? 5 : 4;
      const rider = resolveVengeanceRider(self, opp, rng, riderDice);
      dmg += rider.bonusDamage;
      log(state, playerIdx, "resolveAttack", `Vengeance rider: +${rider.bonusDamage} dmg, ${rider.tbInflictedOnOpponent} TB inflicted, +${rider.covertOpsGained} Covert Ops`);
    }
    const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: !(data.defendable ?? true) }, rng);
    dmg = modified.dmg;
    if (data.defendable ?? true) {
      if (modified.undefendable) {
        queueDamage(state, 1 - playerIdx, dmg);
        flushDamage(state);
      } else resolveDefense(state, playerIdx, dmg, rng, policies);
    } else {
      queueDamage(state, 1 - playerIdx, dmg);
      flushDamage(state);
    }
    if (data.cpGain) grantCp(self, data.cpGain);
    if (data.cpGainIfUpgradesAtLeast && self.upgradesInPlay.length >= data.cpGainIfUpgradesAtLeast.upgradesAtLeast) {
      grantCp(self, data.cpGainIfUpgradesAtLeast.cpGain);
    }
    if (data.tokensGrantedToSelf?.agility) grantAgility(self, data.tokensGrantedToSelf.agility);
    if (data.advancesAllTimeBombsInPlay) {
      const upgraded = self.upgradesInPlay.includes("infiltrate-ii");
      if (!upgraded) {
        const n = advanceAllTimeBombs(opp);
        if (n > 0) log(state, playerIdx, "resolveAttack", `Advanced all Time Bombs: ${n} detonated`);
      }
      if (data.tokensInflictedOnOpponent?.timeBomb) {
        inflictTimeBomb(opp, self.upgradesInPlay.length, data.tokensInflictedOnOpponent.timeBomb);
      }
      if (upgraded) {
        const n = advanceAllTimeBombs(opp);
        if (n > 0) log(state, playerIdx, "resolveAttack", `Advanced all Time Bombs: ${n} detonated`);
      }
    } else if (data.tokensInflictedOnOpponent?.timeBomb) {
      inflictTimeBomb(opp, self.upgradesInPlay.length, data.tokensInflictedOnOpponent.timeBomb);
    }
    if (data.searchUpgradesIntoPlay) {
      const found = searchDeckForUpgrades(state, playerIdx, data.searchUpgradesIntoPlay, rng);
      log(state, playerIdx, "resolveAttack", found.length > 0 ? `Searched deck: put ${found.join(", ")} into play` : "Searched deck: no Ability Upgrades found");
    }
  }
  function searchDeckForUpgrades(state, playerIdx, count, rng) {
    const self = state.players[playerIdx];
    const hero = heroTemplateFor(self.heroId);
    const found = [];
    const remaining = [];
    for (const cardId of shuffle(self.deck, rng)) {
      const card = cardById(hero, cardId);
      if (found.length < count && card?.kind === "upgrade") found.push(cardId);
      else remaining.push(cardId);
    }
    for (const cardId of found) {
      const slot = cardById(hero, cardId)?.upgradeSlot;
      const existingId = self.upgradesInPlay.find((id) => cardById(hero, id)?.upgradeSlot === slot);
      if (existingId) self.upgradesInPlay = self.upgradesInPlay.filter((id) => id !== existingId);
      self.upgradesInPlay.push(cardId);
    }
    self.deck = remaining;
    return found;
  }
  function resolveAbilityPhase(state, playerIdx, dice, rng, policies) {
    const policy = policies[playerIdx];
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const oState = oracleStateFor(self, opp);
    const candidates = resolveMatchedAbilities(self.heroId, dice, oState);
    if (candidates.length === 0) {
      log(state, playerIdx, "resolveAttack", "No ability matched (Whiff)");
      applyWhiffPassive(state, playerIdx);
      return;
    }
    const chosenName = candidates.length === 1 ? candidates[0].name : policy.chooseAbility(state, playerIdx, candidates);
    log(state, playerIdx, "resolveAttack", `Chose ability: ${chosenName}`);
    if (self.heroId === "hh") applyHHAbility(state, playerIdx, chosenName, dice, rng, policies);
    else applyBWAbility(state, playerIdx, chosenName, rng, policies);
  }
  function playEndOfTurn(state, playerIdx) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    if (self.heroId === "hh" && endOfTurnHeadCheck(self)) {
      log(state, playerIdx, "endOfTurn", "Opponent holds the Head: +1 Dreadful");
    }
    log(state, playerIdx, "endOfTurn", `HP: self=${self.hp}, opp=${opp.hp}`);
  }
  function playTurn(state, playerIdx, rng, policies) {
    const policy = policies[playerIdx];
    playUpkeepPhase(state, playerIdx, rng, policy);
    if (checkGameOver(state)) return;
    playIncomePhase(state, playerIdx, rng);
    playMainPhase(state, playerIdx, "main1", policies, rng);
    const dice = playOffensiveRollPhase(state, playerIdx, rng, policy);
    const finalDice = resolveOffensiveAlterWindow(state, playerIdx, dice, rng, policies);
    resolveAbilityPhase(state, playerIdx, finalDice, rng, policies);
    if (checkGameOver(state)) return;
    playMainPhase(state, playerIdx, "main2", policies, rng);
    playDiscardPhase(state, playerIdx, policy);
    playEndOfTurn(state, playerIdx);
  }

  // src/sim/match.ts
  function buildFullDeck(heroId) {
    const hero = heroTemplateFor(heroId);
    return [...hero.cards.map((c) => c.id), ...commonCards.cards.map((c) => c.id)];
  }
  function createInitialPlayer(heroId, rng, isFirstPlayer = true) {
    let deck = [];
    let hand = [];
    if (rng) {
      deck = shuffle(buildFullDeck(heroId), rng);
      hand = deck.splice(0, STARTING_HAND_SIZE);
    }
    const tokens = heroId === "hh" ? createInitialHHTokens(true) : createInitialBWTokens();
    if (heroId === "hh" && !isFirstPlayer) {
      tokens.dreadful += 1;
    }
    return {
      heroId,
      hp: STARTING_HP,
      cp: STARTING_CP,
      upgradesInPlay: [],
      hand,
      deck,
      discard: [],
      tokens,
      timeBombs: [],
      upgradesPlayedThisTurn: 0,
      grimPursuitBonusUsedThisTurn: false,
      covertOpsUsedThisTurn: false,
      grimPursuitRerollUsedThisTurn: false
    };
  }
  function createInitialGameState(heroA, heroB, rng) {
    return {
      turnNumber: 0,
      activePlayerIdx: 0,
      players: [createInitialPlayer(heroA, rng, true), createInitialPlayer(heroB, rng, false)],
      log: [],
      winner: null,
      gameOver: false,
      pendingDamage: [0, 0],
      pendingAttack: null,
      pendingRoll: null,
      pendingDefenseRoll: null
    };
  }
  var MAX_TURNS = 200;
  function runMatch(heroA, heroB, seed, policies) {
    const rng = mulberry32(seed);
    const state = createInitialGameState(heroA, heroB, rng);
    while (!state.gameOver && state.turnNumber < MAX_TURNS) {
      state.turnNumber += 1;
      const activeIdx = state.activePlayerIdx;
      playTurn(state, activeIdx, rng, policies);
      state.activePlayerIdx = 1 - activeIdx;
    }
    return { winner: state.winner, turns: state.turnNumber, finalState: state };
  }

  // src/sim/policy.ts
  var greedyHighestDamagePolicy = {
    chooseMidRollCards: () => [],
    // Scripted decision: in a Main Phase window, play the first affordable Hero Upgrade offered (the
    // engine re-enumerates after each play, so this plays every affordable upgrade one at a time —
    // same net result as the old chooseMainPhaseCards subset). Passes on every other window type,
    // including the DRP5 'defense' window (greedy never plays Action cards — same as the old
    // chooseDefensiveCards: () => []). Options are enumerated in hand order (enumerateWindowActions).
    decide(_state, _playerIdx, request) {
      if (request.ctx.windowType === "mainPhase") {
        const play = request.options.find((o) => o.kind === "playCard");
        if (play) return play;
      }
      return { kind: "pass" };
    },
    chooseSabotageReroll: () => false,
    chooseAbility(_state, _playerIdx, candidates) {
      let best = candidates[0];
      for (const c of candidates) {
        if ((c.baseDamage ?? -Infinity) > (best.baseDamage ?? -Infinity)) best = c;
      }
      return best.name;
    },
    chooseHeadlessMayhem: (_state, _playerIdx, canTerrorize2) => canTerrorize2 ? "terrorize" : "none",
    chooseCardsToDiscard(state, playerIdx, maxHandSize) {
      const hand = state.players[playerIdx].hand;
      const overflow = hand.length - maxHandSize;
      return overflow > 0 ? hand.slice(0, overflow) : [];
    },
    chooseHorrifyBonus: () => "dreadful",
    chooseAttackModifierCards: () => [],
    chooseRollManipulationCards: () => []
  };

  // src/sim/interactive.ts
  function newHumanGame(humanHero, aiHero, ai, rng, humanFirst = true) {
    const state = humanFirst ? createInitialGameState(humanHero, aiHero, rng) : createInitialGameState(aiHero, humanHero, rng);
    const humanIdx = humanFirst ? 0 : 1;
    return { state, humanIdx, aiIdx: 1 - humanIdx, ai, rng };
  }
  function beginHumanTurn(g, mayhem) {
    g.state.turnNumber += 1;
    const policy = mayhem ? { ...greedyHighestDamagePolicy, chooseHeadlessMayhem: () => mayhem } : greedyHighestDamagePolicy;
    playUpkeepPhase(g.state, g.humanIdx, g.rng, policy);
    if (g.state.gameOver) return;
    playIncomePhase(g.state, g.humanIdx, g.rng);
  }
  function humanCanTerrorize(g) {
    const self = g.state.players[g.humanIdx];
    return self.heroId === "hh" && self.tokens.dreadful >= 4;
  }
  var mainCtx = (phase) => ({ windowType: "mainPhase", phase });
  function humanMainOptions(g, phase) {
    return enumerateWindowActions(g.state, g.humanIdx, mainCtx(phase));
  }
  function humanApplyMain(g, action, phase) {
    if (action.kind === "pass") return;
    applyWindowAction(g.state, g.humanIdx, action, mainCtx(phase), g.rng);
  }
  function rollOffense(g, prev, keep) {
    if (!prev) return rollDice(5, g.rng).sort((a, b) => a - b);
    const kept = prev.filter((_, i) => keep[i]);
    const rerolled = rollDice(5 - kept.length, g.rng);
    return [...kept, ...rerolled].sort((a, b) => a - b);
  }
  function beginOffensiveAlter(g, dice) {
    g.state.pendingRoll = { rollerIdx: g.humanIdx, dice: dice.slice() };
  }
  function offensiveAlterOptions(g) {
    return enumerateWindowActions(g.state, g.humanIdx, { windowType: "offensiveRoll" });
  }
  function applyOffensiveAlter(g, action) {
    applyWindowAction(g.state, g.humanIdx, action, { windowType: "offensiveRoll" }, g.rng);
    return g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : [];
  }
  function endOffensiveAlter(g) {
    const d = g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : [];
    g.state.pendingRoll = null;
    return d;
  }
  function matchedAbilities(g, dice) {
    const self = g.state.players[g.humanIdx];
    const opp = g.state.players[g.aiIdx];
    return resolveMatchedAbilities(self.heroId, dice, oracleStateFor(self, opp));
  }
  function humanAttack(g, dice, abilityName, gpBonus = false) {
    const humanPolicy = {
      ...greedyHighestDamagePolicy,
      chooseAbility: () => abilityName,
      chooseGrimPursuitSpend: () => gpBonus
    };
    const policies = g.humanIdx === 0 ? [humanPolicy, g.ai] : [g.ai, humanPolicy];
    resolveAbilityPhase(g.state, g.humanIdx, dice, g.rng, policies);
  }
  function humanSpendGrimPursuitReroll(g) {
    const self = g.state.players[g.humanIdx];
    if (self.heroId !== "hh" || self.tokens.grimPursuit < 1 || self.grimPursuitRerollUsedThisTurn) return false;
    self.tokens.grimPursuit -= 1;
    self.grimPursuitRerollUsedThisTurn = true;
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "roll", message: "Grim Pursuit (mode a): +1 additional Roll Attempt" });
    return true;
  }
  function endHumanTurn(g) {
    if (!g.state.gameOver) {
      playDiscardPhase(g.state, g.humanIdx, greedyHighestDamagePolicy);
      playEndOfTurn(g.state, g.humanIdx);
    }
    g.state.activePlayerIdx = g.aiIdx;
  }
  function runAiTurn(g) {
    if (g.state.gameOver) return;
    g.state.turnNumber += 1;
    const humanDefense = greedyHighestDamagePolicy;
    const policies = g.aiIdx === 0 ? [g.ai, humanDefense] : [humanDefense, g.ai];
    playTurn(g.state, g.aiIdx, g.rng, policies);
    g.state.activePlayerIdx = g.humanIdx;
  }
  var passPolicy = { ...greedyHighestDamagePolicy, decide: () => ({ kind: "pass" }) };
  function order(g, aiPol, humanPol) {
    return g.aiIdx === 0 ? [aiPol, humanPol] : [humanPol, aiPol];
  }
  function defensePolicy(script, probe) {
    let i = 0;
    return {
      ...greedyHighestDamagePolicy,
      decide(state, _p, req) {
        if (i < script.length) return script[i++];
        if (probe && !probe.captured) {
          probe.captured = {
            ctx: req.ctx,
            options: req.options,
            remaining: req.ctx.windowType === "defense" ? state.pendingAttack?.remaining ?? null : null,
            defenseDice: state.pendingRoll ? state.pendingRoll.dice.slice() : null
          };
        }
        i++;
        return { kind: "pass" };
      }
    };
  }
  function computeAttackInfo(g, dice) {
    const ai = g.state.players[g.aiIdx];
    const human = g.state.players[g.humanIdx];
    const cands = resolveMatchedAbilities(ai.heroId, dice, oracleStateFor(ai, human));
    if (cands.length === 0) return { abilityName: null, incomingDamage: 0, defendable: false };
    const name = cands.length === 1 ? cands[0].name : g.ai.chooseAbility(g.state, g.aiIdx, cands);
    const c = cands.find((x) => x.name === name) ?? cands[0];
    return { abilityName: name, incomingDamage: c.baseDamage ?? 0, defendable: c.defendable ?? true };
  }
  function runAiTurnUpToAttack(g) {
    if (g.state.gameOver) return { done: true };
    g.state.turnNumber += 1;
    playUpkeepPhase(g.state, g.aiIdx, g.rng, g.ai);
    if (checkGameOver(g.state)) return { done: true };
    playIncomePhase(g.state, g.aiIdx, g.rng);
    playMainPhase(g.state, g.aiIdx, "main1", order(g, g.ai, passPolicy), g.rng);
    const dice = playOffensiveRollPhase(g.state, g.aiIdx, g.rng, g.ai);
    const finalDice = resolveOffensiveAlterWindow(g.state, g.aiIdx, dice, g.rng, order(g, g.ai, passPolicy));
    const savedRng = g.rng.state;
    const attack = computeAttackInfo(g, finalDice);
    g.def = { finalDice, savedRng, script: [], attack };
    return { done: false, attack };
  }
  function nextDefenseDecision(g) {
    const d = g.def;
    if (!d) return null;
    const clone = structuredClone({ ...g.state, log: [] });
    const cloneRng = mulberry32Stateful(0);
    cloneRng.state = d.savedRng;
    const probe = { captured: null };
    resolveAbilityPhase(clone, g.aiIdx, d.finalDice, cloneRng, order(g, g.ai, defensePolicy(d.script, probe)));
    return probe.captured;
  }
  function chooseDefense(g, action) {
    if (g.def) g.def.script.push(action);
  }
  function resolveAiAttack(g) {
    const d = g.def;
    if (!d) return;
    resolveAbilityPhase(g.state, g.aiIdx, d.finalDice, g.rng, order(g, g.ai, defensePolicy(d.script)));
  }
  function finishAiTurn(g) {
    if (!checkGameOver(g.state)) {
      playMainPhase(g.state, g.aiIdx, "main2", order(g, g.ai, passPolicy), g.rng);
      playDiscardPhase(g.state, g.aiIdx, g.ai);
      playEndOfTurn(g.state, g.aiIdx);
    }
    g.def = void 0;
    g.state.activePlayerIdx = g.humanIdx;
  }

  // src/sim/rl/network.ts
  function tanh(x) {
    return Math.tanh(x);
  }
  function createNetwork(sizes, rng) {
    const layers = [];
    for (let l = 1; l < sizes.length; l++) {
      const fanIn = sizes[l - 1];
      const fanOut = sizes[l];
      const scale = 1 / Math.sqrt(fanIn);
      const W = [];
      for (let i = 0; i < fanOut; i++) {
        const row = [];
        for (let j = 0; j < fanIn; j++) row.push((rng() * 2 - 1) * scale);
        W.push(row);
      }
      const b = new Array(fanOut).fill(0);
      layers.push({ W, b });
    }
    return { sizes, layers };
  }
  function forwardSampleCached(net, input) {
    const activations = [input];
    let a = input;
    for (const layer of net.layers) {
      const next = [];
      for (let i = 0; i < layer.W.length; i++) {
        let z = layer.b[i];
        const row = layer.W[i];
        for (let j = 0; j < row.length; j++) z += row[j] * a[j];
        next.push(tanh(z));
      }
      activations.push(next);
      a = next;
    }
    return activations;
  }
  function forward(net, batch) {
    return batch.map((input) => {
      const activations = forwardSampleCached(net, input);
      return activations[activations.length - 1][0];
    });
  }
  function toJSON(net) {
    return JSON.stringify(net);
  }
  function fromJSON(json) {
    const parsed = JSON.parse(json);
    return parsed;
  }

  // src/sim/rl/features.ts
  var MAX_HP = STARTING_HP + HEAL_CAP_ABOVE_STARTING;
  var MAX_UPGRADES_IN_PLAY = 8;
  var MAX_UPGRADES_PLAYED_PER_TURN = 4;
  function buildHeroEncoding(heroId) {
    const hero = heroTemplateFor(heroId);
    const upgradeIds = hero.cards.filter((c) => c.kind === "upgrade").map((c) => c.id);
    const deck = buildFullDeck(heroId);
    return {
      upgradeIds,
      deckIndex: new Map(deck.map((id, i) => [id, i])),
      deckSize: deck.length
    };
  }
  var ENCODINGS = { hh: buildHeroEncoding("hh"), bw: buildHeroEncoding("bw") };
  var UPGRADE_ONEHOT_SIZE = 8;
  var HAND_ONEHOT_SIZE = Math.max(ENCODINGS.hh.deckSize, ENCODINGS.bw.deckSize);
  function encodeUpgradesInPlay(p) {
    const enc = ENCODINGS[p.heroId];
    const out = new Array(UPGRADE_ONEHOT_SIZE).fill(0);
    for (const id of p.upgradesInPlay) {
      const idx = enc.upgradeIds.indexOf(id);
      if (idx >= 0 && idx < UPGRADE_ONEHOT_SIZE) out[idx] = 1;
    }
    return out;
  }
  function encodeHand(p) {
    const enc = ENCODINGS[p.heroId];
    const out = new Array(HAND_ONEHOT_SIZE).fill(0);
    for (const id of p.hand) {
      const idx = enc.deckIndex.get(id);
      if (idx !== void 0) out[idx] = 1;
    }
    return out;
  }
  function encodePlayer(p) {
    const deckSize = ENCODINGS[p.heroId].deckSize;
    const isHH = p.heroId === "hh" ? 1 : 0;
    const isBW = p.heroId === "bw" ? 1 : 0;
    return [
      p.hp / MAX_HP,
      p.cp / CP_CAP,
      p.hand.length / MAX_HAND_SIZE,
      p.deck.length / deckSize,
      p.discard.length / deckSize,
      p.upgradesInPlay.length / MAX_UPGRADES_IN_PLAY,
      p.timeBombs.length / TIME_BOMB_STACK_CAP,
      p.upgradesPlayedThisTurn / MAX_UPGRADES_PLAYED_PER_TURN,
      isHH,
      isBW,
      // Tokens read straight from the generic bag for BOTH heroes (v2: un-gated). Cross-player
      // token transfer cards mean any player can end up holding any bag token; gating by hero
      // hid that from the network.
      p.tokens.dreadful / DREADFUL_CAP,
      p.tokens.grimPursuit / GRIM_PURSUIT_CAP,
      p.tokens.head,
      p.tokens.agility / AGILITY_CAP,
      p.tokens.covertOps / COVERT_OPS_CAP,
      ...encodeUpgradesInPlay(p)
    ];
  }
  function encodeState(state, forPlayerIdx) {
    const self = state.players[forPlayerIdx];
    const opp = state.players[1 - forPlayerIdx];
    return [
      state.turnNumber / MAX_TURNS,
      ...encodePlayer(self),
      ...encodeHand(self),
      ...encodePlayer(opp)
    ];
  }
  var PLAYER_BLOCK_SIZE = 15 + UPGRADE_ONEHOT_SIZE;
  var FEATURE_COUNT = 1 + (PLAYER_BLOCK_SIZE + HAND_ONEHOT_SIZE) + PLAYER_BLOCK_SIZE;

  // src/sim/rl/lookahead.ts
  function cloneForLookahead(state) {
    return structuredClone({ ...state, log: [] });
  }
  function scoreCandidatesByReplay(network, scoringPlayerIdx, baseState, lookaheadSeed, candidates, applyCandidate) {
    if (candidates.length === 0) throw new Error("scoreCandidatesByReplay: candidates must be non-empty");
    if (candidates.length === 1) return candidates[0];
    const featureBatch = candidates.map((candidate) => {
      const clone = cloneForLookahead(baseState);
      const rng = mulberry32(lookaheadSeed);
      applyCandidate(clone, candidate, rng);
      return encodeState(clone, scoringPlayerIdx);
    });
    const scores = forward(network, featureBatch);
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIdx]) bestIdx = i;
    }
    return candidates[bestIdx];
  }

  // src/sim/rl/candidates.ts
  function powerset(items) {
    let result = [[]];
    for (const item of items) result = result.concat(result.map((subset) => [...subset, item]));
    return result;
  }
  function combinations(items, k) {
    if (k === 0) return [[]];
    if (items.length < k) return [];
    const [first, ...rest] = items;
    return [...combinations(rest, k - 1).map((c) => [first, ...c]), ...combinations(rest, k)];
  }
  function enumerateAbilityCandidates(candidates) {
    return candidates;
  }
  function enumerateHorrifyBonus() {
    return ["dreadful", "grimPursuit"];
  }
  function enumerateHeadlessMayhem(self, canTerrorize2) {
    const options = ["none"];
    if (canTerrorize2) options.push("terrorize");
    if (hasHead(self)) options.push("giveHead");
    return options;
  }
  function enumerateSabotageReroll() {
    return [true, false];
  }
  function enumerateDiscardSubsets(hand, maxHandSize) {
    const overflow = hand.length - maxHandSize;
    if (overflow <= 0) return [[]];
    return combinations(hand, overflow);
  }
  function enumerateSmallCardSubsets(eligibleCardIds) {
    return powerset(eligibleCardIds);
  }
  function enumerateForCard(cardId, dice) {
    const n = dice.length;
    const out = [];
    if (cardId === "six-it") {
      for (let i = 0; i < n; i++) out.push({ cardId, dieIndices: [i], values: [6] });
    } else if (cardId === "so-wild") {
      const soWildValues = Array.from(/* @__PURE__ */ new Set([6, ...dice]));
      for (let i = 0; i < n; i++) {
        for (const v of soWildValues) {
          if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] });
        }
      }
    } else if (cardId === "samesies") {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) out.push({ cardId, dieIndices: [i], values: [dice[j]] });
        }
      }
    } else if (cardId === "twice-as-wild") {
      const counts = /* @__PURE__ */ new Map();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const candidateValues = Array.from(/* @__PURE__ */ new Set([6, mode]));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (const v1 of candidateValues) {
            for (const v2 of candidateValues) {
              out.push({ cardId, dieIndices: [i, j], values: [v1, v2] });
            }
          }
        }
      }
    } else if (cardId === "try-try-again") {
      for (let i = 0; i < n; i++) out.push({ cardId, dieIndices: [i] });
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) out.push({ cardId, dieIndices: [i, j] });
      }
    } else if (cardId === "one-more-time") {
      out.push({ cardId });
    }
    return out;
  }
  function enumerateRollManipulationChoices(dice, eligibleCardIds) {
    const options = [[]];
    for (const cardId of eligibleCardIds) {
      for (const choice of enumerateForCard(cardId, dice)) options.push([choice]);
    }
    return options;
  }

  // src/sim/rl/valueGreedyPolicy.ts
  function seedFor(state, salt) {
    return state.turnNumber * 7919 + salt >>> 0;
  }
  function createValueGreedyPolicy(network) {
    const policy = {
      // Approximation (no dice available in this method's signature — see file header): scores
      // each candidate by its already-upgrade-adjusted `baseDamage`/`defendable`, applied via the
      // dice-independent resolveDefense re-entry point. This ignores dice-dependent bonuses
      // (Cleave's number-match, Spectral Assault's bonus roll, Vengeance's rider, self token
      // grants, card draw) for the specific purpose of ranking WHICH ability to activate — a
      // deliberate v1 gap, not an oversight. Other decisions (attack modifiers, defensive cards)
      // still get full-fidelity lookahead.
      chooseAbility(state, playerIdx, candidates) {
        const options = enumerateAbilityCandidates(candidates);
        const best = scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 1),
          options,
          (clone, candidate, rng) => {
            const dmg = candidate.baseDamage ?? 0;
            if (candidate.defendable) {
              resolveDefense(clone, playerIdx, dmg, rng, [policy, policy]);
            } else {
              clone.players[1 - playerIdx].hp -= dmg;
            }
          }
        );
        return best.name;
      },
      // Only called when NOT holding the Head and NOT Horrify II (see turn.ts) — always the base,
      // non-upgraded token amounts. Applied directly (no need to replay anything: this choice's
      // entire effect IS the token grant, nothing else depends on it).
      chooseHorrifyBonus(state, playerIdx) {
        const options = enumerateHorrifyBonus();
        const data = abilityByBoardName(heroTemplateFor("hh"), "Horrify (CCCC)");
        const best = scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 2),
          options,
          (clone, candidate, _rng) => {
            const self = clone.players[playerIdx];
            if (candidate === "dreadful" && data?.tokensGrantedToSelf?.dreadful) {
              grantDreadful(self, data.tokensGrantedToSelf.dreadful);
            } else if (candidate === "grimPursuit" && data?.tokensGrantedIfHasHead?.grimPursuit) {
              grantGrimPursuit(self, data.tokensGrantedIfHasHead.grimPursuit);
            }
          }
        );
        return best;
      },
      chooseHeadlessMayhem(state, playerIdx, canTerrorize2) {
        const options = enumerateHeadlessMayhem(state.players[playerIdx], canTerrorize2);
        const best = scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 3),
          options,
          (clone, candidate, rng) => {
            const forced = { ...policy, chooseHeadlessMayhem: () => candidate };
            playUpkeepPhase(clone, playerIdx, rng, forced);
          }
        );
        return best;
      },
      // Unified decision (plan Stage 2): score every legal WindowAction by replaying it through the
      // real engine (applyWindowAction — the SAME apply path resolveResponseWindow uses, so no
      // drift) and pick the highest-V one. This one method replaces what used to be a per-decision
      // bespoke enumerate/replay closure (here: the old chooseMainPhaseCards subset search) — the
      // whole point of the unified model. As more decisions migrate onto windows, they all flow
      // through here for free. Salt keys the lookahead RNG per window type (fairness across options).
      decide(state, playerIdx, request) {
        if (request.options.length === 1) return request.options[0];
        if (request.ctx.windowType === "offensiveRoll") {
          return scoreCandidatesByReplay(
            network,
            playerIdx,
            state,
            seedFor(state, 10),
            request.options,
            (clone, action, rng) => {
              applyWindowAction(clone, playerIdx, action, request.ctx, rng);
              const pr = clone.pendingRoll;
              if (pr) {
                const finalDice = pr.dice.slice();
                clone.pendingRoll = null;
                resolveAbilityPhase(clone, pr.rollerIdx, finalDice, rng, [policy, policy]);
              }
            }
          );
        }
        if (request.ctx.windowType === "defenseRoll") {
          const pd = state.pendingDefenseRoll;
          if (!pd) return { kind: "pass" };
          return scoreCandidatesByReplay(
            network,
            playerIdx,
            state,
            seedFor(state, 11),
            request.options,
            (clone, action, rng) => {
              applyWindowAction(clone, playerIdx, action, request.ctx, rng);
              const pr = clone.pendingRoll;
              if (pr) {
                const finalDice = pr.dice.slice();
                clone.pendingRoll = null;
                clone.pendingDefenseRoll = null;
                finalizeDefenseRoll(clone, pd.attackerIdx, pd.incomingDamage, finalDice, rng, [policy, policy]);
              }
            }
          );
        }
        const salt = request.ctx.windowType === "defense" ? 7 : 4;
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, salt),
          request.options,
          (clone, action, rng) => {
            applyWindowAction(clone, playerIdx, action, request.ctx, rng);
            if (request.ctx.windowType === "defense") finalizePendingAttackDamage(clone);
          }
        );
      },
      // Direct call to bw.resolveSabotage (dice-independent of resolveDefense's `incomingDamage`,
      // which this method's own signature doesn't receive) — a wrapper policy forces the reroll
      // choice; the RNG-fairness rule (same seed per candidate) keeps the initial dice roll
      // identical across the true/false comparison.
      chooseSabotageReroll(state, defenderIdx, _dice) {
        const options = enumerateSabotageReroll();
        const attackerIdx = 1 - defenderIdx;
        const best = scoreCandidatesByReplay(
          network,
          defenderIdx,
          state,
          seedFor(state, 5),
          options,
          (clone, candidate, rng) => {
            const forced = { ...policy, chooseSabotageReroll: () => candidate };
            const upgraded = clone.players[defenderIdx].upgradesInPlay.includes("sabotage-ii");
            resolveSabotage(
              clone.players[defenderIdx],
              clone.players[attackerIdx].upgradesInPlay.length,
              rng,
              forced,
              clone,
              defenderIdx,
              upgraded
            );
          }
        );
        return best;
      },
      chooseCardsToDiscard(state, playerIdx, maxHandSize) {
        const options = enumerateDiscardSubsets(state.players[playerIdx].hand, maxHandSize);
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 6),
          options,
          (clone, subset) => {
            const forced = { ...policy, chooseCardsToDiscard: () => subset };
            playDiscardPhase(clone, playerIdx, forced);
          }
        );
      },
      // Direct call to the exported applyAttackModifierCard per candidate card, then finishes the
      // attack (resolveDefense is dice-independent) — bypasses the Policy call entirely, same
      // spirit as chooseMainPhaseCards's direct playCard loop.
      chooseAttackModifierCards(state, playerIdx, dmg, eligibleCardIds) {
        const options = enumerateSmallCardSubsets(eligibleCardIds);
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 8),
          options,
          (clone, subset, rng) => {
            let result = { dmg, undefendable: false };
            for (const cardId of subset) result = applyAttackModifierCard(clone, playerIdx, cardId, result);
            if (result.undefendable) clone.players[1 - playerIdx].hp -= result.dmg;
            else resolveDefense(clone, playerIdx, result.dmg, rng, [policy, policy]);
          }
        );
      },
      // Grim Pursuit spend mode (b): score not-spending vs spending 1 Grim Pursuit for a random die
      // of bonus damage, each replayed through resolveDefense (dice-independent, like the attack-
      // modifier scoring above — defendability isn't in this method's signature, so it approximates a
      // defendable attack for ranking). Same-seed-per-candidate keeps the comparison fair.
      chooseGrimPursuitSpend(state, playerIdx, dmg) {
        const options = [false, true];
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 9),
          options,
          (clone, spend, rng) => {
            let d = dmg;
            if (spend) d += spendGrimPursuitForBonusDamage(clone.players[playerIdx], rng);
            resolveDefense(clone, playerIdx, d, rng, [policy, policy]);
          }
        );
      },
      // v1 gap, not an oversight: fires from WITHIN oracle.ts's roll loop for BW's mid-roll
      // upgrade plays (Red Room Training); scoring it would need the same resume machinery as
      // below plus upgrade-play replay — still future work. Matches greedy's default.
      chooseMidRollCards: () => [],
      // Roll-manipulation cards (Six-It!/So Wild!/Twice As Wild!/Samesies!/Try Try Again!/One
      // More Time!) — un-stubbed (was the "5 cards the RL literally cannot play" gap). Scored by
      // full resolve-through in V units, no hand-tuned CP-to-damage constant anywhere: for each
      // candidate (including "play nothing"), clone the state, apply the card (real
      // applyRollManipulationCard: CP debit + discard), roll the modified dice FORWARD to their
      // final state with the real DP loop (oracle.completeOffensiveRoll — the resumable re-entry
      // point added for exactly this), resolve the attack on those final dice, then let V judge.
      // Same per-decision seed across candidates (RNG-fairness rule), so "played Six-It!" vs
      // "didn't" are compared under identical reroll luck.
      //
      // Only acts on the FINAL window (rollsRemaining === 0, fired since the oracle's final-window
      // change): the dice are otherwise final, so value-setters are DETERMINISTIC (no reroll can
      // undo them) and their rollout is a single resolve — maximum information at minimum cost.
      // One More Time! grants +1 attempt and is rolled forward through the granted attempt.
      chooseRollManipulationCards(state, playerIdx, dice, rollsRemaining, eligibleCardIds) {
        if (rollsRemaining !== 0 || eligibleCardIds.length === 0) return [];
        const options = enumerateRollManipulationChoices(dice, eligibleCardIds);
        if (options.length === 1) return options[0];
        const heroId = state.players[playerIdx].heroId;
        const oppIdx = 1 - playerIdx;
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 12),
          options,
          (clone, choices, rng) => {
            let d = dice;
            let extra = 0;
            for (const choice of choices) {
              const r = applyRollManipulationCard(clone, playerIdx, choice, d, rng);
              d = r.dice;
              extra += r.extraRollsGranted;
            }
            const finalDice = completeOffensiveRoll(
              heroId,
              oracleStateFor(clone.players[playerIdx], clone.players[oppIdx]),
              d,
              rollsRemaining + extra,
              rng
            );
            resolveAbilityPhase(clone, playerIdx, finalDice, rng, [policy, policy]);
          }
        );
      },
      // Grim Pursuit mode (a): same resolve-through scoring as the roll-manipulation cards above —
      // "keep these final dice" vs "spend 1 Grim Pursuit for one more DP attempt", both rolled
      // forward under the same seed and judged by V. No hand-tuned token-value constant anywhere.
      chooseGrimPursuitReroll(state, playerIdx, dice) {
        const heroId = state.players[playerIdx].heroId;
        const oppIdx = 1 - playerIdx;
        return scoreCandidatesByReplay(
          network,
          playerIdx,
          state,
          seedFor(state, 13),
          [false, true],
          (clone, spend, rng) => {
            if (spend) {
              spendGrimPursuit(clone.players[playerIdx], 1);
              clone.players[playerIdx].grimPursuitRerollUsedThisTurn = true;
            }
            const finalDice = completeOffensiveRoll(
              heroId,
              oracleStateFor(clone.players[playerIdx], clone.players[oppIdx]),
              dice,
              spend ? 1 : 0,
              rng
            );
            resolveAbilityPhase(clone, playerIdx, finalDice, rng, [policy, policy]);
          }
        );
      }
    };
    return policy;
  }
  return __toCommonJS(browser_exports);
})();
