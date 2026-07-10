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
    FEATURE_COUNT: () => FEATURE_COUNT,
    MAX_TURNS: () => MAX_TURNS,
    TRANSFERABLE_TOKENS: () => TRANSFERABLE_TOKENS,
    abilityByBoardName: () => abilityByBoardName,
    aiComboPending: () => aiComboPending,
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
    finishAiAlter: () => finishAiAlter,
    finishAiTurn: () => finishAiTurn,
    forward: () => forward,
    fromJSON: () => fromJSON,
    fullAbilityBoard: () => fullAbilityBoard,
    greedyHighestDamagePolicy: () => greedyHighestDamagePolicy,
    hasHead: () => hasHead,
    heroTemplateFor: () => heroTemplateFor,
    hhHero: () => hhHero,
    humanAiAlterOptions: () => humanAiAlterOptions,
    humanApplyAiAlter: () => humanApplyAiAlter,
    humanApplyInstant: () => humanApplyInstant,
    humanApplyMain: () => humanApplyMain,
    humanAttack: () => humanAttack,
    humanAttackModifierOptions: () => humanAttackModifierOptions,
    humanCanTerrorize: () => humanCanTerrorize,
    humanCraft: () => humanCraft,
    humanCraftOptions: () => humanCraftOptions,
    humanDragonsHoard: () => humanDragonsHoard,
    humanForgeOre: () => humanForgeOre,
    humanFreeRerollDie: () => humanFreeRerollDie,
    humanInstantOptions: () => humanInstantOptions,
    humanKeepAdvice: () => humanKeepAdvice,
    humanMainOptions: () => humanMainOptions,
    humanMinePeek: () => humanMinePeek,
    humanMinesDraw: () => humanMinesDraw,
    humanNevermoreCull: () => humanNevermoreCull,
    humanNevermoreFeatherReroll: () => humanNevermoreFeatherReroll,
    humanNevermoreFeatherShift: () => humanNevermoreFeatherShift,
    humanNevermoreFinish: () => humanNevermoreFinish,
    humanNevermoreRollStart: () => humanNevermoreRollStart,
    humanPlayRollCard: () => humanPlayRollCard,
    humanScrap: () => humanScrap,
    humanScrapDie: () => humanScrapDie,
    humanSetRoarDiscard: () => humanSetRoarDiscard,
    humanSpendGrimPursuitReroll: () => humanSpendGrimPursuitReroll,
    matchedAbilities: () => matchedAbilities,
    mulberry32: () => mulberry32,
    mulberry32Stateful: () => mulberry32Stateful,
    nevermoreRollDue: () => nevermoreRollDue,
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
    runAiTurnUpToAlter: () => runAiTurnUpToAlter,
    runAiTurnUpToAttack: () => runAiTurnUpToAttack,
    runBossMatch: () => runBossMatch,
    runMatch: () => runMatch,
    runOffensiveRoll: () => runOffensiveRoll,
    shuffle: () => shuffle,
    startAiComboOrp: () => startAiComboOrp,
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
  var TRANSFERABLE_TOKENS = [
    "dreadful",
    "grimPursuit",
    "agility",
    "timeBomb",
    "feather",
    "nevermore",
    "regen2",
    "regen1",
    "wound",
    "electrokinesis",
    "guardBreak",
    "webbed",
    "fireMastery",
    "burn",
    "knockdown",
    "stun",
    "disarm",
    "chargedGem",
    "sunMarked"
  ];
  var TOKEN_CAPS = {
    dreadful: 5,
    grimPursuit: 3,
    agility: 2,
    feather: 5,
    nevermore: 1,
    regen2: 2,
    regen1: 2,
    wound: 2,
    electrokinesis: 4,
    guardBreak: 2,
    webbed: 1,
    fireMastery: 5,
    burn: 1,
    knockdown: 1,
    stun: 1,
    disarm: 1,
    chargedGem: 1,
    sunMarked: 1
  };
  function countToken(p, kind) {
    return kind === "timeBomb" ? p.timeBombs.length : p.tokens[kind];
  }
  function emptyBag() {
    return { dreadful: 0, grimPursuit: 0, agility: 0, covertOps: 0, head: 0, feather: 0, hex: 0, nevermore: 0, shapeShift: 0, regen2: 0, regen1: 0, wound: 0, electrokinesis: 0, guardBreak: 0, combo: 0, webbed: 0, invisibility: 0, fireMastery: 0, burn: 0, knockdown: 0, stun: 0, disarm: 0, chargedGem: 0, sunMarked: 0 };
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
  function cacheKey(cfg, kept, rollsRemaining, state, totalDice) {
    return `${cfg.id}|${totalDice}|${kept.join(",")}|${rollsRemaining}|${cfg.stateKey(state)}`;
  }
  function hasAnyWildcard(flags) {
    return !!flags && !!(flags.sixIt || flags.soWild || flags.twiceAsWild || flags.samesies || flags.tipIt);
  }
  function* wildcardVariants(dice, flags) {
    const counts = /* @__PURE__ */ new Map();
    for (const v of dice) counts.set(v, (counts.get(v) ?? 0) + 1);
    let mode = dice[0];
    for (const [v, n] of counts) if (n > (counts.get(mode) ?? 0)) mode = v;
    const single = (i, v, cost) => {
      if (dice[i] === v) return null;
      const d2 = dice.slice();
      d2[i] = v;
      d2.sort((a, b) => a - b);
      return { dice: d2, cost };
    };
    for (let i = 0; i < dice.length; i++) {
      if (flags.sixIt) {
        const r = single(i, 6, 1);
        if (r) yield r;
      }
      if (flags.soWild) {
        for (const v of [6, mode]) {
          const r = single(i, v, 2);
          if (r) yield r;
        }
      }
      if (flags.tipIt) {
        if (dice[i] < 6) {
          const r = single(i, dice[i] + 1, 1);
          if (r) yield r;
        }
        if (dice[i] > 1) {
          const r = single(i, dice[i] - 1, 1);
          if (r) yield r;
        }
      }
      if (flags.samesies) {
        for (const v of counts.keys()) {
          const r = single(i, v, 1);
          if (r) yield r;
        }
      }
    }
    if (flags.twiceAsWild) {
      for (let i = 0; i < dice.length; i++) for (let j = i + 1; j < dice.length; j++) {
        for (const v of [6, mode]) {
          if (dice[i] === v && dice[j] === v) continue;
          const d2 = dice.slice();
          d2[i] = v;
          d2[j] = v;
          d2.sort((a, b) => a - b);
          yield { dice: d2, cost: 3 };
        }
      }
    }
  }
  function augmentTerminalValue(dice, base, flags, evalDice, cpToDmg = 0.75) {
    if (!hasAnyWildcard(flags)) return base;
    let best = base;
    for (const { dice: d2, cost } of wildcardVariants(dice, flags)) {
      const val = evalDice(d2) - cost * cpToDmg;
      if (val > best) best = val;
    }
    return best;
  }
  function augmentTerminalName(dice, flags, evalDice, nameDice, cpToDmg = 0.75) {
    const baseName = nameDice(dice);
    if (!hasAnyWildcard(flags)) return baseName;
    let best = evalDice(dice);
    let bestName = baseName;
    for (const { dice: d2, cost } of wildcardVariants(dice, flags)) {
      const val = evalDice(d2) - cost * cpToDmg;
      if (val > best) {
        best = val;
        bestName = nameDice(d2);
      }
    }
    return bestName;
  }
  function evalState(cfg, kept, rollsRemaining, state, totalDice = 5) {
    if (rollsRemaining === 0) {
      if (kept.length !== totalDice) throw new Error(`evalState: need ${totalDice} dice at rolls=0, got ${kept.length}`);
      return cfg.bestAbilityValue(kept, state);
    }
    const key = cacheKey(cfg, kept, rollsRemaining, state, totalDice);
    const cached = evMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = totalDice - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    let totalEv = 0;
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      totalEv += prob * _bestKeepEv(cfg, full, rollsRemaining - 1, state, totalDice);
    }
    evMemo.set(key, totalEv);
    return totalEv;
  }
  function _bestKeepEv(cfg, full, rollsRemaining, state, totalDice = 5) {
    if (rollsRemaining === 0) return evalState(cfg, full, 0, state, totalDice);
    let best = -Infinity;
    const n = full.length;
    for (let mask = 0; mask < 1 << n; mask++) {
      const kept = [];
      for (let i = 0; i < n; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(cfg, kept, rollsRemaining, state, totalDice);
      if (ev > best) best = ev;
    }
    return best;
  }
  function _optimalKeep(cfg, full, rollsRemaining, state, totalDice = 5) {
    if (rollsRemaining === 0) return full;
    let bestEv = -Infinity;
    let bestKept = full;
    const n = full.length;
    for (let mask = 0; mask < 1 << n; mask++) {
      const kept = [];
      for (let i = 0; i < n; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(cfg, kept, rollsRemaining, state, totalDice);
      if (ev > bestEv) {
        bestEv = ev;
        bestKept = kept;
      }
    }
    return bestKept;
  }
  function _abilityDist(cfg, kept, rollsRemaining, state, totalDice = 5) {
    if (rollsRemaining === 0) {
      if (kept.length !== totalDice) throw new Error(`Need ${totalDice} dice at rolls=0`);
      return { [cfg.bestAbilityName(kept, state)]: 1 };
    }
    const key = cacheKey(cfg, kept, rollsRemaining, state, totalDice);
    const cached = distMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = totalDice - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    const dist = {};
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      const bestKept = _optimalKeep(cfg, full, rollsRemaining - 1, state, totalDice);
      const sub = _abilityDist(cfg, bestKept, rollsRemaining - 1, state, totalDice);
      for (const [name, p] of Object.entries(sub)) {
        dist[name] = (dist[name] ?? 0) + prob * p;
      }
    }
    distMemo.set(key, dist);
    return dist;
  }
  function calculateOptimalKeep(cfg, dice, rollsRemaining, state) {
    const totalDice = dice.length;
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
      const dist = _abilityDist(cfg, sorted, 0, state, totalDice);
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
    for (let mask = 0; mask < 1 << totalDice; mask++) {
      const kept = [];
      for (let i = 0; i < totalDice; i++) {
        if (mask & 1 << i) kept.push(sorted[i]);
      }
      kept.sort((a, b) => a - b);
      const kKey = kept.join(",");
      if (seenKeys.has(kKey)) continue;
      seenKeys.add(kKey);
      const ev = evalState(cfg, kept, rollsRemaining, state, totalDice);
      const dist = _abilityDist(cfg, kept, rollsRemaining, state, totalDice);
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
  var GRIM_PURSUIT_AVG_DMG = 1.3;
  var CARD_DRAW_VALUE = 1.4;
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
  var MARGINAL_VALUE = [1, 1.4, 0.8, 0.45, 1];
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
  var GRIM_PURSUIT_CAP_SOLVER = 3;
  function gpGainValue(gp, gain) {
    return Math.min(gain, Math.max(0, GRIM_PURSUIT_CAP_SOLVER - gp)) * GRIM_PURSUIT_AVG_DMG;
  }
  function getCandidates(dice, dreadful, hasHead2, upgradeIds = [], defenseTax = 0, gp = 0) {
    const { A: a, B: b, C: c } = classify(dice);
    const out = [];
    const has = (id) => upgradeIds.includes(id);
    const tax = defenseTax;
    if (has("cleave-ii") && a >= 2 && b >= 1 && c >= 1) {
      const val = GHOSTLY_CHARGE_DMG + gpGainValue(gp, GHOSTLY_CHARGE_GRIM_PURSUIT);
      out.push(["Ghostly Charge", val, GHOSTLY_CHARGE_DMG]);
    }
    if (has("ride-down-ii") && b >= 3) {
      const val = CURSED_GALLOP_DMG + gpGainValue(gp, CURSED_GALLOP_GRIM_PURSUIT);
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
      const val = SPOOKY_DMG + gpGainValue(gp, SPOOKY_GRIM_PURSUIT);
      out.push(["Spooky", val - tax, SPOOKY_DMG]);
    }
    if (c >= 5) {
      const base = DREADFUL_CHARGE_VALUE;
      out.push(["Dreadful Charge", base + dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN), base]);
    }
    if (c >= 4) {
      const base = HORRIFY_BASE_UNDEFENDABLE;
      const horrifyUpgraded = has("horrify-ii");
      let val = base + dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN);
      if (horrifyUpgraded) val += gpGainValue(gp, HORRIFY_GRIM_PURSUIT_UPGRADED);
      else if (hasHead2) val += gpGainValue(gp, 1);
      out.push(["Horrify", val, base]);
    }
    if (a >= 3 && c >= 2) {
      const base = has("spectral-assault-ii") ? SPECTRAL_ASSAULT_BASE_UPGRADED : SPECTRAL_ASSAULT_BASE;
      const val = base + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL;
      out.push(["Spectral Assault", val - tax, base]);
    }
    const cleaveUpgraded = has("cleave-ii");
    if (a >= 5) {
      const dmg = cleaveUpgraded ? CLEAVE_5A_UPGRADED : CLEAVE_5A;
      out.push(["Cleave 5A", dmg - tax, dmg]);
    } else if (a === 4) {
      const dmg = cleaveUpgraded ? CLEAVE_4A_UPGRADED : CLEAVE_4A;
      out.push(["Cleave 4A", dmg - tax, dmg]);
    } else if (a === 3) {
      const dmg = cleaveUpgraded ? CLEAVE_3A_UPGRADED : CLEAVE_3A;
      out.push(["Cleave 3A", dmg - tax, dmg]);
    }
    if (a >= 3 && b >= 2) {
      const grimPursuit = has("ride-down-ii") ? RIDE_DOWN_GRIM_PURSUIT_UPGRADED : RIDE_DOWN_GRIM_PURSUIT;
      const val = RIDE_DOWN_BASE + gpGainValue(gp, grimPursuit);
      out.push(["Ride Down", val - tax, RIDE_DOWN_BASE]);
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
      out.push(["Sow Despair L", val - tax, dmg]);
    }
    if (hasStraight(dice, 4)) {
      const dreadfulGiven = sowUpgraded ? SOW_SMALL_DREADFUL_UPGRADED : SOW_SMALL_DREADFUL;
      const val = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, dreadfulGiven);
      out.push(["Sow Despair S", val - tax, SOW_SMALL_DMG]);
    }
    const whiffVal = gpGainValue(gp, WHIFF_PURSUIT_TOKENS);
    out.push(["Whiff", whiffVal, whiffVal]);
    return out;
  }
  function bestAbilityValue(dice, dreadful, hasHead2, upgradeIds = [], defenseTax = 0, gp = 0) {
    return Math.max(...getCandidates(dice, dreadful, hasHead2, upgradeIds, defenseTax, gp).map(([, v]) => v));
  }
  function bestAbilityName(dice, dreadful, hasHead2, upgradeIds = [], defenseTax = 0, gp = 0) {
    const cands = getCandidates(dice, dreadful, hasHead2, upgradeIds, defenseTax, gp);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard(dice, dreadful, hasHead2, upgradeIds = [], defenseTax = 0, gp = 0) {
    const matchedSet = new Set(getCandidates(dice, dreadful, hasHead2, upgradeIds, defenseTax, gp).map(([name]) => name));
    const tax = defenseTax;
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
    if (horrifyUpgraded) horrifyVal += gpGainValue(gp, HORRIFY_GRIM_PURSUIT_UPGRADED);
    else if (hasHead2) horrifyVal += gpGainValue(gp, 1);
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
      { name: "Spectral Assault (AAACC)", value: saVal - tax, baseDamage: spectralAssaultBase, matched: matchedSet.has("Spectral Assault") },
      { name: "Cleave 5A (AAAAA)", value: cleave5Dmg - tax, baseDamage: cleave5Dmg, matched: matchedSet.has("Cleave 5A") },
      { name: "Cleave 4A (AAAA)", value: cleave4Dmg - tax, baseDamage: cleave4Dmg, matched: matchedSet.has("Cleave 4A") },
      { name: "Cleave 3A (AAA)", value: cleave3Dmg - tax, baseDamage: cleave3Dmg, matched: matchedSet.has("Cleave 3A") },
      { name: "Ride Down (AAABB)", value: rdVal - tax, baseDamage: RIDE_DOWN_BASE, matched: matchedSet.has("Ride Down") },
      { name: "Reap (BBBC)", value: reapVal, baseDamage: reapDmg, matched: matchedSet.has("Reap") },
      { name: "Sow Despair L (5-straight)", value: sowLVal - tax, baseDamage: sowLDmg, matched: matchedSet.has("Sow Despair L") },
      { name: "Sow Despair S (4-straight)", value: sowSVal - tax, baseDamage: SOW_SMALL_DMG, matched: matchedSet.has("Sow Despair S") },
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
      entries.push({ name: "Spooky (CCC)", value: spookyVal - tax, baseDamage: SPOOKY_DMG, matched: matchedSet.has("Spooky") });
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
      const base = bestAbilityValue(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
      return augmentTerminalValue(
        dice,
        base,
        state.wildcards,
        (d) => bestAbilityValue(d, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0)
      );
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue(d, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
      const nameFn = (d) => bestAbilityName(d, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const _w = state.wildcards || {};
      const wc = (_w.sixIt ? 1 : 0) + (_w.soWild ? 2 : 0) + (_w.twiceAsWild ? 4 : 0) + (_w.samesies ? 8 : 0) + (_w.tipIt ? 16 : 0);
      return `${state.dreadful}|${state.hasHead ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${Math.min(state.grimPursuit ?? 0, 3)}|${wc}|${upgrades}`;
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
  var AGILITY_VALUE = 1.1;
  var CP_TO_DMG_EQUIV = 0.75;
  var COVERT_OPS_VALUE = 0.1;
  var WHIFF_VALUE = 0;
  var COVERT_MISSION_DMG = 0;
  var RECON_DMG = 0;
  var RECON_UPGRADE_SEARCH_VALUE = 4;
  var SPY_GAME_DMG = 6;
  var SUBVERT_DMG = 0;

  // src/characters/black_widow/timebomb.ts
  var TB_VALUE_LOW = 1.6;
  var TB_VALUE_HIGH = 1.9;
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
  function getCandidates2(dice, upgrades, tbOnOpp, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify2(dice);
    const out = [];
    const tax = defenseTax;
    const rrt = upgradeIds.includes("red-room-training-ii") && upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
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
      out.push(["Baton Strike 5B", dmg + rrt - tax, dmg]);
    } else if (b === 4) {
      const dmg = batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B;
      out.push(["Baton Strike 4B", dmg + rrt - tax, dmg]);
    } else if (b === 3) {
      const dmg = batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B;
      out.push(["Baton Strike 3B", dmg + rrt - tax, dmg]);
    }
    if (a >= 2 && b >= 1 && c >= 1) {
      const tb = tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED);
      const agility = INFILTRATE_AGILITY_GAIN * AGILITY_VALUE;
      out.push(["Infiltrate", INFILTRATE_BASE_DMG + tb + agility + rrt, INFILTRATE_BASE_DMG]);
    }
    if (b >= 3 && a >= 2) {
      const gauntletsDmg = has("widows-gauntlets-ii") ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG;
      const val = gauntletsDmg + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt;
      out.push(["Widow's Gauntlets", val - tax, gauntletsDmg]);
    }
    if (hasStraight2(dice, 4)) {
      const hackedDmg = has("hacked-ii") ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG;
      const thresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
      const tb = tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED);
      out.push(["Hacked", hackedDmg + thresh + tb + rrt - tax, hackedDmg]);
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
      out.push(["Vengeance", VENGEANCE_BASE_DMG + rider + agility + rrt - tax, VENGEANCE_BASE_DMG]);
    }
    if (c >= 5) {
      const tb = tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED);
      out.push(["Widow's Bite", WIDOWS_BITE_BASE_DMG + tb + rrt, WIDOWS_BITE_BASE_DMG]);
    }
    out.push(["Whiff", WHIFF_VALUE, WHIFF_VALUE]);
    return out;
  }
  function bestAbilityValue2(dice, upgrades, tbOnOpp, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates2(dice, upgrades, tbOnOpp, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName2(dice, upgrades, tbOnOpp, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates2(dice, upgrades, tbOnOpp, upgradeIds, defenseTax);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function directDamageByName(upgrades, _tbOnOpp, upgradeIds = []) {
    const rrt = upgradeIds.includes("red-room-training-ii") && upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
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
  function buildAbilityBoard2(dice, upgrades, tbOnOpp, upgradeIds = [], defenseTax = 0) {
    const matched = new Set(getCandidates2(dice, upgrades, tbOnOpp, upgradeIds, defenseTax).map(([n]) => n));
    const tax = defenseTax;
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
      { name: "Widow's Gauntlets (BBBAA)", value: gauntletsVal - tax, baseDamage: gauntletsDmg, matched: matched.has("Widow's Gauntlets") },
      { name: "Vengeance (5-straight)", value: vengeanceVal - tax, baseDamage: VENGEANCE_BASE_DMG, matched: matched.has("Vengeance") },
      { name: "Hacked (4-straight)", value: hackedVal - tax, baseDamage: hackedDmg, matched: matched.has("Hacked") },
      { name: "Infiltrate (AABC)", value: infiltrateVal, baseDamage: INFILTRATE_BASE_DMG, matched: matched.has("Infiltrate") },
      { name: "Baton Strike 5B (BBBBB)", value: batonStrike5Dmg + rrt - tax, baseDamage: batonStrike5Dmg, matched: matched.has("Baton Strike 5B") },
      { name: "Baton Strike 4B (BBBB)", value: batonStrike4Dmg + rrt - tax, baseDamage: batonStrike4Dmg, matched: matched.has("Baton Strike 4B") },
      { name: "Baton Strike 3B (BBB)", value: batonStrike3Dmg + rrt - tax, baseDamage: batonStrike3Dmg, matched: matched.has("Baton Strike 3B") },
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
      const base = bestAbilityValue2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(
        dice,
        base,
        state.wildcards,
        (d) => bestAbilityValue2(d, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0)
      );
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue2(d, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName2(d, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgradeIds = (state.upgradeIds ?? []).slice().sort().join(",");
      const _w = state.wildcards || {};
      const wc = (_w.sixIt ? 1 : 0) + (_w.soWild ? 2 : 0) + (_w.twiceAsWild ? 4 : 0) + (_w.samesies ? 8 : 0) + (_w.tipIt ? 16 : 0);
      return `${state.upgrades}|${state.tbOnOpp}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgradeIds}`;
    },
    directDamageByName(state) {
      return directDamageByName(state.upgrades, state.tbOnOpp, state.upgradeIds);
    }
  };

  // src/characters/forgemaster/constants.ts
  var PICK_AXE_3A = 5;
  var PICK_AXE_4A = 6;
  var PICK_AXE_5A = 7;
  var FURNACE_BASE = 5;
  var FURNACE_BONUS_ROLL_EV = 3.5;
  var SMELTING_TIME_UNDEFENDABLE = 9;
  var A_GOOD_HAUL_DMG = 8;
  var ARMORED_UP_SMALL = 7;
  var ARMORED_UP_LARGE = 10;
  var ARMORED_UP_2ARMOR_BONUS = 2;
  var FINAL_TOUCHES_VALUE = 14;
  var CP_TO_DMG_EQUIV2 = 0.75;
  var CARD_DRAW_VALUE2 = 1.5;
  var MINE_VALUE = 2;
  var ORE_TUTOR_VALUE = 2.2;
  var WHIFF_VALUE2 = 0;

  // src/characters/forgemaster/abilities.ts
  function fmFaceToSymbol(face) {
    if (face <= 3) return "A";
    if (face <= 5) return "B";
    return "C";
  }
  function classify3(dice) {
    const counts = { A: 0, B: 0, C: 0 };
    for (const face of dice) counts[fmFaceToSymbol(face)]++;
    return counts;
  }
  function hasStraight3(dice, length) {
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
  function hasNumberMatch(dice, ofAKind) {
    const counts = /* @__PURE__ */ new Map();
    for (const v of dice) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.values()].some((n) => n >= ofAKind);
  }
  function getCandidates3(dice, armorCount2, defenseTax = 0) {
    const tax = defenseTax;
    const { A: a, B: b, C: c } = classify3(dice);
    const out = [];
    const pickCpBonus = hasNumberMatch(dice, 4) ? CP_TO_DMG_EQUIV2 : 0;
    if (a >= 5) out.push(["Pick Axe 5A", PICK_AXE_5A + pickCpBonus - tax, PICK_AXE_5A]);
    else if (a === 4) out.push(["Pick Axe 4A", PICK_AXE_4A + pickCpBonus - tax, PICK_AXE_4A]);
    else if (a === 3) out.push(["Pick Axe 3A", PICK_AXE_3A + pickCpBonus - tax, PICK_AXE_3A]);
    if (b >= 4) out.push(["Furnace", FURNACE_BASE + FURNACE_BONUS_ROLL_EV - tax, FURNACE_BASE]);
    if (c >= 4) out.push(["Smelting Time", SMELTING_TIME_UNDEFENDABLE + CARD_DRAW_VALUE2, SMELTING_TIME_UNDEFENDABLE]);
    if (a >= 1 && b >= 1 && c >= 2) out.push(["A Good Haul", A_GOOD_HAUL_DMG + MINE_VALUE - tax, A_GOOD_HAUL_DMG]);
    const armoredBonus = armorCount2 >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0;
    if (hasStraight3(dice, 5)) out.push(["Armored Up L", ARMORED_UP_LARGE + armoredBonus - tax, ARMORED_UP_LARGE + armoredBonus]);
    if (hasStraight3(dice, 4)) out.push(["Armored Up S", ARMORED_UP_SMALL + armoredBonus - tax, ARMORED_UP_SMALL + armoredBonus]);
    if (c >= 5) out.push(["Final Touches!", FINAL_TOUCHES_VALUE + ORE_TUTOR_VALUE, FINAL_TOUCHES_VALUE]);
    out.push(["Whiff", WHIFF_VALUE2, WHIFF_VALUE2]);
    return out;
  }
  function bestAbilityValue3(dice, armorCount2, defenseTax = 0) {
    return Math.max(...getCandidates3(dice, armorCount2, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName3(dice, armorCount2, defenseTax = 0) {
    const cands = getCandidates3(dice, armorCount2, defenseTax);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard3(dice, armorCount2, defenseTax = 0) {
    const matchedSet = new Set(getCandidates3(dice, armorCount2, defenseTax).map(([name]) => name));
    const tax = defenseTax;
    const armoredBonus = armorCount2 >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0;
    return [
      { name: "Final Touches! (CCCCC)", value: FINAL_TOUCHES_VALUE + ORE_TUTOR_VALUE, baseDamage: FINAL_TOUCHES_VALUE, matched: matchedSet.has("Final Touches!") },
      { name: "Smelting Time (CCCC)", value: SMELTING_TIME_UNDEFENDABLE + CARD_DRAW_VALUE2, baseDamage: SMELTING_TIME_UNDEFENDABLE, matched: matchedSet.has("Smelting Time") },
      { name: "Armored Up L (5-straight)", value: ARMORED_UP_LARGE + armoredBonus - tax, baseDamage: ARMORED_UP_LARGE + armoredBonus, matched: matchedSet.has("Armored Up L") },
      { name: "A Good Haul (ABCC)", value: A_GOOD_HAUL_DMG + MINE_VALUE - tax, baseDamage: A_GOOD_HAUL_DMG, matched: matchedSet.has("A Good Haul") },
      { name: "Armored Up S (4-straight)", value: ARMORED_UP_SMALL + armoredBonus - tax, baseDamage: ARMORED_UP_SMALL + armoredBonus, matched: matchedSet.has("Armored Up S") },
      { name: "Furnace (BBBB)", value: FURNACE_BASE + FURNACE_BONUS_ROLL_EV - tax, baseDamage: FURNACE_BASE, matched: matchedSet.has("Furnace") },
      { name: "Pick Axe 5A (AAAAA)", value: PICK_AXE_5A - tax, baseDamage: PICK_AXE_5A, matched: matchedSet.has("Pick Axe 5A") },
      { name: "Pick Axe 4A (AAAA)", value: PICK_AXE_4A - tax, baseDamage: PICK_AXE_4A, matched: matchedSet.has("Pick Axe 4A") },
      { name: "Pick Axe 3A (AAA)", value: PICK_AXE_3A - tax, baseDamage: PICK_AXE_3A, matched: matchedSet.has("Pick Axe 3A") },
      { name: "Whiff", value: WHIFF_VALUE2, baseDamage: WHIFF_VALUE2, matched: matchedSet.has("Whiff") }
    ];
  }

  // src/characters/forgemaster/config.ts
  var fmConfig = {
    id: "fm",
    faceToSymbol(face) {
      return fmFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const base = bestAbilityValue3(dice, state.armorCount, state.defenseTax ?? 0);
      return augmentTerminalValue(
        dice,
        base,
        state.wildcards,
        (d) => bestAbilityValue3(d, state.armorCount, state.defenseTax ?? 0)
      );
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue3(d, state.armorCount, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName3(d, state.armorCount, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard3(dice, state.armorCount, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates3(dice, state.armorCount, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const _w = state.wildcards || {};
      const wc = (_w.sixIt ? 1 : 0) + (_w.soWild ? 2 : 0) + (_w.twiceAsWild ? 4 : 0) + (_w.samesies ? 8 : 0) + (_w.tipIt ? 16 : 0);
      return `${Math.min(state.armorCount, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}`;
    }
  };

  // src/characters/raveness/constants.ts
  var NEVERMORE_ACTIVATION_VALUE = 1.3;
  var FEATHER_VALUE = 0.3;
  var FEATHER_CAP = 5;
  var HEX_VALUE = 1.5;
  var CARD_DRAW_VALUE3 = 1.3;
  var PECK_DMG = [5, 6, 7];
  var PECK_DMG_UPGRADED = [6, 7, 8];
  var RAVEN_SIGHT_DMG = 3;
  var CRAVEN_DMG = 8;
  var CRAVEN_DMG_UPGRADED = 9;
  var BEGUILE_DMG = 9;
  var MURDER_DMG = 5;
  var MURDER_DMG_UPGRADED = 6;
  var CHAMBER_DMG = 7;
  var AVIARY_DMG = 2;
  var PLUCK_DMG = 9;
  var FANTASTIC_TERRORS_DMG = 13;

  // src/characters/raveness/abilities.ts
  function rvFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify4(dice, hexed) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else if (!hexed) C += 1;
    }
    return { A, B, C };
  }
  function hasStraight4(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return uniq.length >= len && run >= len;
  }
  function maxOfAKind(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function featherGainValue(current, gain, cap = FEATHER_CAP) {
    return Math.min(gain, Math.max(0, cap - current)) * FEATHER_VALUE;
  }
  function getCandidates4(dice, feathers, nevermoreOnOpponent, hexed, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify4(dice, hexed);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const act = NEVERMORE_ACTIVATION_VALUE + (nevermoreOnOpponent ? 0.2 : 0);
    const tax = (defendable) => defendable ? defenseTax : 0;
    const peckUp = has("peck-ii");
    const dmgs = peckUp ? PECK_DMG_UPGRADED : PECK_DMG;
    const kindNeeded = peckUp ? 3 : 4;
    const kindBonus = maxOfAKind(dice) >= kindNeeded ? act : 0;
    if (a >= 5) out.push([`Peck 5T (AAAAA)`, dmgs[2] + kindBonus - tax(true), dmgs[2]]);
    else if (a >= 4) out.push([`Peck 4T (AAAA)`, dmgs[1] + kindBonus - tax(true), dmgs[1]]);
    else if (a >= 3) out.push([`Peck 3T (AAA)`, dmgs[0] + kindBonus - tax(true), dmgs[0]]);
    if (a >= 2 && c >= 2) {
      const acts = has("raven-sight-ii") ? 2 : 1;
      out.push(["Raven Sight (AACC)", RAVEN_SIGHT_DMG + acts * act, RAVEN_SIGHT_DMG]);
    }
    if (hasStraight4(dice, 4)) {
      const up = has("craven-ii");
      const dmg = up ? CRAVEN_DMG_UPGRADED : CRAVEN_DMG;
      const f = up ? 2 : 1;
      out.push(["Craven (4-straight)", dmg + featherGainValue(feathers, f) - tax(true), dmg]);
    }
    if (hasStraight4(dice, 5)) {
      const up = has("beguile-ii");
      const f = up ? 3 : 2;
      const acts = up ? 2 : 1;
      out.push(["Beguile (5-straight)", BEGUILE_DMG + featherGainValue(feathers, f) + acts * act - tax(true), BEGUILE_DMG]);
    }
    const ffUp = has("fowl-friend-ii");
    const ffNeed = ffUp ? 3 : 4;
    if (b >= ffNeed) {
      const fGain = ffUp ? Math.max(0, FEATHER_CAP - feathers) : 4;
      const acts = ffUp ? 3 : 2;
      const name = ffUp ? "Fowl Friend II (BBB)" : "Fowl Friend (BBBB)";
      out.push([name, CARD_DRAW_VALUE3 + featherGainValue(feathers, fGain) + acts * act, 0]);
    }
    if (a >= 2 && b >= 3) {
      const up = has("murder-of-crows-ii");
      const dmg = up ? MURDER_DMG_UPGRADED : MURDER_DMG;
      const n = up ? 5 : 4;
      const eTalon = n / 2;
      const eFeather = n / 3;
      const pEye = 1 - Math.pow(5 / 6, n);
      const val = dmg + eTalon + featherGainValue(feathers, Math.round(eFeather)) + pEye * act - tax(true);
      out.push(["Murder of Crows (AABBB)", val, dmg]);
    }
    if (c >= 4) {
      const acts = has("chamber-ii") ? 3 : 2;
      out.push(["Chamber (CCCC)", CHAMBER_DMG + acts * act, CHAMBER_DMG]);
    } else if (c >= 3 && has("chamber-ii")) {
      out.push(["Aviary (CCC)", AVIARY_DMG + featherGainValue(feathers, 4), AVIARY_DMG]);
    }
    if (b >= 3 && c >= 2 && has("beguile-ii")) {
      out.push(["Pluck (BBBCC)", PLUCK_DMG + HEX_VALUE - tax(true), PLUCK_DMG]);
    }
    if (b >= 5 && has("fowl-friend-ii")) {
      const ffVal = CARD_DRAW_VALUE3 + featherGainValue(feathers, FEATHER_CAP + 1 - feathers, FEATHER_CAP + 1) + 3 * act;
      out.push(["Birds of a Feather (BBBBB)", 0.3 + ffVal, 0]);
    }
    if (c >= 5) {
      out.push(["Fantastic Terrors (CCCCC)", FANTASTIC_TERRORS_DMG + 3 * act + HEX_VALUE, FANTASTIC_TERRORS_DMG]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue4(dice, feathers, nvOnOpp, hexed, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates4(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName4(dice, feathers, nvOnOpp, hexed, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates4(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard4(dice, feathers, nvOnOpp, hexed, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates4(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Peck 3T (AAA)",
      "Peck 4T (AAAA)",
      "Peck 5T (AAAAA)",
      "Raven Sight (AACC)",
      "Craven (4-straight)",
      "Beguile (5-straight)",
      upgradeIds.includes("fowl-friend-ii") ? "Fowl Friend II (BBB)" : "Fowl Friend (BBBB)",
      "Murder of Crows (AABBB)",
      "Chamber (CCCC)",
      "Fantastic Terrors (CCCCC)"
    ];
    if (upgradeIds.includes("chamber-ii")) all.push("Aviary (CCC)");
    if (upgradeIds.includes("beguile-ii")) all.push("Pluck (BBBCC)");
    if (upgradeIds.includes("fowl-friend-ii")) all.push("Birds of a Feather (BBBBB)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/raveness/config.ts
  var rvConfig = {
    id: "rv",
    faceToSymbol(face) {
      return rvFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const base = bestAbilityValue4(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(
        dice,
        base,
        state.wildcards,
        (d) => bestAbilityValue4(d, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0)
      );
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue4(d, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName4(d, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard4(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates4(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0);
      return `${Math.min(state.feathers, 6)}|${state.nevermoreOnOpponent ? 1 : 0}|${state.hexed ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/druid/constants.ts
  var SHAPE_SHIFT_VALUE = 1.45;
  var REGEN2_VALUE = 2.9;
  var WOUND_VALUE = 1.4;
  var CARD_DRAW_VALUE4 = 1.3;
  var CP_TO_DMG_EQUIV3 = 0.55;
  var FEROCITY_DMG = [4, 5, 6];
  var FEROCITY_DMG_UPGRADED = [5, 6, 7];
  var MAUL_EV = 7;
  var MAUL_EV_BEAR = 8.17;
  var NATURES_CURE_DMG = 5;
  var FORESTS_CALL_DMG = 6;
  var FORESTS_ANSWER_DMG = 7;
  var PROTECT_DMG = 6;
  var PROTECT_DMG_UPGRADED = 8;
  var WRATH_DMG = 12;
  var CAT_ATTACK_BONUS = 2;

  // src/characters/druid/abilities.ts
  function drFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify5(dice) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else C += 1;
    }
    return { A, B, C };
  }
  function hasStraight5(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function maxOfAKind2(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function getCandidates5(dice, form, shapeShift, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify5(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const catBonus = (dmg) => form === "cat" && dmg > 0 ? CAT_ATTACK_BONUS + WOUND_VALUE : 0;
    const ssGain = (n) => (Math.min(2, shapeShift + n) - Math.min(2, shapeShift)) * SHAPE_SHIFT_VALUE;
    const fUp = has("ferocity-ii");
    const fd = fUp ? FEROCITY_DMG_UPGRADED : FEROCITY_DMG;
    const kindNeeded = fUp ? 3 : 4;
    const woundBonus = maxOfAKind2(dice) >= kindNeeded ? WOUND_VALUE : 0;
    if (a >= 5) out.push(["Ferocity 5A (AAAAA)", fd[2] + woundBonus + catBonus(fd[2]) - tax(true), fd[2]]);
    else if (a >= 4) out.push(["Ferocity 4A (AAAA)", fd[1] + woundBonus + catBonus(fd[1]) - tax(true), fd[1]]);
    else if (a >= 3) out.push(["Ferocity 3A (AAA)", fd[0] + woundBonus + catBonus(fd[0]) - tax(true), fd[0]]);
    const maulEv = form === "bear" ? MAUL_EV_BEAR : MAUL_EV;
    if (b >= 5 && has("maul-ii")) {
      out.push(["Savage Maul (BBBBB)", ssGain(1) + maulEv + catBonus(maulEv) - tax(true), Math.round(maulEv)]);
    }
    if (b >= 4) out.push(["Maul (BBBB)", maulEv + catBonus(maulEv) - tax(true), Math.round(maulEv)]);
    if (a >= 2 && c >= 2) {
      out.push(["Nature's Cure (AACC)", NATURES_CURE_DMG + REGEN2_VALUE + catBonus(NATURES_CURE_DMG) - tax(true), NATURES_CURE_DMG]);
    }
    if (a >= 1 && b >= 2 && c >= 1) {
      const val = CP_TO_DMG_EQUIV3 + ssGain(2) + (form === "druid" ? CARD_DRAW_VALUE4 : 0);
      out.push(["Wild Realignment (ABBC)", val, 0]);
    }
    if (hasStraight5(dice, 4)) {
      out.push(["Forest's Call (4-straight)", FORESTS_CALL_DMG + ssGain(1) + catBonus(FORESTS_CALL_DMG) - tax(true), FORESTS_CALL_DMG]);
    }
    if (hasStraight5(dice, 5)) {
      const bonus = 0.5 * 2 + 1 / 3 * ssGain(1) + 1 / 6 * REGEN2_VALUE;
      out.push(["Forest's Answer (5-straight)", FORESTS_ANSWER_DMG + ssGain(1) + bonus + catBonus(FORESTS_ANSWER_DMG) - tax(true), FORESTS_ANSWER_DMG]);
    }
    const pDmg = has("protect-the-forest-ii") ? PROTECT_DMG_UPGRADED : PROTECT_DMG;
    if (c >= 4) {
      out.push(["Protect the Forest (CCCC)", pDmg + REGEN2_VALUE + ssGain(1) + catBonus(pDmg), pDmg]);
    } else if (c >= 3 && has("protect-the-forest-ii")) {
      out.push(["Rainfall (CCC)", CP_TO_DMG_EQUIV3 + 2 * REGEN2_VALUE, 0]);
    }
    if (c >= 5) {
      out.push(["Wrath of Nature (CCCCC)", WRATH_DMG + REGEN2_VALUE + ssGain(2) + catBonus(WRATH_DMG), WRATH_DMG]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue5(dice, form, shapeShift, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates5(dice, form, shapeShift, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName5(dice, form, shapeShift, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates5(dice, form, shapeShift, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard5(dice, form, shapeShift, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates5(dice, form, shapeShift, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Ferocity 3A (AAA)",
      "Ferocity 4A (AAAA)",
      "Ferocity 5A (AAAAA)",
      "Maul (BBBB)",
      "Nature's Cure (AACC)",
      "Wild Realignment (ABBC)",
      "Forest's Call (4-straight)",
      "Forest's Answer (5-straight)",
      "Protect the Forest (CCCC)",
      "Wrath of Nature (CCCCC)"
    ];
    if (upgradeIds.includes("maul-ii")) all.push("Savage Maul (BBBBB)");
    if (upgradeIds.includes("protect-the-forest-ii")) all.push("Rainfall (CCC)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/druid/config.ts
  var drConfig = {
    id: "dr",
    faceToSymbol(face) {
      return drFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const base = bestAbilityValue5(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(
        dice,
        base,
        state.wildcards,
        (d) => bestAbilityValue5(d, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0)
      );
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue5(d, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName5(d, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard5(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates5(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0);
      return `${state.form}|${Math.min(state.shapeShift, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/thor/constants.ts
  var EK_VALUE = 0.6;
  var EK_MARGINAL = [0.6, 0.6, 0.6, 0.6];
  function ekValueOfGaining(current, gained) {
    let total = 0;
    for (let i = 0; i < gained; i++) {
      const idx = current + i;
      if (idx >= EK_MARGINAL.length) break;
      total += EK_MARGINAL[idx];
    }
    return total;
  }
  var GB_VALUE = 0.9;
  var HEAL_VALUE = 1;
  var CP_TO_DMG_EQUIV4 = 1.3;
  var HAMMERED_DMG = [4, 5, 7];
  var HAMMERED_DMG_II = [5, 6, 7];
  var HAMMERED_DMG_III = [5, 6, 8];
  var MIGHTY_SUMMON_HEAL = 2;
  var MIGHTY_SUMMON_HEAL_II = 3;
  var MIGHTY_SUMMON_COLLATERAL = 3;
  var MIGHTY_SUMMON_COLLATERAL_II = 4;
  var CHAIN_LIGHTNING_EV = 8.458;
  var CHAIN_LIGHTNING_EV_II = 9.344;
  var CHAIN_LIGHTNING_COLLATERAL = 2;
  var CHAIN_LIGHTNING_COLLATERAL_II = 3;
  var ODINFORCE_DMG = 5;
  var ODINFORCE_DMG_II = 6;
  var ODINFORCE_P_SHUTTLE = 0.812;
  var ODINFORCE_P_CP = 0.539;
  var ODINFORCE_E_THUNDER = 5 / 6;
  var BOTTLED_DMG = 7;
  var BOTTLED_DMG_II = 8;
  var LIGHTNING_ROD_DMG = 7;
  var LIGHTNING_ROD_DMG_MJOLNIR = 9;
  var LIGHTNING_ROD_DMG_II = 9;
  var THUNDER_BOLT_DMG = 10;
  var THUNDER_BOLT_DMG_II = 12;
  var FOR_ASGARD_DMG = 14;
  var BOOM_BOOM_DMG = 6;
  var ASGARDIAN_BRAWN_HEAL = 4;
  var RICOCHET_STEPS = 6;

  // src/characters/thor/abilities.ts
  function thFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify6(dice) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else C += 1;
    }
    return { A, B, C };
  }
  function hasStraight6(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function maxOfAKind3(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function shuttleValue(steps, home, ek = 0) {
    let v = 0;
    let h = home;
    let stock = ek;
    for (let i = 0; i < steps; i++) {
      if (h) v += 1;
      else {
        v += ekValueOfGaining(stock, 1);
        stock += 1;
      }
      h = !h;
    }
    return v;
  }
  function getCandidates6(dice, mjolnirHome2, electrokinesis, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify6(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const ek = electrokinesis;
    if (a >= 3) {
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const dmgTable = has("hammered-iii") ? HAMMERED_DMG_III : has("hammered-ii") ? HAMMERED_DMG_II : HAMMERED_DMG;
      const dmg = dmgTable[tier];
      const moveV = has("hammered-ii") || has("hammered-iii") ? shuttleValue(1, mjolnirHome2, ek) : mjolnirHome2 ? 1 : 0;
      const kindNeed = has("hammered-iii") ? 3 : has("hammered-ii") ? 4 : 99;
      const ekBonus = maxOfAKind3(dice) >= kindNeed ? ekValueOfGaining(ek, 1) : 0;
      const label = a >= 5 ? "Hammered 5H" : a >= 4 ? "Hammered 4H" : "Hammered 3H";
      out.push([label, dmg + moveV + ekBonus - tax(true), dmg]);
    }
    if (a >= 1 && b >= 2 && c >= 1) {
      const up = has("mighty-summon-ii");
      const heal = up ? MIGHTY_SUMMON_HEAL_II : MIGHTY_SUMMON_HEAL;
      const coll = up ? MIGHTY_SUMMON_COLLATERAL_II : MIGHTY_SUMMON_COLLATERAL;
      const branch = mjolnirHome2 ? ekValueOfGaining(ek, 3) : coll + ekValueOfGaining(ek, 1);
      out.push(["Mighty Summon (HWWT)", 2 * GB_VALUE + heal * HEAL_VALUE + branch, 0]);
    }
    if (a >= 2 && c >= 2 && has("mighty-summon-ii")) {
      out.push(["Boom Boom! (HHTT)", BOOM_BOOM_DMG + 2 * EK_VALUE - tax(true), BOOM_BOOM_DMG]);
    }
    if (a >= 3 && c >= 2) {
      const up = has("chain-lightning-ii");
      const ev = up ? CHAIN_LIGHTNING_EV_II : CHAIN_LIGHTNING_EV;
      const coll = up ? CHAIN_LIGHTNING_COLLATERAL_II : CHAIN_LIGHTNING_COLLATERAL;
      out.push(["Chain Lightning (HHHTT)", ev + coll - tax(true), Math.round(ev)]);
    }
    if (a >= 2 && b >= 3) {
      const dmg = has("odinforce-ii") ? ODINFORCE_DMG_II : ODINFORCE_DMG;
      const expectEkGain = ODINFORCE_E_THUNDER;
      const boost = Math.min(4, ek + expectEkGain);
      const v = dmg + boost + ODINFORCE_P_SHUTTLE * shuttleValue(1, mjolnirHome2, ek) + ODINFORCE_P_CP * CP_TO_DMG_EQUIV4 + ekValueOfGaining(ek, 1) * ODINFORCE_E_THUNDER - tax(true);
      out.push(["Odinforce (HHWWW)", v, dmg]);
    }
    if (c >= 4) {
      const up = has("bottled-lightning-ii");
      const dmg = (up ? BOTTLED_DMG_II : BOTTLED_DMG) + Math.min(4, ek);
      const steps = up ? 3 : 2;
      out.push(["Bottled Lightning (TTTT)", dmg + shuttleValue(steps, mjolnirHome2, ek) + 2 * GB_VALUE - tax(true), dmg]);
    }
    if (c >= 3 && has("bottled-lightning-ii")) {
      out.push(["Ricochet! (TTT)", shuttleValue(RICOCHET_STEPS, mjolnirHome2, ek), 0]);
    }
    if (hasStraight6(dice, 4)) {
      if (has("lightning-rod-ii")) {
        out.push(["Lightning Rod (4-straight)", LIGHTNING_ROD_DMG_II + shuttleValue(1, mjolnirHome2, ek) + ekValueOfGaining(ek, 1) - tax(true), LIGHTNING_ROD_DMG_II]);
      } else {
        const v = mjolnirHome2 ? LIGHTNING_ROD_DMG + ekValueOfGaining(ek, 1) : LIGHTNING_ROD_DMG_MJOLNIR;
        const dmg = mjolnirHome2 ? LIGHTNING_ROD_DMG : LIGHTNING_ROD_DMG_MJOLNIR;
        out.push(["Lightning Rod (4-straight)", v - tax(true), dmg]);
      }
    }
    if (hasStraight6(dice, 5)) {
      const dmg = has("thunder-bolt-ii") ? THUNDER_BOLT_DMG_II : THUNDER_BOLT_DMG;
      out.push(["Thunder Bolt (5-straight)", dmg + shuttleValue(1, mjolnirHome2, ek) + ekValueOfGaining(ek, 2) - tax(true), dmg]);
    }
    if (b >= 3 && has("thunder-bolt-ii")) {
      out.push(["Asgardian Brawn (WWW)", ASGARDIAN_BRAWN_HEAL * HEAL_VALUE, 0]);
    }
    if (c >= 5) {
      out.push(["For Asgard! (TTTTT)", FOR_ASGARD_DMG + GB_VALUE + shuttleValue(4, mjolnirHome2, ek), FOR_ASGARD_DMG]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue6(dice, mjolnirHome2, ek, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates6(dice, mjolnirHome2, ek, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName6(dice, mjolnirHome2, ek, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates6(dice, mjolnirHome2, ek, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard6(dice, mjolnirHome2, ek, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates6(dice, mjolnirHome2, ek, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Hammered 3H",
      "Hammered 4H",
      "Hammered 5H",
      "Mighty Summon (HWWT)",
      "Chain Lightning (HHHTT)",
      "Odinforce (HHWWW)",
      "Bottled Lightning (TTTT)",
      "Lightning Rod (4-straight)",
      "Thunder Bolt (5-straight)",
      "For Asgard! (TTTTT)"
    ];
    if (upgradeIds.includes("mighty-summon-ii")) all.push("Boom Boom! (HHTT)");
    if (upgradeIds.includes("bottled-lightning-ii")) all.push("Ricochet! (TTT)");
    if (upgradeIds.includes("thunder-bolt-ii")) all.push("Asgardian Brawn (WWW)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/thor/config.ts
  var thConfig = {
    id: "th",
    faceToSymbol(face) {
      return thFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const evalFn = (d) => bestAbilityValue6(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0);
      let v = augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn);
      if (state.heIsWorthy) {
        for (let i = 0; i < dice.length; i++) {
          for (const f of [4, 5]) {
            if (dice[i] === f) continue;
            const alt = dice.slice();
            alt[i] = f;
            v = Math.max(v, evalFn(alt) - CP_TO_DMG_EQUIV4);
          }
        }
      }
      return v;
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue6(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName6(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard6(dice, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates6(dice, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0) + (state.heIsWorthy ? 32 : 0);
      return `${state.mjolnirHome ? 1 : 0}|${Math.min(state.electrokinesis, 4)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/spiderman/constants.ts
  var COMBO_VALUE = 4.7;
  var WEBBED_VALUE = 1.5;
  var INVIS_VALUE = 0.3;
  var CARD_DRAW_VALUE5 = 1.2;
  var PUNCH_DMG = [4, 5, 6];
  var PUNCH_DMG_II = [5, 6, 7];
  var CCC_COMBO_DMG = 5;
  var CCC_COMBO_DMG_II = 6;
  var SPIDER_REFLEXES_EV = 7;
  var SPIDER_REFLEXES_P_COMBO = 10 / 36;
  var WALL_CRAWLER_DMG = 7;
  var ENSNARE_SMALL_DMG = 5;
  var ENSNARE_SMALL_DMG_II = 6;
  var ENSNARE_LARGE_DMG = 8;
  var ENSNARE_LARGE_DMG_II = 9;
  var VENOM_PUNCH_DMG = 7;
  var VENOM_PUNCH_DMG_II = 8;
  var VENOM_SHOCKWAVE_DMG = 13;
  var COMBO_UP_DMG = 2;

  // src/characters/spiderman/abilities.ts
  function smFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify7(dice) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else C += 1;
    }
    return { A, B, C };
  }
  function hasStraight7(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function maxOfAKind4(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function getCandidates7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify7(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const comboV = comboHeld ? 0 : COMBO_VALUE;
    const invisV = invisHeld ? 0 : INVIS_VALUE;
    const webbedV = oppWebbed ? 0 : WEBBED_VALUE;
    if (a >= 3) {
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const dmg = (has("punch-ii") ? PUNCH_DMG_II : PUNCH_DMG)[tier];
      const comboBonus = has("punch-ii") && maxOfAKind4(dice) >= 4 ? comboV : 0;
      const label = a >= 5 ? "Punch 5A (AAAAA)" : a >= 4 ? "Punch 4A (AAAA)" : "Punch 3A (AAA)";
      out.push([label, dmg + comboBonus - tax(true), dmg]);
    }
    if (a >= 2 && c >= 2) {
      const dmg = has("combo-ii") ? CCC_COMBO_DMG_II : CCC_COMBO_DMG;
      out.push(["C-C-C-Combo (AACC)", dmg + comboV - tax(true), dmg]);
    }
    if (b >= 2 && c >= 1 && has("combo-ii")) {
      out.push(["Web Shot (BBC)", invisV + webbedV, 0]);
    }
    if (a >= 1 && b >= 2 && c >= 1) {
      out.push(["Spider-Reflexes (ABBC)", SPIDER_REFLEXES_EV + SPIDER_REFLEXES_P_COMBO * comboV - tax(true), SPIDER_REFLEXES_EV]);
    }
    if (a >= 2 && b >= 3) {
      out.push(["Wall Crawler (AABBB)", WALL_CRAWLER_DMG + invisV - tax(true), WALL_CRAWLER_DMG]);
    }
    if (hasStraight7(dice, 5)) {
      const dmg = has("ensnare-ii") ? ENSNARE_LARGE_DMG_II : ENSNARE_LARGE_DMG;
      out.push(["Ensnare (5-straight)", dmg + webbedV + CARD_DRAW_VALUE5 - tax(true), dmg]);
    } else if (hasStraight7(dice, 4)) {
      const dmg = has("ensnare-ii") ? ENSNARE_SMALL_DMG_II : ENSNARE_SMALL_DMG;
      out.push(["Ensnare (4-straight)", dmg + webbedV - tax(true), dmg]);
    }
    if (c >= 3 && has("venom-punch-ii")) {
      out.push(["Combo Up (CCC)", COMBO_UP_DMG + comboV, COMBO_UP_DMG]);
    }
    if (c >= 4) {
      const dmg = has("venom-punch-ii") ? VENOM_PUNCH_DMG_II : VENOM_PUNCH_DMG;
      out.push(["Venom Punch (CCCC)", dmg + invisV, dmg]);
    }
    if (c >= 5) {
      out.push(["Venom Shockwave (CCCCC)", VENOM_SHOCKWAVE_DMG + invisV + webbedV, VENOM_SHOCKWAVE_DMG]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates7(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Punch 3A (AAA)",
      "Punch 4A (AAAA)",
      "Punch 5A (AAAAA)",
      "C-C-C-Combo (AACC)",
      "Spider-Reflexes (ABBC)",
      "Wall Crawler (AABBB)",
      "Ensnare (4-straight)",
      "Ensnare (5-straight)",
      "Venom Punch (CCCC)",
      "Venom Shockwave (CCCCC)"
    ];
    if (upgradeIds.includes("combo-ii")) all.push("Web Shot (BBC)");
    if (upgradeIds.includes("venom-punch-ii")) all.push("Combo Up (CCC)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/spiderman/config.ts
  var smConfig = {
    id: "sm",
    faceToSymbol(face) {
      return smFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const evalFn = (d) => bestAbilityValue7(d, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn);
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue7(d, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName7(d, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard7(dice, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates7(dice, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0);
      return `${state.comboHeld ? 1 : 0}${state.invisHeld ? 1 : 0}${state.oppWebbed ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/pyromancer/constants.ts
  var FM_VALUE = 0.7;
  var BURN_VALUE = 4;
  var KNOCKDOWN_VALUE = 1.5;
  var STUN_EXTRA_PHASE_VALUE = 5;
  var FIREBALL_DMG = [4, 6, 8];
  var HOT_STREAK_BASE = 5;
  var HOT_STREAK_BASE_II = 6;
  var IGNITE_BASE = 4;
  var IGNITE_BASE_II = 5;
  var PYROBLAST_DMG = 6;
  var COMBUSTION_DMG_PER_TOKEN = 3;
  var COMBUSTION_DMG_PER_TOKEN_II = 4;
  var METEORITE_COLLATERAL = 2;
  var METEORITE_COLLATERAL_II = 3;
  var SCORCH_DMG = 6;
  var ULT_DMG = 12;
  var ULT_COLLATERAL = 2;

  // src/characters/pyromancer/abilities.ts
  function pyFaceToSymbol(face) {
    return face <= 3 ? "A" : face === 4 ? "B" : face === 5 ? "C" : "D";
  }
  function classify8(dice) {
    let A = 0, B = 0, C = 0, D = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d === 4) B += 1;
      else if (d === 5) C += 1;
      else D += 1;
    }
    return { A, B, C, D };
  }
  function hasStraight8(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function getCandidates8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c, D: d } = classify8(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const burnV = oppBurned ? 0 : BURN_VALUE;
    const knockV = oppKnocked ? 0 : KNOCKDOWN_VALUE;
    const gainFm2 = (n) => Math.min(fmCap2, fm + n) - fm;
    if (a >= 3) {
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const dmg = FIREBALL_DMG[tier];
      const fmGain = gainFm2(has("fireball-ii") ? 2 : 1);
      const label = a >= 5 ? "Fireball 5F (AAAAA)" : a >= 4 ? "Fireball 4F (AAAA)" : "Fireball 3F (AAA)";
      out.push([label, dmg + fmGain * FM_VALUE - tax(true), dmg]);
    }
    if (c >= 2) {
      const up = has("burning-soul-ii");
      const fmGain = gainFm2(2 * c);
      let v = fmGain * FM_VALUE + c;
      if (up && c >= 3) v += burnV;
      if (up && c >= 4) v += FM_VALUE;
      out.push(["Burning Soul (CC)", v, c]);
    }
    if (a >= 1 && b >= 1 && c >= 1 && d >= 1) {
      const per = has("combustion-ii") ? COMBUSTION_DMG_PER_TOKEN_II : COMBUSTION_DMG_PER_TOKEN;
      const removable = Math.min(4, Math.min(fmCap2, fm + 1));
      const dmg = removable * per;
      out.push(["Combustion (ABCD)", dmg - removable * FM_VALUE + FM_VALUE, dmg]);
    }
    if (a >= 4 && d >= 1) {
      const dice2 = has("pyroblast-ii") || has("pyroblast-iii") ? 2 : 1;
      const perDie = 0.5 * 3 + (burnV + 2 * FM_VALUE + knockV) / 6;
      const reroll = has("pyroblast-iii") ? 0.4 : 0;
      out.push(["Pyroblast (AAAAD)", PYROBLAST_DMG + dice2 * perDie + reroll - tax(true), PYROBLAST_DMG]);
    }
    if (hasStraight8(dice, 4)) {
      const base = has("hot-streak-ii") ? HOT_STREAK_BASE_II : HOT_STREAK_BASE;
      const fmAfter = Math.min(fmCap2, fm + 2);
      const dmg = base + fmAfter;
      out.push(["Hot Streak (4-straight)", dmg + (fmAfter - fm) * FM_VALUE - tax(true), dmg]);
    }
    if (hasStraight8(dice, 5)) {
      const up = has("ignite-ii");
      const base = up ? IGNITE_BASE_II : IGNITE_BASE;
      const fmAfter = Math.min(fmCap2, fm + 2);
      const dmg = base + 2 * fmAfter;
      out.push(["Ignite (5-straight)", dmg + (fmAfter - fm) * FM_VALUE + (up ? burnV : 0) - tax(true), dmg]);
    }
    if (a >= 2 && b >= 2 && has("hot-streak-ii")) {
      out.push(["Scorch (AABB)", SCORCH_DMG + gainFm2(2) * FM_VALUE + burnV - tax(true), SCORCH_DMG]);
    }
    if (b >= 2 && c >= 2 && has("ignite-ii")) {
      const fmGain = Math.min(fmCap2 + 1, fm + 5) - fm;
      out.push(["Blazing Soul (BBCC)", fmGain * FM_VALUE + FM_VALUE + knockV, 0]);
    }
    if (d >= 3 && has("meteorite-ii")) {
      out.push(["Meteoroid (DDD)", knockV + burnV + STUN_EXTRA_PHASE_VALUE, 0]);
    }
    if (d >= 4) {
      const coll = has("meteorite-ii") ? METEORITE_COLLATERAL_II : METEORITE_COLLATERAL;
      const fmAfter = Math.min(fmCap2, fm + 2);
      const dmg = fmAfter + coll;
      out.push(["Meteorite (DDDD)", dmg + (fmAfter - fm) * FM_VALUE + STUN_EXTRA_PHASE_VALUE, dmg]);
    }
    if (d >= 5) {
      out.push(["Scorch the Earth (DDDDD)", ULT_DMG + ULT_COLLATERAL + gainFm2(3) * FM_VALUE + knockV + burnV, ULT_DMG + ULT_COLLATERAL]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates8(dice, fm, fmCap2, oppBurned, oppKnocked, upgradeIds, defenseTax).map(([n, v, dd]) => [n, [v, dd]]));
    const all = [
      "Fireball 3F (AAA)",
      "Fireball 4F (AAAA)",
      "Fireball 5F (AAAAA)",
      "Burning Soul (CC)",
      "Combustion (ABCD)",
      "Pyroblast (AAAAD)",
      "Hot Streak (4-straight)",
      "Ignite (5-straight)",
      "Meteorite (DDDD)",
      "Scorch the Earth (DDDDD)"
    ];
    if (upgradeIds.includes("hot-streak-ii")) all.push("Scorch (AABB)");
    if (upgradeIds.includes("ignite-ii")) all.push("Blazing Soul (BBCC)");
    if (upgradeIds.includes("meteorite-ii")) all.push("Meteoroid (DDD)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/pyromancer/config.ts
  var pyConfig = {
    id: "py",
    faceToSymbol(face) {
      return pyFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const evalFn = (d) => bestAbilityValue8(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn);
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue8(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName8(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard8(dice, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates8(dice, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0);
      return `${Math.min(state.fireMastery, state.fmCap)}|${state.fmCap}|${state.oppBurned ? 1 : 0}${state.oppKnocked ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/duelist/constants.ts
  var GB_VALUE2 = 0.9;
  var DISARM_VALUE = 1;
  var STEP_VALUE = 0.3;
  var CP_TO_DMG_EQUIV6 = 1;
  function offensiveBonusDmg(pos) {
    return pos >= 2 ? 3 : pos >= 1 ? 1 : 0;
  }
  var BLADE_FLURRY_DMG = [4, 5, 6];
  var BLADE_FLURRY_DMG_II = [5, 6, 7];
  var BALESTRA_DMG = 6;
  var BALESTRA_DMG_II = 8;
  var BALESTRA_STEPS = 2;
  var FANCY_FEET_STEPS = 3;
  var FEINT_ATTACK_DMG = 2;
  var FEINT_ATTACK_DMG_II = 3;
  var EN_GARDE_DMG = 8;
  var EN_GARDE_P_DISARM = 1 - Math.pow(5 / 6, 4);
  var STRIKE_SMALL_DMG = 7;
  var STRIKE_LARGE_DMG = 10;
  var BLADESTORM_DMG = 8;
  var BLADESTORM_DMG_II = 9;
  var BLADESTORM_STEPS = 2;
  var BLADEWIND_COLLATERAL = 3;
  var ULT_DMG2 = 11;
  var ULT_STEPS = 4;
  function gbValueOfGaining(current, gained) {
    return Math.max(0, Math.min(2, current + gained) - Math.min(2, current)) * GB_VALUE2;
  }

  // src/characters/duelist/abilities.ts
  function duFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify9(dice) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else C += 1;
    }
    return { A, B, C };
  }
  function hasStraight9(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function maxOfAKind5(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function getCandidates9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify9(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const stepPack = (steps) => {
      const posAfter = Math.min(2, footwork + steps);
      const moved = posAfter - footwork;
      return { offBonus: bonusAvailable ? offensiveBonusDmg(posAfter) : 0, residual: STEP_VALUE * moved };
    };
    const baselineOff = bonusAvailable ? offensiveBonusDmg(footwork) : 0;
    if (a >= 3) {
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("blade-flurry-ii") ? BLADE_FLURRY_DMG_II : BLADE_FLURRY_DMG;
      const kindNeed = has("blade-flurry-ii") ? 3 : 4;
      const steps = maxOfAKind5(dice) >= kindNeed ? 1 : 0;
      const p = stepPack(steps);
      const label = a >= 5 ? "Blade Flurry 5A (AAAAA)" : a >= 4 ? "Blade Flurry 4A (AAAA)" : "Blade Flurry 3A (AAA)";
      out.push([label, table[tier] + p.offBonus + p.residual - tax(true), table[tier]]);
    }
    if (a >= 2 && b >= 2) {
      const dmg = has("balestra-ii") ? BALESTRA_DMG_II : BALESTRA_DMG;
      const p = stepPack(BALESTRA_STEPS);
      out.push(["Balestra (AABB)", dmg + p.offBonus + p.residual - tax(true), dmg]);
    }
    if (b >= 3 && has("balestra-ii")) {
      const p = stepPack(FANCY_FEET_STEPS);
      out.push(["Fancy Feet (BBB)", gbValueOfGaining(guardBreak, 1) + p.residual + STEP_VALUE, 0]);
    }
    if (a >= 2 && c >= 2) {
      const up = has("feint-attack-ii");
      const dmg = up ? FEINT_ATTACK_DMG_II : FEINT_ATTACK_DMG;
      const p = stepPack(1);
      out.push(["Feint Attack (AACC)", dmg + p.offBonus + p.residual + gbValueOfGaining(guardBreak, up ? 2 : 1), dmg]);
    }
    if (c >= 1 && b >= 3) {
      const disarmV = oppDisarmed ? 0 : EN_GARDE_P_DISARM * DISARM_VALUE;
      out.push(["En Garde (CBBB)", EN_GARDE_DMG + baselineOff + disarmV - tax(true), EN_GARDE_DMG]);
    }
    if (hasStraight9(dice, 5)) {
      const p = stepPack(1);
      out.push(["Strike (5-straight)", STRIKE_LARGE_DMG + p.offBonus + p.residual - tax(true), STRIKE_LARGE_DMG]);
    } else if (hasStraight9(dice, 4)) {
      out.push(["Strike (4-straight)", STRIKE_SMALL_DMG + baselineOff - tax(true), STRIKE_SMALL_DMG]);
    }
    if (c >= 4) {
      const up = has("bladestorm-ii");
      const dmg = up ? BLADESTORM_DMG_II : BLADESTORM_DMG;
      const p = stepPack(BLADESTORM_STEPS);
      const v = dmg + p.offBonus + p.residual + gbValueOfGaining(guardBreak, up ? 2 : 1) + (oppDisarmed ? 0 : DISARM_VALUE) - tax(true);
      out.push(["Bladestorm (CCCC)", v, dmg]);
    }
    if (c >= 3 && has("bladestorm-ii")) {
      out.push(["Bladewind (CCC)", BLADEWIND_COLLATERAL, BLADEWIND_COLLATERAL]);
    }
    if (c >= 5) {
      const p = stepPack(ULT_STEPS);
      const v = ULT_DMG2 + p.offBonus + p.residual + gbValueOfGaining(guardBreak, 2) + (oppDisarmed ? 0 : DISARM_VALUE);
      out.push(["Master of the Blade! (CCCCC)", v, ULT_DMG2]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates9(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Blade Flurry 3A (AAA)",
      "Blade Flurry 4A (AAAA)",
      "Blade Flurry 5A (AAAAA)",
      "Balestra (AABB)",
      "Feint Attack (AACC)",
      "En Garde (CBBB)",
      "Strike (4-straight)",
      "Strike (5-straight)",
      "Bladestorm (CCCC)",
      "Master of the Blade! (CCCCC)"
    ];
    if (upgradeIds.includes("balestra-ii")) all.push("Fancy Feet (BBB)");
    if (upgradeIds.includes("bladestorm-ii")) all.push("Bladewind (CCC)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/duelist/config.ts
  var duConfig = {
    id: "du",
    faceToSymbol(face) {
      return duFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const evalFn = (d) => bestAbilityValue9(d, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0);
      let v = augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn);
      if (state.quickFootwork) {
        for (let i = 0; i < dice.length; i++) {
          for (const f of [4, 5]) {
            if (dice[i] === f) continue;
            const alt = dice.slice();
            alt[i] = f;
            v = Math.max(v, evalFn(alt) - CP_TO_DMG_EQUIV6);
          }
        }
      }
      return v;
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue9(d, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName9(d, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard9(dice, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates9(dice, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0) + (state.quickFootwork ? 32 : 0);
      return `${state.footwork}|${Math.min(state.guardBreak, 2)}|${state.oppDisarmed ? 1 : 0}|${state.bonusAvailable ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/characters/sunelf/constants.ts
  var DIAL_VALUE = 0.8;
  var DIAL_RESIDUAL_DAWN = 0.3;
  var GEM_VALUE = 2;
  var SUN_MARKED_VALUE = 2.5;
  var HEAL_VALUE2 = 1;
  var LIGHT_STAFF_DMG = [4, 5, 7];
  var LIGHT_STAFF_DMG_II = [5, 6, 7];
  var RAY_ABSORPTION_DIAL = 3;
  var RAY_ABSORPTION_HEAL = 2;
  var RADIANT_ENERGY_DMG = 6;
  var PRAISE_THE_SUN_DMG = 5;
  var SCORCHING_DMG = 5;
  var SCORCHING_BONUS_E_DMG = 1;
  var SCORCHING_BONUS_E_DIAL = 2 * (2 / 6) + 2 * (1 / 6);
  var SCORCHING_BONUS_P_GEM = 1 / 6;
  var SCORCHING_II_E_DMG = 2;
  var SCORCHING_II_E_DIAL = 2 / 3 + 2 * (11 / 36);
  var SCORCHING_II_P_GEM = 11 / 36;
  var RAY_OF_LIGHT_DMG = 7;
  var RAY_OF_LIGHT_DIAL = 1;
  var SUNBEAM_DMG = 9;
  var SUNBEAM_DIAL = 2;
  var SUNBEAM_DIAL_II = 3;
  var SOAKING_DMG = 9;
  var SOLAR_BURST_DMG = 8;
  var SOLAR_BURST_DMG_II = 7;
  var SOLAR_BURST_DIAL = 2;
  var BESTOW_DIAL = 4;
  var ULT_DMG3 = 10;
  var ULT_DIAL = 3;
  function dialValueOfGaining(current, gained) {
    const toDial = Math.max(0, Math.min(5, current + gained) - Math.min(5, current));
    const excess = Math.max(0, gained - toDial);
    return toDial * DIAL_VALUE + excess * HEAL_VALUE2;
  }

  // src/characters/sunelf/abilities.ts
  function seFaceToSymbol(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function classify10(dice) {
    let A = 0, B = 0, C = 0;
    for (const d of dice) {
      if (d <= 3) A += 1;
      else if (d <= 5) B += 1;
      else C += 1;
    }
    return { A, B, C };
  }
  function hasStraight10(dice, len) {
    const uniq = [...new Set(dice)].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < uniq.length; i++) {
      run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }
  function maxOfAKind6(dice) {
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    return Math.max(...counts.values());
  }
  function getCandidates10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds = [], defenseTax = 0) {
    const { A: a, B: b, C: c } = classify10(dice);
    const has = (id) => upgradeIds.includes(id);
    const out = [];
    const tax = (defendable) => defendable ? defenseTax : 0;
    const gem = (p = 1) => gemHeld ? 0 : p * GEM_VALUE;
    const mark = () => oppMarked ? 0 : SUN_MARKED_VALUE;
    const dial$ = (n) => dialValueOfGaining(dial, n);
    const dawnBonus = dawn && dial >= 3 ? dial - DIAL_RESIDUAL_DAWN * Math.min(dial, 4) : 0;
    if (a >= 3) {
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("light-staff-ii") ? LIGHT_STAFF_DMG_II : LIGHT_STAFF_DMG;
      const kindNeed = has("light-staff-ii") ? 3 : 4;
      const kindBonus = maxOfAKind6(dice) >= kindNeed ? dial$(1) : 0;
      const label = a >= 5 ? "Light Staff 5A (AAAAA)" : a >= 4 ? "Light Staff 4A (AAAA)" : "Light Staff 3A (AAA)";
      out.push([label, table[tier] + dawnBonus + kindBonus - tax(true), table[tier]]);
    }
    if (b >= 4) {
      out.push(["Ray Absorption (BBBB)", dial$(RAY_ABSORPTION_DIAL) + RAY_ABSORPTION_HEAL * HEAL_VALUE2 + gem(), 0]);
    }
    if ((has("radiant-energy-ii") ? a >= 2 : a >= 3) && c >= 2) {
      out.push(["Radiant Energy (AAACC)", RADIANT_ENERGY_DMG + dawnBonus + mark() - tax(true), RADIANT_ENERGY_DMG]);
    }
    if (a >= 3 && c >= 1 && has("radiant-energy-ii")) {
      out.push(["Praise the Sun (AAAC)", PRAISE_THE_SUN_DMG + dawnBonus + gem() - tax(true), PRAISE_THE_SUN_DMG]);
    }
    if (a >= 1 && b >= 3) {
      const up = has("scorching-staff-ii");
      const eDmg = up ? SCORCHING_II_E_DMG : SCORCHING_BONUS_E_DMG;
      const eDial = up ? SCORCHING_II_E_DIAL : SCORCHING_BONUS_E_DIAL;
      const pGem = up ? SCORCHING_II_P_GEM : SCORCHING_BONUS_P_GEM;
      const v = SCORCHING_DMG + eDmg + dawnBonus + dialValueOfGaining(dial, 1) * eDial + gem(pGem) - tax(true);
      out.push(["Scorching Staff (ABBB)", v, SCORCHING_DMG]);
    }
    if (hasStraight10(dice, 5)) {
      const d = has("sunbeam-ii") ? SUNBEAM_DIAL_II : SUNBEAM_DIAL;
      out.push(["Sunbeam (5-straight)", SUNBEAM_DMG + dawnBonus + dial$(d) - tax(true), SUNBEAM_DMG]);
    } else if (hasStraight10(dice, 4)) {
      out.push(["Ray of Light (4-straight)", RAY_OF_LIGHT_DMG + dawnBonus + dial$(RAY_OF_LIGHT_DIAL) - tax(true), RAY_OF_LIGHT_DMG]);
    }
    if (b >= 1 && c >= 3 && has("sunbeam-ii")) {
      out.push(["Soaking Up the Sun (BCCC)", SOAKING_DMG + dawnBonus + gem() - tax(true), SOAKING_DMG]);
    }
    if (c >= 4) {
      if (has("solar-burst-ii")) {
        out.push(["Solar Burst (CCCC)", SOLAR_BURST_DMG_II + dawnBonus + dial$(SOLAR_BURST_DIAL) + gem() + mark(), SOLAR_BURST_DMG_II]);
      } else {
        out.push(["Solar Burst (CCCC)", SOLAR_BURST_DMG + dawnBonus + dial$(SOLAR_BURST_DIAL) + Math.max(gem(), mark()) - tax(true), SOLAR_BURST_DMG]);
      }
    }
    if (c >= 3 && has("solar-burst-ii")) {
      out.push(["Bestow Your Light (CCC)", dial$(BESTOW_DIAL) + mark(), 0]);
    }
    if (c >= 5) {
      out.push(["Solar Flare! (CCCCC)", ULT_DMG3 + dawnBonus + dial$(ULT_DIAL) + gem() + mark(), ULT_DMG3]);
    }
    out.push(["Whiff", 0, 0]);
    return out;
  }
  function bestAbilityValue10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds = [], defenseTax = 0) {
    return Math.max(...getCandidates10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds = [], defenseTax = 0) {
    const cands = getCandidates10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax);
    let best = cands[0];
    for (const cand of cands) if (cand[1] > best[1]) best = cand;
    return best[0];
  }
  function buildAbilityBoard10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds = [], defenseTax = 0) {
    const matched = new Map(getCandidates10(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d]]));
    const all = [
      "Light Staff 3A (AAA)",
      "Light Staff 4A (AAAA)",
      "Light Staff 5A (AAAAA)",
      "Ray Absorption (BBBB)",
      "Radiant Energy (AAACC)",
      "Scorching Staff (ABBB)",
      "Ray of Light (4-straight)",
      "Sunbeam (5-straight)",
      "Solar Burst (CCCC)",
      "Solar Flare! (CCCCC)"
    ];
    if (upgradeIds.includes("radiant-energy-ii")) all.push("Praise the Sun (AAAC)");
    if (upgradeIds.includes("sunbeam-ii")) all.push("Soaking Up the Sun (BCCC)");
    if (upgradeIds.includes("solar-burst-ii")) all.push("Bestow Your Light (CCC)");
    return all.map((name) => {
      const hit = matched.get(name);
      return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 };
    });
  }

  // src/characters/sunelf/config.ts
  var seConfig = {
    id: "se",
    faceToSymbol(face) {
      return seFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      const evalFn = (d) => bestAbilityValue10(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn);
    },
    bestAbilityName(dice, state) {
      const evalFn = (d) => bestAbilityValue10(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0);
      const nameFn = (d) => bestAbilityName10(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0);
      return augmentTerminalName(dice, state.wildcards, evalFn, nameFn);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard10(dice, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates10(dice, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      const upgrades = (state.upgradeIds ?? []).slice().sort().join(",");
      const w = state.wildcards || {};
      const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0);
      return `${state.sunDial}|${state.dawn ? 1 : 0}|${state.gemHeld ? 1 : 0}|${state.oppMarked ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`;
    }
  };

  // src/sim/oracle.ts
  function cfgFor(heroId) {
    return heroId === "hh" ? hhConfig : heroId === "fm" ? fmConfig : heroId === "rv" ? rvConfig : heroId === "dr" ? drConfig : heroId === "th" ? thConfig : heroId === "sm" ? smConfig : heroId === "py" ? pyConfig : heroId === "du" ? duConfig : heroId === "se" ? seConfig : bwConfig;
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
      { id: "grimPursuit", name: "Grim Pursuit", startingCount: 0, stackCap: 3, description: "Positive Status Effect. Spend 1 to either: (a) perform an additional Roll Attempt during your Offensive Roll Phase, or (b) After Attacking, roll 5 dice: add 1 dmg per Horseshoe rolled (Attack Modifier). Each effect usable once per turn." }
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

  // src/sim/data/characters/fm/hero.json
  var hero_default3 = {
    id: "fm",
    name: "Forgemaster",
    diceAnatomy: "AAABBC \u2014 faces 1-3 = Pick (A), 4-5 = Forge (B), 6 = Anvil (C). Verified die leaflet (V1).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    setupNotes: "Hero Setup (verified leaflet): 'If you have more than 1 opponent, begin the game with any one Gold Armor.' In 1v1 (this engine) the Forgemaster therefore starts with NO Armor.",
    source: "Encoded 2026-07-04 from user's scans in characters/forge_master/ (board x3, Forging Info Card x2, leaflet rules clarifications x2, die anatomy, 3 distinct Ore cards). No strategy guide exists for this hero.",
    tokens: [],
    flags: [],
    abilities: [
      { id: "pick_axe_3a", boardName: "Pick Axe 3A (AAA)", dicePattern: "AAA", baseDamage: 5, defendable: true, numberMatchBonus: { ofAKind: 4, cpGain: 1 }, notes: "Board: '3 Pick: Deal 5 dmg. 4: 6. 5: 7. On 4-of-a-kind (#'s), gain 1 CP.'", verified: true },
      { id: "pick_axe_4a", boardName: "Pick Axe 4A (AAAA)", dicePattern: "AAAA", baseDamage: 6, defendable: true, numberMatchBonus: { ofAKind: 4, cpGain: 1 }, verified: true },
      { id: "pick_axe_5a", boardName: "Pick Axe 5A (AAAAA)", dicePattern: "AAAAA", baseDamage: 7, defendable: true, numberMatchBonus: { ofAKind: 4, cpGain: 1 }, verified: true },
      { id: "furnace", boardName: "Furnace (BBBB)", dicePattern: "BBBB", baseDamage: 5, defendable: true, bonusRoll: { diceCount: "1", addRolledValueAsDamage: true }, notes: "Board: 'Deal 5 dmg and roll 1 die: Add dmg equal to the value rolled.' 4 Forge symbols (corrig\xE9 2026-07-04 par le user contre le board physique \u2014 la premi\xE8re lecture photo disait 5).", verified: true },
      { id: "smelting_time", boardName: "Smelting Time (CCCC)", dicePattern: "CCCC", baseDamage: 9, defendable: false, cardDraw: 1, notes: "Board: 'Draw 1. Deal 9 undefendable dmg.' (4 Anvil symbols.)", verified: true },
      { id: "a_good_haul", boardName: "A Good Haul (ABCC)", dicePattern: "ABCC (1 Pick, 1 Forge, 2 Anvil)", baseDamage: 8, defendable: true, minesDeck: true, revealAllMinedOre: true, notes: "Board: 'Mine your deck. You may reveal all ORE cards that are Mined in this way and place them on your Passive Ability, THE FORGE. Then deal 8 dmg.' Pattern confirmed by user 2026-07-04: Pick + Forge + 2 Anvil.", verified: true },
      { id: "armored_up_s", boardName: "Armored Up S (4-straight)", dicePattern: "Small Straight (4 consecutive)", baseDamage: 7, defendable: true, thresholdBonusArmor: { armorAtLeast: 2, bonusDamage: 2 }, notes: "Board: 'If you have 2 Armor, add 2 dmg. SMALL STRAIGHT: Deal 7 dmg. LARGE STRAIGHT: Deal 10 dmg.'", verified: true },
      { id: "armored_up_l", boardName: "Armored Up L (5-straight)", dicePattern: "Large Straight (5 consecutive)", baseDamage: 10, defendable: true, thresholdBonusArmor: { armorAtLeast: 2, bonusDamage: 2 }, verified: true },
      { id: "final_touches", boardName: "Final Touches! (CCCCC)", dicePattern: "CCCCC", baseDamage: 14, defendable: false, searchOreToForge: 1, notes: "ULTIMATE. Board: 'Search your deck for any one ORE card. Place it on to your Passive Ability, THE FORGE, then shuffle your deck. Deal 14 dmg.' Leaflet clarification: 'If you have zero ORE cards in your deck, ignore the effect of placing one ORE card on THE FORGE (but still shuffle your deck).' Standard Ultimate convention: dice may be altered to prevent it, otherwise no opponent action until it completes \u2014 treated as undefendable.", verified: true }
    ],
    passives: [
      { id: "the_forge", name: "The Forge", trigger: "Main Phase (passive holding area)", text: "During your Main Phase, you may place any number of ORE from your hand on to this Passive Ability. (Clarifications: ORE drawn normally is NOT auto-placed but can be placed there any time during your Main Phase; Scrap Effects can only be performed on ORE that is on THE FORGE; ORE on THE FORGE is revealed/public.)", verified: true },
      { id: "the_mines", name: "The Mines", trigger: "Upkeep Phase (optional) + any time (once per turn, 3 CP)", text: "During your Upkeep Phase, you may Mine your deck. Once per turn, you may spend 3 CP at any time to draw 1 card.", verified: true },
      { id: "mining", name: "Mining (keyword)", trigger: "Any effect that reads 'Mine your deck'", text: "Look at the top three cards of your deck: if any of them are ORE cards, reveal one of them to your opponent and place it on your Passive Ability, THE FORGE. Alternatively, you may choose to reveal none of these cards and gain 1 CP (allowed even if none of the top 3 are ORE). Each remaining card must be placed on the bottom of your deck in any order. You cannot play Instant Action cards from the looked-at cards (this is not drawing them).", verified: true },
      { id: "crafting", name: "Crafting (keyword)", trigger: "Main Phase", text: "During your Main Phase, you may Craft Armor from your leaflet. You must have the required Blueprint ORE cards on THE FORGE, and the prerequisite Armor (if applicable) on any Hero Board. All ORE used goes to the bottom of your deck; the old Blueprint Armor returns to the leaflet; place the new Armor on yourself (or a teammate \u2014 N/A in 1v1). You may not Craft an Armor whose token is not available on the leaflet.", verified: true },
      { id: "scrap", name: "Scrap (keyword)", trigger: "Any time", text: "At any time, choose an ORE card from your Passive Ability, THE FORGE, and perform its Scrap Effect. Scrapped ORE goes to the discard pile (unlike Crafted/unrevealed Mined ORE, which goes to the bottom of the deck).", verified: true }
    ],
    defense: {
      name: "Masterwork",
      diceCount: "1",
      text: "Defense Roll 1 die: On Pick, Mine your deck. On Forge, double the effect of one Armor. On Anvil, double the effect of up to two different Armor. (Armor effects themselves trigger from being Attacked \u2014 see armors.)",
      verified: true
    },
    cards: [
      { id: "gold-ore", name: "Gold Ore", kind: "ore", cpCost: null, count: 9, text: "Scrap Effect: Heal 1 or gain 1 CP. Then discard this card.", effect: null, scrapOptions: [{ heal: 1 }, { cpGain: 1 }], verified: true },
      { id: "diamond-ore", name: "Diamond Ore", kind: "ore", cpCost: null, count: 6, text: "Scrap Effect: You may re-roll 1 of your dice or gain 1 CP. Then discard this card.", effect: null, scrapOptions: [{ rerollOwnDie: true }, { cpGain: 1 }], verified: true },
      { id: "ultimanium-ore", name: "Ultimanium Ore", kind: "ore", cpCost: null, count: 1, text: "Scrap Effect: Change the value of one of your dice to a 6 or draw 2. Then discard this card.", effect: null, scrapOptions: [{ setOwnDieTo: 6 }, { cardDraw: 2 }], verified: true }
    ],
    armors: [
      { id: "gold_helmet", name: "Gold Helmet", slot: "helmet", tier: 1, blueprint: { ore: { "gold-ore": 2 } }, effectText: "Whenever you are Attacked with normal damage, you may deal 1 dmg back to your Attacker.", verified: true },
      { id: "diamond_helmet", name: "Diamond Helmet", slot: "helmet", tier: 2, blueprint: { ore: { "diamond-ore": 2 }, requiresArmorId: "gold_helmet" }, effectText: "Whenever you are Attacked with normal damage, you may deal 2 dmg back to your Attacker.", verified: true },
      { id: "ultimanium_helmet", name: "Ultimanium Helmet", slot: "helmet", tier: 3, blueprint: { ore: { "ultimanium-ore": 1 }, requiresArmorId: "diamond_helmet" }, effectText: "Whenever you are Attacked with normal damage, you may deal 3 dmg back to your Attacker.", verified: true },
      { id: "gold_shield", name: "Gold Shield", slot: "shield", tier: 1, blueprint: { ore: { "gold-ore": 2 } }, effectText: "Whenever you are Attacked with normal damage, you may prevent 1 dmg.", verified: true },
      { id: "diamond_shield", name: "Diamond Shield", slot: "shield", tier: 2, blueprint: { ore: { "diamond-ore": 2 }, requiresArmorId: "gold_shield" }, effectText: "Whenever you are Attacked with normal damage, you may prevent 2 dmg.", verified: true },
      { id: "ultimanium_shield", name: "Ultimanium Shield", slot: "shield", tier: 3, blueprint: { ore: { "ultimanium-ore": 1 }, requiresArmorId: "diamond_shield" }, effectText: "Whenever you are Attacked with any type of damage (except an Ultimate), prevent 2 dmg. (Leaflet clarification: works against normal, undefendable and pure dmg; NOT against an Ultimate or collateral dmg.)", verified: true }
    ]
  };

  // src/sim/data/characters/rv/hero.json
  var hero_default4 = {
    id: "rv",
    name: "Raveness",
    diceAnatomy: "1-3 = Talon (A), 4-5 = Wing (B), 6 = Raven Eye (C). V\xE9rifi\xE9 leaflet (photo user 2026-07-06).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board + leaflet + 14 cartes scann\xE9s par l'user 2026-07-06. Rulings user : d\xE9fense = seuils UNE fois ; face 6 du Nevermore Die Roll = pas de soin ; Fowl Friend II = WWW.",
    tokens: [
      { id: "feather", name: "Feather", startingCount: 0, stackCap: 5, description: "Positive Status Effect. Spend at any time: 1 = force the Nevermore Die Roll to be re-rolled; 2 = +/-1 on the Nevermore Die Roll; 3 = Activate Nevermore." },
      { id: "hex", name: "Hex", startingCount: 0, stackCap: 1, description: "Unique Status Effect. 6's are considered blanks: afflicted player treats all die faces showing 6 as completely blank. Removed at the conclusion of their turn. May not be transferred (but can be removed)." },
      { id: "nevermore", name: "Nevermore", startingCount: 1, stackCap: 1, description: "Companion. Starts on the Raveness' board with dial at 0. Activated = choose: move to a chosen player, OR Absorb Vitality (only while on an opponent: dial +1 (max 3), that opponent takes 1 isolated undefendable dmg). When moved TO the Raveness: heal the dial amount, then dial to 0. Opponent holding Nevermore rolls the Nevermore Die Roll at their Upkeep: 1 = they gain Hex; 2 = Raveness may Activate x2; 3 = Activate x1; 4 = they discard 1 of choice; 5 = they lose 1 CP, Raveness gains 1 CP; 6 = dial to 0 THEN return to Raveness (NO heal, ruling user)." }
    ],
    flags: [],
    abilities: [
      {
        id: "peck_3t",
        boardName: "Peck 3T (AAA)",
        dicePattern: "AAA",
        baseDamage: 5,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, activateNevermore: 1 },
        upgradedBy: { upgradeId: "peck-ii", baseDamage: 6, numberMatchOfAKind: 3 },
        notes: "On 4-of-a-kind (#'s), Activate Nevermore. Peck II: 6/7/8 dmg et le d\xE9clencheur passe \xE0 3-of-a-kind.",
        verified: true
      },
      {
        id: "peck_4t",
        boardName: "Peck 4T (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 6,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, activateNevermore: 1 },
        upgradedBy: { upgradeId: "peck-ii", baseDamage: 7, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "peck_5t",
        boardName: "Peck 5T (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 7,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, activateNevermore: 1 },
        upgradedBy: { upgradeId: "peck-ii", baseDamage: 8, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "raven_sight",
        boardName: "Raven Sight (AACC)",
        dicePattern: "AACC",
        baseDamage: 3,
        defendable: false,
        activateNevermore: 1,
        upgradedBy: { upgradeId: "raven-sight-ii", activateNevermore: 2 },
        notes: "Pattern r\xE9el : 2 Talons + 2 Raven Eyes (AACC). Activate Nevermore (II : two times). Deal 3 undefendable dmg.",
        verified: true
      },
      {
        id: "craven",
        boardName: "Craven (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 8,
        defendable: true,
        tokensGrantedToSelf: { feather: 1 },
        upgradedBy: { upgradeId: "craven-ii", baseDamage: 9, tokensGrantedToSelf: { feather: 2 } },
        verified: true
      },
      {
        id: "beguile",
        boardName: "Beguile (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 9,
        defendable: true,
        tokensGrantedToSelf: { feather: 2 },
        activateNevermore: 1,
        upgradedBy: { upgradeId: "beguile-ii", tokensGrantedToSelf: { feather: 3 }, activateNevermore: 2 },
        verified: true
      },
      {
        id: "fowl_friend",
        boardName: "Fowl Friend (BBBB)",
        dicePattern: "BBBB",
        baseDamage: 0,
        defendable: true,
        drawCards: 1,
        tokensGrantedToSelf: { feather: 4 },
        activateNevermore: 2,
        upgradedBy: { upgradeId: "fowl-friend-ii", dicePattern: "BBB", activateNevermore: 3, feathersToMax: true },
        notes: "Base : Draw 1, Gain 4 Feather, Activate x2 \u2014 aucune attaque. II (WWW, ruling user) : Draw 1, Gain MAX Feather, Activate x3.",
        verified: true
      },
      {
        id: "murder_of_crows",
        boardName: "Murder of Crows (AABBB)",
        dicePattern: "AABBB",
        baseDamage: 5,
        defendable: true,
        bonusRoll: { dice: 4, damagePerTalon: 1, featherPerWing: 1, activateNevermorePerEye: 1, eyeCap: 1 },
        upgradedBy: { upgradeId: "murder-of-crows-ii", baseDamage: 6, bonusRollDice: 5 },
        notes: "Deal 5 & roll 4 (II : 6 & roll 5) : +1 d\xE9g\xE2t par Talon, +1 Feather par Wing, sur Raven Eye Activate Nevermore.",
        verified: true
      },
      {
        id: "chamber",
        boardName: "Chamber (CCCC)",
        dicePattern: "CCCC",
        baseDamage: 7,
        defendable: false,
        activateNevermore: 2,
        upgradedBy: { upgradeId: "chamber-ii", activateNevermore: 3 },
        notes: "7 ind\xE9fendables + Activate x2 (II : x3).",
        verified: true
      },
      {
        id: "fantastic_terrors",
        boardName: "Fantastic Terrors (CCCCC)",
        dicePattern: "CCCCC",
        baseDamage: 13,
        defendable: false,
        ultimate: true,
        activateNevermore: 3,
        tokensInflictedOnOpponent: { hex: 1 },
        notes: "ULTIMATE. Activate Nevermore three times. Inflict Hex. Deal 13 dmg. (Ind\xE9fendable de par la r\xE8gle Ultimate.)",
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "aviary",
        boardName: "Aviary (CCC)",
        dicePattern: "CCC",
        baseDamage: 2,
        defendable: false,
        requiresUpgradeId: "chamber-ii",
        tokensGrantedToSelf: { feather: 4 },
        notes: "Alt de Chamber II : Gain 4 Feather. Deal 2 undefendable dmg.",
        verified: true
      },
      {
        id: "pluck",
        boardName: "Pluck (BBBCC)",
        dicePattern: "BBBCC",
        baseDamage: 9,
        defendable: true,
        requiresUpgradeId: "beguile-ii",
        tokensInflictedOnOpponent: { hex: 1 },
        notes: "Alt de Beguile II : Inflict Hex. Then deal 9 dmg.",
        verified: true
      },
      {
        id: "birds_of_a_feather",
        boardName: "Birds of a Feather (BBBBB)",
        dicePattern: "BBBBB",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "fowl-friend-ii",
        increaseFeatherCap: 1,
        thenActivateFowlFriendII: true,
        notes: "Alt de Fowl Friend II : Increase Feather Stack Limit by 1. Then activate FOWL FRIEND II (draw 1, max Feather, Activate x3).",
        verified: true
      }
    ],
    passives: [
      {
        id: "nevermore_die_roll",
        name: "Nevermore Die Roll",
        trigger: "Upkeep de l'adversaire qui d\xE9tient Nevermore",
        text: "1 = gains Hex; 2 = Raveness may Activate Nevermore two times; 3 = Activate once; 4 = discards 1 of their choice; 5 = loses 1 CP, Raveness gains 1 CP; 6 = reduce dial to 0, then return Nevermore to the Raveness (no heal).",
        verified: true
      }
    ],
    defense: {
      name: "Nothing More",
      diceCount: "5",
      text: "Defense Roll 5: On 2+ Talons, deal 2 dmg (ONCE, ruling user). On 2+ Wings, prevent 2 dmg (ONCE). On 2+ Raven Eyes, Activate Nevermore (ONCE). Nothing More II: deal 1 dmg PER Talon; the Wing/Eye pair thresholds unchanged.",
      verified: true
    },
    cards: [
      {
        id: "cull",
        name: "Cull!",
        kind: "action",
        cpCost: 1,
        actionTiming: "instant",
        text: "Instant Action. Change the value of the Nevermore Die Roll.",
        verified: true
      },
      {
        id: "nevermore-attack",
        name: "Nevermore Attack!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Activate Nevermore. Then choose if the player that Nevermore is on Heals 2 or receives 2 dmg.",
        verified: true
      },
      {
        id: "midnight-dreary",
        name: "Midnight Dreary!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Roll 5 dice: Gain 1 x Feather per Wing. On Raven Eye, Activate Nevermore.",
        verified: true
      },
      {
        id: "stone-beak",
        name: "Stone Beak!",
        kind: "action",
        cpCost: 2,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Play only if Nevermore is on the target of your Attack. Add 1 dmg. This Attack becomes undefendable.",
        verified: true
      },
      {
        id: "broken-stillness",
        name: "Broken Stillness!",
        kind: "action",
        cpCost: 1,
        actionTiming: "instant",
        text: "Instant Action. Activate Nevermore.",
        verified: true
      },
      {
        id: "talon-strike",
        name: "Talon Strike!",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Roll 5 dice: Add 1 x Talon dmg. Gain Feather.",
        verified: true
      },
      {
        id: "chamber-ii",
        name: "Chamber II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "chamber",
        text: "CCCC: Activate Nevermore three times. Deal 7 undefendable dmg. Adds alt-ability AVIARY (CCC): Gain 4 Feather. Deal 2 undefendable dmg.",
        verified: true
      },
      {
        id: "fowl-friend-ii",
        name: "Fowl Friend II",
        kind: "upgrade",
        cpCost: 3,
        upgradeSlot: "fowl_friend",
        text: "BBB (ruling user): Draw 1. Gain max Feather. Activate Nevermore three times. Adds alt-ability BIRDS OF A FEATHER (BBBBB): Increase Feather Stack Limit by 1. Then activate FOWL FRIEND II.",
        verified: true
      },
      {
        id: "raven-sight-ii",
        name: "Raven Sight II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "raven_sight",
        text: "AACC: Activate Nevermore two times. Deal 3 undefendable dmg.",
        verified: true
      },
      {
        id: "peck-ii",
        name: "Peck II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "peck",
        text: "AAA: 6 dmg. AAAA: 7 dmg. AAAAA: 8 dmg. On 3-of-a-kind (#'s), Activate Nevermore.",
        verified: true
      },
      {
        id: "beguile-ii",
        name: "Beguile II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "beguile",
        text: "Large Straight: Gain 3 Feather. Activate Nevermore two times. Deal 9 dmg. Adds alt-ability PLUCK (BBBCC): Inflict Hex. Then deal 9 dmg.",
        verified: true
      },
      {
        id: "craven-ii",
        name: "Craven II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "craven",
        text: "Small Straight: Gain 2 Feather. Deal 9 dmg.",
        verified: true
      },
      {
        id: "nothing-more-ii",
        name: "Nothing More II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "defense",
        text: "Defense Roll 5: Deal 1 x Talon dmg. On 2 Wings, prevent 2 dmg (once). On 2 Raven Eyes, Activate Nevermore (once).",
        verified: true
      },
      {
        id: "murder-of-crows-ii",
        name: "Murder of Crows II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "murder_of_crows",
        text: "AABBB: Deal 6 dmg & roll 5: Add 1 x Talon dmg. Gain 1 x Feather per Wing. On Raven Eye, Activate Nevermore.",
        verified: true
      }
    ]
  };

  // src/sim/data/characters/dr/hero.json
  var hero_default5 = {
    id: "dr",
    name: "Druid",
    diceAnatomy: "1-3 = Claw (A), 4-5 = Paw (B), 6 = Nature (C). V\xE9rifi\xE9 leaflet (scan user 2026-07-06).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board + leaflet + 14 cartes scann\xE9s user 2026-07-06. Spec compl\xE8te : characters/Druid/SPEC.md. Rulings user : Thick Hide contre par Claw toujours / pr\xE9vention Bear seulement ; Nature's Cure = AACC ; Wound = 1 dmg upkeep + d6 4-6 retire.",
    tokens: [
      { id: "shapeShift", name: "Shape Shift", startingCount: 0, stackCap: 2, description: "Unique Status Effect. Spend at ANY time: Transform into Bear Form / Cat Form / return to Druid Form. May not be removed or transferred by any other means." },
      { id: "regen2", name: "Regenerate (face 2)", startingCount: 0, stackCap: 2, description: "Positive. Upkeep: heal 2, flip to face 1. Gaining a 2 at stack cap may flip a 1 to the 2 side. Total regen tokens (2+1 faces) capped at 2." },
      { id: "regen1", name: "Regenerate (face 1)", startingCount: 0, stackCap: 2, description: "Positive. Upkeep: heal 1, remove." },
      { id: "wound", name: "Wound", startingCount: 0, stackCap: 2, description: "Negative. Afflicted player is dealt 1 dmg during their Upkeep Phase, then rolls 1 die: on 4-6, remove this token (per token)." }
    ],
    flags: [],
    forms: {
      start: "druid",
      druid: "At the conclusion of your turn, gain Regenerate 2 (1v1: self).",
      cat: "If you conclude your Offensive Roll Phase with an Attack, add 2 dmg and inflict Wound. Attack Modifier.",
      bear: "Your Defensive Ability is stronger (see Thick Hide)."
    },
    abilities: [
      {
        id: "ferocity_3a",
        boardName: "Ferocity 3A (AAA)",
        dicePattern: "AAA",
        baseDamage: 4,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, tokensInflictedOnOpponent: { wound: 1 } },
        upgradedBy: { upgradeId: "ferocity-ii", baseDamage: 5, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "ferocity_4a",
        boardName: "Ferocity 4A (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 5,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, tokensInflictedOnOpponent: { wound: 1 } },
        upgradedBy: { upgradeId: "ferocity-ii", baseDamage: 6, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "ferocity_5a",
        boardName: "Ferocity 5A (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 6,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, tokensInflictedOnOpponent: { wound: 1 } },
        upgradedBy: { upgradeId: "ferocity-ii", baseDamage: 7, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "maul",
        boardName: "Maul (BBBB)",
        dicePattern: "BBBB",
        baseDamage: 0,
        defendable: true,
        maulRoll: { dice: 2, bearMayRerollOne: true },
        upgradedBy: { upgradeId: "maul-ii" },
        notes: "Lance 2d6, d\xE9g\xE2ts = somme (E=7). Si Bear Form : peut relancer un des deux (E~8.2). Maul II : identique (l'upgrade vaut par son alt Savage Maul).",
        verified: true
      },
      {
        id: "natures_cure",
        boardName: "Nature's Cure (AACC)",
        dicePattern: "AACC",
        baseDamage: 5,
        defendable: true,
        tokensGrantedToSelf: { regen2: 1 },
        notes: "Ruling user : pattern AACC. Gain Regenerate (2) + 5 d\xE9g\xE2ts.",
        verified: true
      },
      {
        id: "wild_realignment",
        boardName: "Wild Realignment (ABBC)",
        dicePattern: "ABBC",
        baseDamage: 0,
        defendable: true,
        cpGain: 1,
        tokensGrantedToSelf: { shapeShift: 2 },
        drawIfDruidForm: 1,
        notes: "Gain 1 CP et 2 Shape Shift. Puis, si Druid Form, pioche 1.",
        verified: true
      },
      {
        id: "forests_call",
        boardName: "Forest's Call (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 6,
        defendable: true,
        tokensGrantedToSelf: { shapeShift: 1 },
        verified: true
      },
      {
        id: "forests_answer",
        boardName: "Forest's Answer (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 7,
        defendable: true,
        tokensGrantedToSelf: { shapeShift: 1 },
        bonusRoll: { dice: 1, onA: "add2dmg", onB: "shapeShift1", onC: "regen2" },
        verified: true
      },
      {
        id: "protect_the_forest",
        boardName: "Protect the Forest (CCCC)",
        dicePattern: "CCCC",
        baseDamage: 6,
        defendable: false,
        tokensGrantedToSelf: { regen2: 1, shapeShift: 1 },
        upgradedBy: { upgradeId: "protect-the-forest-ii", baseDamage: 8 },
        verified: true
      },
      {
        id: "wrath_of_nature",
        boardName: "Wrath of Nature (CCCCC)",
        dicePattern: "CCCCC",
        baseDamage: 12,
        defendable: false,
        ultimate: true,
        tokensGrantedToSelf: { regen2: 1, shapeShift: 2 },
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "savage_maul",
        boardName: "Savage Maul (BBBBB)",
        dicePattern: "BBBBB",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "maul-ii",
        tokensGrantedToSelf: { shapeShift: 1 },
        thenActivateMaul: true,
        notes: "Gain Shape Shift, puis active MAUL II (2d6 somme, reroll Bear).",
        verified: true
      },
      {
        id: "rainfall",
        boardName: "Rainfall (CCC)",
        dicePattern: "CCC",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "protect-the-forest-ii",
        cpGain: 1,
        tokensGrantedToSelf: { regen2: 2 },
        notes: "1v1 : sur soi \u2014 gagne 1 CP et 2 Regenerate (2).",
        verified: true
      }
    ],
    passives: [
      {
        id: "forms",
        name: "Formes (overlay)",
        trigger: "permanent",
        text: "Druid: fin de ton tour +Regenerate 2. Cat: attaque conclue -> +2 dmg et inflige Wound. Bear: Thick Hide renforc\xE9e (4 d\xE9s + pr\xE9vention).",
        verified: true
      }
    ],
    defense: {
      name: "Thick Hide",
      diceCount: "2 (4 en Bear Form)",
      text: "Defense Roll 2 (Bear: 4). Deal 1 dmg per Claw. If in Bear Form: prevent 1 per Paw + 1 per Nature. (Hors Bear : aucune pr\xE9vention \u2014 ruling user.)",
      verified: true
    },
    cards: [
      {
        id: "maul-ii",
        name: "Maul II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "maul",
        text: "BBBB: Roll 2 dice and deal dmg equal to the total roll value. If in Bear Form, you may re-roll one of these dice. Adds alt SAVAGE MAUL (BBBBB): Gain Shape Shift. Then activate MAUL II.",
        verified: true
      },
      {
        id: "ferocity-ii",
        name: "Ferocity II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "ferocity",
        text: "AAA: 5. AAAA: 6. AAAAA: 7. On 3-of-a-kind (#'s), inflict Wound.",
        verified: true
      },
      {
        id: "protect-the-forest-ii",
        name: "Protect the Forest II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "protect_the_forest",
        text: "CCCC: Gain Regenerate 2 and Shape Shift. Then deal 8 undefendable dmg. Adds alt RAINFALL (CCC): A chosen player gains 1 CP and 2 Regenerate 2.",
        verified: true
      },
      {
        id: "hibernate",
        name: "Hibernate!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Transform into Bear Form (if not already). Gain Regenerate 2.",
        verified: true
      },
      {
        id: "ready-to-pounce",
        name: "Ready to Pounce!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Transform into Cat Form (if not already). Inflict Wound on a chosen player.",
        verified: true
      },
      {
        id: "natures-rest",
        name: "Nature's Rest!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Return to Druid Form (if not already). Draw 1.",
        verified: true
      },
      {
        id: "quick-morph",
        name: "Quick Morph!",
        kind: "action",
        cpCost: 2,
        actionTiming: "instant",
        text: "Instant Action. Gain Shape Shift.",
        verified: true
      },
      {
        id: "natures-cycle",
        name: "Nature's Cycle!",
        kind: "action",
        cpCost: 0,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Flip any one Regenerate 1 token to the Regenerate 2 side.",
        verified: true
      },
      {
        id: "fey-lure",
        name: "Fey Lure!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. A chosen player gains Regenerate 2. (1v1 : soi.)",
        verified: true
      },
      {
        id: "lethal-swipe",
        name: "Lethal Swipe!",
        kind: "action",
        cpCost: 2,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. If in Cat Form, roll 5 dice: Add 1 x Claw dmg. On 2 Paws, inflict Wound.",
        verified: true
      },
      {
        id: "surprise-bite",
        name: "Surprise Bite!",
        kind: "action",
        cpCost: 2,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. If in Cat Form, your Attack becomes undefendable.",
        verified: true
      },
      {
        id: "strength-of-the-woods",
        name: "Strength of the Woods!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. If in Druid Form, roll 1 die: On Claw, deal 2 dmg to a chosen opponent. On Paw, gain Shape Shift. On Nature, Heal 3.",
        verified: true
      },
      {
        id: "shrug-off",
        name: "Shrug Off!",
        kind: "action",
        cpCost: 0,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Play only after being Attacked. If in Bear Form, prevent 2 dmg.",
        verified: true
      },
      {
        id: "dont-poke-the-bear",
        name: "Don't Poke the Bear!",
        kind: "action",
        cpCost: 0,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Play only after being Attacked. If in Bear Form, deal 2 dmg.",
        verified: true
      }
    ]
  };

  // src/sim/data/characters/th/hero.json
  var hero_default6 = {
    id: "th",
    name: "Thor",
    diceAnatomy: "1-3 = Hammer (A), 4-5 = Worthy (B), 6 = Thunder (C). V\xE9rifi\xE9 leaflet (scan user 2026-07-06).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "characters/Thor/ scans 2026-07-06 (board 3 photos, leaflet 4 captures, 15 cartes) \u2014 SPEC.md + rulings user",
    tokens: [
      { id: "electrokinesis", name: "Electrokinesis", startingCount: 0, stackCap: 4, description: "Positive. Boosts abilities (+1 dmg x EK sur Bottled Lightning/Odinforce). Once per turn, spend 4 during Main Phase to draw 1." },
      { id: "guardBreak", name: "Guard Break", startingCount: 0, stackCap: 2, description: "Positive. At the conclusion of your Offensive Roll Phase with an Attack: spend and roll 1 die \u2014 on 4-5, the Attack becomes undefendable. (Ruling user : d\xE9pense libre, jeton par jeton.)" }
    ],
    companion: {
      id: "mjolnir",
      name: "Mj\xF6lnir",
      start: "home",
      description: "Begins on Thor's board. Throw (home -> opponent): 1 isolated undefendable dmg. Retrieve (opponent -> home): gain 1 Electrokinesis. At ANY time, discard a card to Throw or Retrieve. Abilities do it for free."
    },
    abilities: [
      { id: "hammered_3h", boardName: "Hammered 3H", dicePattern: "AAA", baseDamage: 4, defendable: true, effect: "Throw Mj\xF6lnir", upgradedBy: { upgradeId: "hammered-ii", baseDamage: 5 }, verified: true },
      { id: "hammered_4h", boardName: "Hammered 4H", dicePattern: "AAAA", baseDamage: 5, defendable: true, effect: "Throw Mj\xF6lnir", upgradedBy: { upgradeId: "hammered-ii", baseDamage: 6 }, verified: true },
      { id: "hammered_5h", boardName: "Hammered 5H", dicePattern: "AAAAA", baseDamage: 7, defendable: true, effect: "Throw Mj\xF6lnir", upgradedBy: { upgradeId: "hammered-iii", baseDamage: 8 }, verified: true },
      { id: "mighty_summon", boardName: "Mighty Summon (HWWT)", dicePattern: "ABBC", baseDamage: 0, defendable: true, effect: "Gain 2 Guard Break, Heal 2. If Mj\xF6lnir home: gain 3 EK. Otherwise Retrieve -> 3 collateral dmg.", upgradedBy: { upgradeId: "mighty-summon-ii" }, verified: true },
      { id: "chain_lightning", boardName: "Chain Lightning (HHHTT)", dicePattern: "AAACC", baseDamage: 8, defendable: true, effect: "Roll 3 dice: deal dmg = total of any two. +2 isolated collateral.", upgradedBy: { upgradeId: "chain-lightning-ii" }, verified: true },
      { id: "odinforce", boardName: "Odinforce (HHWWW)", dicePattern: "AABBB", baseDamage: 5, defendable: true, effect: "Roll 5: >=2 Hammer -> Throw/Retrieve; >=2 Worthy -> +1 CP; +1 EK per Thunder. Then +1 dmg x EK.", upgradedBy: { upgradeId: "odinforce-ii", baseDamage: 6 }, verified: true },
      { id: "bottled_lightning", boardName: "Bottled Lightning (TTTT)", dicePattern: "CCCC", baseDamage: 7, defendable: true, effect: "Throw/Retrieve x2. Gain 2 Guard Break. Then deal 7 + 1 x EK.", upgradedBy: { upgradeId: "bottled-lightning-ii", baseDamage: 8 }, verified: true },
      { id: "lightning_rod", boardName: "Lightning Rod (4-straight)", dicePattern: "small-straight", baseDamage: 7, defendable: true, effect: "7 dmg + gain 1 EK ; 9 dmg instead (no EK) if the opponent holds Mj\xF6lnir.", upgradedBy: { upgradeId: "lightning-rod-ii", baseDamage: 9, effect: "9 dmg (always) \xB7 Throw/Retrieve Mj\xF6lnir \xB7 gain 1 EK." }, verified: true },
      { id: "thunder_bolt", boardName: "Thunder Bolt (5-straight)", dicePattern: "large-straight", baseDamage: 10, defendable: true, effect: "Throw/Retrieve. Gain 2 EK.", upgradedBy: { upgradeId: "thunder-bolt-ii", baseDamage: 12 }, verified: true },
      { id: "for_asgard", boardName: "For Asgard! (TTTTT)", dicePattern: "CCCCC", baseDamage: 14, defendable: false, ultimate: true, effect: "Gain Guard Break. Throw/Retrieve up to 4 times. Deal 14 dmg.", verified: true }
    ],
    altAbilities: [
      { id: "ricochet", boardName: "Ricochet! (TTT)", dicePattern: "CCC", baseDamage: 0, defendable: true, requiresUpgrade: "bottled-lightning-ii", effect: "Throw or Retrieve Mj\xF6lnir up to SIX times.", verified: true },
      { id: "boom_boom", boardName: "Boom Boom! (HHTT)", dicePattern: "AACC", baseDamage: 6, defendable: true, requiresUpgrade: "mighty-summon-ii", effect: "Gain 2 EK. Deal 6 dmg.", verified: true },
      { id: "asgardian_brawn", boardName: "Asgardian Brawn (WWW)", dicePattern: "BBB", baseDamage: 0, defendable: true, requiresUpgrade: "thunder-bolt-ii", effect: "Heal 4.", verified: true }
    ],
    passives: [],
    defense: {
      name: "Thunder Wheel",
      diceCount: "3 (4 avec Thunder Wheel II)",
      text: "Defense Roll 3. On >=2 Hammer: Throw or Retrieve Mj\xF6lnir (II: for EVERY pair). Prevent 2 x Worthy. Gain 1 EK per Thunder.",
      verified: true
    },
    cards: [
      { id: "hammered-ii", name: "Hammered II", kind: "upgrade", cpCost: 0, upgradeSlot: "hammered", text: "3/4/5 Hammers: 5/6/7 dmg. Throw or Retrieve Mj\xF6lnir. On 4-of-a-kind (#'s), gain Electrokinesis.", verified: true },
      { id: "hammered-iii", name: "Hammered III", kind: "upgrade", cpCost: 2, upgradeSlot: "hammered", text: "3/4/5 Hammers: 5/6/8 dmg. Throw or Retrieve Mj\xF6lnir. On 3-of-a-kind (#'s), gain Electrokinesis.", verified: true },
      { id: "mighty-summon-ii", name: "Mighty Summon II", kind: "upgrade", cpCost: 2, upgradeSlot: "mighty-summon", text: "Heal 3, collateral 4. Adds alt BOOM BOOM! (HH+TT): Gain 2 Electrokinesis. Deal 6 dmg.", verified: true },
      { id: "chain-lightning-ii", name: "Chain Lightning II", kind: "upgrade", cpCost: 2, upgradeSlot: "chain-lightning", text: "Roll 4 dice: deal dmg = total of any two. +3 isolated collateral.", verified: true },
      { id: "odinforce-ii", name: "Odinforce II", kind: "upgrade", cpCost: 2, upgradeSlot: "odinforce", text: "Deal 6 dmg & roll 5. You may re-roll up to 5 of these dice (once). Then add 1 dmg x Electrokinesis.", verified: true },
      { id: "bottled-lightning-ii", name: "Bottled Lightning II", kind: "upgrade", cpCost: 2, upgradeSlot: "bottled-lightning", text: "Throw/Retrieve x3. 8 dmg + 1 x EK. Adds alt RICOCHET! (TTT): Throw or Retrieve Mj\xF6lnir up to six times.", verified: true },
      { id: "lightning-rod-ii", name: "Lightning Rod II", kind: "upgrade", cpCost: 2, upgradeSlot: "lightning-rod", text: "Small Straight: Throw or Retrieve Mj\xF6lnir. Gain Electrokinesis. Deal 9 dmg.", verified: true },
      { id: "thunder-bolt-ii", name: "Thunder Bolt II", kind: "upgrade", cpCost: 2, upgradeSlot: "thunder-bolt", text: "Large Straight: 12 dmg. Adds alt ASGARDIAN BRAWN (WWW): Heal 4.", verified: true },
      { id: "thunder-wheel-ii", name: "Thunder Wheel II", kind: "upgrade", cpCost: 2, upgradeSlot: "thunder-wheel", text: "Defense Roll 4. For every 2 Hammers, Throw or Retrieve Mj\xF6lnir. Prevent 2 x Worthy. Gain 1 EK per Thunder.", verified: true },
      { id: "indomitable-will", name: "Indomitable Will!", kind: "action", cpCost: 2, actionTiming: "rollPhase", defensive: true, text: "Play only after being Attacked. If the incoming Attack would reduce your Health to 0, roll 1 die: on Worthy (4-5), set your Health to 1 instead.", verified: true },
      { id: "invulnerability", name: "Invulnerability!", kind: "action", cpCost: 2, actionTiming: "rollPhase", defensive: true, text: "Discard 2 Electrokinesis to prevent all incoming damage.", verified: true },
      { id: "he-is-worthy", name: "He Is Worthy!", kind: "action", cpCost: 1, actionTiming: "rollPhase", text: "Change the value of any one of your dice to a 4 or 5.", verified: true },
      { id: "power-trip", name: "Power Trip!", kind: "action", cpCost: 1, actionTiming: "instant", text: "Draw 1. Gain 2 Electrokinesis.", verified: true },
      { id: "time-to-hammer", name: "Time to Hammer!", kind: "action", cpCost: 0, actionTiming: "instant", text: "Retrieve Mj\xF6lnir. Gain 1 CP and Electrokinesis.", verified: true },
      { id: "stormbreak", name: "Stormbreak!", kind: "action", cpCost: 0, actionTiming: "instant", text: "Play only if you have Thrown Mj\xF6lnir twice this turn. Draw 1. Gain 1 CP, Guard Break, and Electrokinesis.", verified: true }
    ]
  };

  // src/sim/data/characters/sm/hero.json
  var hero_default7 = {
    id: "sm",
    name: "Spider-Man",
    diceAnatomy: "1-3 = Thwip (A), 4-5 = Web (B), 6 = Spider (C). V\xE9rifi\xE9 leaflet (scan user 2026-07-06).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board + leaflet + 14 cartes scann\xE9s user 2026-07-06. Spec compl\xE8te : characters/Spider_Man/SPEC.md. Rulings user : Spider-Sense 'On Spider' = une fois si >=1 Spider ; d\xE9fenseur choisit librement entre les 2 d\xE9fenses ; Combo = Offensive Roll Phase compl\xE8te additionnelle.",
    tokens: [
      { id: "combo", name: "Combo", startingCount: 0, stackCap: 1, description: "Unique Status Effect. If your Offensive Roll Phase resulted in an Attack, you may spend this token at the conclusion of your opponent's Defensive Roll Phase: immediately target the same opponent with an additional Offensive Roll Phase. Can only spend once per turn. Not transferable." },
      { id: "webbed", name: "Webbed", startingCount: 0, stackCap: 1, description: "Negative Status Effect. When inflicted, deal 2 as an isolated source of undefendable dmg. The next time the afflicted player is Attacked with normal damage, the damage becomes undefendable instead and this token is removed." },
      { id: "invisibility", name: "Invisibility", startingCount: 0, stackCap: 1, description: "Unique Status Effect. When Attacked with an undefendable Attack, may spend this token to activate a Defensive Ability. Not transferable. Also fuel for Ambush!/Nice Try!/Spider-Sense extra Roll Attempt." }
    ],
    flags: [],
    abilities: [
      {
        id: "punch_3a",
        boardName: "Punch 3A (AAA)",
        dicePattern: "AAA",
        baseDamage: 4,
        defendable: true,
        upgradedBy: { upgradeId: "punch-ii", baseDamage: 5, numberMatchBonus: { ofAKind: 4, tokensGrantedToSelf: { combo: 1 } } },
        verified: true
      },
      {
        id: "punch_4a",
        boardName: "Punch 4A (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 5,
        defendable: true,
        upgradedBy: { upgradeId: "punch-ii", baseDamage: 6, numberMatchBonus: { ofAKind: 4, tokensGrantedToSelf: { combo: 1 } } },
        verified: true
      },
      {
        id: "punch_5a",
        boardName: "Punch 5A (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 6,
        defendable: true,
        upgradedBy: { upgradeId: "punch-ii", baseDamage: 7, numberMatchBonus: { ofAKind: 4, tokensGrantedToSelf: { combo: 1 } } },
        verified: true
      },
      {
        id: "ccc_combo",
        boardName: "C-C-C-Combo (AACC)",
        dicePattern: "AACC",
        baseDamage: 5,
        defendable: true,
        tokensGrantedToSelf: { combo: 1 },
        upgradedBy: { upgradeId: "combo-ii", baseDamage: 6 },
        verified: true
      },
      {
        id: "spider_reflexes",
        boardName: "Spider-Reflexes (ABBC)",
        dicePattern: "ABBC",
        baseDamage: 0,
        defendable: true,
        reflexRoll: { dice: 2, comboIfTotalAtMost: 5 },
        notes: "Roll 2 dice and deal dmg equal to the total roll value (E=7). If the final roll value is 5 or less, gain Combo.",
        verified: true
      },
      {
        id: "wall_crawler",
        boardName: "Wall Crawler (AABBB)",
        dicePattern: "AABBB",
        baseDamage: 7,
        defendable: true,
        tokensGrantedToSelf: { invisibility: 1 },
        verified: true
      },
      {
        id: "ensnare_small",
        boardName: "Ensnare (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 5,
        defendable: true,
        tokensInflictedOnOpponent: { webbed: 1 },
        upgradedBy: { upgradeId: "ensnare-ii", baseDamage: 6 },
        notes: "Deal dmg, THEN inflict Webbed (les 2 iso dmg du jeton tombent apr\xE8s l'attaque).",
        verified: true
      },
      {
        id: "ensnare_large",
        boardName: "Ensnare (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 8,
        defendable: true,
        draw: 1,
        tokensInflictedOnOpponent: { webbed: 1 },
        upgradedBy: { upgradeId: "ensnare-ii", baseDamage: 9 },
        notes: "Draw 1. Deal dmg. Then inflict Webbed.",
        verified: true
      },
      {
        id: "venom_punch",
        boardName: "Venom Punch (CCCC)",
        dicePattern: "CCCC",
        baseDamage: 7,
        defendable: false,
        tokensGrantedToSelf: { invisibility: 1 },
        upgradedBy: { upgradeId: "venom-punch-ii", baseDamage: 8 },
        verified: true
      },
      {
        id: "venom_shockwave",
        boardName: "Venom Shockwave (CCCCC)",
        dicePattern: "CCCCC",
        baseDamage: 13,
        defendable: false,
        ultimate: true,
        tokensGrantedToSelf: { invisibility: 1 },
        tokensInflictedOnOpponent: { webbed: 1 },
        notes: "Gain Invisibility. Inflict Webbed. Then deal 13 dmg (Ultimate = ind\xE9fendable).",
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "web_shot",
        boardName: "Web Shot (BBC)",
        dicePattern: "BBC",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "combo-ii",
        tokensGrantedToSelf: { invisibility: 1 },
        tokensInflictedOnOpponent: { webbed: 1 },
        notes: "Gain Invisibility. Inflict Webbed (les 2 iso dmg du jeton = seule source de d\xE9g\xE2ts).",
        verified: true
      },
      {
        id: "combo_up",
        boardName: "Combo Up (CCC)",
        dicePattern: "CCC",
        baseDamage: 2,
        defendable: false,
        requiresUpgradeId: "venom-punch-ii",
        tokensGrantedToSelf: { combo: 1 },
        notes: "Gain Combo. Then deal 2 undefendable dmg.",
        verified: true
      }
    ],
    passives: [],
    defense: {
      name: "Spider-Sense / Counterpunch",
      diceCount: "2 (Spider-Sense) ou 3 (Counterpunch) \u2014 au choix du d\xE9fenseur",
      text: "Spider-Sense \u2014 Defense Roll 2: On Spider, prevent 1/2 dmg (rounded up), une fois (ruling user). You may discard Invisibility to take an additional Roll Attempt. Counterpunch \u2014 Defense Roll 3: Deal 1 dmg x Thwip.",
      verified: true
    },
    cards: [
      {
        id: "punch-ii",
        name: "Punch II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "punch",
        text: "AAA: 5. AAAA: 6. AAAAA: 7. On 4-of-a-kind (#'s), gain Combo.",
        verified: true
      },
      {
        id: "combo-ii",
        name: "C-C-C-Combo II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "ccc_combo",
        text: "AACC: Deal 6 dmg. Gain Combo. Adds alt WEB SHOT (BBC): Gain Invisibility. Inflict Webbed.",
        verified: true
      },
      {
        id: "ensnare-ii",
        name: "Ensnare II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "ensnare",
        text: "Small Straight: 6 dmg, then inflict Webbed. Large Straight: Draw 1, 9 dmg, then inflict Webbed.",
        verified: true
      },
      {
        id: "venom-punch-ii",
        name: "Venom Punch II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "venom_punch",
        text: "CCCC: Gain Invisibility. Deal 8 undefendable dmg. Adds alt COMBO UP (CCC): Gain Combo. Then deal 2 undefendable dmg.",
        verified: true
      },
      {
        id: "yikes",
        name: "Yikes!",
        kind: "action",
        cpCost: 1,
        actionTiming: "instant",
        text: "Instant Action. Gain Invisibility.",
        verified: true
      },
      {
        id: "radioactive-blood",
        name: "Radioactive Blood!",
        kind: "action",
        cpCost: 3,
        actionTiming: "instant",
        text: "Instant Action. Gain Combo.",
        verified: true
      },
      {
        id: "swing-escape",
        name: "Swing Escape!",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Your Spider-Sense Defensive Ability succeeds on Web instead of Spider (this card can be played after your dice have been rolled).",
        verified: true
      },
      {
        id: "nice-try",
        name: "Nice Try!",
        kind: "action",
        cpCost: 0,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Play only after being Attacked. Discard Invisibility: prevent 3 dmg.",
        verified: true
      },
      {
        id: "invisible-punch",
        name: "Invisible Punch!",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Play only after being Attacked. If you prevented dmg via Spider-Sense, deal 3 dmg.",
        verified: true
      },
      {
        id: "ambush",
        name: "Ambush!",
        kind: "action",
        cpCost: 0,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Discard Invisibility: add 3 dmg.",
        verified: true
      },
      {
        id: "web-shooters",
        name: "Web Shooters!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Inflict Webbed on a chosen player.",
        verified: true
      },
      {
        id: "booyah",
        name: "Booyah!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Roll 1 die: On Thwip, gain Invisibility. On Web, inflict Webbed. On Spider, gain Combo.",
        verified: true
      },
      {
        id: "milkshake-me",
        name: "Milkshake Me!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Heal 3.",
        verified: true
      },
      {
        id: "cha-ching",
        name: "Cha-Ching!",
        kind: "action",
        cpCost: 0,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Gain 2 CP.",
        verified: true
      }
    ]
  };

  // src/sim/data/characters/py/hero.json
  var hero_default8 = {
    id: "py",
    name: "Pyromancer",
    diceAnatomy: "1-3 = Flame (A), 4 = Blaze (B), 5 = Fiery Soul (C), 6 = Meteor (D). V\xE9rifi\xE9 leaflet (scan user 2026-07-06).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board + leaflet + 14 cartes scann\xE9s user 2026-07-06. Spec compl\xE8te : characters/Pyromancer/SPEC.md. Rulings user : Molten Armor II/III Burn = un Flame ET un Blaze ; Knockdown = choix du porteur ; Burning Soul = 2 FM par Fiery Soul ; Burn+Knockdown+Stun cumulables.",
    tokens: [
      { id: "fireMastery", name: "Fire Mastery", startingCount: 0, stackCap: 5, description: "Positive. Stack limit 5 (augmentable par Fire Up!/Blazing Soul/Burning Soul II). \xC0 TON upkeep, tu dois 'cool off' en retirant 1 jeton. Booste les habilet\xE9s." },
      { id: "burn", name: "Burn", startingCount: 0, stackCap: 1, description: "Negative. Le porteur re\xE7oit 2 dmg \xE0 son Upkeep Phase. Persistant." },
      { id: "knockdown", name: "Knockdown", startingCount: 0, stackCap: 1, description: "Negative. Avant le d\xE9but de son Offensive Roll Phase, le porteur paie 2 CP pour retirer le jeton, SINON il saute son Offensive Roll Phase puis retire le jeton." },
      { id: "stun", name: "Stun", startingCount: 0, stackCap: 1, description: "Negative. Le porteur ne peut RIEN faire pendant l'Attaque. \xC0 la fin de l'Attaque, l'infligeur retire le jeton et cible imm\xE9diatement le m\xEAme adversaire avec une Offensive Roll Phase additionnelle." }
    ],
    flags: [],
    abilities: [
      {
        id: "fireball_3a",
        boardName: "Fireball 3F (AAA)",
        dicePattern: "AAA",
        baseDamage: 4,
        defendable: true,
        tokensGrantedToSelf: { fireMastery: 1 },
        upgradedBy: { upgradeId: "fireball-ii", tokensGrantedToSelf: { fireMastery: 2 } },
        verified: true
      },
      {
        id: "fireball_4a",
        boardName: "Fireball 4F (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 6,
        defendable: true,
        tokensGrantedToSelf: { fireMastery: 1 },
        upgradedBy: { upgradeId: "fireball-ii", tokensGrantedToSelf: { fireMastery: 2 } },
        verified: true
      },
      {
        id: "fireball_5a",
        boardName: "Fireball 5F (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 8,
        defendable: true,
        tokensGrantedToSelf: { fireMastery: 1 },
        upgradedBy: { upgradeId: "fireball-ii", tokensGrantedToSelf: { fireMastery: 2 } },
        verified: true
      },
      {
        id: "burning_soul",
        boardName: "Burning Soul (CC)",
        dicePattern: "CC",
        baseDamage: 0,
        defendable: false,
        notes: "Gain 2 FM PAR Fiery Soul (ruling user). 1 collat\xE9ral PAR Fiery Soul. II : SSS -> Burn, SSSS -> stack limit FM +1.",
        upgradedBy: { upgradeId: "burning-soul-ii" },
        verified: true
      },
      {
        id: "combustion",
        boardName: "Combustion (ABCD)",
        dicePattern: "ABCD",
        baseDamage: 0,
        defendable: false,
        tokensGrantedToSelf: { fireMastery: 1 },
        notes: "+1 FM ; puis retire jusqu'\xE0 4 FM -> 3 dmg ind\xE9fendables PAR jeton retir\xE9 (4 avec la II).",
        upgradedBy: { upgradeId: "combustion-ii" },
        verified: true
      },
      {
        id: "pyroblast",
        boardName: "Pyroblast (AAAAD)",
        dicePattern: "AAAAD",
        baseDamage: 6,
        defendable: true,
        bonusRoll: { dice: 1, onA: "add3dmg", onB: "inflictBurn", onC: "fireMastery2", onD: "inflictKnockdown" },
        upgradedBy: { upgradeId: "pyroblast-iii", bonusRollDice: 2 },
        notes: "6 dmg + 1d6 d'effets (II : 2d6 ; III : 2d6 + relance optionnelle d'1 d\xE9).",
        verified: true
      },
      {
        id: "hot_streak",
        boardName: "Hot Streak (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 5,
        defendable: true,
        tokensGrantedToSelf: { fireMastery: 2 },
        notes: "+2 FM PUIS 5 + 1 dmg par FM (6 + 1/FM avec la II).",
        upgradedBy: { upgradeId: "hot-streak-ii", baseDamage: 6 },
        verified: true
      },
      {
        id: "ignite",
        boardName: "Ignite (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 4,
        defendable: true,
        tokensGrantedToSelf: { fireMastery: 2 },
        notes: "+2 FM PUIS 4 + 2 dmg par FM (II : 5 + 2/FM + inflige Burn).",
        upgradedBy: { upgradeId: "ignite-ii", baseDamage: 5 },
        verified: true
      },
      {
        id: "meteorite",
        boardName: "Meteorite (DDDD)",
        dicePattern: "DDDD",
        baseDamage: 0,
        defendable: false,
        tokensGrantedToSelf: { fireMastery: 2 },
        tokensInflictedOnOpponent: { stun: 1 },
        notes: "+2 FM ; inflige Stun ; 1 dmg ind\xE9f PAR FM ; +2 collat\xE9raux (3 avec la II). Stun -> Offensive Roll Phase additionnelle apr\xE8s l'attaque.",
        upgradedBy: { upgradeId: "meteorite-ii" },
        verified: true
      },
      {
        id: "scorch_the_earth",
        boardName: "Scorch the Earth (DDDDD)",
        dicePattern: "DDDDD",
        baseDamage: 12,
        defendable: false,
        ultimate: true,
        tokensGrantedToSelf: { fireMastery: 3 },
        tokensInflictedOnOpponent: { knockdown: 1, burn: 1 },
        notes: "+3 FM ; inflige Knockdown & Burn ; 12 dmg (Ultimate) ; +2 collat\xE9raux.",
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "scorch",
        boardName: "Scorch (AABB)",
        dicePattern: "AABB",
        baseDamage: 6,
        defendable: true,
        requiresUpgradeId: "hot-streak-ii",
        tokensGrantedToSelf: { fireMastery: 2 },
        tokensInflictedOnOpponent: { burn: 1 },
        notes: "+2 FM. Inflige Burn. 6 dmg.",
        verified: true
      },
      {
        id: "blazing_soul",
        boardName: "Blazing Soul (BBCC)",
        dicePattern: "BBCC",
        baseDamage: 0,
        defendable: false,
        requiresUpgradeId: "ignite-ii",
        tokensGrantedToSelf: { fireMastery: 5 },
        tokensInflictedOnOpponent: { knockdown: 1 },
        notes: "Stack limit FM +1 (permanent). +5 FM. Inflige Knockdown.",
        verified: true
      },
      {
        id: "meteoroid",
        boardName: "Meteoroid (DDD)",
        dicePattern: "DDD",
        baseDamage: 0,
        defendable: false,
        requiresUpgradeId: "meteorite-ii",
        tokensInflictedOnOpponent: { knockdown: 1, burn: 1, stun: 1 },
        notes: "Inflige Knockdown, Burn ET Stun (pas de d\xE9g\xE2ts). Stun -> Offensive Roll Phase additionnelle.",
        verified: true
      }
    ],
    passives: [],
    defense: {
      name: "Molten Armor",
      diceCount: "5",
      text: "Defense Roll 5. Gain 1 Fire Mastery par Fiery Soul. Deal 1 dmg par Flame \xE0 l'attaquant. II (+1 CP) : + si >=1 Flame ET >=1 Blaze, inflige Burn (ruling user : les deux). III (+3 CP) : gain aussi 1 FM par Meteor et 1 dmg par Meteor.",
      verified: true
    },
    cards: [
      {
        id: "fireball-ii",
        name: "Fireball II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "fireball",
        text: "AAA: 4. AAAA: 6. AAAAA: 8. Gain 2 Fire Mastery.",
        verified: true
      },
      {
        id: "burning-soul-ii",
        name: "Burning Soul II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "burning_soul",
        text: "CC: On SSS inflict Burn. On SSSS increase Fire Mastery stack limit by 1. Gain 2 x S Fire Mastery. Deal 1 x S collateral dmg to all opponents.",
        verified: true
      },
      {
        id: "combustion-ii",
        name: "Combustion II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "combustion",
        text: "ABCD: Gain 1 Fire Mastery. Then remove up to 4 Fire Mastery tokens and deal 4 undefendable dmg per token removed.",
        verified: true
      },
      {
        id: "pyroblast-ii",
        name: "Pyroblast II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "pyroblast",
        text: "AAAAD: Deal 6 dmg and roll 2 dice: Add 3 x Flame dmg. On Blaze, inflict Burn. Gain 2 x FierySoul Fire Mastery. On Meteor, inflict Knockdown.",
        verified: true
      },
      {
        id: "pyroblast-iii",
        name: "Pyroblast III",
        kind: "upgrade",
        cpCost: 3,
        upgradeSlot: "pyroblast",
        text: "AAAAD: Deal 6 dmg and roll 2 dice (may re-roll 1): Add 3 x Flame dmg. On Blaze, inflict Burn. Gain 2 x FierySoul Fire Mastery. On Meteor, inflict Knockdown.",
        verified: true
      },
      {
        id: "hot-streak-ii",
        name: "Hot Streak II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "hot_streak",
        text: "Small Straight: Gain 2 Fire Mastery. Then deal 6 + 1 dmg per Fire Mastery. Adds alt SCORCH (AABB): Gain 2 Fire Mastery. Inflict Burn. Deal 6 dmg.",
        verified: true
      },
      {
        id: "ignite-ii",
        name: "Ignite II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "ignite",
        text: "Large Straight: Gain 2 Fire Mastery. Inflict Burn. Then deal 5 + 2 dmg per Fire Mastery. Adds alt BLAZING SOUL (BBCC): Increase Fire Mastery stack limit by 1. Then gain 5 Fire Mastery. Inflict Knockdown.",
        verified: true
      },
      {
        id: "meteorite-ii",
        name: "Meteorite II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "meteorite",
        text: "DDDD: Gain 2 Fire Mastery. Inflict Stun. Then deal 1 undefendable dmg per Fire Mastery. Additionally, deal 3 collateral dmg. Adds alt METEOROID (DDD): Inflict Knockdown, Burn, and Stun.",
        verified: true
      },
      {
        id: "molten-armor-ii",
        name: "Molten Armor II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "defense",
        text: "Defense Roll 5: Gain 1 x FierySoul Fire Mastery. On Flame AND Blaze, inflict Burn. Deal 1 x Flame dmg.",
        verified: true
      },
      {
        id: "molten-armor-iii",
        name: "Molten Armor III",
        kind: "upgrade",
        cpCost: 3,
        upgradeSlot: "defense",
        text: "Defense Roll 5: Gain 1 x FierySoul + 1 x Meteor Fire Mastery. On Flame AND Blaze, inflict Burn. Deal 1 x Flame + 1 x Meteor dmg.",
        verified: true
      },
      {
        id: "warm-up",
        name: "Warm Up!",
        kind: "action",
        cpCost: 0,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Gain 1 Fire Mastery. Then spend CP as desired and gain 1 additional Fire Mastery for each CP spent.",
        verified: true
      },
      {
        id: "fire-up",
        name: "Fire Up!",
        kind: "action",
        cpCost: 3,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Increase Fire Mastery stack limit by 1. Then gain 2 Fire Mastery.",
        verified: true
      },
      {
        id: "huzzah",
        name: "Huzzah!",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Roll 1 die: On Flame, add 3 dmg. On Blaze, inflict Burn. On Fiery Soul, gain 2 Fire Mastery. On Meteor, inflict Knockdown.",
        verified: true
      },
      {
        id: "red-hot",
        name: "Red Hot!",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Add 1 dmg per Fire Mastery.",
        verified: true
      }
    ]
  };

  // src/sim/data/characters/du/hero.json
  var hero_default9 = {
    id: "du",
    name: "Duelist",
    diceAnatomy: "1-3 = Blade (A), 4-5 = Boot (B), 6 = Pierce (C). V\xE9rifi\xE9 leaflet (scan user 2026-07-07).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board (3 photos) + leaflet (5 captures) + 14 cartes scann\xE9s user 2026-07-07. Spec compl\xE8te : characters/Duelist/SPEC.md. Rulings user : D\xE9f. +1 = pige 1 carte, +3 = pr\xE9vient 3 ; 1 Bonus/tour ; direction libre des Steps hors Reposition. D\xE9fauts (user pas s\xFBr) : Steps hors piste perdus, Retreat bouge toujours le jeton.",
    tokens: [
      { id: "guardBreak", name: "Guard Break", startingCount: 0, stackCap: 2, description: "Positive Status Effect. If a player concludes their Offensive Roll Phase with an Attack, they may spend this token and roll 1 die. If the outcome is 4-5, the Attack becomes undefendable. (Identique au Guard Break de Thor.)" },
      { id: "disarm", name: "Disarm", startingCount: 0, stackCap: 1, description: "Negative Status Effect. During their Upkeep Phase, a player afflicted with this token may choose to discard 1. If they do not (or cannot), they must skip their Income Phase instead. Then remove this token." },
      { id: "footwork", name: "Footwork Track", startingCount: 0, stackCap: 0, description: "Pseudo-jeton : position -2..+2 g\xE9r\xE9e dans du.rules.ts (comme le cadran Nevermore). 5 positions : +3 dmg Offensive (+2) / +1 dmg Offensive (+1) / NEUTRAL (0) / Defensive pige-1-carte (-1) / Defensive pr\xE9vient-3-dmg (-2) \u2014 ic\xF4nes v\xE9rifi\xE9es + ruling user 2026-07-07. D\xE9part : Neutral. Take a Step = bouger d'une case up/down. En attaquant : Offensive Bonus de la position FINALE (Attack Modifier). Attaqu\xE9 avec d\xE9g\xE2ts normaux : Defensive Bonus de la position FINALE. R\xE9solus avant le total final de dmg pendant la Defensive Roll Phase. UN seul Bonus r\xE9solu par tour." }
    ],
    flags: [],
    abilities: [
      {
        id: "blade_flurry_3a",
        boardName: "Blade Flurry 3A (AAA)",
        dicePattern: "AAA",
        baseDamage: 4,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, steps: 1 },
        upgradedBy: { upgradeId: "blade-flurry-ii", baseDamage: 5, numberMatchOfAKind: 3 },
        notes: "On 4-of-a-kind (#'s), you may take 1 Step. II : 5/6/7 et le Step passe au 3-of-a-kind.",
        verified: true
      },
      {
        id: "blade_flurry_4a",
        boardName: "Blade Flurry 4A (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 5,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, steps: 1 },
        upgradedBy: { upgradeId: "blade-flurry-ii", baseDamage: 6, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "blade_flurry_5a",
        boardName: "Blade Flurry 5A (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 6,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, steps: 1 },
        upgradedBy: { upgradeId: "blade-flurry-ii", baseDamage: 7, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "balestra",
        boardName: "Balestra (AABB)",
        dicePattern: "AABB",
        baseDamage: 6,
        defendable: true,
        stepsBeforeDamage: { upTo: 2 },
        upgradedBy: { upgradeId: "balestra-ii", baseDamage: 8 },
        notes: "You may take up to 2 Steps. Then deal 6 dmg (II : 8).",
        verified: true
      },
      {
        id: "feint_attack",
        boardName: "Feint Attack (AACC)",
        dicePattern: "AACC",
        baseDamage: 2,
        defendable: false,
        tokensGrantedToSelf: { guardBreak: 1 },
        stepsBeforeDamage: { upTo: 1 },
        upgradedBy: { upgradeId: "feint-attack-ii", baseDamage: 3, tokensGrantedToSelf: { guardBreak: 2 } },
        notes: "Gain Guard Break. You may take 1 Step. Then deal 2 UNDEFENDABLE dmg (II : 2 GB, 3 undef).",
        verified: true
      },
      {
        id: "en_garde",
        boardName: "En Garde (CBBB)",
        dicePattern: "CBBB",
        baseDamage: 8,
        defendable: true,
        bonusRoll: { dice: 4, onC: "inflictDisarm" },
        notes: "Deal 8 dmg and roll 4 dice: On Pierce, inflict Disarm (stack 1 \u2014 un seul suffit).",
        verified: true
      },
      {
        id: "strike_small",
        boardName: "Strike (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 7,
        defendable: true,
        verified: true
      },
      {
        id: "strike_large",
        boardName: "Strike (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 10,
        defendable: true,
        stepsBeforeDamage: { upTo: 1 },
        notes: "You may take 1 Step. Then deal 10 dmg.",
        verified: true
      },
      {
        id: "bladestorm",
        boardName: "Bladestorm (CCCC)",
        dicePattern: "CCCC",
        baseDamage: 8,
        defendable: true,
        tokensGrantedToSelf: { guardBreak: 1 },
        tokensInflictedOnOpponent: { disarm: 1 },
        stepsBeforeDamage: { upTo: 2 },
        upgradedBy: { upgradeId: "bladestorm-ii", baseDamage: 9, tokensGrantedToSelf: { guardBreak: 2 } },
        notes: "Gain Guard Break. Inflict Disarm. You may take up to 2 Steps. Then deal 8 dmg (II : 2 GB, 9 dmg).",
        verified: true
      },
      {
        id: "master_of_the_blade",
        boardName: "Master of the Blade! (CCCCC)",
        dicePattern: "CCCCC",
        baseDamage: 11,
        defendable: false,
        ultimate: true,
        tokensGrantedToSelf: { guardBreak: 2 },
        tokensInflictedOnOpponent: { disarm: 1 },
        stepsBeforeDamage: { upTo: 4 },
        notes: "Gain 2 Guard Break. Inflict Disarm. You may take up to 4 Steps. Then deal 11 dmg.",
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "fancy_feet",
        boardName: "Fancy Feet (BBB)",
        dicePattern: "BBB",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "balestra-ii",
        tokensGrantedToSelf: { guardBreak: 1 },
        stepsBeforeDamage: { upTo: 3 },
        notes: "Gain Guard Break. You may take up to 3 Steps. (Pas de d\xE9g\xE2ts.)",
        verified: true
      },
      {
        id: "bladewind",
        boardName: "Bladewind (CCC)",
        dicePattern: "CCC",
        baseDamage: 3,
        defendable: false,
        collateral: true,
        requiresUpgradeId: "bladestorm-ii",
        notes: "Deal 3 collateral dmg (1v1 : \xE0 l'adversaire, ind\xE9fendable non modifiable).",
        verified: true
      }
    ],
    passives: [
      {
        id: "reposition",
        name: "Reposition",
        trigger: "upkeep",
        text: "During your Upkeep Phase, choose forward (up) or backward (down). You MUST take 1 or 2 Steps in this direction. If you move backwards with this Ability, gain Guard Break. RULING corrig\xE9 (user 2026-07-08) : TOUT recul (1 ou 2 steps) donne le Guard Break.",
        verified: true
      }
    ],
    defense: {
      name: "Retreat",
      diceCount: "4",
      text: "Defense Roll 4. For every 2 Blades, deal 1 dmg. For each Boot or Pierce rolled, you MUST take 1 Step backward. (II : 1 dmg PAR Blade.) La position finale apr\xE8s ces Steps forc\xE9s d\xE9termine le Defensive Bonus du Footwork Track.",
      verified: true
    },
    cards: [
      {
        id: "blade-flurry-ii",
        name: "Blade Flurry II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "blade_flurry",
        text: "AAA: 5. AAAA: 6. AAAAA: 7. On 3-of-a-kind (#'s), you may take 1 Step.",
        verified: true
      },
      {
        id: "balestra-ii",
        name: "Balestra II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "balestra",
        text: "AABB: You may take up to 2 Steps. Then deal 8 dmg. Adds alt FANCY FEET (BBB): Gain Guard Break. You may take up to 3 Steps.",
        verified: true
      },
      {
        id: "feint-attack-ii",
        name: "Feint Attack II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "feint_attack",
        text: "AACC: Gain 2 Guard Break. You may take 1 Step. Then deal 3 undefendable dmg.",
        verified: true
      },
      {
        id: "bladestorm-ii",
        name: "Bladestorm II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "bladestorm",
        text: "CCCC: Gain 2 Guard Break. Inflict Disarm. You may take up to 2 Steps. Then deal 9 dmg. Adds alt BLADEWIND (CCC): Deal 3 collateral dmg.",
        verified: true
      },
      {
        id: "retreat-ii",
        name: "Retreat II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "retreat",
        text: "Defense Roll 4. For every Blade, deal 1 dmg. For each Boot or Pierce rolled, you must take 1 Step backward.",
        verified: true
      },
      {
        id: "pick-it-up",
        name: "Pick It Up",
        kind: "action",
        cpCost: 0,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. If the opponent is afflicted with Disarm, remove it and add 3 dmg to your Attack.",
        verified: true
      },
      {
        id: "sashay",
        name: "Sashay",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Take 1 Step forward and deal 2 dmg, OR take 1 Step backward and Heal 2.",
        verified: true
      },
      {
        id: "courageous-advance",
        name: "Courageous Advance!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Take up to 2 Steps forward.",
        verified: true
      },
      {
        id: "i-hate-waiting",
        name: "I Hate Waiting",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Play only after being Attacked. Take up to 2 Steps backward.",
        verified: true
      },
      {
        id: "burst-forward",
        name: "Burst Forward",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Take 1 Step forward.",
        verified: true
      },
      {
        id: "quick-footwork",
        name: "Quick Footwork",
        kind: "action",
        cpCost: 1,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Change 1 of your dice to a 4 or a 5.",
        verified: true
      },
      {
        id: "all-in-the-wrists",
        name: "All in the Wrists",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Inflict Disarm on up to 2 opponents. (1v1 : l'adversaire.)",
        verified: true
      },
      {
        id: "confident-footing",
        name: "Confident Footing",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. If your Footwork token is on Neutral, gain 2 Guard Break.",
        verified: true
      },
      {
        id: "blade-barrage",
        name: "Blade Barrage",
        kind: "action",
        cpCost: 2,
        actionTiming: "rollPhase",
        text: "Roll Phase Action, Attack Modifier. Roll 5 dice: Add 1 x Blade dmg. On 2 Boots, you may take 1 Step.",
        verified: true
      }
    ]
  };

  // src/sim/data/characters/se/hero.json
  var hero_default10 = {
    id: "se",
    name: "Sun Elf",
    diceAnatomy: "1-3 = Stave (A), 4-5 = Charge (B), 6 = Sun Power (C). V\xE9rifi\xE9 leaflet dice.png (scan user 2026-07-08).",
    startingHp: 50,
    cpIncomePerTurn: 1,
    source: "Board (3 photos) + leaflet (5 captures) + 15 cartes (kit complet confirm\xE9 user). Spec : characters/Sun_Elf/SPEC.md. Rulings user 2026-07-08 : Radiant Energy base AAACC (II: AACC) ; 'On X' = une fois sauf 'for each' ; DAWN s'applique aussi \xE0 l'Ultimate ; Sun Marked heal sur toute attaque qui inflige des d\xE9g\xE2ts.",
    tokens: [
      { id: "chargedGem", name: "Charged Gem", startingCount: 0, stackCap: 1, description: "Positive Status Effect. Spend during your Main Phase and roll 1 die: 1-2 gain 1 CP; 3-4 deal 2 isolated undefendable dmg to a chosen opponent; 5-6 both." },
      { id: "sunMarked", name: "Sun Marked", startingCount: 0, stackCap: 1, description: "Negative Status Effect, PERSISTENT. When a player afflicted with this token is Attacked by an opponent, the Attacker Heals 2. Attack Modifier." },
      { id: "sunDial", name: "Sun Dial", startingCount: 0, stackCap: 5, description: "Cadran 0-5 \xE0 deux faces, g\xE9r\xE9 dans se.rules.ts (PlayerState.sunDial + sunDialDawn). Setup : 0 c\xF4t\xE9 DUSK. Increase au-del\xE0 de 5 = Heal 1 par exc\xE8s. DUSK : upkeep +1 ; \xE0 5 -> flip DAWN. DAWN : si l'ORP produit une Attaque, PEUT ajouter la valeur du cadran en dmg (Attack Modifier) puis cadran -4 \xE0 la fin de la Roll Phase ; \xE0 0 -> flip DUSK." }
    ],
    flags: [],
    abilities: [
      {
        id: "light_staff_3a",
        boardName: "Light Staff 3A (AAA)",
        dicePattern: "AAA",
        baseDamage: 4,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, sunDial: 1 },
        upgradedBy: { upgradeId: "light-staff-ii", baseDamage: 5, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "light_staff_4a",
        boardName: "Light Staff 4A (AAAA)",
        dicePattern: "AAAA",
        baseDamage: 5,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, sunDial: 1 },
        upgradedBy: { upgradeId: "light-staff-ii", baseDamage: 6, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "light_staff_5a",
        boardName: "Light Staff 5A (AAAAA)",
        dicePattern: "AAAAA",
        baseDamage: 7,
        defendable: true,
        numberMatchBonus: { ofAKind: 4, sunDial: 1 },
        upgradedBy: { upgradeId: "light-staff-ii", baseDamage: 7, numberMatchOfAKind: 3 },
        verified: true
      },
      {
        id: "ray_absorption",
        boardName: "Ray Absorption (BBBB)",
        dicePattern: "BBBB",
        baseDamage: 0,
        defendable: true,
        sunDialGain: 3,
        heal: 2,
        tokensGrantedToSelf: { chargedGem: 1 },
        notes: "Increase Sun Dial by 3. Heal 2. Gain Charged Gem. (Pas de d\xE9g\xE2ts.)",
        verified: true
      },
      {
        id: "radiant_energy",
        boardName: "Radiant Energy (AAACC)",
        dicePattern: "AAACC",
        baseDamage: 6,
        defendable: true,
        tokensInflictedOnOpponent: { sunMarked: 1 },
        upgradedBy: { upgradeId: "radiant-energy-ii", dicePattern: "AACC" },
        notes: "Inflict Sun Marked. Then deal 6 dmg. Ruling user : base AAACC, le II \xE9largit le pattern \xE0 AACC.",
        verified: true
      },
      {
        id: "scorching_staff",
        boardName: "Scorching Staff (ABBB)",
        dicePattern: "ABBB",
        baseDamage: 5,
        defendable: true,
        bonusRoll: { dice: 1, onA: "add2dmg", onB: "sunDial2", onC: "chargedGemAndSunDial2" },
        upgradedBy: { upgradeId: "scorching-staff-ii" },
        notes: "Deal 5 dmg and roll 1: On A add 2 dmg; On B Sun Dial +2; On C gain Charged Gem AND Sun Dial +2. II : roll 2 dice, +2 dmg PAR A, Dial +1 PAR B, sur C gem + Dial +2.",
        verified: true
      },
      {
        id: "ray_of_light",
        boardName: "Ray of Light (4-straight)",
        dicePattern: "Small Straight (4 consecutive)",
        baseDamage: 7,
        defendable: true,
        sunDialGain: 1,
        notes: "Increase Sun Dial by 1. Then deal 7 dmg.",
        verified: true
      },
      {
        id: "sunbeam",
        boardName: "Sunbeam (5-straight)",
        dicePattern: "Large Straight (5 consecutive)",
        baseDamage: 9,
        defendable: true,
        sunDialGain: 2,
        upgradedBy: { upgradeId: "sunbeam-ii", sunDialGain: 3 },
        notes: "Increase Sun Dial by 2 (II : 3). Then deal 9 dmg.",
        verified: true
      },
      {
        id: "solar_burst",
        boardName: "Solar Burst (CCCC)",
        dicePattern: "CCCC",
        baseDamage: 8,
        defendable: true,
        sunDialGain: 2,
        chooseGemOrMark: true,
        upgradedBy: { upgradeId: "solar-burst-ii", baseDamage: 7 },
        notes: "Dial +2 ; CHOIX : gagner Charged Gem OU infliger Sun Marked ; puis 8 dmg. II : gem ET mark, puis 7 dmg IND\xC9FENDABLES.",
        verified: true
      },
      {
        id: "solar_flare",
        boardName: "Solar Flare! (CCCCC)",
        dicePattern: "CCCCC",
        baseDamage: 10,
        defendable: false,
        ultimate: true,
        sunDialGain: 3,
        tokensGrantedToSelf: { chargedGem: 1 },
        tokensInflictedOnOpponent: { sunMarked: 1 },
        notes: "Increase Sun Dial by 3. Gain Charged Gem. Inflict Sun Marked. Then deal 10 dmg.",
        verified: true
      }
    ],
    altAbilities: [
      {
        id: "bestow_your_light",
        boardName: "Bestow Your Light (CCC)",
        dicePattern: "CCC",
        baseDamage: 0,
        defendable: true,
        requiresUpgradeId: "solar-burst-ii",
        sunDialGain: 4,
        tokensInflictedOnOpponent: { sunMarked: 1 },
        notes: "Increase Sun Dial by 4. Inflict Sun Marked. (Pas de d\xE9g\xE2ts.)",
        verified: true
      },
      {
        id: "praise_the_sun",
        boardName: "Praise the Sun (AAAC)",
        dicePattern: "AAAC",
        baseDamage: 5,
        defendable: true,
        requiresUpgradeId: "radiant-energy-ii",
        tokensGrantedToSelf: { chargedGem: 1 },
        notes: "Gain Charged Gem. Deal 5 dmg.",
        verified: true
      },
      {
        id: "soaking_up_the_sun",
        boardName: "Soaking Up the Sun (BCCC)",
        dicePattern: "BCCC",
        baseDamage: 9,
        defendable: true,
        requiresUpgradeId: "sunbeam-ii",
        tokensGrantedToSelf: { chargedGem: 1 },
        notes: "Gain Charged Gem. Deal 9 dmg.",
        verified: true
      }
    ],
    passives: [],
    defense: {
      name: "Harness the Light",
      diceCount: "3",
      text: "Defense Roll 3. Heal 1 per Stave. On BB (2 Charges, UNE fois \u2014 ruling 'On X' = once), increase Sun Dial by 1. On C (une fois), increase Sun Dial by 1. II (3 CP) : Heal 1/A ; on B (une fois) Dial +1 ; Dial +1 PAR C (for each) ; on A+B+C gain Charged Gem.",
      verified: true
    },
    cards: [
      {
        id: "light-staff-ii",
        name: "Light Staff II",
        kind: "upgrade",
        cpCost: 1,
        upgradeSlot: "light_staff",
        text: "AAA: 5. AAAA: 6. AAAAA: 7. On 3-of-a-kind (#'s), increase Sun Dial by 1.",
        verified: true
      },
      {
        id: "scorching-staff-ii",
        name: "Scorching Staff II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "scorching_staff",
        text: "ABBB: Deal 5 dmg and roll 2 dice: Add 2 x A dmg. For each B, increase Sun Dial by 1. On C, gain Charged Gem and increase Sun Dial by 2.",
        verified: true
      },
      {
        id: "radiant-energy-ii",
        name: "Radiant Energy II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "radiant_energy",
        text: "AACC: Inflict Sun Marked on a chosen opponent. Then deal 6 dmg. Adds alt PRAISE THE SUN (AAAC): Gain Charged Gem. Deal 5 dmg.",
        verified: true
      },
      {
        id: "solar-burst-ii",
        name: "Solar Burst II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "solar_burst",
        text: "CCCC: Increase Sun Dial by 2. Gain Charged Gem. Inflict Sun Marked. Then deal 7 undefendable dmg. Adds alt BESTOW YOUR LIGHT (CCC): Increase Sun Dial by 4. Inflict Sun Marked.",
        verified: true
      },
      {
        id: "sunbeam-ii",
        name: "Sunbeam II",
        kind: "upgrade",
        cpCost: 2,
        upgradeSlot: "sunbeam",
        text: "LARGE STRAIGHT: Increase Sun Dial by 3. Then deal 9 dmg. Adds alt SOAKING UP THE SUN (BCCC): Gain Charged Gem. Deal 9 dmg.",
        verified: true
      },
      {
        id: "harness-the-light-ii",
        name: "Harness the Light II",
        kind: "upgrade",
        cpCost: 3,
        upgradeSlot: "harness_the_light",
        text: "Defense Roll 3. Heal 1 x A. On B, increase Sun Dial by 1. For each C, increase Sun Dial by 1. On A+B+C, gain Charged Gem.",
        verified: true
      },
      {
        id: "clouds-parting",
        name: "Clouds Parting!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Roll 1 die: Increase Sun Dial by 1/2 the value rolled (rounded up).",
        verified: true
      },
      {
        id: "solstice",
        name: "Solstice!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Choose one: Deal 2 dmg to all opponents OR you and all teammates Heal 2. (1v1 : 2 dmg \xE0 l'adversaire OU Heal 2.)",
        verified: true
      },
      {
        id: "here-comes-the-sun",
        name: "Here Comes the Sun!",
        kind: "action",
        cpCost: 1,
        actionTiming: "instant",
        text: "Instant Action. Play only if Sun Dial is on the DUSK side. Increase Sun Dial by 2.",
        verified: true
      },
      {
        id: "it-gives-life",
        name: "It Gives Life!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Reduce Sun Dial to 0 (must reduce by at least 1). A chosen player Heals equal to the amount reduced (max 5).",
        verified: true
      },
      {
        id: "the-suns-blessing",
        name: "The Sun's Blessing!",
        kind: "action",
        cpCost: 1,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Roll 1 die: On A, gain Charged Gem. On B, draw 2. On C, set Sun Dial to 5.",
        verified: true
      },
      {
        id: "sun-shield",
        name: "Sun Shield!",
        kind: "action",
        cpCost: 0,
        actionTiming: "instant",
        text: "Instant Action. Remove Charged Gem to prevent 3 incoming dmg.",
        verified: true
      },
      {
        id: "first-light",
        name: "First Light!",
        kind: "action",
        cpCost: 2,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Play only if Sun Dial is at 0. Increase Sun Dial by 2. Inflict Sun Marked on a chosen opponent.",
        verified: true
      },
      {
        id: "the-glorious-sun",
        name: "The Glorious Sun!",
        kind: "action",
        cpCost: 0,
        actionTiming: "mainPhase",
        text: "Main Phase Action. Flip over your Sun Dial.",
        verified: true
      },
      {
        id: "radiant-exchange",
        name: "Radiant Exchange!",
        kind: "action",
        cpCost: 2,
        actionTiming: "rollPhase",
        text: "Roll Phase Action. Reduce Sun Dial to 0 (must reduce by at least 1). Change the value of one of your dice to a 6.",
        verified: true
      }
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
  var fmHero = hero_default3;
  var rvHero = hero_default4;
  var drHero = hero_default5;
  var thHero = hero_default6;
  var smHero = hero_default7;
  var pyHero = hero_default8;
  var duHero = hero_default9;
  var seHero = hero_default10;
  var commonCards = common_cards_default;
  var nxHero = {
    id: "nx",
    name: "Naraxus the Devourer",
    diceAnatomy: "1 d\xE9 (2 en hard mode, garde le plus haut) \u2014 la face choisit son attaque.",
    startingHp: 65,
    cpIncomePerTurn: null,
    source: "Planche Naraxus_Battle (scan user 2026-07-05), mode normal + hard v\xE9rifi\xE9s.",
    tokens: [],
    flags: [],
    abilities: [],
    passives: [],
    defense: { name: "Dragon Scales", diceCount: "1", text: "Roll 1 die: on 1 prevent 1, on 2-5 prevent 3, on 6 prevent 5. Activates against any defendable dmg.", verified: true },
    cards: []
  };
  function heroTemplateFor(heroId) {
    return heroId === "hh" ? hhHero : heroId === "fm" ? fmHero : heroId === "rv" ? rvHero : heroId === "dr" ? drHero : heroId === "th" ? thHero : heroId === "sm" ? smHero : heroId === "py" ? pyHero : heroId === "du" ? duHero : heroId === "se" ? seHero : heroId === "nx" ? nxHero : bwHero;
  }
  function abilityByBoardName(hero, boardName) {
    const pools = [
      ...hero.abilities,
      ...hero.altAbilities ?? [],
      ...hero.cards.map((c) => c.altAbility).filter((x) => !!x)
    ];
    const exact = pools.find((a) => a.boardName === boardName);
    if (exact) return exact;
    const short = (n) => n.split(" (")[0].replace(/ I{1,3}$/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    const want = short(boardName);
    return pools.find((a) => short(a.boardName) === want);
  }
  function cardById(hero, cardId) {
    return hero.cards.find((c) => c.id === cardId) ?? commonCards.cards.find((c) => c.id === cardId);
  }
  function resolvedAbilityByBoardName(hero, boardName, upgradeIds) {
    const base = abilityByBoardName(hero, boardName);
    if (!base?.upgradedBy) return base;
    if (!upgradeIds.includes(base.upgradedBy.upgradeId)) return base;
    const merged = { ...base };
    for (const [k, v] of Object.entries(base.upgradedBy)) {
      if (k !== "upgradeId" && v !== void 0) merged[k] = v;
    }
    if (base.upgradedBy.cpGain != null) merged.cpGainIfUpgradesAtLeast = void 0;
    return merged;
  }

  // src/sim/ability-resolver.ts
  function fullAbilityBoard(heroId, dice, oracleState) {
    return heroId === "hh" ? hhConfig.buildAbilityBoard(dice, oracleState) : heroId === "fm" ? fmConfig.buildAbilityBoard(dice, oracleState) : heroId === "rv" ? rvConfig.buildAbilityBoard(dice, oracleState) : heroId === "dr" ? drConfig.buildAbilityBoard(dice, oracleState) : heroId === "th" ? thConfig.buildAbilityBoard(dice, oracleState) : heroId === "sm" ? smConfig.buildAbilityBoard(dice, oracleState) : heroId === "py" ? pyConfig.buildAbilityBoard(dice, oracleState) : heroId === "du" ? duConfig.buildAbilityBoard(dice, oracleState) : heroId === "se" ? seConfig.buildAbilityBoard(dice, oracleState) : bwConfig.buildAbilityBoard(dice, oracleState);
  }
  function resolveMatchedAbilities(heroId, dice, oracleState) {
    const template = heroTemplateFor(heroId);
    const upgradeIds = oracleState.upgradeIds ?? [];
    const board = fullAbilityBoard(heroId, dice, oracleState);
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
  function hasNumberMatch2(dice, ofAKind) {
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
    return { bonusDamage: a, undefendable: b >= 2, grimPursuitGained: c, dice };
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
    if (tokens.grimPursuit <= 0) return { dice: [], bonus: 0 };
    tokens.grimPursuit -= 1;
    const dice = [rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng)];
    const bonus = dice.filter((v) => v === 4 || v === 5).length;
    return { dice, bonus };
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
    const rolls = [];
    const survivors = [];
    for (const pos of self.timeBombs) {
      const roll = rollDie(rng);
      rolls.push(roll);
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
    return { rolls, selfDamage, defused };
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
    if (!upgradesInPlay.includes("red-room-training-ii")) return 0;
    return upgradesInPlay.length >= 5 ? 1 : 0;
  }

  // src/sim/hero/fm.rules.ts
  function createInitialFMTokens() {
    return emptyBag();
  }
  var ORE_RANK = { "ultimanium-ore": 3, "diamond-ore": 2, "gold-ore": 1 };
  function isOre(cardId) {
    return cardId in ORE_RANK;
  }
  function armorCount(p) {
    return (p.armor.helmet > 0 ? 1 : 0) + (p.armor.shield > 0 ? 1 : 0);
  }
  function minePeek(self) {
    return self.deck.slice(0, Math.min(3, self.deck.length));
  }
  function mineResolve(self, reveal) {
    const top = self.deck.splice(0, Math.min(3, self.deck.length));
    const revealed = [];
    for (const id of reveal) {
      const i = top.indexOf(id);
      if (i >= 0 && isOre(id)) {
        top.splice(i, 1);
        revealed.push(id);
      }
    }
    self.forge.push(...revealed);
    self.deck.push(...top);
    const cpGained = revealed.length === 0 ? 1 : 0;
    self.cp += cpGained;
    return { revealed, cpGained };
  }
  function mine(self, revealAll = false) {
    const ores = minePeek(self).filter(isOre).sort((a, b) => ORE_RANK[b] - ORE_RANK[a]);
    return mineResolve(self, revealAll ? ores : ores.slice(0, 1));
  }
  function tutorOreToForge(self, rng) {
    const best = self.deck.filter(isOre).sort((a, b) => ORE_RANK[b] - ORE_RANK[a])[0] ?? null;
    if (best) {
      self.deck.splice(self.deck.indexOf(best), 1);
      self.forge.push(best);
    }
    for (let i = self.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [self.deck[i], self.deck[j]] = [self.deck[j], self.deck[i]];
    }
    return best;
  }
  function craftOptions(self) {
    const out = [];
    for (const a of fmHero.armors ?? []) {
      const cur = self.armor[a.slot];
      if (cur >= a.tier) continue;
      if (a.tier > 1 && cur !== a.tier - 1) continue;
      const need = Object.entries(a.blueprint.ore);
      if (!need.every(([oreId, n]) => self.forge.filter((x) => x === oreId).length >= n)) continue;
      out.push({ armorId: a.id, name: a.name, slot: a.slot, tier: a.tier, ore: a.blueprint.ore });
    }
    return out;
  }
  function craftSpecific(self, armorId) {
    const opt = craftOptions(self).find((o) => o.armorId === armorId);
    if (!opt) return null;
    for (const [oreId, n] of Object.entries(opt.ore)) {
      for (let k = 0; k < n; k++) {
        self.forge.splice(self.forge.indexOf(oreId), 1);
        self.deck.push(oreId);
      }
    }
    self.armor[opt.slot] = opt.tier;
    return { armorId: opt.armorId, slot: opt.slot, tier: opt.tier };
  }
  function craftOnce(self) {
    const opts = craftOptions(self).sort((a, b) => b.tier - a.tier || (a.slot === "shield" ? -1 : 1));
    return opts.length ? craftSpecific(self, opts[0].armorId) : null;
  }
  var HELMET_COUNTER = [0, 1, 2, 3];
  var SHIELD_PREVENT = [0, 1, 2, 2];
  function armorEffects(self, kind, doubling = {}) {
    if (kind === "ultimate") return { prevented: 0, counter: 0 };
    let prevented = 0, counter = 0;
    if (kind === "normal" && self.armor.helmet > 0) {
      counter = HELMET_COUNTER[self.armor.helmet] * (doubling.helmet ? 2 : 1);
    }
    if (self.armor.shield > 0 && (kind === "normal" || self.armor.shield >= 3)) {
      prevented = SHIELD_PREVENT[self.armor.shield] * (doubling.shield ? 2 : 1);
    }
    return { prevented, counter };
  }
  function rollMasterworkDie(rng) {
    return rollDie(rng);
  }
  function masterworkOutcome(face, self, incomingDamage, forgePref) {
    if (face <= 3) return { mines: true, doubling: {} };
    const hasHelm = self.armor.helmet > 0, hasShield = self.armor.shield > 0;
    if (face >= 6) return { mines: false, doubling: { helmet: hasHelm, shield: hasShield } };
    if (forgePref === "helmet" && hasHelm) return { mines: false, doubling: { helmet: true } };
    if (forgePref === "shield" && hasShield) return { mines: false, doubling: { shield: true } };
    const base = armorEffects(self, "normal");
    const helmGain = hasHelm ? HELMET_COUNTER[self.armor.helmet] : 0;
    const shieldGain = hasShield ? Math.min(SHIELD_PREVENT[self.armor.shield], Math.max(0, incomingDamage - base.prevented)) : 0;
    if (helmGain === 0 && shieldGain === 0) return { mines: false, doubling: {} };
    return helmGain > shieldGain ? { mines: false, doubling: { helmet: true } } : { mines: false, doubling: { shield: true } };
  }

  // src/sim/hero/nx.rules.ts
  var NX_HP_BY_HEROES = [65, 65, 70, 75];
  var NX_HEAL_CAP = 65;
  function createInitialNXTokens() {
    return emptyBag();
  }
  function nxAttackInfo(face) {
    switch (face) {
      case 1:
        return { name: "Swoop", dmg: 3, defendable: false };
      case 2:
        return { name: "Ember Spark", dmg: 8, defendable: true };
      case 3:
        return { name: "Gashing Bite", dmg: 0, defendable: true };
      case 4:
        return { name: "Hoarding", dmg: 9, defendable: true };
      case 5:
        return { name: "Thundering Roar", dmg: 8, defendable: false };
      default:
        return { name: "Dragon's Might", dmg: 10, defendable: true };
    }
  }
  function removeRandomStatus(self, rand) {
    const pool = [];
    for (const [k, v] of Object.entries(self.tokens)) if (v > 0 && k !== "head") pool.push(k);
    for (let i = 0; i < self.timeBombs.length; i++) pool.push("timeBomb");
    if (!pool.length) return null;
    const pick = pool[Math.floor(rand() * pool.length)];
    if (pick === "timeBomb") self.timeBombs.pop();
    else self.tokens[pick] -= 1;
    return pick;
  }
  function dragonScalesPrevent(face) {
    if (face === 1) return 1;
    if (face <= 5) return 3;
    return 5;
  }

  // src/sim/hero/rv.rules.ts
  var FEATHER_CAP_BASE = 5;
  var NEVERMORE_DIAL_CAP = 3;
  function createInitialRVTokens() {
    return { ...emptyBag(), nevermore: 1 };
  }
  function rvFaceToSymbol2(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function featherCap(self) {
    return FEATHER_CAP_BASE + (self.featherCapBonus ?? 0);
  }
  function grantFeathers(self, n) {
    const cap = featherCap(self);
    const before = self.tokens.feather ?? 0;
    const after = Math.min(cap, before + n);
    self.tokens.feather = after;
    return after - before;
  }
  function nevermoreHolder(state) {
    return (state.players[0].tokens.nevermore ?? 0) > 0 ? 0 : 1;
  }
  function applyNevermoreActivation(rv, opp, rvIsHolder, choice) {
    if (choice === "absorb") {
      rv.nevermoreDial = Math.min(NEVERMORE_DIAL_CAP, (rv.nevermoreDial ?? 0) + 1);
      return { choice: "absorb", absorbDamage: 1, dialAfter: rv.nevermoreDial };
    }
    if (rvIsHolder) {
      rv.tokens.nevermore = 0;
      opp.tokens.nevermore = 1;
      return { choice: "moveToOpponent" };
    }
    opp.tokens.nevermore = 0;
    rv.tokens.nevermore = 1;
    const healed = rv.nevermoreDial ?? 0;
    rv.hp = Math.min(rv.hp + healed, 60);
    rv.nevermoreDial = 0;
    return { choice: "moveToSelf", healed };
  }
  function applyNevermoreDieFace(rv, holder, face) {
    switch (face) {
      case 1:
        holder.tokens.hex = 1;
        return { face, hexInflicted: true };
      case 2:
        return { face, activations: 2 };
      case 3:
        return { face, activations: 1 };
      case 4:
        return { face, discards: 1 };
      case 5: {
        const stolen = Math.min(1, holder.cp);
        holder.cp -= stolen;
        rv.cp = Math.min(15, rv.cp + stolen);
        return { face, cpStolen: stolen };
      }
      default: {
        rv.nevermoreDial = 0;
        holder.tokens.nevermore = 0;
        rv.tokens.nevermore = 1;
        return { face, returned: true };
      }
    }
  }
  function nothingMoreEffects(dice, upgraded) {
    let a = 0, b = 0, c = 0;
    for (const d of dice) {
      const s = rvFaceToSymbol2(d);
      if (s === "A") a += 1;
      else if (s === "B") b += 1;
      else c += 1;
    }
    return {
      counterDamage: upgraded ? a : a >= 2 ? 2 : 0,
      prevented: b >= 2 ? 2 : 0,
      activations: c >= 2 ? 1 : 0
    };
  }

  // src/sim/hero/dr.rules.ts
  var SHAPE_SHIFT_CAP = 2;
  var REGEN_CAP = 2;
  function createInitialDRTokens() {
    return emptyBag();
  }
  function drFaceToSymbol2(face) {
    return face <= 3 ? "A" : face <= 5 ? "B" : "C";
  }
  function formOf(p) {
    return p.form ?? "druid";
  }
  function grantShapeShift(self, n) {
    const before = self.tokens.shapeShift ?? 0;
    self.tokens.shapeShift = Math.min(SHAPE_SHIFT_CAP, before + n);
    return self.tokens.shapeShift - before;
  }
  function grantRegen2(self, n = 1) {
    for (let i = 0; i < n; i++) {
      const total = (self.tokens.regen2 ?? 0) + (self.tokens.regen1 ?? 0);
      if (total < REGEN_CAP) self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1;
      else if ((self.tokens.regen1 ?? 0) > 0) {
        self.tokens.regen1 -= 1;
        self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1;
      }
    }
  }
  function spendShapeShift(self, to) {
    if ((self.tokens.shapeShift ?? 0) < 1) return null;
    if (formOf(self) === to) return null;
    self.tokens.shapeShift -= 1;
    self.form = to;
    return to;
  }
  function upkeepRegenAndWound(self, rng) {
    let healed = 0;
    const r2 = self.tokens.regen2 ?? 0;
    const r1 = self.tokens.regen1 ?? 0;
    if (r2 > 0) {
      healed += 2 * r2;
      self.tokens.regen2 = 0;
      self.tokens.regen1 = Math.min(REGEN_CAP, r1 + r2);
    }
    const r1b = self.tokens.regen1 ?? 0;
    if (r1 > 0) {
      healed += 1 * r1;
      self.tokens.regen1 = r1b - r1;
    }
    self.hp = Math.min(self.hp + healed, 60);
    let woundDamage = 0, woundsRemoved = 0;
    const woundRolls = [];
    const wounds = self.tokens.wound ?? 0;
    for (let i = 0; i < wounds; i++) {
      woundDamage += 1;
      const roll = rollDie(rng);
      woundRolls.push(roll);
      if (roll >= 4) woundsRemoved += 1;
    }
    self.hp -= woundDamage;
    self.tokens.wound = wounds - woundsRemoved;
    return { healed, woundDamage, woundsRemoved, woundRolls };
  }
  function thickHideDiceCount(p) {
    return formOf(p) === "bear" ? 4 : 2;
  }
  function thickHideEffects(dice, bear) {
    let a = 0, b = 0, c = 0;
    for (const d of dice) {
      const s = drFaceToSymbol2(d);
      if (s === "A") a += 1;
      else if (s === "B") b += 1;
      else c += 1;
    }
    return { counterDamage: a, prevented: bear ? b + c : 0 };
  }
  function maulRoll(rng, bear) {
    const d = [rollDie(rng), rollDie(rng)];
    let rerolled = false;
    if (bear) {
      const iMin = d[0] <= d[1] ? 0 : 1;
      if (d[iMin] <= 3) {
        d[iMin] = rollDie(rng);
        rerolled = true;
      }
    }
    return { dice: d, total: d[0] + d[1], rerolled };
  }

  // src/sim/hero/th.rules.ts
  var EK_CAP = 4;
  var GB_CAP = 2;
  function createInitialTHTokens() {
    return emptyBag();
  }
  function mjolnirHome(p) {
    return p.mjolnirAway !== true;
  }
  function gainEk(p, n) {
    const before = p.tokens.electrokinesis ?? 0;
    p.tokens.electrokinesis = Math.min(EK_CAP, before + n);
    return p.tokens.electrokinesis - before;
  }
  function gainGb(p, n) {
    const before = p.tokens.guardBreak ?? 0;
    p.tokens.guardBreak = Math.min(GB_CAP, before + n);
    return p.tokens.guardBreak - before;
  }
  function shuttleOnce(self) {
    if (mjolnirHome(self)) {
      self.mjolnirAway = true;
      self.thrownThisTurn = (self.thrownThisTurn ?? 0) + 1;
      return { action: "throw", damage: 1, ekGained: 0 };
    }
    self.mjolnirAway = false;
    return { action: "retrieve", damage: 0, ekGained: gainEk(self, 1) };
  }
  function shuttle(self, times) {
    let damage = 0, ekGained = 0, throws = 0, retrieves = 0;
    for (let i = 0; i < times; i++) {
      const r = shuttleOnce(self);
      damage += r.damage;
      ekGained += r.ekGained;
      if (r.action === "throw") throws += 1;
      else retrieves += 1;
    }
    return { damage, ekGained, throws, retrieves };
  }
  function tryGuardBreak(self, rng, maxTokens) {
    const avail = Math.min(self.tokens.guardBreak ?? 0, maxTokens ?? GB_CAP);
    const rolls = [];
    let spent = 0;
    for (let i = 0; i < avail; i++) {
      spent += 1;
      self.tokens.guardBreak = (self.tokens.guardBreak ?? 0) - 1;
      const d = Math.floor(rng() * 6) + 1;
      rolls.push(d);
      if (d === 4 || d === 5) return { spent, rolls, success: true };
    }
    return { spent, rolls, success: false };
  }
  function chainLightningRoll(rng, diceCount) {
    const dice = [];
    for (let i = 0; i < diceCount; i++) dice.push(Math.floor(rng() * 6) + 1);
    const sorted = [...dice].sort((a, b) => b - a);
    return { dice, total: sorted[0] + sorted[1] };
  }
  function odinforceRoll(rng) {
    const dice = [];
    for (let i = 0; i < 5; i++) dice.push(Math.floor(rng() * 6) + 1);
    return {
      dice,
      hammers: dice.filter((d) => d <= 3).length,
      worthies: dice.filter((d) => d === 4 || d === 5).length,
      thunders: dice.filter((d) => d === 6).length
    };
  }
  function thunderWheelEffects(dice, upgraded) {
    const h = dice.filter((d) => d <= 3).length;
    const w = dice.filter((d) => d === 4 || d === 5).length;
    const t = dice.filter((d) => d === 6).length;
    return {
      shuttles: upgraded ? Math.floor(h / 2) : h >= 2 ? 1 : 0,
      prevented: 2 * w,
      ekGain: t
    };
  }

  // src/sim/hero/sm.rules.ts
  var COMBO_CAP = 1;
  var WEBBED_CAP = 1;
  var INVIS_CAP = 1;
  function createInitialSMTokens() {
    return emptyBag();
  }
  function gainCombo(p) {
    const before = p.tokens.combo ?? 0;
    p.tokens.combo = Math.min(COMBO_CAP, before + 1);
    return p.tokens.combo - before;
  }
  function gainInvisibility(p) {
    const before = p.tokens.invisibility ?? 0;
    p.tokens.invisibility = Math.min(INVIS_CAP, before + 1);
    return p.tokens.invisibility - before;
  }
  function inflictWebbed(target) {
    if ((target.tokens.webbed ?? 0) >= WEBBED_CAP) return { gained: false, isoDamage: 0 };
    target.tokens.webbed = 1;
    return { gained: true, isoDamage: 2 };
  }
  function spiderSenseSuccess(dice, swingEscape) {
    return swingEscape ? dice.some((d) => d >= 4 && d <= 5) : dice.some((d) => d === 6);
  }
  function spiderSensePrevention(incomingDamage) {
    return Math.ceil(incomingDamage / 2);
  }
  function counterpunchDamage(dice) {
    return dice.filter((d) => d <= 3).length;
  }
  function chooseDefenseHeuristic(incomingDamage, hasInvisibility) {
    const pSense = hasInvisibility ? 1 - Math.pow(5 / 6, 4) : 1 - Math.pow(5 / 6, 2);
    return pSense * spiderSensePrevention(incomingDamage) >= 1.5 ? "sense" : "counter";
  }

  // src/sim/hero/py.rules.ts
  var FM_BASE_CAP = 5;
  var BURN_UPKEEP_DMG = 2;
  var KNOCKDOWN_COST = 2;
  function createInitialPYTokens() {
    return emptyBag();
  }
  function fmCap(p) {
    return FM_BASE_CAP + (p.fmCapBonus ?? 0);
  }
  function gainFm(p, n) {
    const before = p.tokens.fireMastery ?? 0;
    p.tokens.fireMastery = Math.min(fmCap(p), before + n);
    return p.tokens.fireMastery - before;
  }
  function coolOff(p) {
    if ((p.tokens.fireMastery ?? 0) <= 0) return false;
    p.tokens.fireMastery -= 1;
    return true;
  }
  function inflictNegative(target, kind) {
    const before = target.tokens[kind] ?? 0;
    target.tokens[kind] = Math.min(1, before + 1);
    return target.tokens[kind] - before;
  }
  function moltenArmorEffects(dice, tier) {
    const flames = dice.filter((d) => d <= 3).length;
    const blazes = dice.filter((d) => d === 4).length;
    const souls = dice.filter((d) => d === 5).length;
    const meteors = dice.filter((d) => d === 6).length;
    return {
      fmGain: souls + (tier >= 3 ? meteors : 0),
      counterDamage: flames + (tier >= 3 ? meteors : 0),
      inflictBurn: tier >= 2 && flames >= 1 && blazes >= 1
    };
  }
  function pyroBonusDieEffects(face) {
    return {
      addDmg: face <= 3 ? 3 : 0,
      burn: face === 4,
      fm: face === 5 ? 2 : 0,
      knockdown: face === 6
    };
  }

  // src/sim/hero/du.rules.ts
  var FOOTWORK_MIN = -2;
  var FOOTWORK_MAX = 2;
  function createInitialDUTokens() {
    return emptyBag();
  }
  function footworkPos(p) {
    return p.footwork ?? 0;
  }
  function takeSteps(p, delta) {
    const before = footworkPos(p);
    const after = Math.max(FOOTWORK_MIN, Math.min(FOOTWORK_MAX, before + delta));
    p.footwork = after;
    return after - before;
  }
  function offensiveBonusDmg2(pos) {
    return pos === 2 ? 3 : pos === 1 ? 1 : 0;
  }
  function defensiveBonus(pos) {
    return pos === -2 ? { prevent: 3, draw: 0 } : pos === -1 ? { prevent: 0, draw: 1 } : { prevent: 0, draw: 0 };
  }
  function repositionLegalDirections(p) {
    const pos = footworkPos(p);
    const dirs = [];
    if (pos < FOOTWORK_MAX) dirs.push("forward");
    if (pos > FOOTWORK_MIN) dirs.push("backward");
    return dirs;
  }
  function applyReposition(p, direction, steps) {
    const delta = direction === "forward" ? steps : -steps;
    const moved = takeSteps(p, delta);
    const gbGained = direction === "backward" && moved < 0 ? gainGb(p, 1) : 0;
    return { moved, gbGained };
  }
  function enGardeRoll(rng) {
    const dice = [];
    for (let i = 0; i < 4; i++) dice.push(Math.floor(rng() * 6) + 1);
    return { dice, disarm: dice.some((d) => d === 6) };
  }
  function retreatEffects(dice, upgraded) {
    const blades = dice.filter((d) => d <= 3).length;
    const nonBlades = dice.length - blades;
    return {
      counterDamage: upgraded ? blades : Math.floor(blades / 2),
      forcedBackSteps: nonBlades
    };
  }
  function inflictDisarm(target) {
    const before = target.tokens.disarm ?? 0;
    target.tokens.disarm = Math.min(1, before + 1);
    return target.tokens.disarm - before;
  }

  // src/sim/hero/se.rules.ts
  var SUN_DIAL_MAX = 5;
  var SUN_MARKED_HEAL = 2;
  var DAWN_SPEND_COST = 4;
  var HEAL_CAP = 60;
  function createInitialSETokens() {
    return emptyBag();
  }
  function dialOf(p) {
    return p.sunDial ?? 0;
  }
  function isDawn(p) {
    return p.sunDialDawn === true;
  }
  function checkFlip(p) {
    if (!isDawn(p) && dialOf(p) >= SUN_DIAL_MAX) {
      p.sunDialDawn = true;
      return "dawn";
    }
    if (isDawn(p) && dialOf(p) <= 0) {
      p.sunDialDawn = false;
      return "dusk";
    }
    return null;
  }
  function increaseDial(p, n) {
    const before = dialOf(p);
    const after = Math.min(SUN_DIAL_MAX, before + n);
    const excess = Math.max(0, before + n - SUN_DIAL_MAX);
    p.sunDial = after;
    const healed = excess > 0 ? Math.min(excess, HEAL_CAP - p.hp) : 0;
    if (excess > 0) p.hp = Math.min(HEAL_CAP, p.hp + excess);
    return { gained: after - before, healed: Math.max(0, healed), flipped: checkFlip(p) };
  }
  function reduceDial(p, n) {
    const before = dialOf(p);
    p.sunDial = Math.max(0, before - n);
    return { reduced: before - p.sunDial, flipped: checkFlip(p) };
  }
  function setDialTo5(p) {
    p.sunDial = SUN_DIAL_MAX;
    return { flipped: checkFlip(p) };
  }
  function flipDial(p) {
    p.sunDialDawn = !isDawn(p);
    checkFlip(p);
  }
  function gainChargedGem(p) {
    const before = p.tokens.chargedGem ?? 0;
    p.tokens.chargedGem = Math.min(1, before + 1);
    return p.tokens.chargedGem - before;
  }
  function inflictSunMarked(target) {
    const before = target.tokens.sunMarked ?? 0;
    target.tokens.sunMarked = Math.min(1, before + 1);
    return target.tokens.sunMarked - before;
  }
  function spendChargedGem(p, rng) {
    p.tokens.chargedGem = 0;
    const face = Math.floor(rng() * 6) + 1;
    return { face, cp: face <= 2 || face >= 5 ? 1 : 0, damage: face >= 3 ? 2 : 0 };
  }
  function scorchingBonus(rng, upgraded) {
    const n = upgraded ? 2 : 1;
    const dice = [];
    for (let i = 0; i < n; i++) dice.push(Math.floor(rng() * 6) + 1);
    const a = dice.filter((d) => d <= 3).length;
    const b = dice.filter((d) => d === 4 || d === 5).length;
    const c = dice.filter((d) => d === 6).length;
    return {
      dice,
      addDmg: 2 * a,
      // I : « On B » = une fois, +2 ; II : « for each B » = +1 par B (textes vérifiés)
      dialFromB: upgraded ? b : b >= 1 ? 2 : 0,
      gemOnC: c >= 1
      // « On C » = une fois (gem stack 1 de toute façon) — Dial +2 avec
    };
  }
  function harnessEffects(dice, upgraded) {
    const a = dice.filter((d) => d <= 3).length;
    const b = dice.filter((d) => d === 4 || d === 5).length;
    const c = dice.filter((d) => d === 6).length;
    if (!upgraded) {
      return { heal: a, dialGain: (b >= 2 ? 1 : 0) + (c >= 1 ? 1 : 0), gem: false };
    }
    return { heal: a, dialGain: (b >= 1 ? 1 : 0) + c, gem: a >= 1 && b >= 1 && c >= 1 };
  }

  // src/sim/turn.ts
  function log(state, playerIdx, phase, message) {
    state.log.push({ turn: state.turnNumber, playerIdx, phase, message });
  }
  function responseRiskFor(opponent) {
    const hand = opponent.hand.length, deck = opponent.deck.length;
    if (hand === 0) return 0;
    const pInHand = hand / Math.max(1, hand + deck);
    const RESP = [
      ["not-this-time", 1, 4.5],
      ["spirited-reprisal", 1, 3],
      ["recoil", 0, 3],
      ["sun-shield", 1, 2.5],
      ["indomitable-will", 2, 2.5],
      ["invulnerability", 2, 4]
    ];
    let risk = 0;
    for (const [id, cost, prev] of RESP) {
      if (opponent.cp < cost) continue;
      if (opponent.discard.includes(id)) continue;
      if (id === "spirited-reprisal" && (opponent.tokens.head ?? 0) <= 0) continue;
      if (id === "invulnerability" && (opponent.tokens.electrokinesis ?? 0) < 2) continue;
      if (!cardById(heroTemplateFor(opponent.heroId), id)) continue;
      risk += pInHand * prev;
    }
    return Math.min(risk, 5) * 0.8;
  }
  function defenseTaxFor(opponent) {
    return baseDefenseTaxFor(opponent) + responseRiskFor(opponent);
  }
  function baseDefenseTaxFor(opponent) {
    if (opponent.heroId === "se") {
      return 1.5;
    }
    if (opponent.heroId === "du") {
      const counter = opponent.upgradesInPlay.includes("retreat-ii") ? 2 : 0.75;
      const pos = footworkPos(opponent);
      const posGain = opponent.footworkBonusUsedThisTurn ? 0 : pos <= 0 ? 3 : pos === 1 ? 1 : 0.5;
      return counter + posGain;
    }
    if (opponent.heroId === "py") {
      return opponent.upgradesInPlay.includes("molten-armor-iii") ? 2.5 + 5 / 6 : 2.5;
    }
    if (opponent.heroId === "sm") {
      return 1.5;
    }
    if (opponent.heroId === "bw") {
      return opponent.upgradesInPlay.includes("sabotage-ii") ? 2.67 : 2;
    }
    if (opponent.heroId === "th") {
      return opponent.upgradesInPlay.includes("thunder-wheel-ii") ? 2.7 : 2;
    }
    if (opponent.heroId === "dr") {
      if (formOf(opponent) === "bear") return 2 + 2;
      return (opponent.tokens.shapeShift ?? 0) > 0 ? 3.5 : 1;
    }
    if (opponent.heroId === "rv") {
      return 2 * 0.8125 + 2 * 0.539;
    }
    if (opponent.heroId === "nx") {
      return 3;
    }
    if (opponent.heroId === "hh") {
      const dice = Math.min(1 + opponent.tokens.dreadful, 5);
      const PREV = [0, 0, 0.11, 0.26, 0.42, 0.58];
      return 0.5 * dice + PREV[dice];
    }
    const HELM = [0, 1, 2, 3], SHIELD = [0, 1, 2, 2];
    return (HELM[opponent.armor.helmet] + SHIELD[opponent.armor.shield]) * 1.33;
  }
  function wildcardFlagsFor(p) {
    return {
      sixIt: p.hand.includes("six-it") && p.cp >= 1,
      soWild: p.hand.includes("so-wild") && p.cp >= 2,
      twiceAsWild: p.hand.includes("twice-as-wild") && p.cp >= 3,
      samesies: p.hand.includes("samesies") && p.cp >= 1,
      tipIt: p.hand.includes("tip-it") && p.cp >= 1
    };
  }
  function oracleStateFor(player, opponent) {
    if (player.heroId === "se") {
      return {
        sunDial: dialOf(player),
        dawn: isDawn(player),
        gemHeld: (player.tokens.chargedGem ?? 0) > 0,
        oppMarked: (opponent.tokens.sunMarked ?? 0) > 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "du") {
      return {
        footwork: footworkPos(player),
        guardBreak: player.tokens.guardBreak ?? 0,
        oppDisarmed: (opponent.tokens.disarm ?? 0) > 0,
        bonusAvailable: player.footworkBonusUsedThisTurn !== true,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player),
        quickFootwork: player.hand.includes("quick-footwork") && player.cp >= 1
      };
    }
    if (player.heroId === "py") {
      return {
        fireMastery: player.tokens.fireMastery ?? 0,
        fmCap: fmCap(player),
        oppBurned: (opponent.tokens.burn ?? 0) > 0,
        oppKnocked: (opponent.tokens.knockdown ?? 0) > 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "sm") {
      return {
        comboHeld: (player.tokens.combo ?? 0) > 0,
        invisHeld: (player.tokens.invisibility ?? 0) > 0,
        oppWebbed: (opponent.tokens.webbed ?? 0) > 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "dr") {
      return {
        form: formOf(player),
        shapeShift: player.tokens.shapeShift ?? 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "th") {
      return {
        mjolnirHome: mjolnirHome(player),
        // EK EXACT (0-4). L'ancien bucketing floor-even (1->0, 3->2) — hérité du fix « boost
        // fantôme » de Math.round — faisait sous-évaluer Odinforce/Bottled Lightning d'1 dmg
        // un tour sur deux (audit Thor, user 2026-07-09 « il n'est pas supposé être aussi
        // faible »). 5 états au lieu de 3 : coût de cache négligeable.
        electrokinesis: Math.min(4, player.tokens.electrokinesis ?? 0),
        guardBreak: player.tokens.guardBreak ?? 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player),
        heIsWorthy: player.hand.includes("he-is-worthy") && player.cp >= 1
      };
    }
    if (player.heroId === "rv") {
      return {
        feathers: player.tokens.feather,
        nevermoreOnOpponent: (opponent.tokens.nevermore ?? 0) > 0,
        hexed: (player.tokens.hex ?? 0) > 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "hh") {
      const t = player.tokens;
      return {
        dreadful: t.dreadful,
        hasHead: t.head > 0,
        upgradeIds: player.upgradesInPlay,
        defenseTax: defenseTaxFor(opponent),
        grimPursuit: t.grimPursuit,
        // L'IA PLANIFIE aussi ses gardes autour de ses cartes de conversion (user-caught :
        // elle réparait après coup mais ne chassait jamais). Le suivi-de-plan est assuré par
        // le scoring-par-replay de ses fenêtres : jouer la carte qui complète l'Ultimate gagne
        // ~14 PV au replay, largement au-dessus de son bruit de décision.
        wildcards: wildcardFlagsFor(player)
      };
    }
    if (player.heroId === "fm") {
      return { armorCount: armorCount(player), upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player) };
    }
    return { upgrades: player.upgradesInPlay.length, tbOnOpp: opponent.timeBombs.length, upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player) };
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
      let final = pa.remaining;
      const halv = pa.halvings ?? 0;
      if (halv > 0 && pa.remaining > 0) {
        const per = Math.ceil(pa.remaining / 2);
        final = Math.max(0, pa.remaining - halv * per);
        log(state, pa.defenderIdx, "defense", `Final total: subtotal ${pa.remaining}, ${halv} halving(s) of ${per} -> ${final}`);
      }
      queueDamage(state, pa.defenderIdx, final);
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
    self.minesDrawUsedThisTurn = false;
    self.thrownThisTurn = 0;
    self.ekDrawUsedThisTurn = false;
    self.comboSpentThisTurn = false;
    self.smAttackedThisPhase = false;
    self.swingEscapeArmed = false;
    self.smInvisDefendArmed = false;
    self.smInvisRerollArmed = false;
    state.players[0].footworkBonusUsedThisTurn = false;
    state.players[1].footworkBonusUsedThisTurn = false;
    if ((self.tokens.disarm ?? 0) > 0) {
      self.tokens.disarm = 0;
      const heroTD = heroTemplateFor(self.heroId);
      const humanChoice = self.humanControlled ? self.duDisarmChoice : void 0;
      self.duDisarmChoice = void 0;
      const chosen = humanChoice && humanChoice !== "skip" ? humanChoice : policy.chooseDiscardForRoar?.(state, playerIdx, self.hand.slice());
      const pick = humanChoice === "skip" || self.hand.length === 0 ? void 0 : chosen && self.hand.includes(chosen) ? chosen : self.hand.slice().sort((x, y) => (cardById(heroTD, x)?.cpCost ?? 0) - (cardById(heroTD, y)?.cpCost ?? 0))[0];
      if (pick !== void 0) {
        self.hand.splice(self.hand.indexOf(pick), 1);
        self.discard.push(pick);
        log(state, playerIdx, "upkeep", `Disarm: discarded ${pick}, token removed`);
      } else {
        self.skipIncomeThisTurn = true;
        log(state, playerIdx, "upkeep", "Disarm: no card to discard \u2014 Income Phase will be skipped, token removed");
      }
    }
    if (self.heroId === "du") {
      const legal = repositionLegalDirections(self);
      let dir = "forward";
      let steps = 1;
      const pref = self.humanControlled ? self.duRepositionDir : void 0;
      if (pref) {
        dir = pref.startsWith("forward") ? "forward" : "backward";
        steps = pref === "forward2" || pref === "backward2" ? 2 : 1;
      } else if ((self.tokens.guardBreak ?? 0) < GB_CAP && legal.includes("backward")) {
        dir = "backward";
        steps = 1;
      } else if (legal.includes("forward")) {
        dir = "forward";
        steps = Math.min(2, FOOTWORK_MAX - footworkPos(self));
      } else {
        dir = "backward";
        steps = 1;
      }
      if (!legal.includes(dir)) dir = legal[0];
      const r = applyReposition(self, dir, steps);
      log(state, playerIdx, "upkeep", `Reposition: ${Math.abs(r.moved)} step(s) ${dir} (position ${footworkPos(self)})${r.gbGained > 0 ? ", +1 Guard Break" : ""}`);
    }
    if (self.heroId === "se" && !isDawn(self)) {
      const r = increaseDial(self, 1);
      log(state, playerIdx, "upkeep", `Sun Dial (DUSK): +1 (now ${dialOf(self)})${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""}`);
    }
    if ((self.tokens.burn ?? 0) > 0) {
      self.hp -= BURN_UPKEEP_DMG;
      log(state, playerIdx, "upkeep", `Burn: received ${BURN_UPKEEP_DMG} dmg (persistent)`);
      if (checkGameOver(state)) return;
    }
    if ((self.tokens.fireMastery ?? 0) > 0 && coolOff(self)) {
      log(state, playerIdx, "upkeep", `Fire Mastery cool off: -1 (now ${self.tokens.fireMastery})`);
    }
    if ((self.tokens.regen2 ?? 0) > 0 || (self.tokens.regen1 ?? 0) > 0 || (self.tokens.wound ?? 0) > 0) {
      const rw = upkeepRegenAndWound(self, rng);
      if (rw.healed > 0) log(state, playerIdx, "upkeep", `Regenerate: healed ${rw.healed}`);
      if (rw.woundDamage > 0) log(state, playerIdx, "upkeep", `Wound: ${rw.woundDamage} dmg, rolls [${rw.woundRolls.join(",")}], ${rw.woundsRemoved} removed`);
      if (checkGameOver(state)) return;
    }
    if (self.heroId !== "rv" && (self.tokens.nevermore ?? 0) > 0 && opp.heroId === "rv" && !state.nevermoreRollResolved) {
      let face = rollDie(rng);
      if (face === 6 && (opp.nevermoreDial ?? 0) > 0) {
        if ((opp.tokens.feather ?? 0) >= 2) {
          opp.tokens.feather -= 2;
          face = 5;
          log(state, 1 - playerIdx, "upkeep", "Feathers x2 spent: Nevermore Die shifted 6 -> 5");
        } else if ((opp.tokens.feather ?? 0) >= 1) {
          opp.tokens.feather -= 1;
          face = rollDie(rng);
          log(state, 1 - playerIdx, "upkeep", `Feather spent: Nevermore Die re-rolled -> ${face}`);
        }
      }
      const r = applyNevermoreDieFace(opp, self, face);
      log(state, playerIdx, "upkeep", `Nevermore Die Roll: ${face}` + (r.hexInflicted ? " \u2014 gains Hex (6s are blanks this turn)" : r.activations ? ` \u2014 Raveness activates Nevermore x${r.activations}` : r.discards ? " \u2014 must discard 1 of choice" : r.cpStolen !== void 0 ? ` \u2014 loses ${r.cpStolen} CP to the Raveness` : " \u2014 dial to 0, Nevermore returns (no heal)"));
      if (r.activations) performNevermoreActivations(state, 1 - playerIdx, r.activations, rng, void 0);
      if (r.discards && self.hand.length) {
        const heroT2 = heroTemplateFor(self.heroId);
        const chosen = policy.chooseDiscardForRoar?.(state, playerIdx, self.hand.slice());
        const pick = chosen && self.hand.includes(chosen) ? chosen : self.hand.slice().sort((x, y) => (cardById(heroT2, x)?.cpCost ?? 0) - (cardById(heroT2, y)?.cpCost ?? 0))[0];
        self.hand.splice(self.hand.indexOf(pick), 1);
        self.discard.push(pick);
        log(state, playerIdx, "upkeep", `Nevermore: discarded ${pick}`);
      }
      if (checkGameOver(state)) return;
    }
    if (state.nevermoreRollResolved) state.nevermoreRollResolved = false;
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
    if (self.heroId === "fm") {
      const top3 = minePeek(self);
      const choice = policy.chooseFmMine?.(state, playerIdx, top3);
      if (choice?.kind === "skip") {
        log(state, playerIdx, "upkeep", "The Mines: chose not to mine");
      } else {
        const r = choice?.kind === "cp" ? mineResolve(self, []) : choice?.kind === "reveal" ? mineResolve(self, [choice.oreId]) : mine(self);
        log(state, playerIdx, "upkeep", `The Mines: mined \u2014 ${r.revealed.length ? `revealed ${r.revealed.join(",")} to The Forge` : `no reveal, +${r.cpGained} CP`}`);
      }
    }
    const tb = tickTimeBombsUpkeep(self, rng);
    if (tb.rolls.length > 0) {
      log(state, playerIdx, "upkeep", `Time Bomb upkeep: rolls [${tb.rolls.join(",")}], ${tb.selfDamage} self-dmg, ${tb.defused} defused`);
    }
  }
  function playIncomePhase(state, playerIdx, rng) {
    const bossMode = state.players.some((p) => p.heroId === "nx");
    if (!bossMode && playerIdx === 0 && state.turnNumber === 1) {
      log(state, playerIdx, "income", "Start Player skips their first Income Phase");
      return;
    }
    const self = state.players[playerIdx];
    if (self.skipIncomeThisTurn) {
      self.skipIncomeThisTurn = false;
      log(state, playerIdx, "income", "Income Phase skipped (Disarm)");
      return;
    }
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
    if (card.kind === "upgrade") playUpgradeCard(state, playerIdx, phase, card, hero, rng);
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
  function rrtIIDrawOnUpgrade(state, playerIdx, playedCardId, rng) {
    const self = state.players[playerIdx];
    if (playedCardId === "red-room-training-ii") return;
    if (!self.upgradesInPlay.includes("red-room-training-ii")) return;
    drawCards(self, 1, rng);
    log(state, playerIdx, "main1", "Red Room Training II: drew 1 (upgrade played)");
  }
  function playUpgradeCard(state, playerIdx, phase, card, hero, rng) {
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
    rrtIIDrawOnUpgrade(state, playerIdx, card.id, rng);
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
    if (card.id === "nevermore-attack") {
      performNevermoreActivations(state, playerIdx, 1, rng, void 0);
      const holderIdx = nevermoreHolder(state);
      const holder = state.players[holderIdx];
      const mode = holderIdx === playerIdx ? "heal" : "damage";
      if (mode === "heal") {
        holder.hp = Math.min(holder.hp + 2, 60);
        log(state, playerIdx, phase, `Nevermore Attack!: ${holderIdx === playerIdx ? "self" : "opponent"} heals 2`);
      } else {
        holder.hp -= 2;
        log(state, playerIdx, phase, "Nevermore Attack!: holder receives 2 dmg");
        checkGameOver(state);
      }
      return;
    }
    if (card.id === "midnight-dreary") {
      const rolls5 = rollDice(5, rng);
      const wings5 = rolls5.filter((d) => d >= 4 && d <= 5).length;
      const eyes5 = rolls5.filter((d) => d === 6).length;
      const gained5 = grantFeathers(self, wings5);
      log(state, playerIdx, phase, `Midnight Dreary!: rolled [${rolls5.join(",")}] \u2014 +${gained5} Feather${eyes5 > 0 ? ", Raven Eye -> Activate Nevermore" : ""}`);
      if (eyes5 > 0) performNevermoreActivations(state, playerIdx, 1, rng, void 0);
      return;
    }
    if (card.id === "broken-stillness") {
      log(state, playerIdx, phase, "Broken Stillness!: Activate Nevermore");
      performNevermoreActivations(state, playerIdx, 1, rng, void 0);
      return;
    }
    if (card.id === "power-trip") {
      drawCards(self, 1, rng);
      gainEk(self, 2);
      log(state, playerIdx, phase, "Power Trip!: drew 1, +2 EK");
      return;
    }
    if (card.id === "time-to-hammer") {
      if (self.mjolnirAway === true) {
        const r = shuttleOnce(self);
        grantCp(self, 1);
        gainEk(self, 1);
        log(state, playerIdx, phase, `Time to Hammer!: Retrieve Mjolnir, +1 CP, +${1 + r.ekGained} EK`);
      }
      return;
    }
    if (card.id === "stormbreak") {
      drawCards(self, 1, rng);
      grantCp(self, 1);
      gainGb(self, 1);
      gainEk(self, 1);
      log(state, playerIdx, phase, "Stormbreak!: drew 1, +1 CP, +1 Guard Break, +1 EK");
      return;
    }
    if (card.id === "hibernate") {
      if (formOf(self) !== "bear") {
        self.form = "bear";
      }
      grantRegen2(self, 1);
      log(state, playerIdx, phase, "Hibernate!: Bear Form, +Regenerate (2)");
      return;
    }
    if (card.id === "ready-to-pounce") {
      if (formOf(self) !== "cat") {
        self.form = "cat";
      }
      opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1);
      log(state, playerIdx, phase, "Ready to Pounce!: Cat Form, Wound inflicted");
      return;
    }
    if (card.id === "natures-rest") {
      if (formOf(self) !== "druid") {
        self.form = "druid";
      }
      drawCards(self, 1, rng);
      log(state, playerIdx, phase, "Nature's Rest!: Druid Form, drew 1");
      return;
    }
    if (card.id === "quick-morph") {
      const g = grantShapeShift(self, 1);
      log(state, playerIdx, phase, `Quick Morph!: +${g} Shape Shift`);
      return;
    }
    if (card.id === "natures-cycle") {
      if ((self.tokens.regen1 ?? 0) > 0) {
        self.tokens.regen1 -= 1;
        self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1;
      }
      log(state, playerIdx, phase, "Nature's Cycle!: flipped a Regenerate (1) to (2)");
      return;
    }
    if (card.id === "fey-lure") {
      grantRegen2(self, 1);
      log(state, playerIdx, phase, "Fey Lure!: +Regenerate (2)");
      return;
    }
    if (card.id === "strength-of-the-woods") {
      if (formOf(self) !== "druid") {
        log(state, playerIdx, phase, "Strength of the Woods!: no effect (not in Druid Form)");
        return;
      }
      const sw = rollDie(rng);
      if (sw <= 3) {
        opp.hp -= 2;
        log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> 2 dmg`);
        checkGameOver(state);
      } else if (sw <= 5) {
        const g = grantShapeShift(self, 1);
        log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> +${g} Shape Shift`);
      } else {
        self.hp = Math.min(self.hp + 3, 60);
        log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> Heal 3`);
      }
      return;
    }
    if (card.id === "yikes") {
      const g = gainInvisibility(self);
      log(state, playerIdx, phase, `Yikes!: ${g ? "gained Invisibility" : "Invisibility already held (stack 1)"}`);
      return;
    }
    if (card.id === "radioactive-blood") {
      const g = gainCombo(self);
      log(state, playerIdx, phase, `Radioactive Blood!: ${g ? "gained Combo" : "Combo already held (stack 1)"}`);
      return;
    }
    if (card.id === "web-shooters") {
      const r = inflictWebbed(opp);
      if (r.gained) {
        queueDamage(state, 1 - playerIdx, r.isoDamage);
        flushDamage(state);
        log(state, playerIdx, phase, "Web Shooters!: Webbed inflicted (2 isolated undefendable dmg)");
        checkGameOver(state);
      } else log(state, playerIdx, phase, "Web Shooters!: opponent already Webbed (stack 1) \u2014 no effect");
      return;
    }
    if (card.id === "booyah") {
      const by = rollDie(rng);
      if (by <= 3) {
        const g = gainInvisibility(self);
        log(state, playerIdx, phase, `Booyah!: rolled ${by} (Thwip) -> ${g ? "gained Invisibility" : "Invisibility already held"}`);
      } else if (by <= 5) {
        const r = inflictWebbed(opp);
        if (r.gained) {
          queueDamage(state, 1 - playerIdx, r.isoDamage);
          flushDamage(state);
          log(state, playerIdx, phase, `Booyah!: rolled ${by} (Web) -> Webbed inflicted (2 iso dmg)`);
          checkGameOver(state);
        } else log(state, playerIdx, phase, `Booyah!: rolled ${by} (Web) -> opponent already Webbed`);
      } else {
        const g = gainCombo(self);
        log(state, playerIdx, phase, `Booyah!: rolled ${by} (Spider) -> ${g ? "gained Combo" : "Combo already held"}`);
      }
      return;
    }
    if (card.id === "milkshake-me") {
      self.hp = Math.min(self.hp + 3, 60);
      log(state, playerIdx, phase, "Milkshake Me!: healed 3");
      return;
    }
    if (card.id === "cha-ching") {
      grantCp(self, 2);
      log(state, playerIdx, phase, "Cha-Ching!: +2 CP");
      return;
    }
    if (card.id === "sashay") {
      const back = self.humanControlled ? self.duSashayHeal === true : self.hp <= 35;
      if (back) {
        const moved = takeSteps(self, -1);
        self.hp = Math.min(self.hp + 2, 60);
        log(state, playerIdx, phase, `Sashay: ${Math.abs(moved)} step backward (position ${footworkPos(self)}), healed 2`);
      } else {
        const moved = takeSteps(self, 1);
        opp.hp -= 2;
        log(state, playerIdx, phase, `Sashay: ${moved} step forward (position ${footworkPos(self)}), 2 dmg`);
        checkGameOver(state);
      }
      return;
    }
    if (card.id === "courageous-advance") {
      const moved = takeSteps(self, 2);
      log(state, playerIdx, phase, `Courageous Advance!: ${moved} step(s) forward (position ${footworkPos(self)})`);
      return;
    }
    if (card.id === "all-in-the-wrists") {
      const g = inflictDisarm(opp);
      log(state, playerIdx, phase, `All in the Wrists: ${g > 0 ? "Disarm inflicted" : "opponent already Disarmed (stack 1)"}`);
      return;
    }
    if (card.id === "confident-footing") {
      if (footworkPos(self) === 0) {
        const g = gainGb(self, 2);
        log(state, playerIdx, phase, `Confident Footing: +${g} Guard Break (Neutral)`);
      } else {
        log(state, playerIdx, phase, "Confident Footing: no effect (not on Neutral)");
      }
      return;
    }
    if (card.id === "clouds-parting") {
      const cp6 = rollDie(rng);
      const inc = Math.ceil(cp6 / 2);
      const r = increaseDial(self, inc);
      log(state, playerIdx, phase, `Clouds Parting!: rolled ${cp6} -> Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal)` : ""}${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""}`);
      return;
    }
    if (card.id === "solstice") {
      const heal = self.humanControlled ? self.seSolsticeHeal === true : self.hp <= 35;
      if (heal) {
        self.hp = Math.min(60, self.hp + 2);
        log(state, playerIdx, phase, "Solstice!: healed 2");
      } else {
        opp.hp -= 2;
        log(state, playerIdx, phase, "Solstice!: 2 dmg to opponent");
        checkGameOver(state);
      }
      return;
    }
    if (card.id === "here-comes-the-sun") {
      if (isDawn(self)) {
        log(state, playerIdx, phase, "Here Comes the Sun!: no effect (DAWN side)");
        return;
      }
      const r = increaseDial(self, 2);
      log(state, playerIdx, phase, `Here Comes the Sun!: Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal)` : ""}${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""}`);
      return;
    }
    if (card.id === "it-gives-life") {
      const before = dialOf(self);
      if (before < 1) {
        log(state, playerIdx, phase, "It Gives Life!: no effect (Sun Dial at 0)");
        return;
      }
      const r = reduceDial(self, before);
      const healed = Math.min(5, r.reduced);
      self.hp = Math.min(60, self.hp + healed);
      log(state, playerIdx, phase, `It Gives Life!: Sun Dial -${r.reduced} -> healed ${healed}${r.flipped === "dusk" ? " \u2014 FLIPS to DUSK" : ""}`);
      return;
    }
    if (card.id === "the-suns-blessing") {
      const sb = rollDie(rng);
      if (sb <= 3) {
        const g = gainChargedGem(self);
        log(state, playerIdx, phase, `The Sun's Blessing!: rolled ${sb} (Stave) -> ${g ? "gained Charged Gem" : "Charged Gem already held"}`);
      } else if (sb <= 5) {
        drawCards(self, 2, rng);
        log(state, playerIdx, phase, `The Sun's Blessing!: rolled ${sb} (Charge) -> drew 2`);
      } else {
        const r = setDialTo5(self);
        log(state, playerIdx, phase, `The Sun's Blessing!: rolled 6 (Sun Power) -> Sun Dial set to 5${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""}`);
      }
      return;
    }
    if (card.id === "first-light") {
      if (dialOf(self) !== 0) {
        log(state, playerIdx, phase, "First Light!: no effect (Sun Dial not at 0)");
        return;
      }
      const r = increaseDial(self, 2);
      const g = inflictSunMarked(opp);
      log(state, playerIdx, phase, `First Light!: Sun Dial +${r.gained}, ${g ? "Sun Marked inflicted" : "opponent already Sun Marked"}`);
      return;
    }
    if (card.id === "the-glorious-sun") {
      flipDial(self);
      log(state, playerIdx, phase, `The Glorious Sun!: Sun Dial flipped -> ${isDawn(self) ? "DAWN" : "DUSK"} (${dialOf(self)})`);
      return;
    }
    if (card.id === "warm-up") {
      const g1 = gainFm(self, 1);
      const room = fmCap(self) - (self.tokens.fireMastery ?? 0);
      const want = self.humanControlled ? Math.max(0, Math.min(self.warmUpCpChoice ?? 0, self.cp)) : Math.min(self.cp, room);
      const spend = Math.min(want, self.cp);
      self.cp -= spend;
      const g2 = spend > 0 ? gainFm(self, spend) : 0;
      self.warmUpCpChoice = void 0;
      log(state, playerIdx, phase, `Warm Up!: +${g1 + g2} Fire Mastery (${spend} CP spent)`);
      return;
    }
    if (card.id === "fire-up") {
      self.fmCapBonus = (self.fmCapBonus ?? 0) + 1;
      const g = gainFm(self, 2);
      log(state, playerIdx, phase, `Fire Up!: Fire Mastery stack limit +1 (now ${fmCap(self)}), +${g} Fire Mastery`);
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
      log(state, playerIdx, "roll", `Roll (relances restantes ${step.rollsRemaining}): [${step.dice.join(",")}]`);
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
  var ROLL_MANIPULATION_CARD_IDS = ["one-more-time", "try-try-again", "six-it", "so-wild", "twice-as-wild", "samesies", "he-is-worthy", "quick-footwork", "radiant-exchange"];
  function eligibleRollManipulationCardIds(self) {
    const hero = heroTemplateFor(self.heroId);
    return ROLL_MANIPULATION_CARD_IDS.filter((id) => {
      if (!self.hand.includes(id) || self.cp < (cardById(hero, id)?.cpCost ?? 0)) return false;
      if (id === "radiant-exchange") return self.heroId === "se" && (self.sunDial ?? 0) >= 1;
      return true;
    });
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
    if (choice.cardId === "radiant-exchange") {
      const r = reduceDial(self, dialOf(self));
      log(state, playerIdx, "roll", `Radiant Exchange!: Sun Dial -${r.reduced}${r.flipped === "dusk" ? " \u2014 FLIPS to DUSK" : ""}`);
    }
    const values = choice.values ?? [];
    indices.forEach((i, k) => {
      newDice[i] = values[k];
    });
    log(state, playerIdx, "roll", `${card.name}: set ${indices.length} dice to [${values.join(",")}]`);
    return { dice: newDice, extraRollsGranted: 0 };
  }
  function playMainPhase(state, playerIdx, phase, policies, rng) {
    {
      const self2 = state.players[playerIdx];
      if (!self2.humanControlled && !self2.ekDrawUsedThisTurn && (self2.tokens.electrokinesis ?? 0) >= 4 && self2.hand.length <= 2) {
        self2.tokens.electrokinesis -= 4;
        self2.ekDrawUsedThisTurn = true;
        drawCards(self2, 1, rng);
        log(state, playerIdx, phase, "Electrokinesis x4 spent: drew 1");
      }
      if (!self2.humanControlled && (self2.tokens.chargedGem ?? 0) > 0 && phase === "main1") {
        const opp2 = state.players[1 - playerIdx];
        const r = spendChargedGem(self2, rng);
        if (r.cp > 0) grantCp(self2, r.cp);
        if (r.damage > 0) {
          opp2.hp -= r.damage;
          checkGameOver(state);
        }
        log(state, playerIdx, phase, `Charged Gem: rolled ${r.face} -> ${[r.cp ? "+1 CP" : "", r.damage ? `${r.damage} isolated undefendable dmg` : ""].filter(Boolean).join(" + ")}`);
      }
    }
    const oppIdx = 1 - playerIdx;
    const self = state.players[playerIdx];
    if (self.heroId === "fm") {
      const ores = self.hand.filter(isOre);
      if (ores.length) {
        self.hand = self.hand.filter((id) => !isOre(id));
        self.forge.push(...ores);
        log(state, playerIdx, phase, `The Forge: placed ${ores.join(",")} from hand`);
      }
      for (let c = craftOnce(self); c; c = craftOnce(self)) {
        log(state, playerIdx, phase, `Crafted ${c.armorId} (tier ${c.tier} ${c.slot})`);
      }
    }
    resolveResponseWindow(state, [playerIdx, oppIdx], { windowType: "mainPhase", phase }, rng, policies, enumerateWindowActions, applyWindowAction);
  }
  var INSTANT_SELFBUFF_IDS = ["getting-paid", "double-up", "triple-up", "dark-surprise", "assemble", "broken-stillness", "quick-morph", "power-trip", "time-to-hammer", "stormbreak", "yikes", "radioactive-blood", "here-comes-the-sun"];
  function instantEligible(state, playerIdx, id) {
    const self = state.players[playerIdx];
    if (id === "time-to-hammer") return self.mjolnirAway === true;
    if (id === "stormbreak") return (self.thrownThisTurn ?? 0) >= 2;
    if (id === "yikes") return (self.tokens.invisibility ?? 0) < 1;
    if (id === "radioactive-blood") return (self.tokens.combo ?? 0) < 1;
    if (id === "here-comes-the-sun") return self.sunDialDawn !== true;
    return true;
  }
  var MAIN_PHASE_ACTION_IDS = ["dancing-pumpkin", "vegas-baby", "undercover-mission", "cunning", "nevermore-attack", "midnight-dreary", "hibernate", "ready-to-pounce", "natures-rest", "natures-cycle", "fey-lure", "strength-of-the-woods", "web-shooters", "booyah", "milkshake-me", "cha-ching", "warm-up", "fire-up", "sashay", "courageous-advance", "all-in-the-wrists", "confident-footing", "clouds-parting", "solstice", "it-gives-life", "the-suns-blessing", "first-light", "the-glorious-sun"];
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
      dice.forEach((cur, i) => {
        for (const v of values) if (v !== cur) options.push({ kind: "setDie", cardId: "so-wild", sets: [{ dieIndex: i, value: v }] });
      });
    }
    if (canAfford("twice-as-wild")) {
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          for (const vi of values) for (const vj of values) {
            if (vi === dice[i] && vj === dice[j]) continue;
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
    for (const id of INSTANT_SELFBUFF_IDS) if (canAfford(id) && instantEligible(state, playerIdx, id)) options.push({ kind: "playInstant", cardId: id });
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
          {
            options.push({ kind: "covertOpsSearch" });
          }
        }
        for (const id of MAIN_PHASE_ACTION_IDS) if (canAfford(id)) options.push({ kind: "playInstant", cardId: id });
        for (const cardId of player.hand) options.push({ kind: "sellCard", cardId });
        if (player.heroId === "th" && player.hand.length > 0) {
          options.push({ kind: "mjolnirShuttle" });
        }
        if (player.heroId === "fm") {
          const seen = /* @__PURE__ */ new Set();
          for (const oreId of player.forge) {
            if (seen.has(oreId)) continue;
            if (player.forge.filter((o) => o === oreId).length < 3) continue;
            seen.add(oreId);
            if (oreId === "gold-ore") {
              options.push({ kind: "scrapOre", oreId, choice: "cp" });
              options.push({ kind: "scrapOre", oreId, choice: "heal" });
            } else if (oreId === "diamond-ore") options.push({ kind: "scrapOre", oreId, choice: "cp" });
            else if (oreId === "ultimanium-ore") options.push({ kind: "scrapOre", oreId, choice: "draw2" });
          }
        }
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
        if (playerIdx === pr.rollerIdx) {
          if (canAfford("he-is-worthy")) {
            pr.dice.forEach((v, i) => {
              for (const val of [4, 5]) if (v !== val) options.push({ kind: "setDie", cardId: "he-is-worthy", sets: [{ dieIndex: i, value: val }] });
            });
          }
          if (canAfford("quick-footwork")) {
            pr.dice.forEach((v, i) => {
              for (const val of [4, 5]) if (v !== val) options.push({ kind: "setDie", cardId: "quick-footwork", sets: [{ dieIndex: i, value: val }] });
            });
          }
          if (canAfford("six-it")) {
            pr.dice.forEach((v, i) => {
              if (v !== 6) options.push({ kind: "setDie", cardId: "six-it", sets: [{ dieIndex: i, value: 6 }] });
            });
          }
          if (canAfford("radiant-exchange") && player.heroId === "se" && (player.sunDial ?? 0) >= 1) {
            pr.dice.forEach((v, i) => {
              if (v !== 6) options.push({ kind: "setDie", cardId: "radiant-exchange", sets: [{ dieIndex: i, value: 6 }] });
            });
          }
          if (canAfford("samesies")) {
            const seen = /* @__PURE__ */ new Set();
            for (let i = 0; i < pr.dice.length; i++) {
              for (let j = 0; j < pr.dice.length; j++) {
                if (i === j || pr.dice[i] === pr.dice[j]) continue;
                const key = `${i}:${pr.dice[j]}`;
                if (seen.has(key)) continue;
                seen.add(key);
                options.push({ kind: "setDie", cardId: "samesies", sets: [{ dieIndex: i, value: pr.dice[j] }] });
              }
            }
          }
          if (canAfford("try-try-again")) {
            pr.dice.forEach((_, i) => options.push({ kind: "rerollDie", cardId: "try-try-again", dieIndex: i }));
          }
        }
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
    if (action.kind === "scrapOre") {
      const self = state.players[playerIdx];
      const a = action;
      const i = self.forge.indexOf(a.oreId);
      if (i < 0) return;
      if (a.choice === "heal") self.hp = Math.min(self.hp + 1, 60);
      else if (a.choice === "cp") grantCp(self, 1);
      else drawCards(self, 2, rng);
      self.forge.splice(i, 1);
      self.discard.push(a.oreId);
      log(state, playerIdx, ctx.phase ?? "main1", `Scrap: ${a.oreId} -> ${a.choice}`);
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
    if (action.kind === "mjolnirShuttle") {
      const self = state.players[playerIdx];
      if (self.hand.length === 0) return;
      const hero = heroTemplateFor(self.heroId);
      let pick = self.hand.find((id, i) => self.hand.indexOf(id) !== i);
      if (!pick) pick = self.hand.slice().sort((a, b) => (cardById(hero, a)?.cpCost ?? 0) - (cardById(hero, b)?.cpCost ?? 0))[0];
      self.hand.splice(self.hand.indexOf(pick), 1);
      self.discard.push(pick);
      const r = shuttleOnce(self);
      if (r.damage > 0) {
        state.players[1 - playerIdx].hp -= r.damage;
        checkGameOver(state);
      }
      log(state, playerIdx, ctx.phase ?? "main1", `Mjolnir shuttle (discarded ${pick}): ${r.action === "throw" ? "1 isolated undefendable dmg" : `+${r.ekGained} EK`}`);
      return;
    }
    if (action.kind === "covertOpsUpgrade") {
      applyCovertOpsUpgrade(state, playerIdx, action.cardId);
      rrtIIDrawOnUpgrade(state, playerIdx, action.cardId, rng);
      return;
    }
    if (action.kind === "covertOpsSearch") {
      const self = state.players[playerIdx];
      if (self.tokens.covertOps < 1 || self.covertOpsUsedThisTurn) return;
      self.tokens.covertOps -= 1;
      self.covertOpsUsedThisTurn = true;
      const hero = heroTemplateFor(self.heroId);
      const isUp = (id) => cardById(hero, id)?.kind === "upgrade";
      const top3 = self.deck.slice(0, 3);
      if (top3.some(isUp)) {
        const rest = self.deck.slice(3);
        const ups = top3.filter(isUp), others = top3.filter((id) => !isUp(id));
        self.deck = [...ups, ...others, ...rest];
        log(state, playerIdx, ctxPhaseless, `Covert Ops (b): top 3 contained ${ups.length} upgrade(s) \u2014 no search, put back with upgrade(s) ON TOP (${ups.join(",")})`);
      } else {
        const found = self.deck.find(isUp);
        if (found) {
          self.deck.splice(self.deck.indexOf(found), 1);
          self.hand.push(found);
        }
        for (let i = self.deck.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [self.deck[i], self.deck[j]] = [self.deck[j], self.deck[i]];
        }
        log(state, playerIdx, ctxPhaseless, found ? `Covert Ops (b): searched ${found} to hand, deck shuffled` : "Covert Ops (b): no upgrade left in deck, shuffled");
      }
      return;
    }
    if (action.kind === "spendGrimPursuitBonus") return;
    const pr = state.pendingRoll;
    if (!pr || !spendActionCard(state, playerIdx, action.cardId)) return;
    if (action.kind === "setDie") {
      if (action.cardId === "radiant-exchange") {
        const p2 = state.players[playerIdx];
        const r = reduceDial(p2, dialOf(p2));
        log(state, playerIdx, "roll", `Radiant Exchange!: Sun Dial -${r.reduced}${r.flipped === "dusk" ? " \u2014 FLIPS to DUSK" : ""}`);
      }
      const before = pr.dice.join(",");
      for (const s of action.sets) pr.dice[s.dieIndex] = s.value;
      const setDieName = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId)?.name ?? action.cardId;
      log(state, playerIdx, "roll", `${setDieName}: set dice ${before}->${pr.dice.join(",")}`);
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
      const rerollName = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId)?.name ?? action.cardId;
      log(state, playerIdx, "roll", `${rerollName}: rerolled die ${action.dieIndex + 1} ${old}->${pr.dice[action.dieIndex]}`);
    }
  }
  function grantTransferable(to, kind, pos) {
    if (kind === "timeBomb") {
      if (to.timeBombs.length < TIME_BOMB_STACK_CAP) to.timeBombs.push(pos ?? "0:02");
    } else if (kind === "dreadful") grantDreadful(to, 1);
    else if (kind === "grimPursuit") grantGrimPursuit(to, 1);
    else if (kind === "agility") grantAgility(to, 1);
    else if (kind === "regen2" || kind === "regen1") {
      if ((to.tokens.regen2 ?? 0) + (to.tokens.regen1 ?? 0) < 2) to.tokens[kind] = (to.tokens[kind] ?? 0) + 1;
    } else to.tokens[kind] = Math.min(TOKEN_CAPS[kind], (to.tokens[kind] ?? 0) + 1);
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
    for (const k of TRANSFERABLE_TOKENS) {
      if (k === "timeBomb") target.timeBombs = [];
      else target.tokens[k] = 0;
    }
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
    if ((defender.tokens.stun ?? 0) > 0 && incomingDamage > 0) {
      log(state, defenderIdx, "defense", "Stun: no defense possible \u2014 damage goes through");
      queueDamage(state, defenderIdx, incomingDamage);
      flushDamage(state);
      return;
    }
    if ((attacker.tokens.guardBreak ?? 0) > 0 && incomingDamage > 0) {
      const atkPolicy = policies[attackerIdx];
      const gbWanted = atkPolicy.chooseGuardBreakSpend ? atkPolicy.chooseGuardBreakSpend(state, attackerIdx, incomingDamage) : incomingDamage >= 5;
      if (gbWanted) {
        const gb = tryGuardBreak(attacker, rng);
        log(state, attackerIdx, "resolveAttack", `Guard Break: spent ${gb.spent}, rolls [${gb.rolls.join(",")}] \u2014 ${gb.success ? "attack is UNDEFENDABLE" : "failed"}`);
        if (gb.success) {
          queueAttackDamageVsArmor(state, attackerIdx, incomingDamage, false, rng, policies);
          return;
        }
      }
    }
    if ((defender.tokens.webbed ?? 0) > 0 && incomingDamage > 0) {
      defender.tokens.webbed = 0;
      log(state, defenderIdx, "defense", "Webbed: incoming attack becomes UNDEFENDABLE, token removed");
      queueAttackDamageVsArmor(state, attackerIdx, incomingDamage, false, rng, policies);
      return;
    }
    let hallowedUpgraded = false;
    let defenseDice;
    if (defender.heroId === "th") {
      defenseDice = rollDice(defender.upgradesInPlay.includes("thunder-wheel-ii") ? 4 : 3, rng);
    } else if (defender.heroId === "dr") {
      if (!defender.humanControlled && formOf(defender) !== "bear" && (defender.tokens.shapeShift ?? 0) > 0 && incomingDamage >= 5) {
        spendShapeShift(defender, "bear");
        log(state, defenderIdx, "defense", "Shape Shift -> Bear Form (defense)");
      }
      defenseDice = rollDice(thickHideDiceCount(defender), rng);
    } else if (defender.heroId === "rv") {
      defenseDice = rollDice(5, rng);
    } else if (defender.heroId === "py") {
      defenseDice = rollDice(5, rng);
    } else if (defender.heroId === "sm") {
      defender.spiderSensePrevented = false;
      const mode = defender.humanControlled && defender.smDefenseMode ? defender.smDefenseMode : chooseDefenseHeuristic(incomingDamage, (defender.tokens.invisibility ?? 0) > 0);
      defender.smDefenseActive = mode;
      if (mode === "counter") {
        defenseDice = rollDice(3, rng);
        log(state, defenderIdx, "defense", "Defensive Ability: Counterpunch (3 dice)");
      } else {
        defenseDice = rollDice(2, rng);
        log(state, defenderIdx, "defense", "Defensive Ability: Spider-Sense (2 dice)");
        if (!spiderSenseSuccess(defenseDice, false) && (defender.tokens.invisibility ?? 0) > 0 && (defender.humanControlled ? defender.smInvisRerollArmed === true : incomingDamage >= 4)) {
          defender.tokens.invisibility = 0;
          defenseDice = rollDice(2, rng);
          log(state, defenderIdx, "defense", `Spider-Sense: Invisibility spent -> additional Roll Attempt [${defenseDice.join(",")}]`);
        }
        if (!spiderSenseSuccess(defenseDice, false) && spiderSenseSuccess(defenseDice, true) && defender.hand.includes("swing-escape") && defender.cp >= 1 && (defender.humanControlled ? defender.swingEscapeArmed === true : incomingDamage >= 3)) {
          defender.cp -= 1;
          defender.hand.splice(defender.hand.indexOf("swing-escape"), 1);
          defender.discard.push("swing-escape");
          defender.smDefenseActive = "sense-swing";
          log(state, defenderIdx, "defense", "Swing Escape!: Spider-Sense succeeds on Web instead of Spider");
        }
      }
    } else if (defender.heroId === "du") {
      defenseDice = rollDice(4, rng);
    } else if (defender.heroId === "se") {
      defenseDice = rollDice(3, rng);
    } else if (defender.heroId === "nx") {
      defenseDice = [rollDie(rng)];
    } else if (defender.heroId === "fm") {
      defenseDice = [rollMasterworkDie(rng)];
    } else if (defender.heroId === "bw") {
      defenseDice = rollSabotageDice(defender, rng, policy, state, defenderIdx, defender.upgradesInPlay.includes("sabotage-ii"));
    } else {
      hallowedUpgraded = defender.upgradesInPlay.includes("hallowed-reckoning-ii");
      defenseDice = rollHallowedDice(defender, rng, hallowedUpgraded);
    }
    if (defender.hoardedDice > 0 && defenseDice.length > 1) {
      defenseDice = defenseDice.slice(0, defenseDice.length - 1);
      log(state, defenderIdx, "defense", `Hoarding: -1 defense die (${defenseDice.length} left)`);
    }
    state.pendingRoll = { rollerIdx: defenderIdx, dice: defenseDice };
    state.pendingDefenseRoll = { attackerIdx, incomingDamage };
    resolveResponseWindow(state, [attackerIdx, defenderIdx], { windowType: "defenseRoll" }, rng, policies, enumerateWindowActions, applyWindowAction);
    const finalDefenseDice = state.pendingRoll.dice;
    state.pendingRoll = null;
    state.pendingDefenseRoll = null;
    log(state, defenderIdx, "defense", `Defense dice: ${finalDefenseDice.join(",")}`);
    finalizeDefenseRoll(state, attackerIdx, incomingDamage, finalDefenseDice, rng, policies);
  }
  function finalizeDefenseRoll(state, attackerIdx, incomingDamage, finalDefenseDice, rng, policies) {
    const defenderIdx = 1 - attackerIdx;
    const attacker = state.players[attackerIdx];
    const defender = state.players[defenderIdx];
    let damagePrevented = 0;
    let halvings = 0;
    if (defender.heroId === "th") {
      const twUp = defender.upgradesInPlay.includes("thunder-wheel-ii");
      const eff = thunderWheelEffects(finalDefenseDice, twUp);
      damagePrevented = eff.prevented;
      let thrownBack = 0;
      for (let i = 0; i < eff.shuttles; i++) {
        const r = shuttleOnce(defender);
        if (r.action === "throw") thrownBack += r.damage;
      }
      if (thrownBack > 0) queueDamage(state, attackerIdx, thrownBack);
      if (eff.ekGain > 0) gainEk(defender, eff.ekGain);
      log(state, defenderIdx, "defense", `Thunder Wheel${twUp ? " II" : ""}: prevented ${eff.prevented}, ${eff.shuttles} Mjolnir move(s)${thrownBack ? ` (${thrownBack} dmg back)` : ""}, +${eff.ekGain} EK`);
    } else if (defender.heroId === "dr") {
      const bear = formOf(defender) === "bear";
      const effTH = thickHideEffects(finalDefenseDice, bear);
      damagePrevented = effTH.prevented;
      if (effTH.counterDamage > 0) queueDamage(state, attackerIdx, effTH.counterDamage);
      log(state, defenderIdx, "defense", `Thick Hide${bear ? " (Bear)" : ""}: prevented ${effTH.prevented}, ${effTH.counterDamage} dmg back`);
    } else if (defender.heroId === "rv") {
      const upgradedNM = defender.upgradesInPlay.includes("nothing-more-ii");
      const effNM = nothingMoreEffects(finalDefenseDice, upgradedNM);
      damagePrevented = effNM.prevented;
      if (effNM.counterDamage > 0) queueDamage(state, attackerIdx, effNM.counterDamage);
      log(state, defenderIdx, "defense", `Nothing More${upgradedNM ? " II" : ""}: prevented ${effNM.prevented}, ${effNM.counterDamage} dmg back${effNM.activations ? `, Nevermore activation` : ""}`);
      if (effNM.activations > 0) performNevermoreActivations(state, defenderIdx, effNM.activations, rng, policies[defenderIdx]);
    } else if (defender.heroId === "py") {
      const tier = defender.upgradesInPlay.includes("molten-armor-iii") ? 3 : defender.upgradesInPlay.includes("molten-armor-ii") ? 2 : 1;
      const eff = moltenArmorEffects(finalDefenseDice, tier);
      if (eff.counterDamage > 0) queueDamage(state, attackerIdx, eff.counterDamage);
      const fmGained = eff.fmGain > 0 ? gainFm(defender, eff.fmGain) : 0;
      let burnMsg = "";
      if (eff.inflictBurn) {
        const g = inflictNegative(attacker, "burn");
        burnMsg = g > 0 ? ", Burn inflicted on attacker" : ", Burn already on attacker";
      }
      log(state, defenderIdx, "defense", `Molten Armor${tier > 1 ? ` ${"I".repeat(tier)}` : ""}: prevented 0, ${eff.counterDamage} dmg back, +${fmGained} Fire Mastery${burnMsg}`);
    } else if (defender.heroId === "sm") {
      const mode = defender.smDefenseActive ?? "sense";
      defender.smDefenseActive = void 0;
      if (mode === "counter") {
        const back = counterpunchDamage(finalDefenseDice);
        if (back > 0) queueDamage(state, attackerIdx, back);
        log(state, defenderIdx, "defense", `Counterpunch: prevented 0, ${back} dmg back`);
      } else {
        const success = spiderSenseSuccess(finalDefenseDice, mode === "sense-swing");
        if (success) halvings += 1;
        defender.spiderSensePrevented = success && incomingDamage > 0;
        log(state, defenderIdx, "defense", `Spider-Sense${mode === "sense-swing" ? " (Swing Escape)" : ""}: ${success ? "will prevent 1/2 of the final subtotal (rounded up)" : "prevented 0 (no success face)"}, 0 dmg back`);
      }
    } else if (defender.heroId === "du") {
      const up = defender.upgradesInPlay.includes("retreat-ii");
      const eff = retreatEffects(finalDefenseDice, up);
      if (eff.counterDamage > 0) queueDamage(state, attackerIdx, eff.counterDamage);
      const moved = eff.forcedBackSteps > 0 ? takeSteps(defender, -eff.forcedBackSteps) : 0;
      log(state, defenderIdx, "defense", `Retreat${up ? " II" : ""}: ${eff.counterDamage} dmg back, ${Math.abs(moved)} forced step(s) backward (position ${footworkPos(defender)})`);
    } else if (defender.heroId === "se") {
      const up = defender.upgradesInPlay.includes("harness-the-light-ii");
      const eff = harnessEffects(finalDefenseDice, up);
      if (eff.heal > 0) defender.hp = Math.min(60, defender.hp + eff.heal);
      let dialMsg = "";
      if (eff.dialGain > 0) {
        const r = increaseDial(defender, eff.dialGain);
        dialMsg = `, Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal exc\xE8s)` : ""}${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""}`;
      }
      let gemMsg = "";
      if (eff.gem) gemMsg = gainChargedGem(defender) > 0 ? ", +Charged Gem" : ", Charged Gem d\xE9j\xE0 d\xE9tenu";
      log(state, defenderIdx, "defense", `Harness the Light${up ? " II" : ""}: prevented 0, healed ${eff.heal}${dialMsg}${gemMsg}`);
    } else if (defender.heroId === "nx") {
      damagePrevented = dragonScalesPrevent(finalDefenseDice[0]);
      log(state, defenderIdx, "defense", `Dragon Scales: face ${finalDefenseDice[0]}, prevented ${damagePrevented}`);
    } else if (defender.heroId === "fm") {
      const face = finalDefenseDice[0];
      const out = masterworkOutcome(
        face,
        defender,
        incomingDamage,
        defender.humanControlled ? defender.fmForgePref : void 0
      );
      if (out.mines) {
        const seen = minePeek(defender);
        const r = mine(defender);
        log(state, defenderIdx, "defense", `Masterwork (Pick): mined \u2014 saw [${seen.join(",")}], ${r.revealed.length ? `revealed ${r.revealed.join(",")} to The Forge` : `no reveal, +${r.cpGained} CP`}`);
      }
      const eff = armorEffects(defender, "normal", out.doubling);
      damagePrevented = eff.prevented;
      if (eff.counter > 0) queueDamage(state, attackerIdx, eff.counter);
      const doubled = [out.doubling.helmet ? "helmet" : "", out.doubling.shield ? "shield" : ""].filter(Boolean).join("+");
      log(state, defenderIdx, "defense", `Masterwork: face ${face}, prevented ${eff.prevented}, ${eff.counter} dmg back${doubled ? ` (doubled ${doubled})` : ""}`);
    } else if (defender.heroId === "bw") {
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
    let agilitySuccesses = 0;
    while (defender.tokens.agility > 0 && remaining > 0 && agilitySuccesses < 2) {
      const r = spendAgilityToHalveDamage(defender, remaining, rng);
      if (r.succeeded) {
        agilitySuccesses += 1;
        halvings += 1;
        log(state, defenderIdx, "defense", agilitySuccesses >= 2 ? `Agility spent: rolled ${r.roll} \u2014 SECOND half = 100% prevented (verified clarification)` : `Agility spent: rolled ${r.roll} \u2014 will prevent 1/2 of the final subtotal`);
      } else {
        remaining = r.remainingDamage;
        log(state, defenderIdx, "defense", `Agility spent: rolled ${r.roll}, no effect`);
        eludeEligible = r.roll >= 5;
        break;
      }
    }
    state.pendingAttack = { attackerIdx, defenderIdx, remaining, halvings };
    resolveResponseWindow(
      state,
      [attackerIdx, defenderIdx],
      { windowType: "defense", eludeEligible },
      rng,
      policies,
      enumerateWindowActions,
      applyWindowAction
    );
    if (defender.heroId === "du" && defender.footworkBonusUsedThisTurn !== true && state.pendingAttack) {
      const b = defensiveBonus(footworkPos(defender));
      if (b.prevent > 0) {
        const prevented = Math.min(state.pendingAttack.remaining, b.prevent);
        state.pendingAttack.remaining -= prevented;
        defender.footworkBonusUsedThisTurn = true;
        log(state, defenderIdx, "defense", `Footwork Defensive Bonus: prevented ${prevented} (position ${footworkPos(defender)})`);
      } else if (b.draw > 0) {
        drawCards(defender, b.draw, rng);
        defender.footworkBonusUsedThisTurn = true;
        log(state, defenderIdx, "defense", `Footwork Defensive Bonus: drew ${b.draw} (position ${footworkPos(defender)})`);
      }
    }
    if (state.pendingAttack && (defender.tokens.sunMarked ?? 0) > 0) {
      const paSM = state.pendingAttack;
      const perSM = Math.ceil(paSM.remaining / 2);
      const finalSM = Math.max(0, paSM.remaining - (paSM.halvings ?? 0) * perSM);
      if (finalSM > 0) {
        attacker.hp = Math.min(60, attacker.hp + SUN_MARKED_HEAL);
        log(state, attackerIdx, "defense", `Sun Marked: attacker heals ${SUN_MARKED_HEAL}`);
      }
    }
    finalizePendingAttackDamage(state);
  }
  var DEFENSIVE_CARD_IDS = ["not-this-time", "spirited-reprisal", "recoil", "shrug-off", "dont-poke-the-bear", "indomitable-will", "invulnerability", "nice-try", "invisible-punch", "i-hate-waiting", "sun-shield"];
  function eligibleDefensiveCardIds(defender, eludeEligible) {
    const hero = heroTemplateFor(defender.heroId);
    const ids = DEFENSIVE_CARD_IDS.filter((id) => {
      if (!defender.hand.includes(id)) return false;
      if (id === "nice-try") return (defender.tokens.invisibility ?? 0) > 0;
      if (id === "invisible-punch") return defender.spiderSensePrevented === true;
      if (id === "i-hate-waiting") return defender.heroId === "du" && (defender.footwork ?? 0) > -2;
      if (id === "sun-shield") return (defender.tokens.chargedGem ?? 0) > 0;
      return true;
    });
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
    if (cardId === "sun-shield") {
      if ((defender.tokens.chargedGem ?? 0) < 1) {
        log(state, defenderIdx, "defense", "Sun Shield!: no Charged Gem \u2014 no effect");
        return remaining;
      }
      defender.tokens.chargedGem = 0;
      const prevented = Math.min(remaining, 3);
      log(state, defenderIdx, "defense", `Sun Shield!: Charged Gem removed, prevented ${prevented} dmg`);
      return remaining - prevented;
    }
    if (cardId === "i-hate-waiting") {
      const n = defender.humanControlled ? defender.duIHWSteps ?? 2 : 2;
      const moved = takeSteps(defender, -n);
      log(state, defenderIdx, "defense", `I Hate Waiting: ${Math.abs(moved)} step(s) backward (position ${footworkPos(defender)})`);
      return remaining;
    }
    if (cardId === "invulnerability") {
      if ((defender.tokens.electrokinesis ?? 0) < 2) {
        log(state, defenderIdx, "defense", "Invulnerability!: no effect (needs 2 EK)");
        return remaining;
      }
      defender.tokens.electrokinesis -= 2;
      log(state, defenderIdx, "defense", `Invulnerability!: -2 EK, ALL ${remaining} dmg prevented`);
      return 0;
    }
    if (cardId === "indomitable-will") {
      if (defender.hp - remaining > 0) {
        log(state, defenderIdx, "defense", "Indomitable Will!: attack is not lethal \u2014 no effect");
        return remaining;
      }
      const d = rollDie(rng);
      if (d === 4 || d === 5) {
        log(state, defenderIdx, "defense", `Indomitable Will!: rolled ${d} (Worthy) \u2014 Health set to 1`);
        return defender.hp - 1;
      }
      log(state, defenderIdx, "defense", `Indomitable Will!: rolled ${d} \u2014 failed`);
      return remaining;
    }
    if (cardId === "shrug-off") {
      if (defender.form !== "bear") {
        log(state, defenderIdx, "defense", "Shrug Off!: no effect (not in Bear Form)");
        return remaining;
      }
      const prevented = Math.min(remaining, 2);
      log(state, defenderIdx, "defense", `Shrug Off!: prevented ${prevented} dmg (Bear Form)`);
      return remaining - prevented;
    }
    if (cardId === "dont-poke-the-bear") {
      if (defender.form !== "bear") {
        log(state, defenderIdx, "defense", "Don't Poke the Bear!: no effect (not in Bear Form)");
        return remaining;
      }
      queueDamage(state, 1 - defenderIdx, 2);
      log(state, defenderIdx, "defense", "Don't Poke the Bear!: 2 dmg back (Bear Form)");
      return remaining;
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
      if (r.damagePrevented > 0 && state.pendingAttack) {
        state.pendingAttack.halvings = (state.pendingAttack.halvings ?? 0) + 1;
        log(state, defenderIdx, "defense", `Recoil!: will prevent 1/2 of the final subtotal, +${r.cpGained} CP`);
      } else {
        log(state, defenderIdx, "defense", `Recoil!: prevented 0, +${r.cpGained} CP`);
      }
      return remaining;
    }
    if (cardId === "elude") {
      log(state, defenderIdx, "defense", `Elude!: ignored all ${remaining} incoming dmg`);
      return 0;
    }
    if (cardId === "nice-try") {
      if ((defender.tokens.invisibility ?? 0) < 1) {
        log(state, defenderIdx, "defense", "Nice Try!: no Invisibility to discard \u2014 no effect");
        return remaining;
      }
      defender.tokens.invisibility = 0;
      const prevented = Math.min(remaining, 3);
      log(state, defenderIdx, "defense", `Nice Try!: Invisibility discarded, prevented ${prevented} dmg`);
      return remaining - prevented;
    }
    if (cardId === "invisible-punch") {
      if (defender.spiderSensePrevented !== true) {
        log(state, defenderIdx, "defense", "Invisible Punch!: no Spider-Sense prevention this attack \u2014 no effect");
        return remaining;
      }
      queueDamage(state, 1 - defenderIdx, 3);
      log(state, defenderIdx, "defense", "Invisible Punch!: 3 dmg back (Spider-Sense prevented)");
      return remaining;
    }
    return remaining;
  }
  var ATTACK_MODIFIER_CARD_IDS = ["unescapable", "cranial-assist", "subversion", "thundering-hooves", "stone-beak", "talon-strike", "lethal-swipe", "surprise-bite", "ambush", "huzzah", "red-hot", "pick-it-up", "burst-forward", "blade-barrage"];
  function eligibleAttackModifierCardIds(self) {
    const hero = heroTemplateFor(self.heroId);
    return ATTACK_MODIFIER_CARD_IDS.filter((id) => {
      if (!self.hand.includes(id)) return false;
      const card = cardById(hero, id);
      if (!card || self.cp < (card.cpCost ?? 0)) return false;
      if (id === "lethal-swipe" || id === "surprise-bite") {
        return self.heroId === "dr" && self.form === "cat";
      }
      if (id === "ambush") {
        return self.heroId === "sm" && (self.tokens.invisibility ?? 0) > 0;
      }
      if (id === "red-hot") {
        return self.heroId === "py" && (self.tokens.fireMastery ?? 0) > 0;
      }
      if (id === "huzzah") return self.heroId === "py";
      if (id === "pick-it-up" || id === "burst-forward" || id === "blade-barrage") {
        if (self.heroId !== "du") return false;
        if (id === "burst-forward") return footworkPos(self) < FOOTWORK_MAX;
        return true;
      }
      if (id === "stone-beak" || id === "talon-strike") {
        if (self.heroId !== "rv") return false;
        if (id === "stone-beak" && (self.tokens.nevermore ?? 0) > 0) return false;
        return true;
      }
      if (id === "unescapable" && self.tokens.grimPursuit < 1) {
        const canConvert = self.hand.includes("thundering-hooves") && self.cp >= 2;
        if (!canConvert) return false;
      }
      return true;
    });
  }
  function applyAttackModifierCard(state, playerIdx, cardId, current, rng) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const hero = heroTemplateFor(self.heroId);
    const card = cardById(hero, cardId);
    if (!card || !self.hand.includes(cardId) || self.cp < (card.cpCost ?? 0)) return current;
    if (cardId === "unescapable" && self.tokens.grimPursuit < 1) return current;
    self.cp -= card.cpCost ?? 0;
    self.hand.splice(self.hand.indexOf(cardId), 1);
    self.discard.push(cardId);
    if (cardId === "lethal-swipe") {
      if (!rng) {
        return { ...current, dmg: current.dmg + 2 };
      }
      const lsRoll = rollDice(5, rng);
      const claws = lsRoll.filter((d) => d <= 3).length;
      const paws = lsRoll.filter((d) => d >= 4 && d <= 5).length;
      if (paws >= 2) {
        opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1);
      }
      log(state, playerIdx, "resolveAttack", `Lethal Swipe!: rolled [${lsRoll.join(",")}], +${claws} dmg${paws >= 2 ? ", Wound inflicted" : ""}`);
      return { ...current, dmg: current.dmg + claws };
    }
    if (cardId === "surprise-bite") {
      log(state, playerIdx, "resolveAttack", "Surprise Bite!: attack becomes undefendable (Cat Form)");
      return { ...current, undefendable: true };
    }
    if (cardId === "stone-beak") {
      log(state, playerIdx, "resolveAttack", "Stone Beak!: +1 dmg, attack becomes undefendable");
      return { dmg: current.dmg + 1, undefendable: true };
    }
    if (cardId === "talon-strike") {
      if (!rng) {
        grantFeathers(self, 1);
        return { ...current, dmg: current.dmg + 2 };
      }
      const tsRoll = rollDice(5, rng);
      const tsTalons = tsRoll.filter((d) => d <= 3).length;
      const g = grantFeathers(self, 1);
      log(state, playerIdx, "resolveAttack", `Talon Strike!: rolled [${tsRoll.join(",")}], +${tsTalons} dmg, +${g} Feather`);
      return { ...current, dmg: current.dmg + tsTalons };
    }
    if (cardId === "unescapable") {
      spendGrimPursuit(self, 1);
      log(state, playerIdx, "resolveAttack", "Unescapable!: spent 1 Grim Pursuit, attack is now undefendable");
      return { ...current, undefendable: true };
    }
    if (cardId === "ambush") {
      if ((self.tokens.invisibility ?? 0) < 1) return current;
      self.tokens.invisibility = 0;
      log(state, playerIdx, "resolveAttack", "Ambush!: Invisibility discarded, +3 dmg");
      return { ...current, dmg: current.dmg + 3 };
    }
    if (cardId === "red-hot") {
      const fmNow = self.tokens.fireMastery ?? 0;
      log(state, playerIdx, "resolveAttack", `Red Hot!: +${fmNow} dmg (1 per Fire Mastery)`);
      return { ...current, dmg: current.dmg + fmNow };
    }
    if (cardId === "huzzah") {
      if (!rng) {
        return { ...current, dmg: current.dmg + 2 };
      }
      const hz = rollDie(rng);
      const eff = pyroBonusDieEffects(hz);
      if (eff.burn) inflictNegative(opp, "burn");
      if (eff.knockdown) inflictNegative(opp, "knockdown");
      if (eff.fm > 0) gainFm(self, eff.fm);
      log(state, playerIdx, "resolveAttack", `Huzzah!: rolled ${hz} -> ${eff.addDmg > 0 ? `+${eff.addDmg} dmg` : eff.burn ? "Burn inflicted" : eff.fm > 0 ? "+2 Fire Mastery" : "Knockdown inflicted"}`);
      return { ...current, dmg: current.dmg + eff.addDmg };
    }
    if (cardId === "pick-it-up") {
      if ((opp.tokens.disarm ?? 0) < 1) {
        log(state, playerIdx, "resolveAttack", "Pick It Up: no effect (opponent not Disarmed)");
        return current;
      }
      opp.tokens.disarm = 0;
      log(state, playerIdx, "resolveAttack", "Pick It Up: Disarm removed, +3 dmg");
      return { ...current, dmg: current.dmg + 3 };
    }
    if (cardId === "burst-forward") {
      const self2 = state.players[playerIdx];
      const moved = takeSteps(self2, 1);
      log(state, playerIdx, "resolveAttack", `Burst Forward: ${moved} step forward (position ${footworkPos(self2)})`);
      return current;
    }
    if (cardId === "blade-barrage") {
      if (!rng) {
        return { ...current, dmg: current.dmg + 2 };
      }
      const bbRoll = rollDice(5, rng);
      const blades = bbRoll.filter((d) => d <= 3).length;
      const boots = bbRoll.filter((d) => d >= 4 && d <= 5).length;
      let stepMsg = "";
      if (boots >= 2) {
        const mode = self.humanControlled ? self.duStepsMode ?? "forward" : "forward";
        if (mode !== "none") {
          const moved = takeSteps(self, mode === "backward" ? -1 : 1);
          if (moved !== 0) stepMsg = `, 1 step ${moved > 0 ? "forward" : "backward"} (position ${footworkPos(self)})`;
        }
      }
      log(state, playerIdx, "resolveAttack", `Blade Barrage: rolled [${bbRoll.join(",")}], +${blades} dmg${stepMsg}`);
      return { ...current, dmg: current.dmg + blades };
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
      const spend = Math.min(3, self.cp, Math.max(0, GRIM_PURSUIT_CAP - self.tokens.grimPursuit));
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
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligible).slice().sort((a, b) => (a === "thundering-hooves" ? -1 : 0) - (b === "thundering-hooves" ? -1 : 0));
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result);
    }
    if (self.heroId === "hh" && self.tokens.grimPursuit >= 1 && !self.grimPursuitBonusUsedThisTurn) {
      if (policy.chooseGrimPursuitSpend?.(state, playerIdx, result.dmg)) {
        const r = spendGrimPursuitForBonusDamage(self, rng);
        self.grimPursuitBonusUsedThisTurn = true;
        result = { ...result, dmg: result.dmg + r.bonus };
        log(state, playerIdx, "resolveAttack", `Grim Pursuit spend (b): rolled [${r.dice.join(",")}], ${r.bonus} Horseshoe(s) -> +${r.bonus} dmg`);
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
      const gains = [];
      if (data.tokensGrantedToSelf?.dreadful) {
        grantDreadful(self, data.tokensGrantedToSelf.dreadful);
        gains.push(`+${data.tokensGrantedToSelf.dreadful} Dreadful`);
      }
      if (data.tokensGrantedToSelf?.grimPursuit) {
        grantGrimPursuit(self, data.tokensGrantedToSelf.grimPursuit);
        gains.push(`+${data.tokensGrantedToSelf.grimPursuit} Grim Pursuit`);
      }
      if (gains.length) log(state, playerIdx, "resolveAttack", `${name}: ${gains.join(", ")}`);
    }
    let undefendableOverride = false;
    if (data.bonusRoll) {
      const r = resolveSpectralAssaultBonusRoll(self, rng);
      dmg += r.bonusDamage;
      if (r.undefendable) undefendableOverride = true;
      if (r.grimPursuitGained > 0) grantGrimPursuit(self, r.grimPursuitGained);
      log(state, playerIdx, "resolveAttack", `${name} bonus roll [${r.dice ? r.dice.join(",") : "?"}]: +${r.bonusDamage} dmg, undefendable=${r.undefendable}, +${r.grimPursuitGained} Grim Pursuit`);
    }
    if (data.numberMatchBonus) {
      const ofAKind = self.upgradesInPlay.includes("cleave-ii") ? 3 : data.numberMatchBonus.ofAKind;
      if (hasNumberMatch2(dice, ofAKind)) {
        if (data.numberMatchBonus.tokensGranted?.dreadful) grantDreadful(self, data.numberMatchBonus.tokensGranted.dreadful);
        log(state, playerIdx, "resolveAttack", `${name}: ${ofAKind}-of-a-kind bonus triggered`);
      }
    }
    const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: undefendableOverride }, rng);
    dmg = modified.dmg;
    undefendableOverride = modified.undefendable;
    if (dmg <= 0) log(state, playerIdx, "resolveAttack", `${name}: deals no damage \u2014 no defense roll`);
    else if ((data.defendable ?? true) && !undefendableOverride) resolveDefense(state, playerIdx, dmg, rng, policies);
    else queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith("Dreadful Charge"), rng, policies);
    if (tokens.head > 0 && data.cardDrawIfHasHead) {
      drawCards(self, 1, rng);
      log(state, playerIdx, "resolveAttack", `${name}: drew 1 card (Haunted Head)`);
    }
    if (data.cardDraw) {
      drawCards(self, data.cardDraw, rng);
      log(state, playerIdx, "resolveAttack", `${name}: drew ${data.cardDraw} card(s)`);
    }
  }
  function applyFMAbility(state, playerIdx, name, dice, rng, policies) {
    const policy = policies[playerIdx];
    const self = state.players[playerIdx];
    const data = resolvedAbilityByBoardName(heroTemplateFor("fm"), name, self.upgradesInPlay);
    if (!data) {
      log(state, playerIdx, "resolveAttack", `Unknown ability "${name}" \u2014 no data, skipped`);
      return;
    }
    let dmg = data.baseDamage ?? 0;
    if (data.thresholdBonusArmor && armorCount(self) >= data.thresholdBonusArmor.armorAtLeast) {
      dmg += data.thresholdBonusArmor.bonusDamage;
      log(state, playerIdx, "resolveAttack", `${name}: +${data.thresholdBonusArmor.bonusDamage} dmg (${data.thresholdBonusArmor.armorAtLeast} Armor)`);
    }
    if (data.bonusRoll?.addRolledValueAsDamage) {
      const b = rollDie(rng);
      dmg += b;
      log(state, playerIdx, "resolveAttack", `${name} bonus roll: +${b} dmg`);
    }
    if (data.numberMatchBonus?.cpGain && hasNumberMatch2(dice, data.numberMatchBonus.ofAKind)) {
      grantCp(self, data.numberMatchBonus.cpGain);
      log(state, playerIdx, "resolveAttack", `${name}: ${data.numberMatchBonus.ofAKind}-of-a-kind bonus, +${data.numberMatchBonus.cpGain} CP`);
    }
    if (data.minesDeck) {
      const top3 = minePeek(self);
      const choice = policy.chooseFmMine?.(state, playerIdx, top3);
      const r = choice?.kind === "cp" ? mineResolve(self, []) : choice?.kind === "reveal" ? mineResolve(self, [choice.oreId]) : mine(self, !!data.revealAllMinedOre);
      log(state, playerIdx, "resolveAttack", `${name}: mined \u2014 ${r.revealed.length ? `revealed ${r.revealed.join(",")} to The Forge` : `no reveal, +${r.cpGained} CP`}`);
    }
    if (data.searchOreToForge) {
      const t = tutorOreToForge(self, rng);
      log(state, playerIdx, "resolveAttack", `${name}: ${t ? `tutored ${t} to The Forge` : "no ORE left in deck"}, deck shuffled`);
    }
    if (data.cardDraw) {
      drawCards(self, data.cardDraw, rng);
      log(state, playerIdx, "resolveAttack", `${name}: drew ${data.cardDraw} card(s)`);
    }
    const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: !(data.defendable ?? true) }, rng);
    dmg = modified.dmg;
    if (dmg <= 0) {
      log(state, playerIdx, "resolveAttack", `${name}: deals no damage \u2014 no defense roll`);
    } else if ((data.defendable ?? true) && !modified.undefendable) {
      resolveDefense(state, playerIdx, dmg, rng, policies);
    } else {
      queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith("Final Touches"), rng, policies);
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
    if (dmg <= 0) {
      log(state, playerIdx, "resolveAttack", `${name}: deals no damage \u2014 no defense roll`);
    } else if (data.defendable ?? true) {
      if (modified.undefendable) queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies);
      else resolveDefense(state, playerIdx, dmg, rng, policies);
    } else {
      queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith("Widow's Bite"), rng, policies);
    }
    const bwGains = [];
    if (data.cpGain) {
      grantCp(self, data.cpGain);
      bwGains.push(`+${data.cpGain} CP`);
    }
    if (data.cpGainIfUpgradesAtLeast && self.upgradesInPlay.length >= data.cpGainIfUpgradesAtLeast.upgradesAtLeast) {
      grantCp(self, data.cpGainIfUpgradesAtLeast.cpGain);
      bwGains.push(`+${data.cpGainIfUpgradesAtLeast.cpGain} CP (\u2265${data.cpGainIfUpgradesAtLeast.upgradesAtLeast} upgrades)`);
    }
    if (data.tokensGrantedToSelf?.agility) {
      grantAgility(self, data.tokensGrantedToSelf.agility);
      bwGains.push(`+${data.tokensGrantedToSelf.agility} Agility`);
    }
    if (data.tokensGrantedToSelf?.covertOps) {
      grantCovertOps(self, data.tokensGrantedToSelf.covertOps);
      bwGains.push(`+${data.tokensGrantedToSelf.covertOps} Covert Ops`);
    }
    if (bwGains.length) log(state, playerIdx, "resolveAttack", `${name}: ${bwGains.join(", ")}`);
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
  function queueAttackDamageVsArmor(state, attackerIdx, dmg, isUltimate, rng, policies) {
    const defenderIdx = 1 - attackerIdx;
    const defender = state.players[defenderIdx];
    if ((defender.tokens.invisibility ?? 0) > 0 && !isUltimate && dmg > 0 && rng && policies && (defender.tokens.stun ?? 0) === 0 && (defender.humanControlled ? defender.smInvisDefendArmed === true : dmg >= 5)) {
      defender.tokens.invisibility = 0;
      defender.smInvisDefendArmed = false;
      log(state, defenderIdx, "defense", "Invisibility spent: defending against the undefendable Attack");
      resolveDefense(state, attackerIdx, dmg, rng, policies);
      return;
    }
    if (defender.heroId === "fm" && dmg > 0) {
      const eff = armorEffects(defender, isUltimate ? "ultimate" : "undefendable");
      if (eff.prevented > 0) {
        log(state, defenderIdx, "defense", `Ultimanium Shield: prevented ${Math.min(eff.prevented, dmg)} (undefendable attack)`);
        dmg = Math.max(0, dmg - eff.prevented);
      }
    }
    if (dmg > 0 && (defender.tokens.sunMarked ?? 0) > 0) {
      const att = state.players[attackerIdx];
      att.hp = Math.min(60, att.hp + SUN_MARKED_HEAL);
      log(state, attackerIdx, "defense", `Sun Marked: attacker heals ${SUN_MARKED_HEAL}`);
    }
    queueDamage(state, defenderIdx, dmg);
    flushDamage(state);
  }
  function resolveAbilityPhase(state, playerIdx, dice, rng, policies) {
    const policy = policies[playerIdx];
    const self = state.players[playerIdx];
    if (self.heroId === "nx") {
      resolveNaraxusAbility(state, playerIdx, dice, rng, policies);
      return;
    }
    if ((self.tokens.hex ?? 0) > 0 && dice.includes(6)) {
      const filtered = dice.filter((d) => d !== 6);
      log(state, playerIdx, "resolveAttack", `Hex: ${dice.length - filtered.length} die/dice showing 6 are blank this turn`);
      dice = filtered;
    }
    const opp = state.players[1 - playerIdx];
    const oState = oracleStateFor(self, opp);
    if (self.heroId === "sm") self.smAttackedThisPhase = false;
    const candidates = resolveMatchedAbilities(self.heroId, dice, oState);
    if (candidates.length === 0) {
      log(state, playerIdx, "resolveAttack", "No ability matched (Whiff)");
      applyWhiffPassive(state, playerIdx);
      return;
    }
    const chosenName = candidates.length === 1 ? candidates[0].name : policy.chooseAbility(state, playerIdx, candidates);
    log(state, playerIdx, "resolveAttack", `Chose ability: ${chosenName}`);
    if (self.heroId === "hh") applyHHAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "fm") applyFMAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "rv") applyRVAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "dr") applyDRAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "th") applyTHAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "sm") applySMAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "py") applyPYAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "du") applyDUAbility(state, playerIdx, chosenName, dice, rng, policies);
    else if (self.heroId === "se") applySEAbility(state, playerIdx, chosenName, dice, rng, policies);
    else applyBWAbility(state, playerIdx, chosenName, rng, policies);
  }
  function resolveNaraxusAbility(state, bossIdx, dice, rng, policies) {
    const boss = state.players[bossIdx];
    const heroIdx = 1 - bossIdx;
    const hero = state.players[heroIdx];
    const face = state.bossHard ? Math.max(...dice) : dice[0];
    const info = nxAttackInfo(face);
    log(state, bossIdx, "resolveAttack", `Naraxus: rolled [${dice.join(",")}] -> ${info.name} (${face})`);
    const swoop = () => {
      const removed = removeRandomStatus(boss, rng);
      if (removed) log(state, bossIdx, "resolveAttack", `Swoop: removed ${removed} from Naraxus`);
      boss.hp = Math.min(boss.hp + 4, NX_HEAL_CAP);
      log(state, bossIdx, "resolveAttack", "Swoop: healed 4");
      queueAttackDamageVsArmor(state, bossIdx, 3, false, rng, policies);
    };
    if (face === 1) {
      swoop();
      return;
    }
    if (face === 2) {
      const milled = hero.deck.splice(0, Math.min(3, hero.deck.length));
      hero.discard.push(...milled);
      log(state, bossIdx, "resolveAttack", `Ember Spark: milled ${milled.length} card(s) (${milled.join(",") || "-"})`);
      resolveDefense(state, bossIdx, 8, rng, policies);
      return;
    }
    if (face === 3) {
      const four = [rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng)].sort((a, b) => b - a);
      const dmg = four[0] + four[1];
      log(state, bossIdx, "resolveAttack", `Gashing Bite: rolled [${four.join(",")}] -> ${dmg} dmg`);
      resolveDefense(state, bossIdx, dmg, rng, policies);
      return;
    }
    if (face === 4) {
      hero.hoardedDice = 1;
      log(state, bossIdx, "resolveAttack", "Hoarding: stole 1 die from the Active Hero (returned at end of their turn)");
      resolveDefense(state, bossIdx, 9, rng, policies);
      return;
    }
    if (face === 5) {
      if (hero.hand.length) {
        const heroT = heroTemplateFor(hero.heroId);
        const chosen = policies[heroIdx].chooseDiscardForRoar?.(state, heroIdx, hero.hand.slice());
        const pick = chosen && hero.hand.includes(chosen) ? chosen : hero.hand.slice().sort((a, b) => (cardById(heroT, a)?.cpCost ?? 0) - (cardById(heroT, b)?.cpCost ?? 0))[0];
        hero.hand.splice(hero.hand.indexOf(pick), 1);
        hero.discard.push(pick);
        log(state, bossIdx, "resolveAttack", `Thundering Roar: hero discarded ${pick}`);
      }
      queueAttackDamageVsArmor(state, bossIdx, 8, false, rng, policies);
      return;
    }
    resolveDefense(state, bossIdx, 10, rng, policies);
    const trigger = rollDie(rng);
    log(state, bossIdx, "resolveAttack", `Dragon's Might: trigger roll ${trigger}${trigger >= 5 ? " -> SWOOP!" : ""}`);
    if (trigger >= 5) swoop();
  }
  function naraxusUpToRoll(state, bossIdx, rng) {
    const boss = state.players[bossIdx];
    const tb = tickTimeBombsUpkeep(boss, rng);
    if (tb.rolls.length > 0) log(state, bossIdx, "upkeep", `Time Bomb upkeep: rolls [${tb.rolls.join(",")}], ${tb.selfDamage} self-dmg, ${tb.defused} defused`);
    if (checkGameOver(state)) return [];
    return state.bossHard ? [rollDie(rng), rollDie(rng)] : [rollDie(rng)];
  }
  function playNaraxusTurn(state, bossIdx, rng, policies) {
    const dice = naraxusUpToRoll(state, bossIdx, rng);
    if (state.gameOver || !dice.length) return;
    resolveNaraxusAbility(state, bossIdx, dice, rng, policies);
  }
  function performNevermoreActivations(state, rvIdx, times, rng, policy) {
    const rvP = state.players[rvIdx];
    const opp = state.players[1 - rvIdx];
    for (let i = 0; i < times; i++) {
      if (state.gameOver) return;
      const rvIsHolder = (rvP.tokens.nevermore ?? 0) > 0;
      let choice;
      const hook = policy?.chooseNevermoreActivation;
      if (hook) choice = hook(state, rvIdx);
      else if (rvP.nevermoreMode) choice = rvP.nevermoreMode;
      else if (rvIsHolder) choice = "move";
      else if ((rvP.nevermoreDial ?? 0) >= NEVERMORE_DIAL_CAP) choice = opp.hp <= 2 ? "absorb" : "move";
      else choice = "absorb";
      if (choice === "absorb" && rvIsHolder) choice = "move";
      const r = applyNevermoreActivation(rvP, opp, rvIsHolder, choice);
      if (r.choice === "absorb") {
        opp.hp -= 1;
        log(state, rvIdx, "resolveAttack", `Nevermore absorbs: dial ${r.dialAfter}, 1 undefendable dmg (isolated)`);
        if (checkGameOver(state)) return;
      } else if (r.choice === "moveToOpponent") {
        log(state, rvIdx, "resolveAttack", "Nevermore flies to the opponent");
      } else {
        log(state, rvIdx, "resolveAttack", `Nevermore returns to the Raveness: healed ${r.healed}, dial to 0`);
      }
    }
  }
  function applyRVAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const acts = (n) => performNevermoreActivations(state, playerIdx, n, rng, policy);
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    const maxKind = Math.max(...counts.values());
    const a = dice.filter((d) => d <= 3).length;
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Peck")) {
      const up = has("peck-ii");
      const dmg = (a >= 5 ? [7, 8] : a >= 4 ? [6, 7] : [5, 6])[up ? 1 : 0];
      const trigger = up ? 3 : 4;
      if (maxKind >= trigger) {
        log(state, playerIdx, "resolveAttack", `Peck: ${trigger}-of-a-kind -> Activate Nevermore`);
        acts(1);
      }
      attack(dmg, true);
      return;
    }
    if (name.startsWith("Raven Sight")) {
      acts(has("raven-sight-ii") ? 2 : 1);
      attack(3, false);
      return;
    }
    if (name.startsWith("Craven")) {
      const up = has("craven-ii");
      const g = grantFeathers(self, up ? 2 : 1);
      log(state, playerIdx, "resolveAttack", `Craven: +${g} Feather`);
      attack(up ? 9 : 8, true);
      return;
    }
    if (name.startsWith("Beguile")) {
      const up = has("beguile-ii");
      const g = grantFeathers(self, up ? 3 : 2);
      log(state, playerIdx, "resolveAttack", `Beguile: +${g} Feather`);
      acts(up ? 2 : 1);
      attack(9, true);
      return;
    }
    if (name.startsWith("Fowl Friend") || name.startsWith("Birds of a Feather")) {
      if (name.startsWith("Birds of a Feather")) {
        self.featherCapBonus = (self.featherCapBonus ?? 0) + 1;
        log(state, playerIdx, "resolveAttack", `Birds of a Feather: Feather cap +1 (now ${featherCap(self)}) \u2014 then Fowl Friend II`);
      }
      const up = has("fowl-friend-ii");
      drawCards(self, 1, rng);
      const g = up ? grantFeathers(self, 99) : grantFeathers(self, 4);
      log(state, playerIdx, "resolveAttack", `Fowl Friend${up ? " II" : ""}: drew 1, +${g} Feather`);
      acts(up ? 3 : 2);
      return;
    }
    if (name.startsWith("Murder of Crows")) {
      const up = has("murder-of-crows-ii");
      const n = up ? 5 : 4;
      const rolls = rollDice(n, rng);
      const talons = rolls.filter((d) => d <= 3).length;
      const wings = rolls.filter((d) => d >= 4 && d <= 5).length;
      const eyes = rolls.filter((d) => d === 6).length;
      const g = grantFeathers(self, wings);
      log(state, playerIdx, "resolveAttack", `Murder of Crows${up ? " II" : ""} bonus roll [${rolls.join(",")}]: +${talons} dmg, +${g} Feather${eyes ? ", Raven Eye -> Activate Nevermore" : ""}`);
      if (eyes > 0) acts(1);
      attack((up ? 6 : 5) + talons, true);
      return;
    }
    if (name.startsWith("Aviary")) {
      const g = grantFeathers(self, 4);
      log(state, playerIdx, "resolveAttack", `Aviary: +${g} Feather`);
      attack(2, false);
      return;
    }
    if (name.startsWith("Pluck")) {
      opp.tokens.hex = 1;
      log(state, playerIdx, "resolveAttack", "Pluck: Hex inflicted (6s are blanks)");
      attack(9, true);
      return;
    }
    if (name.startsWith("Chamber")) {
      acts(has("chamber-ii") ? 3 : 2);
      attack(7, false);
      return;
    }
    if (name.startsWith("Fantastic Terrors")) {
      acts(3);
      opp.tokens.hex = 1;
      log(state, playerIdx, "resolveAttack", "Fantastic Terrors: Hex inflicted");
      attack(13, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Raveness ability matched (${name})`);
  }
  function applyDRAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg > 0 && formOf(self) !== "cat" && (self.tokens.shapeShift ?? 0) > 0) {
        const wants = self.humanControlled ? self.drCatOnAttack === true : (self.tokens.shapeShift ?? 0) > (self.hp <= 20 ? 1 : 0);
        if (wants) {
          spendShapeShift(self, "cat");
          log(state, playerIdx, "resolveAttack", "Shape Shift -> Cat Form (attack)");
        }
      }
      if (formOf(self) === "cat" && result.dmg > 0) {
        result = { ...result, dmg: result.dmg + 2 };
        opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1);
        log(state, playerIdx, "resolveAttack", "Cat Form: +2 dmg, Wound inflicted");
      }
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    const counts = /* @__PURE__ */ new Map();
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
    const maxKind = Math.max(...counts.values());
    const a = dice.filter((d) => d <= 3).length;
    if (name.startsWith("Ferocity")) {
      const up = has("ferocity-ii");
      const dmg = (a >= 5 ? [6, 7] : a >= 4 ? [5, 6] : [4, 5])[up ? 1 : 0];
      const trigger = up ? 3 : 4;
      if (maxKind >= trigger) {
        opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1);
        log(state, playerIdx, "resolveAttack", `Ferocity: ${trigger}-of-a-kind -> Wound inflicted`);
      }
      attack(dmg, true);
      return;
    }
    if (name.startsWith("Savage Maul") || name.startsWith("Maul")) {
      if (name.startsWith("Savage Maul")) {
        const g = grantShapeShift(self, 1);
        log(state, playerIdx, "resolveAttack", `Savage Maul: +${g} Shape Shift \u2014 then Maul`);
      }
      const r = maulRoll(rng, formOf(self) === "bear");
      log(state, playerIdx, "resolveAttack", `Maul roll [${r.dice.join(",")}]${r.rerolled ? " (Bear re-roll)" : ""} -> ${r.total} dmg`);
      attack(r.total, true);
      return;
    }
    if (name.startsWith("Nature's Cure")) {
      grantRegen2(self, 1);
      log(state, playerIdx, "resolveAttack", "Nature's Cure: +Regenerate (2)");
      attack(5, true);
      return;
    }
    if (name.startsWith("Wild Realignment")) {
      grantCp(self, 1);
      const g = grantShapeShift(self, 2);
      let msg = `Wild Realignment: +1 CP, +${g} Shape Shift`;
      if (formOf(self) === "druid") {
        drawCards(self, 1, rng);
        msg += ", drew 1 (Druid Form)";
      }
      log(state, playerIdx, "resolveAttack", msg);
      return;
    }
    if (name.startsWith("Forest's Call")) {
      const g = grantShapeShift(self, 1);
      log(state, playerIdx, "resolveAttack", `Forest's Call: +${g} Shape Shift`);
      attack(6, true);
      return;
    }
    if (name.startsWith("Forest's Answer")) {
      const g = grantShapeShift(self, 1);
      const bonus = rollDie(rng);
      let extra = 0;
      let note = "";
      if (bonus <= 3) {
        extra = 2;
        note = "+2 dmg";
      } else if (bonus <= 5) {
        grantShapeShift(self, 1);
        note = "+1 Shape Shift";
      } else {
        grantRegen2(self, 1);
        note = "+Regenerate (2)";
      }
      log(state, playerIdx, "resolveAttack", `Forest's Answer: +${g} Shape Shift, bonus die ${bonus} -> ${note}`);
      attack(7 + extra, true);
      return;
    }
    if (name.startsWith("Protect the Forest")) {
      grantRegen2(self, 1);
      const g = grantShapeShift(self, 1);
      log(state, playerIdx, "resolveAttack", `Protect the Forest: +Regenerate (2), +${g} Shape Shift`);
      attack(has("protect-the-forest-ii") ? 8 : 6, false);
      return;
    }
    if (name.startsWith("Rainfall")) {
      grantCp(self, 1);
      grantRegen2(self, 2);
      log(state, playerIdx, "resolveAttack", "Rainfall: +1 CP, +2 Regenerate (2)");
      return;
    }
    if (name.startsWith("Wrath of Nature")) {
      grantRegen2(self, 1);
      const g = grantShapeShift(self, 2);
      log(state, playerIdx, "resolveAttack", `Wrath of Nature: +Regenerate (2), +${g} Shape Shift`);
      attack(12, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Druid ability matched (${name})`);
  }
  function applyTHAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const oppIdx = 1 - playerIdx;
    const opp = state.players[oppIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const ekOf = () => Math.min(4, self.tokens.electrokinesis ?? 0);
    const doShuttle = (times, label) => {
      const r = shuttle(self, times);
      if (r.damage > 0) queueDamage(state, oppIdx, r.damage);
      if (r.throws + r.retrieves > 0) {
        log(state, playerIdx, "resolveAttack", `${label}: Mjolnir x${r.throws + r.retrieves} (${r.throws} throw = ${r.damage} dmg, ${r.retrieves} retrieve = +${r.ekGained} EK)`);
      }
    };
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      log(state, playerIdx, "resolveAttack", `${name}: attack total ${result.dmg} dmg${result.undefendable ? " (undefendable)" : ""}`);
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Hammered")) {
      const a = dice.filter((d) => d <= 3).length;
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("hammered-iii") ? [5, 6, 8] : has("hammered-ii") ? [5, 6, 7] : [4, 5, 7];
      const upgraded = has("hammered-ii") || has("hammered-iii");
      if (upgraded) doShuttle(1, "Hammered");
      else if (mjolnirHome(self)) {
        const r = shuttleOnce(self);
        queueDamage(state, oppIdx, r.damage);
        log(state, playerIdx, "resolveAttack", "Hammered: Mjolnir thrown (1 dmg)");
      }
      const kindNeed = has("hammered-iii") ? 3 : has("hammered-ii") ? 4 : 99;
      const counts = /* @__PURE__ */ new Map();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      if (Math.max(...counts.values()) >= kindNeed) {
        gainEk(self, 1);
        log(state, playerIdx, "resolveAttack", `Hammered: ${kindNeed}-of-a-kind -> +1 EK`);
      }
      attack(table[tier], true);
      return;
    }
    if (name.startsWith("Mighty Summon")) {
      const up = has("mighty-summon-ii");
      gainGb(self, 2);
      self.hp = Math.min(self.hp + (up ? 3 : 2), 60);
      if (mjolnirHome(self)) {
        gainEk(self, 3);
        log(state, playerIdx, "resolveAttack", `Mighty Summon: +2 Guard Break, Heal ${up ? 3 : 2}, +3 EK (Mjolnir home)`);
      } else {
        const r = shuttleOnce(self);
        const coll = up ? 4 : 3;
        queueDamage(state, oppIdx, coll);
        log(state, playerIdx, "resolveAttack", `Mighty Summon: +2 Guard Break, Heal ${up ? 3 : 2}, Retrieve -> ${coll} collateral (+${r.ekGained} EK)`);
      }
      return;
    }
    if (name.startsWith("Boom Boom!")) {
      gainEk(self, 2);
      log(state, playerIdx, "resolveAttack", "Boom Boom!: +2 EK");
      attack(6, true);
      return;
    }
    if (name.startsWith("Chain Lightning")) {
      const up = has("chain-lightning-ii");
      const r = chainLightningRoll(rng, up ? 4 : 3);
      const coll = up ? 3 : 2;
      queueDamage(state, oppIdx, coll);
      log(state, playerIdx, "resolveAttack", `Chain Lightning: rolled [${r.dice.join(",")}] -> ${r.total} dmg + ${coll} collateral`);
      attack(r.total, true);
      return;
    }
    if (name.startsWith("Odinforce")) {
      const base = has("odinforce-ii") ? 6 : 5;
      let r = odinforceRoll(rng);
      log(state, playerIdx, "resolveAttack", `Odinforce roll [${r.dice.join(",")}]`);
      if (has("odinforce-ii")) {
        const score = (r.hammers >= 2 ? 1 : 0) + (r.worthies >= 2 ? 1 : 0) + r.thunders;
        if (score <= 1) {
          r = odinforceRoll(rng);
          log(state, playerIdx, "resolveAttack", `Odinforce II re-roll -> [${r.dice.join(",")}]`);
        }
      }
      if (r.hammers >= 2) doShuttle(1, "Odinforce");
      if (r.worthies >= 2) {
        grantCp(self, 1);
        log(state, playerIdx, "resolveAttack", "Odinforce: +1 CP (2+ Worthy)");
      }
      if (r.thunders > 0) {
        gainEk(self, r.thunders);
        log(state, playerIdx, "resolveAttack", `Odinforce: +${r.thunders} EK (Thunder)`);
      }
      log(state, playerIdx, "resolveAttack", `Odinforce: ${base} base + ${ekOf()} EK`);
      attack(base + ekOf(), true);
      return;
    }
    if (name.startsWith("Bottled Lightning")) {
      const up = has("bottled-lightning-ii");
      doShuttle(up ? 3 : 2, "Bottled Lightning");
      gainGb(self, 2);
      log(state, playerIdx, "resolveAttack", "Bottled Lightning: +2 Guard Break");
      log(state, playerIdx, "resolveAttack", `Bottled Lightning: ${up ? 8 : 7} base + ${ekOf()} EK`);
      attack((up ? 8 : 7) + ekOf(), true);
      return;
    }
    if (name.startsWith("Ricochet!")) {
      doShuttle(6, "Ricochet!");
      return;
    }
    if (name.startsWith("Lightning Rod")) {
      if (has("lightning-rod-ii")) {
        doShuttle(1, "Lightning Rod");
        gainEk(self, 1);
        attack(9, true);
      } else if (!mjolnirHome(self)) {
        log(state, playerIdx, "resolveAttack", "Lightning Rod: opponent has Mjolnir -> 9 dmg");
        attack(9, true);
      } else {
        gainEk(self, 1);
        log(state, playerIdx, "resolveAttack", "Lightning Rod: +1 EK");
        attack(7, true);
      }
      return;
    }
    if (name.startsWith("Thunder Bolt")) {
      doShuttle(1, "Thunder Bolt");
      gainEk(self, 2);
      attack(has("thunder-bolt-ii") ? 12 : 10, true);
      return;
    }
    if (name.startsWith("Asgardian Brawn")) {
      self.hp = Math.min(self.hp + 4, 60);
      log(state, playerIdx, "resolveAttack", "Asgardian Brawn: Heal 4");
      return;
    }
    if (name.startsWith("For Asgard!")) {
      gainGb(self, 1);
      doShuttle(4, "For Asgard!");
      attack(14, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Thor ability matched (${name})`);
  }
  function applyDUAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const oppIdx = 1 - playerIdx;
    const opp = state.players[oppIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const takeFreeSteps = (upTo, label) => {
      if (upTo <= 0) return;
      const mode = self.humanControlled ? self.duStepsMode ?? "forward" : "forward";
      if (mode === "none") return;
      const n = mode === "forward1" || mode === "backward1" ? Math.min(1, upTo) : upTo;
      const dir = mode.startsWith("backward") ? -1 : 1;
      const moved = takeSteps(self, dir * n);
      if (moved !== 0) log(state, playerIdx, "resolveAttack", `${label}: ${Math.abs(moved)} step(s) ${moved > 0 ? "forward" : "backward"} (position ${footworkPos(self)})`);
    };
    const gainGb2 = (n, label) => {
      const g = gainGb(self, n);
      log(state, playerIdx, "resolveAttack", `${label}: +${g} Guard Break`);
    };
    const inflictDisarm2 = (label) => {
      const g = inflictDisarm(opp);
      log(state, playerIdx, "resolveAttack", `${label}: ${g > 0 ? "Disarm inflicted" : "opponent already Disarmed (stack 1)"}`);
    };
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      if (self.footworkBonusUsedThisTurn !== true) {
        const ob = offensiveBonusDmg2(footworkPos(self));
        if (ob > 0) {
          self.footworkBonusUsedThisTurn = true;
          result = { ...result, dmg: result.dmg + ob };
          log(state, playerIdx, "resolveAttack", `Offensive Bonus: +${ob} dmg (Footwork position ${footworkPos(self)})`);
        }
      }
      const gbWanted = policy.chooseGuardBreakSpend ? policy.chooseGuardBreakSpend(state, playerIdx, result.dmg) : result.dmg >= 5;
      if (!result.undefendable && !ultimate && (self.tokens.guardBreak ?? 0) > 0 && gbWanted) {
        const gb = tryGuardBreak(self, rng);
        log(state, playerIdx, "resolveAttack", `Guard Break: spent ${gb.spent}, rolls [${gb.rolls.join(",")}] \u2014 ${gb.success ? "attack is UNDEFENDABLE" : "failed"}`);
        if (gb.success) result = { ...result, undefendable: true };
      }
      log(state, playerIdx, "resolveAttack", `${name}: attack total ${result.dmg} dmg${result.undefendable ? " (undefendable)" : ""}`);
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Blade Flurry")) {
      const a = dice.filter((d) => d <= 3).length;
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("blade-flurry-ii") ? [5, 6, 7] : [4, 5, 6];
      const kindNeed = has("blade-flurry-ii") ? 3 : 4;
      const counts = /* @__PURE__ */ new Map();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      if (Math.max(...counts.values()) >= kindNeed) takeFreeSteps(1, `Blade Flurry (${kindNeed}-of-a-kind)`);
      attack(table[tier], true);
      return;
    }
    if (name.startsWith("Fancy Feet")) {
      gainGb2(1, "Fancy Feet");
      takeFreeSteps(3, "Fancy Feet");
      return;
    }
    if (name.startsWith("Balestra")) {
      takeFreeSteps(2, "Balestra");
      attack(has("balestra-ii") ? 8 : 6, true);
      return;
    }
    if (name.startsWith("Feint Attack")) {
      const up = has("feint-attack-ii");
      gainGb2(up ? 2 : 1, "Feint Attack");
      takeFreeSteps(1, "Feint Attack");
      attack(up ? 3 : 2, false);
      return;
    }
    if (name.startsWith("En Garde")) {
      const r = enGardeRoll(rng);
      log(state, playerIdx, "resolveAttack", `En Garde: rolled [${r.dice.join(",")}]${r.disarm ? " \u2014 Pierce!" : ""}`);
      if (r.disarm) inflictDisarm2("En Garde");
      attack(8, true);
      return;
    }
    if (name.startsWith("Strike (5-straight)")) {
      takeFreeSteps(1, "Strike");
      attack(10, true);
      return;
    }
    if (name.startsWith("Strike")) {
      attack(7, true);
      return;
    }
    if (name.startsWith("Bladewind")) {
      queueDamage(state, oppIdx, 3);
      flushDamage(state);
      log(state, playerIdx, "resolveAttack", "Bladewind: 3 collateral dmg");
      checkGameOver(state);
      return;
    }
    if (name.startsWith("Bladestorm")) {
      const up = has("bladestorm-ii");
      gainGb2(up ? 2 : 1, "Bladestorm");
      inflictDisarm2("Bladestorm");
      takeFreeSteps(2, "Bladestorm");
      attack(up ? 9 : 8, true);
      return;
    }
    if (name.startsWith("Master of the Blade!")) {
      gainGb2(2, "Master of the Blade!");
      inflictDisarm2("Master of the Blade!");
      takeFreeSteps(4, "Master of the Blade!");
      attack(11, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Duelist ability matched (${name})`);
  }
  function applySEAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const oppIdx = 1 - playerIdx;
    const opp = state.players[oppIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const dial = (n, label) => {
      const r = increaseDial(self, n);
      log(state, playerIdx, "resolveAttack", `${label}: Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal exc\xE8s)` : ""}${r.flipped === "dawn" ? " \u2014 FLIPS to DAWN" : ""} (now ${dialOf(self)})`);
    };
    const gem = (label) => {
      const g = gainChargedGem(self);
      log(state, playerIdx, "resolveAttack", `${label}: ${g > 0 ? "gained Charged Gem" : "Charged Gem already held (stack 1)"}`);
    };
    const mark = (label) => {
      const g = inflictSunMarked(opp);
      log(state, playerIdx, "resolveAttack", `${label}: ${g > 0 ? "Sun Marked inflicted" : "opponent already Sun Marked (stack 1)"}`);
    };
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      if (isDawn(self) && dialOf(self) > 0) {
        const wants = self.humanControlled ? self.seDawnSpendArmed === true : dialOf(self) >= 3;
        if (wants) {
          const bonus = dialOf(self);
          result = { ...result, dmg: result.dmg + bonus };
          const r = reduceDial(self, DAWN_SPEND_COST);
          self.seDawnSpendArmed = false;
          log(state, playerIdx, "resolveAttack", `Sun Dial (DAWN): +${bonus} dmg, dial -${r.reduced}${r.flipped === "dusk" ? " \u2014 FLIPS to DUSK" : ""} (now ${dialOf(self)})`);
        }
      }
      log(state, playerIdx, "resolveAttack", `${name}: attack total ${result.dmg} dmg${result.undefendable ? " (undefendable)" : ""}`);
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Light Staff")) {
      const a = dice.filter((d) => d <= 3).length;
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("light-staff-ii") ? [5, 6, 7] : [4, 5, 7];
      const kindNeed = has("light-staff-ii") ? 3 : 4;
      const counts = /* @__PURE__ */ new Map();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      if (Math.max(...counts.values()) >= kindNeed) dial(1, `Light Staff (${kindNeed}-of-a-kind)`);
      attack(table[tier], true);
      return;
    }
    if (name.startsWith("Ray Absorption")) {
      dial(3, "Ray Absorption");
      self.hp = Math.min(60, self.hp + 2);
      gem("Ray Absorption");
      log(state, playerIdx, "resolveAttack", "Ray Absorption: healed 2");
      return;
    }
    if (name.startsWith("Radiant Energy")) {
      mark("Radiant Energy");
      attack(6, true);
      return;
    }
    if (name.startsWith("Praise the Sun")) {
      gem("Praise the Sun");
      attack(5, true);
      return;
    }
    if (name.startsWith("Scorching Staff")) {
      const up = has("scorching-staff-ii");
      const r = scorchingBonus(rng, up);
      log(state, playerIdx, "resolveAttack", `Scorching Staff${up ? " II" : ""}: bonus roll [${r.dice.join(",")}]`);
      if (r.dialFromB > 0) dial(r.dialFromB, "Scorching Staff (Charge)");
      if (r.gemOnC) {
        gem("Scorching Staff (Sun Power)");
        dial(2, "Scorching Staff (Sun Power)");
      }
      attack(5 + r.addDmg, true);
      return;
    }
    if (name.startsWith("Sunbeam")) {
      dial(has("sunbeam-ii") ? 3 : 2, "Sunbeam");
      attack(9, true);
      return;
    }
    if (name.startsWith("Ray of Light")) {
      dial(1, "Ray of Light");
      attack(7, true);
      return;
    }
    if (name.startsWith("Soaking Up the Sun")) {
      gem("Soaking Up the Sun");
      attack(9, true);
      return;
    }
    if (name.startsWith("Bestow Your Light")) {
      dial(4, "Bestow Your Light");
      mark("Bestow Your Light");
      return;
    }
    if (name.startsWith("Solar Burst")) {
      dial(2, "Solar Burst");
      if (has("solar-burst-ii")) {
        gem("Solar Burst II");
        mark("Solar Burst II");
        attack(7, false);
      } else {
        if (self.humanControlled) {
          if (self.seBurstChoice === "mark") mark("Solar Burst");
          else gem("Solar Burst");
        } else if ((opp.tokens.sunMarked ?? 0) === 0 && (self.tokens.chargedGem ?? 0) > 0) mark("Solar Burst");
        else if ((self.tokens.chargedGem ?? 0) === 0) gem("Solar Burst");
        else mark("Solar Burst");
        attack(8, true);
      }
      return;
    }
    if (name.startsWith("Solar Flare!")) {
      dial(3, "Solar Flare!");
      gem("Solar Flare!");
      mark("Solar Flare!");
      attack(10, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Sun Elf ability matched (${name})`);
  }
  function applySMAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const oppIdx = 1 - playerIdx;
    const opp = state.players[oppIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const gainCombo2 = (label) => {
      const g = gainCombo(self);
      log(state, playerIdx, "resolveAttack", `${label}: ${g ? "gained Combo" : "Combo already held (stack 1)"}`);
    };
    const gainInvis = (label) => {
      const g = gainInvisibility(self);
      log(state, playerIdx, "resolveAttack", `${label}: ${g ? "gained Invisibility" : "Invisibility already held (stack 1)"}`);
    };
    const inflictWebbed2 = (label) => {
      const r = inflictWebbed(opp);
      if (r.gained) {
        queueDamage(state, oppIdx, r.isoDamage);
        log(state, playerIdx, "resolveAttack", `${label}: Webbed inflicted (2 isolated undefendable dmg)`);
      } else log(state, playerIdx, "resolveAttack", `${label}: opponent already Webbed (stack 1) \u2014 no effect`);
    };
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      self.smAttackedThisPhase = true;
      log(state, playerIdx, "resolveAttack", `${name}: attack total ${result.dmg} dmg${result.undefendable ? " (undefendable)" : ""}`);
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Punch")) {
      const a = dice.filter((d) => d <= 3).length;
      const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0;
      const table = has("punch-ii") ? [5, 6, 7] : [4, 5, 6];
      if (has("punch-ii")) {
        const counts = /* @__PURE__ */ new Map();
        for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
        if (Math.max(...counts.values()) >= 4) gainCombo2("Punch II (4-of-a-kind)");
      }
      attack(table[tier], true);
      return;
    }
    if (name.startsWith("C-C-C-Combo")) {
      attack(has("combo-ii") ? 6 : 5, true);
      gainCombo2("C-C-C-Combo");
      return;
    }
    if (name.startsWith("Web Shot")) {
      gainInvis("Web Shot");
      inflictWebbed2("Web Shot");
      flushDamage(state);
      checkGameOver(state);
      return;
    }
    if (name.startsWith("Spider-Reflexes")) {
      const two = [rollDie(rng), rollDie(rng)];
      const total = two[0] + two[1];
      log(state, playerIdx, "resolveAttack", `Spider-Reflexes: rolled [${two.join(",")}] -> ${total} dmg`);
      if (total <= 5) gainCombo2("Spider-Reflexes (total <= 5)");
      attack(total, true);
      return;
    }
    if (name.startsWith("Wall Crawler")) {
      gainInvis("Wall Crawler");
      attack(7, true);
      return;
    }
    if (name.startsWith("Ensnare")) {
      const large = name.includes("5-straight");
      if (large) {
        drawCards(self, 1, rng);
        log(state, playerIdx, "resolveAttack", "Ensnare (large): drew 1");
      }
      const dmg = has("ensnare-ii") ? large ? 9 : 6 : large ? 8 : 5;
      attack(dmg, true);
      if (!state.gameOver) {
        inflictWebbed2("Ensnare");
        flushDamage(state);
        checkGameOver(state);
      }
      return;
    }
    if (name.startsWith("Combo Up")) {
      gainCombo2("Combo Up");
      attack(2, false);
      return;
    }
    if (name.startsWith("Venom Punch")) {
      gainInvis("Venom Punch");
      attack(has("venom-punch-ii") ? 8 : 7, false);
      return;
    }
    if (name.startsWith("Venom Shockwave")) {
      gainInvis("Venom Shockwave");
      inflictWebbed2("Venom Shockwave");
      attack(13, false, true);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Spider-Man ability matched (${name})`);
  }
  function applyPYAbility(state, playerIdx, name, dice, rng, policies) {
    const self = state.players[playerIdx];
    const oppIdx = 1 - playerIdx;
    const opp = state.players[oppIdx];
    const policy = policies[playerIdx];
    const has = (id) => self.upgradesInPlay.includes(id);
    const fmOf = () => self.tokens.fireMastery ?? 0;
    const gainFm2 = (n, label) => {
      const g = gainFm(self, n);
      log(state, playerIdx, "resolveAttack", `${label}: +${g} Fire Mastery (now ${fmOf()}/${fmCap(self)})`);
    };
    const inflict = (kind, label) => {
      const g = inflictNegative(opp, kind);
      log(state, playerIdx, "resolveAttack", `${label}: ${kind} ${g > 0 ? "inflicted" : "already on opponent (stack 1)"}`);
    };
    const attack = (dmg, defendable, ultimate = false) => {
      let result = { dmg, undefendable: !defendable || ultimate };
      const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? [];
      for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng);
      if (result.dmg <= 0) {
        log(state, playerIdx, "resolveAttack", `${name} deals no damage \u2014 no defense roll`);
        return;
      }
      log(state, playerIdx, "resolveAttack", `${name}: attack total ${result.dmg} dmg${result.undefendable ? " (undefendable)" : ""}`);
      if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies);
      else resolveDefense(state, playerIdx, result.dmg, rng, policies);
    };
    if (name.startsWith("Fireball")) {
      const flames = dice.filter((d) => d <= 3).length;
      const tier = flames >= 5 ? 2 : flames >= 4 ? 1 : 0;
      gainFm2(has("fireball-ii") ? 2 : 1, "Fireball");
      attack([4, 6, 8][tier], true);
      return;
    }
    if (name.startsWith("Burning Soul")) {
      const souls = dice.filter((d) => d === 5).length;
      const up = has("burning-soul-ii");
      if (up && souls >= 4) {
        self.fmCapBonus = (self.fmCapBonus ?? 0) + 1;
        log(state, playerIdx, "resolveAttack", `Burning Soul II: Fire Mastery stack limit +1 (now ${fmCap(self)})`);
      }
      gainFm2(2 * souls, "Burning Soul");
      if (up && souls >= 3) inflict("burn", "Burning Soul II");
      queueDamage(state, oppIdx, souls);
      log(state, playerIdx, "resolveAttack", `Burning Soul: ${souls} collateral dmg`);
      flushDamage(state);
      checkGameOver(state);
      return;
    }
    if (name.startsWith("Combustion")) {
      gainFm2(1, "Combustion");
      const removable = Math.min(4, fmOf());
      self.tokens.fireMastery = fmOf() - removable;
      const per = has("combustion-ii") ? 4 : 3;
      const dmg = removable * per;
      log(state, playerIdx, "resolveAttack", `Combustion: removed ${removable} Fire Mastery -> ${dmg} undefendable dmg`);
      if (dmg > 0) queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies);
      return;
    }
    if (name.startsWith("Pyroblast")) {
      const nDice = has("pyroblast-ii") || has("pyroblast-iii") ? 2 : 1;
      let rolls = [];
      for (let i = 0; i < nDice; i++) rolls.push(rollDie(rng));
      log(state, playerIdx, "resolveAttack", `Pyroblast roll [${rolls.join(",")}]`);
      if (has("pyroblast-iii")) {
        const idx = rolls.findIndex((f) => f > 3);
        if (idx >= 0) {
          rolls[idx] = rollDie(rng);
          log(state, playerIdx, "resolveAttack", `Pyroblast III re-roll -> [${rolls.join(",")}]`);
        }
      }
      let add = 0;
      for (const f of rolls) {
        const eff = pyroBonusDieEffects(f);
        add += eff.addDmg;
        if (eff.burn) inflict("burn", "Pyroblast");
        if (eff.knockdown) inflict("knockdown", "Pyroblast");
        if (eff.fm > 0) gainFm2(eff.fm, "Pyroblast");
      }
      attack(6 + add, true);
      return;
    }
    if (name.startsWith("Hot Streak")) {
      gainFm2(2, "Hot Streak");
      attack((has("hot-streak-ii") ? 6 : 5) + fmOf(), true);
      return;
    }
    if (name.startsWith("Ignite")) {
      gainFm2(2, "Ignite");
      if (has("ignite-ii")) inflict("burn", "Ignite II");
      attack((has("ignite-ii") ? 5 : 4) + 2 * fmOf(), true);
      return;
    }
    if (name.startsWith("Scorch the Earth")) {
      gainFm2(3, "Scorch the Earth");
      inflict("knockdown", "Scorch the Earth");
      inflict("burn", "Scorch the Earth");
      queueDamage(state, oppIdx, 2);
      attack(12, false, true);
      return;
    }
    if (name.startsWith("Scorch")) {
      gainFm2(2, "Scorch");
      inflict("burn", "Scorch");
      attack(6, true);
      return;
    }
    if (name.startsWith("Blazing Soul")) {
      self.fmCapBonus = (self.fmCapBonus ?? 0) + 1;
      log(state, playerIdx, "resolveAttack", `Blazing Soul: Fire Mastery stack limit +1 (now ${fmCap(self)})`);
      gainFm2(5, "Blazing Soul");
      inflict("knockdown", "Blazing Soul");
      return;
    }
    if (name.startsWith("Meteoroid")) {
      inflict("knockdown", "Meteoroid");
      inflict("burn", "Meteoroid");
      inflict("stun", "Meteoroid");
      return;
    }
    if (name.startsWith("Meteorite")) {
      gainFm2(2, "Meteorite");
      inflict("stun", "Meteorite");
      const coll = has("meteorite-ii") ? 3 : 2;
      queueDamage(state, oppIdx, coll);
      log(state, playerIdx, "resolveAttack", `Meteorite: ${coll} collateral dmg`);
      const dmg = fmOf();
      log(state, playerIdx, "resolveAttack", `Meteorite: ${dmg} undefendable dmg (1 per Fire Mastery)`);
      queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies);
      return;
    }
    log(state, playerIdx, "resolveAttack", `Whiff \u2014 no Pyromancer ability matched (${name})`);
  }
  function playEndOfTurn(state, playerIdx) {
    const self = state.players[playerIdx];
    if ((self.tokens.hex ?? 0) > 0) {
      self.tokens.hex = 0;
      log(state, playerIdx, "endOfTurn", "Hex removed (end of afflicted turn)");
    }
    if (self.heroId === "dr" && formOf(self) === "druid") {
      grantRegen2(self, 1);
      log(state, playerIdx, "endOfTurn", "Druid Form: gained Regenerate (2)");
    }
    if (self.hoardedDice > 0) {
      log(state, playerIdx, "endOfTurn", `Hoarding: ${self.hoardedDice} stolen die returned`);
      self.hoardedDice = 0;
    }
    const opp = state.players[1 - playerIdx];
    if (self.heroId === "hh" && endOfTurnHeadCheck(self)) {
      log(state, playerIdx, "endOfTurn", "Opponent holds the Head: +1 Dreadful");
    }
    log(state, playerIdx, "endOfTurn", `HP: self=${self.hp}, opp=${opp.hp}`);
  }
  function playTurn(state, playerIdx, rng, policies) {
    const policy = policies[playerIdx];
    {
      const brief = (p) => {
        const toks = Object.entries(p.tokens).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(" ");
        const mj = p.heroId === "th" ? ` mjolnir:${p.mjolnirAway ? "away" : "home"}` : "";
        const up = p.upgradesInPlay.length ? ` upg:${p.upgradesInPlay.length}` : "";
        return `HP${p.hp} CP${p.cp}${up}${mj}${toks ? ` [${toks}]` : ""}`;
      };
      const s = state.players[playerIdx], o = state.players[1 - playerIdx];
      log(state, playerIdx, "upkeep", `===== ${s.heroId.toUpperCase()} turn \u2014 ${s.heroId} ${brief(s)} | vs ${o.heroId} ${brief(o)} (hand ${s.hand.length})`);
    }
    playUpkeepPhase(state, playerIdx, rng, policy);
    if (checkGameOver(state)) return;
    playIncomePhase(state, playerIdx, rng);
    playMainPhase(state, playerIdx, "main1", policies, rng);
    const kdSelf = state.players[playerIdx];
    let skipOffense = false;
    if ((kdSelf.tokens.knockdown ?? 0) > 0) {
      kdSelf.tokens.knockdown = 0;
      if (kdSelf.cp >= KNOCKDOWN_COST) {
        kdSelf.cp -= KNOCKDOWN_COST;
        log(state, playerIdx, "roll", `Knockdown: paid ${KNOCKDOWN_COST} CP, token removed`);
      } else {
        skipOffense = true;
        log(state, playerIdx, "roll", "Knockdown: cannot pay \u2014 skips Offensive Roll Phase, token removed");
      }
    }
    if (!skipOffense) {
      const dice = playOffensiveRollPhase(state, playerIdx, rng, policy);
      const finalDice = resolveOffensiveAlterWindow(state, playerIdx, dice, rng, policies);
      resolveAbilityPhase(state, playerIdx, finalDice, rng, policies);
      if (checkGameOver(state)) return;
    }
    const stunOpp = state.players[1 - playerIdx];
    for (let guard = 0; (stunOpp.tokens.stun ?? 0) > 0 && guard < 3; guard++) {
      stunOpp.tokens.stun = 0;
      log(state, playerIdx, "resolveAttack", "Stun: token removed \u2014 additional Offensive Roll Phase vs the stunned opponent");
      const dS = playOffensiveRollPhase(state, playerIdx, rng, policy);
      const fS = resolveOffensiveAlterWindow(state, playerIdx, dS, rng, policies);
      resolveAbilityPhase(state, playerIdx, fS, rng, policies);
      if (checkGameOver(state)) return;
    }
    const smSelf = state.players[playerIdx];
    if (smSelf.heroId === "sm" && (smSelf.tokens.combo ?? 0) > 0 && !smSelf.comboSpentThisTurn && smSelf.smAttackedThisPhase === true) {
      smSelf.tokens.combo = 0;
      smSelf.comboSpentThisTurn = true;
      log(state, playerIdx, "resolveAttack", "Combo spent: additional Offensive Roll Phase");
      const d2 = playOffensiveRollPhase(state, playerIdx, rng, policy);
      const f2 = resolveOffensiveAlterWindow(state, playerIdx, d2, rng, policies);
      resolveAbilityPhase(state, playerIdx, f2, rng, policies);
      if (checkGameOver(state)) return;
    }
    playMainPhase(state, playerIdx, "main2", policies, rng);
    playDiscardPhase(state, playerIdx, policy);
    playEndOfTurn(state, playerIdx);
  }

  // src/sim/match.ts
  function buildFullDeck(heroId) {
    const hero = heroTemplateFor(heroId);
    const out = [];
    for (const c of hero.cards) for (let i = 0; i < (c.count ?? 1); i++) out.push(c.id);
    for (const c of commonCards.cards) for (let i = 0; i < (c.count ?? 1); i++) out.push(c.id);
    return out;
  }
  function createInitialPlayer(heroId, rng, isFirstPlayer = true) {
    let deck = [];
    let hand = [];
    if (rng && heroId !== "nx") {
      deck = shuffle(buildFullDeck(heroId), rng);
      hand = deck.splice(0, STARTING_HAND_SIZE);
    }
    const tokens = heroId === "hh" ? createInitialHHTokens(true) : heroId === "fm" ? createInitialFMTokens() : heroId === "nx" ? createInitialNXTokens() : heroId === "rv" ? createInitialRVTokens() : heroId === "dr" ? createInitialDRTokens() : heroId === "th" ? createInitialTHTokens() : heroId === "sm" ? createInitialSMTokens() : heroId === "py" ? createInitialPYTokens() : heroId === "du" ? createInitialDUTokens() : heroId === "se" ? createInitialSETokens() : createInitialBWTokens();
    if (heroId === "hh" && !isFirstPlayer) {
      tokens.dreadful += 1;
    }
    return {
      heroId,
      // Naraxus (boss) : 65 PV en 1v1 (65/65/70/75 selon 1-4 héros, planche vérifiée), 0 carte.
      hp: heroId === "nx" ? NX_HP_BY_HEROES[0] : STARTING_HP,
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
      grimPursuitRerollUsedThisTurn: false,
      minesDrawUsedThisTurn: false,
      hoardedDice: 0,
      nevermoreDial: 0,
      featherCapBonus: 0,
      form: heroId === "dr" ? "druid" : void 0,
      // Forgemaster zones (inert for other heroes). 1v1 setup: NO starting Armor (the leaflet's
      // "begin with any one Gold Armor" only applies with more than 1 opponent).
      forge: [],
      armor: { helmet: 0, shield: 0 }
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
  function runBossMatch(heroId, seed, policy, hard = false, hoard = "draw") {
    const rng = mulberry32(seed);
    const state = createInitialGameState(heroId, "nx", rng);
    state.bossHard = hard;
    const hero = state.players[0];
    if (hoard === "draw") {
      const c = hero.deck.shift();
      if (c) hero.hand.push(c);
    } else hero.cp += 2;
    const policies = [policy, policy];
    while (!state.gameOver && state.turnNumber < MAX_TURNS) {
      state.turnNumber += 1;
      playNaraxusTurn(state, 1, rng, policies);
      if (state.gameOver) break;
      playTurn(state, 0, rng, policies);
    }
    return { winner: state.winner, turns: state.turnNumber, finalState: state };
  }
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
    // Grim Pursuit (a) : E[bonus] = 5 dés x P(Fer)=2/6 ~ +1.67 dégâts pour 1 jeton. Un jeton
    // stocké ne vaut que par sa dépense (cap 3) : on dépense dès que l'attaque touche.
    chooseGrimPursuitSpend(state, playerIdx, dmg) {
      return dmg > 0;
    },
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
  function newHumanGame(humanHero, aiHero, ai, rng, humanFirst = true, bossHard = false) {
    if (aiHero === "nx") humanFirst = true;
    const state = humanFirst ? createInitialGameState(humanHero, aiHero, rng) : createInitialGameState(aiHero, humanHero, rng);
    state.bossHard = bossHard;
    const humanIdx = humanFirst ? 0 : 1;
    return { state, humanIdx, aiIdx: 1 - humanIdx, ai, rng };
  }
  function humanDragonsHoard(g, choice) {
    const self = g.state.players[g.humanIdx];
    if (choice === "draw") {
      const c = self.deck.shift();
      if (c) self.hand.push(c);
    } else self.cp += 2;
    g.state.log.push({ turn: 0, playerIdx: g.humanIdx, phase: "income", message: `Dragon's Hoard: ${choice === "draw" ? "drew 1" : "+2 CP"}` });
  }
  function humanMinePeek(g) {
    return g.state.players[g.humanIdx].deck.slice(0, 3);
  }
  function humanMinesDraw(g) {
    const self = g.state.players[g.humanIdx];
    if (self.heroId !== "fm" || self.cp < 3 || self.minesDrawUsedThisTurn) return false;
    self.cp -= 3;
    self.minesDrawUsedThisTurn = true;
    drawCards(self, 1, g.rng);
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "main1", message: "The Mines: spent 3 CP, drew 1 card" });
    return true;
  }
  function humanScrap(g, oreId, choice) {
    const self = g.state.players[g.humanIdx];
    const i = self.forge.indexOf(oreId);
    if (i < 0) return false;
    const legal = oreId === "gold-ore" && (choice === "heal" || choice === "cp") || oreId === "diamond-ore" && choice === "cp" || oreId === "ultimanium-ore" && choice === "draw2";
    if (!legal) return false;
    if (choice === "heal") self.hp = Math.min(self.hp + 1, STARTING_HP + HEAL_CAP_ABOVE_STARTING);
    else if (choice === "cp") grantCp(self, 1);
    else drawCards(self, 2, g.rng);
    self.forge.splice(i, 1);
    self.discard.push(oreId);
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "main1", message: `Scrap: ${oreId} -> ${choice}` });
    return true;
  }
  function humanScrapDie(g, oreId, dice, dieIndex, mode) {
    const self = g.state.players[g.humanIdx];
    const i = self.forge.indexOf(oreId);
    if (i < 0 || dieIndex < 0 || dieIndex >= dice.length) return null;
    if (!(oreId === "diamond-ore" && mode === "reroll" || oreId === "ultimanium-ore" && mode === "set6")) return null;
    const out = dice.slice();
    out[dieIndex] = mode === "set6" ? 6 : rollDie(g.rng);
    self.forge.splice(i, 1);
    self.discard.push(oreId);
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "roll", message: `Scrap: ${oreId} -> die ${dieIndex + 1} ${mode === "set6" ? "set to 6" : `rerolled to ${out[dieIndex]}`}` });
    return out;
  }
  function humanForgeOre(g) {
    const self = g.state.players[g.humanIdx];
    const ores = self.hand.filter(isOre);
    if (ores.length) {
      self.hand = self.hand.filter((id) => !isOre(id));
      self.forge.push(...ores);
      g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "main1", message: `The Forge: placed ${ores.join(",")} from hand` });
    }
    return ores;
  }
  function humanCraftOptions(g) {
    return craftOptions(g.state.players[g.humanIdx]);
  }
  function humanCraft(g, armorId) {
    const r = craftSpecific(g.state.players[g.humanIdx], armorId);
    if (r) g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: "main1", message: `Crafted ${r.armorId} (tier ${r.tier} ${r.slot})` });
    return r;
  }
  function beginHumanTurn(g, mayhem, fmMine) {
    g.state.turnNumber += 1;
    let policy = greedyHighestDamagePolicy;
    if (mayhem) policy = { ...policy, chooseHeadlessMayhem: () => mayhem };
    if (fmMine) policy = { ...policy, chooseFmMine: () => fmMine };
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
    const n = 5 - (g.state.players[g.humanIdx].hoardedDice || 0);
    if (!prev) return rollDice(n, g.rng).sort((a, b) => a - b);
    const kept = prev.filter((_, i) => keep[i]);
    const rerolled = rollDice(n - kept.length, g.rng);
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
    if (g.state.pendingRoll) {
      resolveResponseWindow(
        g.state,
        [g.humanIdx, g.aiIdx],
        { windowType: "offensiveRoll" },
        g.rng,
        order(g, g.ai, passPolicy),
        enumerateWindowActions,
        applyWindowAction
      );
    }
    const d = g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : [];
    g.state.pendingRoll = null;
    return d;
  }
  function matchedAbilities(g, dice) {
    const self = g.state.players[g.humanIdx];
    const opp = g.state.players[g.aiIdx];
    return resolveMatchedAbilities(self.heroId, dice, oracleStateFor(self, opp));
  }
  function humanAttack(g, dice, abilityName, gpBonus = false, attackMods = [], fmMine, gbSpend = false) {
    const humanPolicy = {
      ...greedyHighestDamagePolicy,
      chooseAbility: () => abilityName,
      chooseGrimPursuitSpend: () => gpBonus,
      // Thor : sans ce hook, l'heuristique IA (dmg >= 5) dépensait les Guard Break du joueur
      // humain automatiquement (user-caught) — ici c'est SON toggle UI qui décide.
      chooseGuardBreakSpend: () => gbSpend,
      chooseAttackModifierCards: (_s, _p, _d, eligible) => attackMods.filter((id) => eligible.includes(id)),
      ...fmMine ? { chooseFmMine: () => fmMine } : {}
    };
    const policies = g.humanIdx === 0 ? [humanPolicy, g.ai] : [g.ai, humanPolicy];
    resolveAbilityPhase(g.state, g.humanIdx, dice, g.rng, policies);
  }
  function humanAttackModifierOptions(g, grimPursuitIncoming = false) {
    const self = g.state.players[g.humanIdx];
    const hero = heroTemplateFor(self.heroId);
    const ids = eligibleAttackModifierCardIds(self);
    if (grimPursuitIncoming && !ids.includes("unescapable") && self.hand.includes("unescapable")) {
      const card = cardById(hero, "unescapable");
      if (card && self.cp >= (card.cpCost ?? 0)) ids.push("unescapable");
    }
    return ids;
  }
  function humanFreeRerollDie(g, vals, dieIndex) {
    const out = vals.slice();
    out[dieIndex] = rollDice(1, g.rng)[0];
    return out;
  }
  function humanPlayRollCard(g, choice, dice) {
    return applyRollManipulationCard(g.state, g.humanIdx, choice, dice, g.rng);
  }
  function humanInstantOptions(g) {
    return enumerateWindowActions(g.state, g.humanIdx, { windowType: "mainPhase", phase: "main1" }).filter((a) => a.kind === "playInstant" || a.kind === "moveHead");
  }
  function humanApplyInstant(g, action) {
    applyWindowAction(g.state, g.humanIdx, action, { windowType: "mainPhase", phase: "main1" }, g.rng);
  }
  function humanKeepAdvice(g, dice, rollsRemaining, useWildcards = true) {
    const self = g.state.players[g.humanIdx];
    const opp = g.state.players[g.aiIdx];
    const cfg = self.heroId === "hh" ? hhConfig : self.heroId === "fm" ? fmConfig : self.heroId === "rv" ? rvConfig : self.heroId === "dr" ? drConfig : self.heroId === "th" ? thConfig : self.heroId === "sm" ? smConfig : self.heroId === "py" ? pyConfig : self.heroId === "du" ? duConfig : self.heroId === "se" ? seConfig : bwConfig;
    const state = oracleStateFor(self, opp);
    state.wildcards = useWildcards ? {
      sixIt: self.hand.includes("six-it") && self.cp >= 1,
      soWild: self.hand.includes("so-wild") && self.cp >= 2,
      twiceAsWild: self.hand.includes("twice-as-wild") && self.cp >= 3,
      samesies: self.hand.includes("samesies") && self.cp >= 1,
      tipIt: self.hand.includes("tip-it") && self.cp >= 1
    } : {};
    const r = calculateOptimalKeep(cfg, dice, rollsRemaining, state);
    const top = r.topOptions[0];
    return { kept: top.kept, ev: top.ev, keepAllEv: r.currentEv, topOptions: r.topOptions };
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
  function defensePolicy(script, probe, roarDiscard) {
    let i = 0;
    return {
      ...greedyHighestDamagePolicy,
      ...roarDiscard ? { chooseDiscardForRoar: () => roarDiscard } : {},
      decide(state, _p, req) {
        if (i < script.length) return script[i++];
        if (probe && !probe.captured) {
          const fromLog = [...state.log].reverse().find((e) => e.message.startsWith("Defense dice: "));
          probe.captured = {
            ctx: req.ctx,
            options: req.options,
            remaining: req.ctx.windowType === "defense" ? state.pendingAttack?.remaining ?? null : null,
            defenseDice: state.pendingRoll ? state.pendingRoll.dice.slice() : fromLog ? fromLog.message.slice("Defense dice: ".length).split(",").map(Number) : null
          };
        }
        i++;
        return { kind: "pass" };
      }
    };
  }
  function computeAttackInfo(g, dice) {
    const ai = g.state.players[g.aiIdx];
    if (ai.heroId === "nx") {
      const face = g.state.bossHard ? Math.max(...dice) : dice[0];
      const info = nxAttackInfo(face);
      return { abilityName: info.name, incomingDamage: info.dmg, defendable: info.defendable };
    }
    const human = g.state.players[g.humanIdx];
    const cands = resolveMatchedAbilities(ai.heroId, dice, oracleStateFor(ai, human));
    if (cands.length === 0) return { abilityName: null, incomingDamage: 0, defendable: false };
    const name = cands.length === 1 ? cands[0].name : g.ai.chooseAbility(g.state, g.aiIdx, cands);
    const c = cands.find((x) => x.name === name) ?? cands[0];
    return { abilityName: name, incomingDamage: c.baseDamage ?? 0, defendable: c.defendable ?? true };
  }
  function runAiTurnUpToAttack(g) {
    const r = runAiTurnUpToAlter(g);
    if (r.done) return { done: true };
    return finishAiAlter(g);
  }
  function runAiTurnUpToAlter(g) {
    if (g.state.gameOver) return { done: true };
    g.state.turnNumber += 1;
    if (g.state.players[g.aiIdx].heroId === "nx") {
      const dice2 = naraxusUpToRoll(g.state, g.aiIdx, g.rng);
      if (g.state.gameOver || !dice2.length) return { done: true };
      g.state.pendingRoll = { rollerIdx: g.aiIdx, dice: dice2 };
      return { done: false, dice: dice2.slice() };
    }
    playUpkeepPhase(g.state, g.aiIdx, g.rng, g.ai);
    if (checkGameOver(g.state)) return { done: true };
    playIncomePhase(g.state, g.aiIdx, g.rng);
    playMainPhase(g.state, g.aiIdx, "main1", order(g, g.ai, passPolicy), g.rng);
    const dice = playOffensiveRollPhase(g.state, g.aiIdx, g.rng, g.ai);
    g.state.pendingRoll = { rollerIdx: g.aiIdx, dice };
    return { done: false, dice: dice.slice() };
  }
  function humanAiAlterOptions(g) {
    if (!g.state.pendingRoll) return [];
    return enumerateWindowActions(g.state, g.humanIdx, { windowType: "offensiveRoll" }).filter((a) => a.kind !== "pass");
  }
  function humanApplyAiAlter(g, action) {
    applyWindowAction(g.state, g.humanIdx, action, { windowType: "offensiveRoll" }, g.rng);
    return g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : [];
  }
  function finishAiAlter(g) {
    const pr = g.state.pendingRoll;
    const dice = pr ? pr.dice : [];
    resolveResponseWindow(
      g.state,
      [g.aiIdx, g.humanIdx],
      { windowType: "offensiveRoll" },
      g.rng,
      order(g, g.ai, passPolicy),
      enumerateWindowActions,
      applyWindowAction
    );
    const finalDice = g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : dice;
    g.state.pendingRoll = null;
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
    resolveAbilityPhase(clone, g.aiIdx, d.finalDice, cloneRng, order(g, g.ai, defensePolicy(d.script, probe, d.roarDiscard)));
    return probe.captured;
  }
  function nevermoreRollDue(g, beforeTurnOf) {
    const human = g.state.players[g.humanIdx], ai = g.state.players[g.aiIdx];
    if (beforeTurnOf === "ai") return human.heroId === "rv" && (ai.tokens.nevermore ?? 0) > 0;
    return ai.heroId === "rv" && (human.tokens.nevermore ?? 0) > 0 && human.heroId !== "rv";
  }
  function humanNevermoreRollStart(g) {
    return 1 + Math.floor(g.rng() * 6);
  }
  function humanNevermoreCull(g, newFace) {
    const rvP = g.state.players.find((p) => p.heroId === "rv");
    const i = rvP.hand.indexOf("cull");
    if (i < 0 || rvP.cp < 1) return newFace;
    rvP.cp -= 1;
    rvP.hand.splice(i, 1);
    rvP.discard.push("cull");
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.state.players.indexOf(rvP), phase: "upkeep", message: `Cull!: Nevermore Die Roll set to ${newFace}` });
    return newFace;
  }
  function humanNevermoreFeatherShift(g, face, delta) {
    const rvP = g.state.players.find((p) => p.heroId === "rv");
    if ((rvP.tokens.feather ?? 0) < 2) return face;
    const nf = Math.max(1, Math.min(6, face + delta));
    if (nf === face) return face;
    rvP.tokens.feather -= 2;
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.state.players.indexOf(rvP), phase: "upkeep", message: `2 Feathers: Nevermore Die Roll ${face} -> ${nf}` });
    return nf;
  }
  function humanNevermoreFeatherReroll(g, face) {
    const rvP = g.state.players.find((p) => p.heroId === "rv");
    if ((rvP.tokens.feather ?? 0) < 1) return face;
    rvP.tokens.feather -= 1;
    const nf = 1 + Math.floor(g.rng() * 6);
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.state.players.indexOf(rvP), phase: "upkeep", message: `1 Feather: Nevermore Die Roll re-rolled ${face} -> ${nf}` });
    return nf;
  }
  function humanNevermoreFinish(g, face, discardId) {
    const rvIdx = g.state.players[0].heroId === "rv" ? 0 : 1;
    const holderIdx = 1 - rvIdx;
    const rvP = g.state.players[rvIdx], holder = g.state.players[holderIdx];
    const r = applyNevermoreDieFace(rvP, holder, face);
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: holderIdx, phase: "upkeep", message: `Nevermore Die Roll: ${face}` + (r.hexInflicted ? " \u2014 gains Hex (6s are blanks this turn)" : r.activations ? ` \u2014 Raveness activates Nevermore x${r.activations}` : r.discards ? " \u2014 must discard 1 of choice" : r.cpStolen !== void 0 ? ` \u2014 loses ${r.cpStolen} CP to the Raveness` : " \u2014 dial to 0, Nevermore returns (no heal)") });
    if (r.activations) performNevermoreActivations(g.state, rvIdx, r.activations, g.rng, void 0);
    if (r.discards && holder.hand.length) {
      const pick = discardId && holder.hand.includes(discardId) ? discardId : holder.hand[0];
      holder.hand.splice(holder.hand.indexOf(pick), 1);
      holder.discard.push(pick);
      g.state.log.push({ turn: g.state.turnNumber, playerIdx: holderIdx, phase: "upkeep", message: `Nevermore: discarded ${pick}` });
    }
    g.state.nevermoreRollResolved = true;
  }
  function humanSetRoarDiscard(g, cardId) {
    if (g.def) g.def.roarDiscard = cardId;
  }
  function chooseDefense(g, action) {
    if (g.def) g.def.script.push(action);
  }
  function resolveAiAttack(g) {
    const d = g.def;
    if (!d) return;
    resolveAbilityPhase(g.state, g.aiIdx, d.finalDice, g.rng, order(g, g.ai, defensePolicy(d.script, void 0, d.roarDiscard)));
    checkGameOver(g.state);
  }
  function aiComboPending(g) {
    if (g.state.gameOver) return false;
    const ai = g.state.players[g.aiIdx];
    return ai.heroId === "sm" && (ai.tokens.combo ?? 0) > 0 && !ai.comboSpentThisTurn && ai.smAttackedThisPhase === true;
  }
  function startAiComboOrp(g) {
    if (!aiComboPending(g)) return { done: true };
    const ai = g.state.players[g.aiIdx];
    ai.tokens.combo = 0;
    ai.comboSpentThisTurn = true;
    g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.aiIdx, phase: "resolveAttack", message: "Combo spent: additional Offensive Roll Phase" });
    const dice = playOffensiveRollPhase(g.state, g.aiIdx, g.rng, g.ai);
    g.state.pendingRoll = { rollerIdx: g.aiIdx, dice };
    return { done: false, dice: dice.slice() };
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
  var HERO_IDS = ["hh", "bw", "fm", "rv", "dr", "th", "sm", "py", "du", "se"];
  var ENCODINGS = Object.fromEntries(HERO_IDS.map((h) => [h, buildHeroEncoding(h)]));
  var UPGRADE_ONEHOT_SIZE = Math.max(...HERO_IDS.map((h) => ENCODINGS[h].upgradeIds.length));
  var HAND_ONEHOT_SIZE = Math.max(...HERO_IDS.map((h) => ENCODINGS[h].deckSize));
  function encodeUpgradesInPlay(p) {
    const enc = ENCODINGS[p.heroId] ?? ENCODINGS.hh;
    const out = new Array(UPGRADE_ONEHOT_SIZE).fill(0);
    for (const id of p.upgradesInPlay) {
      const idx = enc.upgradeIds.indexOf(id);
      if (idx >= 0 && idx < UPGRADE_ONEHOT_SIZE) out[idx] = 1;
    }
    return out;
  }
  function encodeHand(p) {
    const enc = ENCODINGS[p.heroId] ?? ENCODINGS.hh;
    const out = new Array(HAND_ONEHOT_SIZE).fill(0);
    for (const id of p.hand) {
      const idx = enc.deckIndex.get(id);
      if (idx !== void 0) out[idx] = 1;
    }
    return out;
  }
  function encodePlayer(p) {
    const deckSize = (ENCODINGS[p.heroId] ?? ENCODINGS.hh).deckSize;
    return [
      p.hp / MAX_HP,
      p.cp / CP_CAP,
      p.hand.length / MAX_HAND_SIZE,
      p.deck.length / deckSize,
      p.discard.length / deckSize,
      p.upgradesInPlay.length / MAX_UPGRADES_IN_PLAY,
      p.timeBombs.length / TIME_BOMB_STACK_CAP,
      p.upgradesPlayedThisTurn / MAX_UPGRADES_PLAYED_PER_TURN,
      // v3 : identité à 8 héros (remplace isHH/isBW/isFM)
      ...HERO_IDS.map((h) => p.heroId === h ? 1 : 0),
      // Forgemaster : la Forge et les armures sont SON état stratégique central — sans ces
      // features le réseau ne peut pas valoriser un état fm (zéro pour les autres héros).
      p.forge.filter((id) => id === "gold-ore").length / 9,
      p.forge.filter((id) => id === "diamond-ore").length / 6,
      p.forge.filter((id) => id === "ultimanium-ore").length,
      p.armor.helmet / 3,
      p.armor.shield / 3,
      // Tokens read straight from the generic bag for BOTH heroes (v2: un-gated). Cross-player
      // token transfer cards mean any player can end up holding any bag token; gating by hero
      // hid that from the network.
      p.tokens.dreadful / DREADFUL_CAP,
      p.tokens.grimPursuit / GRIM_PURSUIT_CAP,
      p.tokens.head,
      p.tokens.agility / AGILITY_CAP,
      p.tokens.covertOps / COVERT_OPS_CAP,
      // v3 : jetons des 5 nouveaux héros (normalisés à leur cap)
      (p.tokens.feather ?? 0) / 5,
      p.tokens.hex ?? 0,
      p.tokens.nevermore ?? 0,
      (p.nevermoreDial ?? 0) / 3,
      (p.tokens.shapeShift ?? 0) / 2,
      (p.tokens.regen2 ?? 0) / 2,
      (p.tokens.regen1 ?? 0) / 2,
      (p.tokens.wound ?? 0) / 2,
      (p.tokens.electrokinesis ?? 0) / 4,
      (p.tokens.guardBreak ?? 0) / 2,
      p.tokens.combo ?? 0,
      p.tokens.webbed ?? 0,
      p.tokens.invisibility ?? 0,
      (p.tokens.fireMastery ?? 0) / 7,
      p.tokens.burn ?? 0,
      p.tokens.knockdown ?? 0,
      p.tokens.stun ?? 0,
      (p.fmCapBonus ?? 0) / 2,
      // v4 : jetons Duelist / Sun Elf
      p.tokens.disarm ?? 0,
      p.tokens.chargedGem ?? 0,
      p.tokens.sunMarked ?? 0,
      // Druid : forme (3 one-hot) ; Thor : Mjölnir chez l'adversaire
      p.form === "druid" ? 1 : 0,
      p.form === "cat" ? 1 : 0,
      p.form === "bear" ? 1 : 0,
      p.mjolnirAway === true ? 1 : 0,
      // v4 : Duelist — piste Footwork (-2..+2 normalisée) + bonus du tour dispo ;
      // Sun Elf — cadran (0-5 normalisé) + face DAWN.
      (p.footwork ?? 0) / 2,
      p.footworkBonusUsedThisTurn === true ? 1 : 0,
      (p.sunDial ?? 0) / 5,
      p.sunDialDawn === true ? 1 : 0,
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
  var PLAYER_BLOCK_SIZE = 57 + UPGRADE_ONEHOT_SIZE;
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
    if (cardId === "six-it" || cardId === "radiant-exchange") {
      for (let i = 0; i < n; i++) out.push({ cardId, dieIndices: [i], values: [6] });
    } else if (cardId === "so-wild") {
      const soWildValues = Array.from(/* @__PURE__ */ new Set([6, ...dice]));
      for (let i = 0; i < n; i++) {
        for (const v of soWildValues) {
          if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] });
        }
      }
    } else if (cardId === "he-is-worthy" || cardId === "quick-footwork") {
      for (let i = 0; i < n; i++) {
        for (const v of [4, 5]) if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] });
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
        const freebie = request.options.find((o) => (o.kind === "playCard" || o.kind === "playInstant") && o.cardId && ["vegas-baby", "getting-paid"].includes(o.cardId));
        if (freebie) return freebie;
        const covert = request.options.filter((o) => o.kind === "covertOpsUpgrade");
        if (covert.length === 1) return covert[0];
        if (covert.length > 1) request = { ...request, options: covert };
        if (request.ctx.windowType === "mainPhase") {
          const upgradePlays = request.options.filter((o) => {
            if (o.kind !== "playCard") return false;
            const self = state.players[playerIdx];
            const card = cardById(heroTemplateFor(self.heroId), o.cardId);
            if (card?.kind !== "upgrade") return false;
            if (self.heroId === "hh" && self.cp < (card.cpCost ?? 0) + 2) return false;
            return true;
          });
          const rrt = upgradePlays.find((o) => o.cardId === "red-room-training-ii");
          if (rrt) return rrt;
          if (upgradePlays.length === 1) return upgradePlays[0];
          if (upgradePlays.length > 1) request = { ...request, options: upgradePlays };
        }
        {
          const sells = request.options.filter((o) => o.kind === "sellCard");
          if (sells.length > 1) {
            const keep = /* @__PURE__ */ new Set([sells[0]]);
            request = { ...request, options: request.options.filter((o) => o.kind !== "sellCard" || keep.has(o)) };
          }
          if (request.options.length > 12) {
            const pass = request.options.filter((o) => o.kind === "pass");
            const rest = request.options.filter((o) => o.kind !== "pass").slice(0, 11);
            request = { ...request, options: [...pass, ...rest] };
          }
        }
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
      // Enquête v3 (2026-07-05) : le scoring par replay répondait NON 100% du temps — l'écart
      // (+1.67 dégâts espérés) est sous le bruit de décision du réseau, et l'égalité retombe
      // sur "ne pas dépenser". 59 jetons gagnés / 0 dépensés sur 12 parties => la calibration
      // mesurait un jeton JAMAIS UTILISÉ (0.35). Règle robuste : dépenser dès que l'attaque
      // touche, sauf garder le dernier jeton si Unescapable! est en main (mode b).
      chooseGrimPursuitSpend(state, playerIdx, dmg) {
        if (dmg <= 0) return false;
        const self = state.players[playerIdx];
        if (self.tokens.grimPursuit === 1 && self.hand.includes("unescapable")) return false;
        return true;
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
