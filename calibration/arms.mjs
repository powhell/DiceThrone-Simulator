// Les "bras" de l'expérience de calibration contrefactuelle — v5 (2026-07-07).
// Chaque bras est une mutation de l'état initial (appliquée APRÈS la création — même flux
// rng que la baseline, donc le design apparié par seed tient). Valeur en équivalent-dégâts :
//   valeur(X) = Δwin(bras X vs base du même matchup) / Δwin(+1 PV du même héros)
//
// v5 : RÉSEAU v3 (8 héros) — les résultats v4 (réseau v2) sont archivés dans
// results_v4_final_netv2/ et NE DOIVENT PAS être mélangés. Cette vague mesure les jetons
// des 5 nouveaux héros (rv/dr/th/sm/py) + ré-ancre les étalons hh/bw sous le nouveau réseau.
// Les bras cartes (card_*) v4 ne sont pas re-mesurés ici (coût ; voir git history).
export const ARMS = {
  // ---- bases (une par matchup ; l'adversaire est toujours bw) ----
  base: null,      // hh vs bw
  base_rv: null,   // rv vs bw
  base_dr: null,
  base_th: null,
  base_sm: null,
  base_py: null,

  // ---- étalons PV / économie ----
  hh_hp4: s => { p(s, 'hh').hp += 4 },
  bw_hp4: s => { p(s, 'bw').hp += 4 },
  rv_hp4: s => { p(s, 'rv').hp += 4 },
  dr_hp4: s => { p(s, 'dr').hp += 4 },
  th_hp4: s => { p(s, 'th').hp += 4 },
  sm_hp4: s => { p(s, 'sm').hp += 4 },
  py_hp4: s => { p(s, 'py').hp += 4 },
  rv_cp1: s => { p(s, 'rv').cp += 1 },
  dr_cp1: s => { p(s, 'dr').cp += 1 },
  th_cp1: s => { p(s, 'th').cp += 1 },
  sm_cp1: s => { p(s, 'sm').cp += 1 },
  py_cp1: s => { p(s, 'py').cp += 1 },

  // ---- Raveness : plumes (échelle) + position de Nevermore ----
  rv_feather1: s => { p(s, 'rv').tokens.feather += 1 },
  rv_feather2: s => { p(s, 'rv').tokens.feather += 2 },
  // Nevermore DÉJÀ chez l'adversaire au départ (vaut : une activation de déplacement)
  rv_nvopp: s => { const r = p(s, 'rv'), o = p(s, 'bw'); if (r.tokens.nevermore > 0) { r.tokens.nevermore = 0; o.tokens.nevermore = 1 } },

  // ---- Druid : Shape Shift, Regenerate, Wound infligé ----
  dr_ss1: s => { p(s, 'dr').tokens.shapeShift += 1 },
  dr_regen1: s => { p(s, 'dr').tokens.regen2 += 1 },
  dr_woundopp1: s => { const o = p(s, 'bw'); o.tokens.wound = Math.min(2, (o.tokens.wound ?? 0) + 1) },

  // ---- Thor : Electrokinesis (échelle), Guard Break, position de Mjölnir ----
  th_ek1: s => { p(s, 'th').tokens.electrokinesis = 1 },
  th_ek2: s => { p(s, 'th').tokens.electrokinesis = 2 },
  th_ek4: s => { p(s, 'th').tokens.electrokinesis = 4 },
  th_gb1: s => { p(s, 'th').tokens.guardBreak = 1 },
  th_gb2: s => { p(s, 'th').tokens.guardBreak = 2 },
  // Mjölnir déjà lancé (chez l'adversaire) : position + le Retrieve à venir vaut 1 EK
  th_mjaway: s => { p(s, 'th').mjolnirAway = true },

  // ---- Spider-Man : Combo, Invisibility, Webbed infligé ----
  sm_combo1: s => { p(s, 'sm').tokens.combo = 1 },
  sm_invis1: s => { p(s, 'sm').tokens.invisibility = 1 },
  sm_webbedopp1: s => { p(s, 'bw').tokens.webbed = 1 },

  // ---- Pyromancer : Fire Mastery (échelle), Burn/Knockdown infligés ----
  py_fm1: s => { p(s, 'py').tokens.fireMastery = 1 },
  py_fm2: s => { p(s, 'py').tokens.fireMastery = 2 },
  py_fm3: s => { p(s, 'py').tokens.fireMastery = 3 },
  py_fm5: s => { p(s, 'py').tokens.fireMastery = 5 },
  py_burnopp1: s => { p(s, 'bw').tokens.burn = 1 },
  py_kdopp1: s => { p(s, 'bw').tokens.knockdown = 1 },
}

function p(state, heroId) { return state.players.find(x => x.heroId === heroId) }

const HERO_PREFIXES = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py']

// Le héros dont ce bras mesure la valeur (son win-rate est la métrique).
export function armHero(arm) {
  if (arm === 'base') return 'hh'
  if (arm.startsWith('base_')) return arm.slice(5)
  const pref = arm.split('_')[0]
  return HERO_PREFIXES.includes(pref) ? pref : 'hh'
}

// Matchup du bras : <héros> vs bw ; les bras hh_*/bw_* jouent hh vs bw (base commune).
export function armMatchup(arm) {
  const h = armHero(arm)
  return h === 'bw' || h === 'hh' ? ['hh', 'bw'] : [h, 'bw']
}

// Base de comparaison d'un bras (pour l'analyse générique).
export function armBase(arm) {
  if (arm === 'base' || arm.startsWith('base_')) return null
  const h = armHero(arm)
  return h === 'bw' || h === 'hh' ? 'base' : 'base_' + h
}
