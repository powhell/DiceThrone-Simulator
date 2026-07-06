"use strict";
var Engine = (() => {
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

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    BWEngine: () => BWEngine,
    FMEngine: () => FMEngine,
    HHEngine: () => HHEngine,
    calculateOptimalKeep: () => calculateOptimalKeep2,
    clearCache: () => clearCache,
    evalState: () => evalState2
  });

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
  function clearCache() {
    evMemo.clear();
    distMemo.clear();
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
  var GRIM_PURSUIT_AVG_DMG = 0.9;
  var CARD_DRAW_VALUE = 0.5;
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
  var MARGINAL_VALUE = [1.5, 0.8, 0.8, 0.4, 1];
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
  function getCandidates(dice, dreadful, hasHead, upgradeIds = [], defenseTax = 0, gp = 0) {
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
      else if (hasHead) val += gpGainValue(gp, 1);
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
      if (hasHead) val += CARD_DRAW_VALUE;
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
  function bestAbilityValue(dice, dreadful, hasHead, upgradeIds = [], defenseTax = 0, gp = 0) {
    return Math.max(...getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax, gp).map(([, v]) => v));
  }
  function bestAbilityName(dice, dreadful, hasHead, upgradeIds = [], defenseTax = 0, gp = 0) {
    const cands = getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax, gp);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard(dice, dreadful, hasHead, upgradeIds = [], defenseTax = 0, gp = 0) {
    const matchedSet = new Set(getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax, gp).map(([name]) => name));
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
    else if (hasHead) horrifyVal += gpGainValue(gp, 1);
    let reapVal = reapDmg + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN);
    if (hasHead) reapVal += CARD_DRAW_VALUE;
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
      return bestAbilityValue(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0);
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
      return `${state.dreadful}|${state.hasHead ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${Math.min(state.grimPursuit ?? 0, 3)}|${upgrades}`;
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
      return bestAbilityValue2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName2(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0);
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
      return `${state.upgrades}|${state.tbOnOpp}|${Math.round((state.defenseTax ?? 0) * 2)}|${upgradeIds}`;
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
  function getCandidates3(dice, armorCount, defenseTax = 0) {
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
    const armoredBonus = armorCount >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0;
    if (hasStraight3(dice, 5)) out.push(["Armored Up L", ARMORED_UP_LARGE + armoredBonus - tax, ARMORED_UP_LARGE + armoredBonus]);
    if (hasStraight3(dice, 4)) out.push(["Armored Up S", ARMORED_UP_SMALL + armoredBonus - tax, ARMORED_UP_SMALL + armoredBonus]);
    if (c >= 5) out.push(["Final Touches!", FINAL_TOUCHES_VALUE + ORE_TUTOR_VALUE, FINAL_TOUCHES_VALUE]);
    out.push(["Whiff", WHIFF_VALUE2, WHIFF_VALUE2]);
    return out;
  }
  function bestAbilityValue3(dice, armorCount, defenseTax = 0) {
    return Math.max(...getCandidates3(dice, armorCount, defenseTax).map(([, v]) => v));
  }
  function bestAbilityName3(dice, armorCount, defenseTax = 0) {
    const cands = getCandidates3(dice, armorCount, defenseTax);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard3(dice, armorCount, defenseTax = 0) {
    const matchedSet = new Set(getCandidates3(dice, armorCount, defenseTax).map(([name]) => name));
    const tax = defenseTax;
    const armoredBonus = armorCount >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0;
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
      return bestAbilityValue3(dice, state.armorCount, state.defenseTax ?? 0);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName3(dice, state.armorCount, state.defenseTax ?? 0);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard3(dice, state.armorCount, state.defenseTax ?? 0);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates3(dice, state.armorCount, state.defenseTax ?? 0);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      return `${Math.min(state.armorCount, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}`;
    }
  };

  // src/index.ts
  function evalState2(kept, rollsRemaining, dreadful, hasHead, upgradeIdsOrGp, grimPursuit = 0) {
    const upgradeIds = Array.isArray(upgradeIdsOrGp) ? upgradeIdsOrGp : void 0;
    const gp = typeof upgradeIdsOrGp === "number" ? upgradeIdsOrGp : grimPursuit;
    return evalState(hhConfig, kept, rollsRemaining, { dreadful, hasHead, upgradeIds, grimPursuit: gp });
  }
  function calculateOptimalKeep2(dice, rollsRemaining, dreadful, hasHead, upgradeIds) {
    return calculateOptimalKeep(hhConfig, dice, rollsRemaining, { dreadful, hasHead, upgradeIds });
  }
  var HHEngine = {
    calculateOptimalKeep: calculateOptimalKeep2,
    evalState: evalState2,
    clearCache
  };
  var FMEngine = {
    calculateOptimalKeep(dice, rollsRemaining, state) {
      return calculateOptimalKeep(fmConfig, dice, rollsRemaining, state);
    },
    evalState(kept, rollsRemaining, state) {
      return evalState(fmConfig, kept, rollsRemaining, state);
    },
    clearCache
  };
  var BWEngine = {
    calculateOptimalKeep(dice, rollsRemaining, state) {
      return calculateOptimalKeep(bwConfig, dice, rollsRemaining, state);
    },
    evalState(kept, rollsRemaining, state) {
      return evalState(bwConfig, kept, rollsRemaining, state);
    },
    clearCache
  };
  return __toCommonJS(src_exports);
})();
