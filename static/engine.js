"use strict";
var HHEngine = (() => {
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
    calculateOptimalKeep: () => calculateOptimalKeep,
    clearCache: () => clearCache,
    evalState: () => evalState
  });

  // src/constants.ts
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

  // src/dice.ts
  function faceToSymbol(face) {
    if (face <= 3) return "A";
    if (face <= 5) return "B";
    return "C";
  }
  function classifyDice(dice) {
    const counts = { A: 0, B: 0, C: 0 };
    for (const face of dice) counts[faceToSymbol(face)]++;
    return counts;
  }
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

  // src/dreadful.ts
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

  // src/abilities.ts
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
    const { A: a, B: b, C: c } = classifyDice(dice);
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

  // src/evaluator.ts
  var evMemo = /* @__PURE__ */ new Map();
  var distMemo = /* @__PURE__ */ new Map();
  function cacheKey(kept, rollsRemaining, dreadful, hasHead) {
    return `${kept.join(",")}|${rollsRemaining}|${dreadful}|${hasHead ? 1 : 0}`;
  }
  function clearCache() {
    evMemo.clear();
    distMemo.clear();
  }
  function evalState(kept, rollsRemaining, dreadful, hasHead) {
    if (rollsRemaining === 0) {
      if (kept.length !== 5) throw new Error(`evalState: need 5 dice at rolls=0, got ${kept.length}`);
      return bestAbilityValue(kept, dreadful, hasHead);
    }
    const key = cacheKey(kept, rollsRemaining, dreadful, hasHead);
    const cached = evMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = 5 - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    let totalEv = 0;
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      totalEv += prob * _bestKeepEv(full, rollsRemaining - 1, dreadful, hasHead);
    }
    evMemo.set(key, totalEv);
    return totalEv;
  }
  function _bestKeepEv(full, rollsRemaining, dreadful, hasHead) {
    if (rollsRemaining === 0) return evalState(full, 0, dreadful, hasHead);
    let best = -Infinity;
    for (let mask = 0; mask < 32; mask++) {
      const kept = [];
      for (let i = 0; i < 5; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(kept, rollsRemaining, dreadful, hasHead);
      if (ev > best) best = ev;
    }
    return best;
  }
  function _optimalKeep(full, rollsRemaining, dreadful, hasHead) {
    if (rollsRemaining === 0) return full;
    let bestEv = -Infinity;
    let bestKept = full;
    for (let mask = 0; mask < 32; mask++) {
      const kept = [];
      for (let i = 0; i < 5; i++) {
        if (mask & 1 << i) kept.push(full[i]);
      }
      kept.sort((a, b) => a - b);
      const ev = evalState(kept, rollsRemaining, dreadful, hasHead);
      if (ev > bestEv) {
        bestEv = ev;
        bestKept = kept;
      }
    }
    return bestKept;
  }
  function _abilityDist(kept, rollsRemaining, dreadful, hasHead) {
    if (rollsRemaining === 0) {
      if (kept.length !== 5) throw new Error("Need 5 dice at rolls=0");
      return { [bestAbilityName(kept, dreadful, hasHead)]: 1 };
    }
    const key = cacheKey(kept, rollsRemaining, dreadful, hasHead);
    const cached = distMemo.get(key);
    if (cached !== void 0) return cached;
    const nReroll = 5 - kept.length;
    const prob = Math.pow(1 / 6, nReroll);
    const dist = {};
    for (const outcome of enumerateOutcomes(nReroll)) {
      const full = [...kept, ...outcome].sort((a, b) => a - b);
      const bestKept = _optimalKeep(full, rollsRemaining - 1, dreadful, hasHead);
      const sub = _abilityDist(bestKept, rollsRemaining - 1, dreadful, hasHead);
      for (const [name, p] of Object.entries(sub)) {
        dist[name] = (dist[name] ?? 0) + prob * p;
      }
    }
    distMemo.set(key, dist);
    return dist;
  }
  function calculateOptimalKeep(dice, rollsRemaining, dreadful, hasHead) {
    const sorted = [...dice].sort((a, b) => a - b);
    const currentEv = bestAbilityValue(sorted, dreadful, hasHead);
    if (rollsRemaining === 0) {
      const dist = _abilityDist(sorted, 0, dreadful, hasHead);
      return {
        currentEv,
        topOptions: [{
          kept: sorted,
          ev: currentEv,
          probDist: _distToPercent(dist)
        }],
        abilities: buildAbilityBoard(sorted, dreadful, hasHead)
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
      const ev = evalState(kept, rollsRemaining, dreadful, hasHead);
      const dist = _abilityDist(kept, rollsRemaining, dreadful, hasHead);
      options.push({ kept, ev, probDist: _distToPercent(dist) });
    }
    options.sort((a, b) => b.ev - a.ev);
    let topOptions = options.slice(0, 5);
    const currentAbility = bestAbilityName(sorted, dreadful, hasHead);
    if (currentAbility !== "Whiff" && rollsRemaining > 0) {
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
      abilities: buildAbilityBoard(sorted, dreadful, hasHead)
    };
  }
  function _distToPercent(dist) {
    const out = {};
    for (const [name, p] of Object.entries(dist)) {
      out[name] = Math.round(p * 1e4) / 100;
    }
    return out;
  }
  return __toCommonJS(src_exports);
})();
