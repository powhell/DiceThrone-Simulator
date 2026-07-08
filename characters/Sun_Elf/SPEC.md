# SUN ELF — Spec (scans user 2026-07-07, lecture 2026-07-08) — QUESTIONS OUVERTES EN BAS

Source : `characters/Sun_Elf/board/*.jpg` (3), `leaflet/Screenshot_{31..34}.png` (4), `cards/*.jpg` (16 scans, 15 cartes uniques — 221109 = DOUBLON de Scorching Staff II).
50 PV / 2 CP (norme). Dé (⚠ à confirmer, pas de capture leaflet des faces) : **1-3 Bâton (A)**, **4-5 Œil/triangle (B)**, **6 Soleil (C)**.

## Sun Dial (mécanique centrale — leaflet vérifié)
Cadran 0-5, deux faces. **Setup : cadran à 0, face DUSK.**
- « Increase Sun Dial » = +N au cadran. **Au-delà de 5 : Heal 1 par point d'excès** à la place.
- **DUSK** : à TON Upkeep, cadran +1. Dès que le cadran AFFICHE 5 → flip immédiat côté **DAWN**.
- **DAWN** : si ton Offensive Roll Phase produit une Attaque, tu PEUX ajouter la valeur du cadran en dégâts (*Attack Modifier*) ; si tu le fais, **cadran −4 à la fin de la Roll Phase**. Dès que le cadran AFFICHE 0 → flip immédiat côté **DUSK**.

## Jetons — leaflet (textes vérifiés)
- **Charged Gem** (positif, **stack 1**) : dépensable à SA Main Phase, lance 1d6 — 1-2 : +1 CP ; 3-4 : 2 dmg isolés INDÉFENDABLES à un adversaire ; 5-6 : les deux.
- **Sun Marked** (négatif, **stack 1**, PERSISTANT) : quand le porteur est Attaqué, **l'Attaquant Heal 2**. *Attack Modifier.*

## Board (8 habiletés + défense) — photos lues, ⚠ patterns à confirmer
| Habileté | Exigence | Effet |
|---|---|---|
| Light Staff | 3/4/5 A | 4/5/7 dmg ; sur 4-of-a-kind (#'s) → Sun Dial +1 |
| Ray Absorption | BBBB | Sun Dial +3 ; Heal 2 ; gagne Charged Gem (pas de dégâts) |
| Radiant Energy | ⚠ AAACC ? | inflige Sun Marked ; puis 6 dmg |
| Scorching Staff | ABBB | 5 dmg et lance 1d6 : A → +2 dmg ; B → Dial +2 ; C → Charged Gem + Dial +2 |
| Ray of Light | petite SUITE | Dial +1 ; puis 7 dmg |
| Sunbeam | grande SUITE | Dial +2 ; puis 9 dmg |
| Solar Burst | CCCC | Dial +2 ; CHOIX : Charged Gem OU Sun Marked ; puis 8 dmg |
| Solar Flare! **ULT** | CCCCC | Dial +3 ; Charged Gem ; Sun Marked ; puis **10 dmg** |
| **Harness the Light** (déf.) | Defense Roll **3** | Heal 1 par A ; ⚠ « On BB » → Dial +1 ; « On C » → Dial +1 |

## Cartes (15 uniques lues : 6 upgrades + 9 actions) — ⚠ 1 carte manquante probable (doublon de scan)
**Upgrades (6)** :
- Light Staff II (1 CP) : 5/6/7 dmg ; le Dial +1 passe au **3-of-a-kind**.
- Scorching Staff II (2 CP) : 5 dmg et lance **2d6** : +2 dmg PAR A ; Dial +1 PAR B ; sur C → Charged Gem + Dial +2.
- Radiant Energy II (2 CP) : pattern **AACC** ; Sun Marked ; puis **6 dmg** ; + alt **PRAISE THE SUN (AAAC)** : Charged Gem + 5 dmg.
- Solar Burst II (2 CP) : Dial +2 ; Charged Gem **ET** Sun Marked ; puis **7 dmg INDÉFENDABLES** ; + alt **BESTOW YOUR LIGHT (CCC)** : Dial +4 ; Sun Marked (pas de dégâts).
- Sunbeam II (2 CP) : grande suite — Dial +3 ; puis **9 dmg** ; + alt **SOAKING UP THE SUN (BCCC)** : Charged Gem + **9 dmg**.
- Harness the Light II (3 CP, déf.) : Heal 1 par A ; sur B → Dial +1 ; Dial +1 PAR C ; sur **A+B+C** → gagne Charged Gem.

**Actions (9)** :
- Clouds Parting! (1 CP, Main) : lance 1d6 → Dial + la MOITIÉ de la valeur (arrondi sup).
- Solstice! (2 CP, Main) : CHOIX — 2 dmg à tous les adversaires OU toi (et coéquipiers) Heal 2.
- Here Comes the Sun! (1 CP, **Instant**) : seulement côté **DUSK** — Dial +2.
- It Gives Life! (1 CP, Main) : réduis le cadran à 0 (min 1 de réduction) ; un joueur choisi Heal = montant réduit (max 5).
- The Sun's Blessing! (1 CP, Main) : lance 1d6 → A : Charged Gem ; B : pioche 2 ; C : cadran À 5.
- Sun Shield! (0 CP, **Instant**) : retire Charged Gem → préviens 3 dmg entrants.
- First Light! (2 CP, Main) : seulement si cadran à 0 — Dial +2 ; inflige Sun Marked.
- The Glorious Sun! (0 CP, Main) : **FLIP** ton Sun Dial (change de face, même valeur).
- Radiant Exchange! (2 CP, Roll Phase) : réduis le cadran à 0 (min 1) ; change 1 de tes dés en 6.

## Notes moteur (préliminaires)
- État : dial 0-5 + face dusk/dawn → clé solveur + PlayerState (pattern cadran Nevermore/Footwork).
- DAWN spend = décision (Attack Modifier) : IA heuristique / humain pré-armé — même famille que Guard Break.
- Sun Marked : le heal se déclenche à CHAQUE attaque (persistant) → gros swing vs heros à multi-attaques.
- Charged Gem : Main Phase, 1d6 — auto-résolu IA, bouton humain.

## Questions user (2026-07-08)
1. **Scan doublon** : 221100 = 221109 (Scorching Staff II ×2). Il manque donc probablement UNE carte (Ray of Light II ? Ray Absorption II ? autre action ?) — rescanne-la.
2. **Faces du dé** : 1-3 Bâton / 4-5 Œil / 6 Soleil ? Les noms officiels (photo leaflet des faces si tu l'as) ?
3. **Radiant Energy (base, board)** : pattern exact ? Je lis AAACC (3 bâtons + 2 soleils, 5 dés) et le II passe à AACC (4 dés) — confirme.
4. **Harness the Light (base)** : « On BB » = il faut 2 Œils (une fois) pour Dial +1 ? Et « On C » une fois même avec plusieurs Soleils ?
5. **DAWN** : le + cadran en dégâts s'applique aussi à l'ULTIMATE ? (je présume oui, comme le +2 Cat du Druide)
6. **Sun Marked** : l'attaquant Heal 2 sur TOUTE attaque (indéfendable incluse) tant que le jeton reste ?
