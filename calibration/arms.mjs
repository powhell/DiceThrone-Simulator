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

  // --- EV PAR CARTE (plan 2026-07-06) : la carte X est AJOUTÉE à la main de départ
  // (5e carte, retirée du deck si présente pour garder la composition). valeur(carte)
  // = Δwin / Δwin(1 PV) ; verdict vente si < ~0.75 (le 1 CP de la vente). ---
  card_hh_cleave_ii: s => addCard(hh(s), 'cleave-ii'),
  card_hh_ride_down_ii: s => addCard(hh(s), 'ride-down-ii'),
  card_hh_sow_despair_ii: s => addCard(hh(s), 'sow-despair-ii'),
  card_hh_reap_ii: s => addCard(hh(s), 'reap-ii'),
  card_hh_hallowed_reckoning_ii: s => addCard(hh(s), 'hallowed-reckoning-ii'),
  card_hh_spectral_assault_ii: s => addCard(hh(s), 'spectral-assault-ii'),
  card_hh_horrify_ii: s => addCard(hh(s), 'horrify-ii'),
  card_hh_dark_surprise: s => addCard(hh(s), 'dark-surprise'),
  card_hh_unescapable: s => addCard(hh(s), 'unescapable'),
  card_hh_spirited_reprisal: s => addCard(hh(s), 'spirited-reprisal'),
  card_hh_cranial_assist: s => addCard(hh(s), 'cranial-assist'),
  card_hh_dancing_pumpkin: s => addCard(hh(s), 'dancing-pumpkin'),
  card_hh_thundering_hooves: s => addCard(hh(s), 'thundering-hooves'),
  card_hh_rolling_pumpkin: s => addCard(hh(s), 'rolling-pumpkin'),
  card_c_six_it: s => addCard(hh(s), 'six-it'),
  card_c_better_d: s => addCard(hh(s), 'better-d'),
  card_c_transference: s => addCard(hh(s), 'transference'),
  card_c_so_wild: s => addCard(hh(s), 'so-wild'),
  card_c_vegas_baby: s => addCard(hh(s), 'vegas-baby'),
  card_c_triple_up: s => addCard(hh(s), 'triple-up'),
  card_c_what_status_effects: s => addCard(hh(s), 'what-status-effects'),
  card_c_get_that_outta_here: s => addCard(hh(s), 'get-that-outta-here'),
  card_c_twice_as_wild: s => addCard(hh(s), 'twice-as-wild'),
  card_c_try_try_again: s => addCard(hh(s), 'try-try-again'),
  card_c_tip_it: s => addCard(hh(s), 'tip-it'),
  card_c_getting_paid: s => addCard(hh(s), 'getting-paid'),
  card_c_samesies: s => addCard(hh(s), 'samesies'),
  card_c_double_up: s => addCard(hh(s), 'double-up'),
  card_c_helping_hand: s => addCard(hh(s), 'helping-hand'),
  card_c_one_more_time: s => addCard(hh(s), 'one-more-time'),
  card_c_not_this_time: s => addCard(hh(s), 'not-this-time'),
  card_bw_baton_strike_ii: s => addCard(bw(s), 'baton-strike-ii'),
  card_bw_widows_gauntlets_ii: s => addCard(bw(s), 'widows-gauntlets-ii'),
  card_bw_red_room_training_ii: s => addCard(bw(s), 'red-room-training-ii'),
  card_bw_grapple_ii: s => addCard(bw(s), 'grapple-ii'),
  card_bw_hacked_ii: s => addCard(bw(s), 'hacked-ii'),
  card_bw_sabotage_ii: s => addCard(bw(s), 'sabotage-ii'),
  card_bw_infiltrate_ii: s => addCard(bw(s), 'infiltrate-ii'),
  card_bw_vengeance_ii: s => addCard(bw(s), 'vengeance-ii'),
  card_bw_recoil: s => addCard(bw(s), 'recoil'),
  card_bw_subversion: s => addCard(bw(s), 'subversion'),
  card_bw_assemble: s => addCard(bw(s), 'assemble'),
  card_bw_elude: s => addCard(bw(s), 'elude'),
  card_bw_undercover_mission: s => addCard(bw(s), 'undercover-mission'),
  card_bw_cunning: s => addCard(bw(s), 'cunning'),
}


// Ajoute une copie de la carte à la main de départ ; si le deck en contient une, on la
// déplace (composition du deck préservée), sinon on l'ajoute (copie supplémentaire).
function addCard(p, cardId) {
  const i = p.deck.indexOf(cardId)
  if (i >= 0) p.deck.splice(i, 1)
  p.hand.push(cardId)
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
  // card_bw_* : même matchup hh-bw que la base (appariement par seed), scoré côté BW à l analyse
  return (arm === 'base_fm' || arm.startsWith('fm')) ? ['fm', 'bw'] : ['hh', 'bw']
}
