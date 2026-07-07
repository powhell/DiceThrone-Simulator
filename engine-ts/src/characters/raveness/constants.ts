// Raveness — constantes d'EV (ESTIMATIONS INITIALES, à calibrer empiriquement comme les
// autres persos : banc contrefactuel après intégration). Sources des chiffres de jeu :
// board + leaflet + cartes scannés par l'user (2026-07-06), rulings user notés dans hero.json.

// Valeur d'une activation de Nevermore. Une activation = au choix : déplacer le compagnon
// (repositionnement/heal du cadran au retour) ou Absorber (cadran +1 (max 3) + 1 dégât
// indéfendable isolé). ~1 dégât garanti + option de soin différé.
export const NEVERMORE_ACTIVATION_VALUE = 1.3

// Jeton Feather (cap 5) : monnaie flexible — 1 = relance du Nevermore Die Roll, 2 = ±1
// dessus, 3 = une activation (3 × 0.8 ≈ 2.4 vs activation 1.3 : la conversion en activation
// est le plancher, la flexibilité paie le reste).
export const FEATHER_VALUE = 0.3 // calibré v5 : 0.18±0.82 (les plumes n'agissent que sur le dé Nevermore)
export const FEATHER_CAP = 5

// Hex (unique) : les 6 de l'adversaire deviennent des faces BLANCHES jusqu'à la fin de son
// tour — tue les habiletés à Frayeurs/Enclumes/Eyes pendant un tour complet.
export const HEX_VALUE = 1.5

export const CARD_DRAW_VALUE = 1.3
export const CP_TO_DMG_EQUIV = 0.75

// Board (vérifié scans)
export const PECK_DMG = [5, 6, 7]          // AAA/AAAA/AAAAA — Peck II : +1 chacun
export const PECK_DMG_UPGRADED = [6, 7, 8]
export const RAVEN_SIGHT_DMG = 3           // AACC, indéfendable
export const CRAVEN_DMG = 8                // petite suite — II : 9
export const CRAVEN_DMG_UPGRADED = 9
export const BEGUILE_DMG = 9               // grande suite
export const MURDER_DMG = 5                // AABBB — II : 6
export const MURDER_DMG_UPGRADED = 6
export const CHAMBER_DMG = 7               // CCCC, indéfendable
export const AVIARY_DMG = 2                // CCC (Chamber II), indéfendable
export const PLUCK_DMG = 9                 // BBBCC (Beguile II)
export const FANTASTIC_TERRORS_DMG = 13    // CCCCC, ULT
