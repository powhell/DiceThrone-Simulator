// Source unique des matchups d'entraînement/éval (v4, 2026-07-08 : les 10 héros — du + se).
// Miroirs exclus (user 2026-07-05) : coût sans information d'équilibre inter-héros.
import type { HeroId } from '../types.js'

export const TRAINABLE_HEROES: HeroId[] = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se']

// Entraînement : toutes les paires ordonnées (90) + chaque héros vs Naraxus (10) = 100.
// Les consommateurs DOIVENT tourner dans la liste avec un offset de seed — un worker qui
// fait `g % length` avec g repartant à 0 ne couvrirait que le début de la liste.
export const TRAIN_MATCHUPS: Array<[HeroId, HeroId]> = [
  ...TRAINABLE_HEROES.flatMap(a => TRAINABLE_HEROES.filter(b => b !== a).map(b => [a, b] as [HeroId, HeroId])),
  ...TRAINABLE_HEROES.map(h => [h, 'nx'] as [HeroId, HeroId]),
]

// Éval (gating current-vs-best) : sous-ensemble compact — chaque héros apparaît des deux
// côtés au moins une fois, + 2 parties boss. 10 × gamesPerMatchup reste comparable au coût
// de l'ancienne liste à 9.
export const EVAL_MATCHUPS: Array<[HeroId, HeroId]> = [
  ['hh', 'bw'], ['bw', 'fm'], ['fm', 'rv'], ['rv', 'dr'], ['dr', 'th'],
  ['th', 'sm'], ['sm', 'py'], ['py', 'du'], ['du', 'se'], ['se', 'hh'],
  ['hh', 'nx'], ['rv', 'nx'],
]
