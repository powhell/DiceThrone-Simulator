# Mythic Brawler (mb) — SPEC d'après scans (2026-07-16)

Tout ce qui suit est lu des scans dans `board/`, `leaflet/`, `cards/`. Rien d'inventé.
Source de chaque bloc indiquée. Zooms de vérification : crops PowerShell sur 20260716_154402.jpg
(Strong Arm 3F+1P, Healing Wind 3S+1P, contrôle Tidal Blow 3F+2S = conforme à sa carte II).

## Dé (leaflet Screenshot_39)
- 1-2-3 : **Fist** (poing) — p=1/2
- 4-5 : **Spirit** (volute) — p=1/3
- 6 : **Peak** (montagne) — p=1/6
Même structure A/B/C que le Headless Horseman.

## Jetons (leaflet Screenshot_37 + 38)
« Gain 1 Strength » = choisir UNE des 3 Strengths. Non transférables, mais retirables.
- **Strength of the Ocean** (bleu) — stack 3. À l'Upkeep, 1×/tour, dépense au choix :
  1 jeton → +1 CP ; 2 jetons → +1 CP et Heal 2.
- **Strength of the Mountain** (vert) — stack 2. +1 dmg d'Attaque. Attack Modifier. Persistent.
- **Strength of the Sky** (orange) — stack 2. +1 dé lancé en activant la Defensive Ability. Persistent.
- **Concussion** (négatif, rouge) — stack 1. Le joueur affligé SAUTE sa Income Phase, puis retire le jeton.

## Board (photos board/ ×2 + Screenshot_40)
| Habileté | Condition | Effet |
|---|---|---|
| Strong Arm | 3 Fist + 1 Peak | Après ciblage, chacun lance 1 dé : si mon jet ≥ au sien → gain 1 Strength puis 6 dmg ; sinon 7 dmg. |
| Tidal Blow | 3 Fist + 2 Spirit | Gain Ocean. 6 dmg et lance 1 dé : Fist → +2 dmg ; Spirit → pioche 1 ; Peak → inflige Concussion. |
| Clobber | 4 Fist / 5 Fist | 5 dmg / 7 dmg. Sur 4-of-a-kind (chiffres), inflige Concussion. |
| Healing Wind | 3 Spirit + 1 Peak | Heal 3. Gain 2 Strengths. |
| Ancestral Strength | 4 Peak | Gain 2 Strengths. Puis 7 dmg **indéfendables**. |
| Spirit Strike | Small Straight | Gain 1 Strength. Puis 7 dmg. |
| Tectonic Punch | Large Straight | Choix : gain Mountain, OU retire 1 Mountain pour +3 dmg à CETTE attaque. Puis 10 dmg. |
| Wrassle (DÉFENSE) | Defense Roll 2 dés | 1 dmg × Fist. Heal 1 × Spirit. Sur Peak, gain 1 Strength. |
| Power of the Ancients! (ULTIMATE) | 5 Peak | Gain 2 Strengths. Inflige Concussion. Puis 12 dmg. (Règle Ultimate standard : indéfendable sauf altération des dés.) |

## Cartes héros (scans cards/, 15 uniques)
### Upgrades (Hero Upgrade)
| Carte | CP | Remplace | Effet |
|---|---|---|---|
| Clobber II | 2 | Clobber | 4F→6 dmg ; 5F→7 dmg. 3-of-a-kind (#) → gain Sky. 4-of-a-kind (#) → inflige AUSSI Concussion. |
| Tidal Blow II | 2 | Tidal Blow | Gain Ocean. 6 dmg et lance **2** dés : +2 dmg × Fist ; Spirit → pioche 1 ; Peak → Concussion. |
| Ancestral Strength II | 2 | Ancestral Strength | Gain 2 Strengths puis **9** dmg indéfendables. **AJOUTE l'habileté « Spirit Call » (3 Peak) : gain 2 Strengths, inflige Concussion.** |
| Spirit Strike II | 2 | Spirit Strike | Gain 1 Strength puis **8** dmg. Si un 6 est utilisé dans la suite, Heal 1. |
| Tectonic Punch II | 2 | Tectonic Punch | Gain Mountain. Puis **12** dmg (plus de choix). **AJOUTE « Knock Out » (Fist+Spirit+Spirit+Peak) : 3 dmg indéfendables.** |
| Wrassle II | 3 | Wrassle | Defense Roll **3** dés, mêmes effets. |

### Actions
| Carte | CP | Timing | Effet |
|---|---|---|---|
| Sea Song! | 0 | Instant | Retire Ocean → gain 2 CP. |
| Haka! | 1 | Instant | Gain 1 Strength. Option : +2 CP pour gagner 2 Strengths à la place. |
| Heavy Hand! | 1 | Roll Phase | Change la valeur d'un de MES dés en 1, 2 ou 3. |
| Kapu! | 1 | Roll Phase (après avoir été Attaqué) | Retire Mountain → prévient 4 dmg entrants. |
| Flying Punch! | 1 | Roll Phase — Attack Modifier | Retire Sky → cette Attaque devient indéfendable. |
| Wild Strength! | 2 | Roll Phase — Attack Modifier | Lance 5 dés : +2 dmg par PAIRE de Fist. Re-roll jusqu'à 1 de ces dés par Strength (max 5 dés). |
| Enjoy the View! | 1 | Main Phase | Choix : gain Sky OU Heal 2. |
| Explosive Flex! | 1 | Main Phase | Choix : gain Mountain OU 2 dmg à un adversaire choisi. |
| Spirit Chant! | 1 | Main Phase | Lance 1 dé : Fist → inflige Concussion ; Spirit → pioche 2 ; Peak → gain 2 Strengths. |

## PV/CP de départ
50 PV / 2 CP (norme du jeu). Jetons de départ : **non vus sur les scans — à confirmer**.

## Rulings — TRANCHÉS (user 2026-07-16)
1. **Jetons de départ : AUCUN.**
2. **Deck = les 15 cartes héros scannées (1 exemplaire chacune) + les cartes communes** (comme les autres persos).
3. **Strong Arm / Healing Wind : pas d'upgrade — n'existent pas.**
4. Strong Arm : « equal or greater » → **l'attaquant gagne l'égalité**.
5. Ocean à l'Upkeep : 1 jeton → +1 CP ; 2 jetons → +1 CP **et** Heal 2 (leaflet, tel quel).
6. Wild Strength : lecture littérale — **1 re-roll par jeton Strength possédé** (tous types confondus), max 5.

## Encodage (2026-07-16)
Moteur complet : `engine-ts/src/sim/data/characters/mb/hero.json` (tout `verified:true`),
`mb.rules.ts`, solveur `engine-ts/src/characters/mythicbrawler/`, registres, cartes câblées,
défense Wrassle (+1 dé/Sky), Concussion (saute l'Income), Ocean à l'Upkeep. Tests
`tests/sim/mb.rules.test.ts`. UI play.js (HERO.mb, defbox, référence, sélecteurs, 15 scans
mappés). ⚠ Valeurs EV des jetons (MOUNTAIN/SKY/OCEAN/CONCUSSION_VALUE) = estimations à
calibrer. ⚠ RL : mb PAS dans le layout features/matchups (comme prévu, retrain gelé).
⚠ Choix « Gain 1 Strength » : heuristique Mountain → Sky → Ocean pour IA ET humain (TODO
prompt humain).
