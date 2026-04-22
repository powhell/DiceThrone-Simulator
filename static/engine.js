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
  function cacheKey(cfg, kept, rollsRemaining, state) {
    return `${cfg.id}|${kept.join(",")}|${rollsRemaining}|${cfg.stateKey(state)}`;
  }
  function clearCache() {
    evMemo.clear();
    distMemo.clear();
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
  var SPECTRAL_ASSAULT_PER_DREADFUL = 1.5;
  var DREADFUL_CHARGE_VALUE = 15;
  var DREADFUL_CHARGE_DREADFUL_GIVEN = 4;
  var CLEAVE_3A = 4;
  var CLEAVE_4A = 5;
  var CLEAVE_5A = 7;
  var REAP_UNDEFENDABLE = 3;
  var REAP_DREADFUL_GIVEN = 2;
  var RIDE_DOWN_BASE = 6;
  var SOW_SMALL_DMG = 7;
  var SOW_SMALL_DREADFUL = 1;
  var SOW_LARGE_DMG = 9;
  var SOW_LARGE_DREADFUL = 2;
  var HORRIFY_BASE_UNDEFENDABLE = 6;
  var HORRIFY_DREADFUL_GIVEN = 3;
  var WHIFF_PURSUIT_TOKENS = 1;

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
  function getCandidates(dice, dreadful, hasHead) {
    const { A: a, B: b, C: c } = classify(dice);
    const out = [];
    if (c >= 5) {
      const base = DREADFUL_CHARGE_VALUE;
      out.push(["Dreadful Charge", base + dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN), base]);
    }
    if (c >= 4) {
      const base = HORRIFY_BASE_UNDEFENDABLE;
      let val = base + dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN);
      if (hasHead) val += GRIM_PURSUIT_AVG_DMG;
      out.push(["Horrify", val, base]);
    }
    if (a >= 3 && c >= 2) {
      const val = SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL;
      out.push(["Spectral Assault", val, SPECTRAL_ASSAULT_BASE]);
    }
    if (a >= 5) {
      out.push(["Cleave 5A", CLEAVE_5A, CLEAVE_5A]);
    } else if (a === 4) {
      out.push(["Cleave 4A", CLEAVE_4A, CLEAVE_4A]);
    } else if (a === 3) {
      out.push(["Cleave 3A", CLEAVE_3A, CLEAVE_3A]);
    }
    if (a >= 2 && b >= 2 && c === 0) {
      const val = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG;
      out.push(["Ride Down", val, RIDE_DOWN_BASE]);
    }
    if (b >= 3 && c >= 1) {
      let val = REAP_UNDEFENDABLE + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN);
      if (hasHead) val += CARD_DRAW_VALUE;
      out.push(["Reap", val, REAP_UNDEFENDABLE]);
    }
    if (hasStraight(dice, 5)) {
      const val = SOW_LARGE_DMG + dreadfulValueOfGaining(dreadful, SOW_LARGE_DREADFUL);
      out.push(["Sow Despair L", val, SOW_LARGE_DMG]);
    }
    if (hasStraight(dice, 4)) {
      const val = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, SOW_SMALL_DREADFUL);
      out.push(["Sow Despair S", val, SOW_SMALL_DMG]);
    }
    const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG;
    out.push(["Whiff", whiffVal, whiffVal]);
    return out;
  }
  function bestAbilityValue(dice, dreadful, hasHead) {
    return Math.max(...getCandidates(dice, dreadful, hasHead).map(([, v]) => v));
  }
  function bestAbilityName(dice, dreadful, hasHead) {
    const cands = getCandidates(dice, dreadful, hasHead);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function buildAbilityBoard(dice, dreadful, hasHead) {
    const matchedSet = new Set(getCandidates(dice, dreadful, hasHead).map(([name]) => name));
    const dc = dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN);
    const horrifyGain = dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN);
    let horrifyVal = HORRIFY_BASE_UNDEFENDABLE + horrifyGain;
    if (hasHead) horrifyVal += GRIM_PURSUIT_AVG_DMG;
    let reapVal = REAP_UNDEFENDABLE + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN);
    if (hasHead) reapVal += CARD_DRAW_VALUE;
    const sowLVal = SOW_LARGE_DMG + dreadfulValueOfGaining(dreadful, SOW_LARGE_DREADFUL);
    const sowSVal = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, SOW_SMALL_DREADFUL);
    const rdVal = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG;
    const saVal = SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL;
    const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG;
    return [
      { name: "Dreadful Charge (CCCCC)", value: DREADFUL_CHARGE_VALUE + dc, baseDamage: DREADFUL_CHARGE_VALUE, matched: matchedSet.has("Dreadful Charge") },
      { name: "Horrify (CCCC)", value: horrifyVal, baseDamage: HORRIFY_BASE_UNDEFENDABLE, matched: matchedSet.has("Horrify") },
      { name: "Spectral Assault (AAACC)", value: saVal, baseDamage: SPECTRAL_ASSAULT_BASE, matched: matchedSet.has("Spectral Assault") },
      { name: "Cleave 5A (AAAAA)", value: CLEAVE_5A, baseDamage: CLEAVE_5A, matched: matchedSet.has("Cleave 5A") },
      { name: "Cleave 4A (AAAA)", value: CLEAVE_4A, baseDamage: CLEAVE_4A, matched: matchedSet.has("Cleave 4A") },
      { name: "Cleave 3A (AAA)", value: CLEAVE_3A, baseDamage: CLEAVE_3A, matched: matchedSet.has("Cleave 3A") },
      { name: "Ride Down (AAABB)", value: rdVal, baseDamage: RIDE_DOWN_BASE, matched: matchedSet.has("Ride Down") },
      { name: "Reap (BBBC)", value: reapVal, baseDamage: REAP_UNDEFENDABLE, matched: matchedSet.has("Reap") },
      { name: "Sow Despair L (5-straight)", value: sowLVal, baseDamage: SOW_LARGE_DMG, matched: matchedSet.has("Sow Despair L") },
      { name: "Sow Despair S (4-straight)", value: sowSVal, baseDamage: SOW_SMALL_DMG, matched: matchedSet.has("Sow Despair S") },
      { name: "Whiff", value: whiffVal, baseDamage: whiffVal, matched: matchedSet.has("Whiff") }
    ];
  }

  // src/characters/horseman/config.ts
  var hhConfig = {
    id: "hh",
    faceToSymbol(face) {
      return hhFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      return bestAbilityValue(dice, state.dreadful, state.hasHead);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName(dice, state.dreadful, state.hasHead);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard(dice, state.dreadful, state.hasHead);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates(dice, state.dreadful, state.hasHead);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      return `${state.dreadful}|${state.hasHead ? 1 : 0}`;
    }
  };

  // src/characters/black_widow/constants.ts
  var BATON_STRIKE_3B = 5;
  var BATON_STRIKE_4B = 6;
  var BATON_STRIKE_5B = 7;
  var INFILTRATE_BASE_DMG = 0;
  var INFILTRATE_TB_INFLICTED = 1;
  var INFILTRATE_AGILITY_GAIN = 1;
  var GAUNTLETS_BASE_DMG = 6;
  var GAUNTLETS_CP_GAIN = 1;
  var HACKED_BASE_DMG = 5;
  var HACKED_THRESHOLD_UPGRADES = 3;
  var HACKED_THRESHOLD_BONUS = 2;
  var HACKED_TB_INFLICTED = 1;
  var GRAPPLE_BASE_DMG = 5;
  var GRAPPLE_AGILITY_GAIN = 1;
  var VENGEANCE_BASE_DMG = 7;
  var VENGEANCE_AGILITY_GAIN = 1;
  var VENGEANCE_RIDER_DICE = 4;
  var WIDOWS_BITE_BASE_DMG = 10;
  var WIDOWS_BITE_TB_INFLICTED = 1;
  var RRT_THRESHOLD_UPGRADES = 5;
  var RRT_ALL_ATTACK_BONUS = 1;
  var AGILITY_VALUE = 2;
  var CP_TO_DMG_EQUIV = 1.5;
  var WHIFF_VALUE = 0;

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
  function binom(n, k) {
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return r;
  }
  function vengeanceRiderEV(upgrades, tbOnOpp) {
    const n = VENGEANCE_RIDER_DICE;
    const riderDmg = n * (5 / 6);
    const p1 = 1 / 6, p0 = 5 / 6;
    let tbEV = 0;
    for (let k = 0; k <= n; k++) {
      const p = binom(n, k) * Math.pow(p1, k) * Math.pow(p0, n - k);
      const gained = Math.min(k, 2 - tbOnOpp);
      tbEV += p * tbGainValue(upgrades, tbOnOpp, gained);
    }
    return riderDmg + tbEV;
  }
  function getCandidates2(dice, upgrades, tbOnOpp) {
    const { A: a, B: b, C: c } = classify2(dice);
    const out = [];
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    if (b >= 5) {
      out.push(["Baton Strike 5B", BATON_STRIKE_5B + rrt, BATON_STRIKE_5B]);
    } else if (b === 4) {
      out.push(["Baton Strike 4B", BATON_STRIKE_4B + rrt, BATON_STRIKE_4B]);
    } else if (b === 3) {
      out.push(["Baton Strike 3B", BATON_STRIKE_3B + rrt, BATON_STRIKE_3B]);
    }
    if (a >= 2 && b >= 1 && c >= 1) {
      const tb = tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED);
      const agility = INFILTRATE_AGILITY_GAIN * AGILITY_VALUE;
      out.push(["Infiltrate", INFILTRATE_BASE_DMG + tb + agility + rrt, INFILTRATE_BASE_DMG]);
    }
    if (a >= 3 && b >= 2) {
      const val = GAUNTLETS_BASE_DMG + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt;
      out.push(["Widow's Gauntlets", val, GAUNTLETS_BASE_DMG]);
    }
    if (hasStraight2(dice, 4)) {
      const thresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
      const tb = tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED);
      out.push(["Hacked", HACKED_BASE_DMG + thresh + tb + rrt, HACKED_BASE_DMG]);
    }
    if (c >= 4) {
      const val = GRAPPLE_BASE_DMG + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + rrt;
      out.push(["Grapple", val, GRAPPLE_BASE_DMG]);
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
  function bestAbilityValue2(dice, upgrades, tbOnOpp) {
    return Math.max(...getCandidates2(dice, upgrades, tbOnOpp).map(([, v]) => v));
  }
  function bestAbilityName2(dice, upgrades, tbOnOpp) {
    const cands = getCandidates2(dice, upgrades, tbOnOpp);
    return cands.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  }
  function directDamageByName(upgrades, _tbOnOpp) {
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
    const vengeanceRiderDmg = VENGEANCE_RIDER_DICE * (5 / 6);
    return {
      "Baton Strike 3B": BATON_STRIKE_3B + rrt,
      "Baton Strike 4B": BATON_STRIKE_4B + rrt,
      "Baton Strike 5B": BATON_STRIKE_5B + rrt,
      "Infiltrate": INFILTRATE_BASE_DMG + rrt,
      "Widow's Gauntlets": GAUNTLETS_BASE_DMG + upgrades + rrt,
      "Hacked": HACKED_BASE_DMG + hackedThresh + rrt,
      "Grapple": GRAPPLE_BASE_DMG + upgrades + rrt,
      "Vengeance": VENGEANCE_BASE_DMG + vengeanceRiderDmg + rrt,
      "Widow's Bite": WIDOWS_BITE_BASE_DMG + rrt,
      "Whiff": 0
    };
  }
  function buildAbilityBoard2(dice, upgrades, tbOnOpp) {
    const matched = new Set(getCandidates2(dice, upgrades, tbOnOpp).map(([n]) => n));
    const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0;
    const infiltrateVal = INFILTRATE_BASE_DMG + tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED) + INFILTRATE_AGILITY_GAIN * AGILITY_VALUE + rrt;
    const gauntletsVal = GAUNTLETS_BASE_DMG + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt;
    const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0;
    const hackedVal = HACKED_BASE_DMG + hackedThresh + tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED) + rrt;
    const grappleVal = GRAPPLE_BASE_DMG + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + rrt;
    const vengeanceVal = VENGEANCE_BASE_DMG + vengeanceRiderEV(upgrades, tbOnOpp) + VENGEANCE_AGILITY_GAIN * AGILITY_VALUE + rrt;
    const biteVal = WIDOWS_BITE_BASE_DMG + tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED) + rrt;
    return [
      { name: "Widow's Bite (CCCCC)", value: biteVal, baseDamage: WIDOWS_BITE_BASE_DMG, matched: matched.has("Widow's Bite") },
      { name: "Grapple (CCCC)", value: grappleVal, baseDamage: GRAPPLE_BASE_DMG, matched: matched.has("Grapple") },
      { name: "Widow's Gauntlets (AAABB)", value: gauntletsVal, baseDamage: GAUNTLETS_BASE_DMG, matched: matched.has("Widow's Gauntlets") },
      { name: "Vengeance (5-straight)", value: vengeanceVal, baseDamage: VENGEANCE_BASE_DMG, matched: matched.has("Vengeance") },
      { name: "Hacked (4-straight)", value: hackedVal, baseDamage: HACKED_BASE_DMG, matched: matched.has("Hacked") },
      { name: "Infiltrate (AABC)", value: infiltrateVal, baseDamage: INFILTRATE_BASE_DMG, matched: matched.has("Infiltrate") },
      { name: "Baton Strike 5B (BBBBB)", value: BATON_STRIKE_5B + rrt, baseDamage: BATON_STRIKE_5B, matched: matched.has("Baton Strike 5B") },
      { name: "Baton Strike 4B (BBBB)", value: BATON_STRIKE_4B + rrt, baseDamage: BATON_STRIKE_4B, matched: matched.has("Baton Strike 4B") },
      { name: "Baton Strike 3B (BBB)", value: BATON_STRIKE_3B + rrt, baseDamage: BATON_STRIKE_3B, matched: matched.has("Baton Strike 3B") },
      { name: "Whiff", value: WHIFF_VALUE, baseDamage: WHIFF_VALUE, matched: matched.has("Whiff") }
    ];
  }

  // src/characters/black_widow/config.ts
  var bwConfig = {
    id: "bw",
    faceToSymbol(face) {
      return bwFaceToSymbol(face);
    },
    bestAbilityValue(dice, state) {
      return bestAbilityValue2(dice, state.upgrades, state.tbOnOpp);
    },
    bestAbilityName(dice, state) {
      return bestAbilityName2(dice, state.upgrades, state.tbOnOpp);
    },
    buildAbilityBoard(dice, state) {
      return buildAbilityBoard2(dice, state.upgrades, state.tbOnOpp);
    },
    hasMatchedAbility(dice, state) {
      const cands = getCandidates2(dice, state.upgrades, state.tbOnOpp);
      return cands.some(([name]) => name !== "Whiff");
    },
    stateKey(state) {
      return `${state.upgrades}|${state.tbOnOpp}`;
    },
    directDamageByName(state) {
      return directDamageByName(state.upgrades, state.tbOnOpp);
    }
  };

  // src/index.ts
  function evalState2(kept, rollsRemaining, dreadful, hasHead) {
    return evalState(hhConfig, kept, rollsRemaining, { dreadful, hasHead });
  }
  function calculateOptimalKeep2(dice, rollsRemaining, dreadful, hasHead) {
    return calculateOptimalKeep(hhConfig, dice, rollsRemaining, { dreadful, hasHead });
  }
  var HHEngine = {
    calculateOptimalKeep: calculateOptimalKeep2,
    evalState: evalState2,
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
