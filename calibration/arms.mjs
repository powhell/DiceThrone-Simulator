// Les "bras" de l'expérience de calibration contrefactuelle : chaque bras est une mutation
// de l'état initial (appliquée APRÈS la création — même flux rng que la baseline, donc le
// design apparié par seed tient). La valeur d'un jeton en équivalent-dégâts se lit ensuite :
//   valeur(X) = Δwin(bras X vs contrôle) / Δwin(+1 PV)
// avec Δwin(+1 PV) = Δwin(hp+2)/2 (perturbation doublée pour sortir du bruit).
export const ARMS = {
  base: null,

  // Étalons points de vie (un par héros — la valeur d'1 PV peut différer).
  // +4 (pas +1) : le ratio final divise par ce Δ, il faut le sortir franchement du bruit.
  hh_hp4: s => { hh(s).hp += 4 },
  bw_hp4: s => { bw(s).hp += 4 },

  // Échelle Dreadful : dreadful de départ FIXÉ à d (écrase le +1 du 2e joueur).
  // Les valeurs marginales sont les différences entre bras consécutifs.
  hh_dread0: s => { hh(s).tokens.dreadful = 0 },
  hh_dread1: s => { hh(s).tokens.dreadful = 1 },
  hh_dread2: s => { hh(s).tokens.dreadful = 2 },
  hh_dread3: s => { hh(s).tokens.dreadful = 3 },
  hh_dread4: s => { hh(s).tokens.dreadful = 4 },
  hh_dread5: s => { hh(s).tokens.dreadful = 5 },

  // Économie / jetons HH
  hh_cp1:   s => { hh(s).cp += 1 },
  hh_card1: s => { const p = hh(s); if (p.deck.length) p.hand.push(p.deck.shift()) },
  hh_grim1: s => { hh(s).tokens.grimPursuit += 1 },
  // Time Bomb subie par HH (mesure la valeur pour BW de l'infliger, côté 0:02)
  hh_tb1:   s => { hh(s).timeBombs.push('0:02') },

  // Économie / jetons BW
  bw_cp1:     s => { bw(s).cp += 1 },
  bw_card1:   s => { const p = bw(s); if (p.deck.length) p.hand.push(p.deck.shift()) },
  bw_agility1:s => { bw(s).tokens.agility += 1 },
  bw_covert1: s => { bw(s).tokens.covertOps += 1 },

  // --- Forgemaster (matchup fm vs bw, greedy des deux côtés — réseau pas entraîné avec fm) ---
  base_fm: null,
  fm_hp4:  s => { fmp(s).hp += 4 },
  fm_cp1:  s => { fmp(s).cp += 1 },
  fm_card1:s => { const p = fmp(s); if (p.deck.length) p.hand.push(p.deck.shift()) },
  // 2 Gold Ore déplacés du deck vers la Forge (état réaliste : deck plus mince, matériaux prêts)
  fm_gold2forge: s => { const p = fmp(s); for (let k=0;k<2;k++){ const i=p.deck.indexOf('gold-ore'); if(i>=0){ p.deck.splice(i,1); p.forge.push('gold-ore'); } } },
  fm_goldshield: s => { fmp(s).armor.shield = 1 },
  fm_goldhelmet: s => { fmp(s).armor.helmet = 1 },
}

function hh(state) { return state.players.find(p => p.heroId === 'hh') }
function bw(state) { return state.players.find(p => p.heroId === 'bw') }
function fmp(state) { return state.players.find(p => p.heroId === 'fm') }

// Le héros dont ce bras mesure la valeur (son win-rate est la métrique).
export function armHero(arm) {
  if (arm === 'hh_tb1') return 'bw' // la TB sur HH est un actif de BW
  if (arm === 'base_fm' || arm.startsWith('fm')) return 'fm'
  return arm.startsWith('bw') ? 'bw' : 'hh'
}

// Matchup du bras : les bras fm jouent fm vs bw (greedy des 2 côtés) ; le reste hh vs bw.
export function armMatchup(arm) {
  return (arm === 'base_fm' || arm.startsWith('fm')) ? ['fm', 'bw'] : ['hh', 'bw']
}
