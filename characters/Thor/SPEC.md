# THOR — Spec vérifiée (scans user 2026-07-06)

Source : `characters/Thor/board/*.jpg`, `leaflet/Screenshot_{11,12,14,15}.png`, `cards/*.jpg` (15 cartes).
50 PV / 2 CP (norme). Dé : **1-3 Marteau (H)**, **4-5 Digne/Worthy (W)**, **6 Tonnerre (T)**.

## Mjölnir (Companion) — leaflet 15
- Commence la partie **sur le board de Thor**.
- **Throw** (marteau sur ton board → chez l'adversaire) : inflige **1 dmg isolé indéfendable**.
- **Retrieve** (chez l'adversaire → ton board) : gagne **1 Electrokinesis**.
- À TOUT MOMENT : défausser 1 carte pour Throw ou Retrieve. Gratuit quand une habileté le dit.
- Interdit de Throw s'il n'est pas sur ton board ; interdit de Retrieve s'il y est déjà.
- "Up to X times" = alternances successives (T→R→T…), chaque pas donne son bonus.

## Jetons — leaflet 11/12
- **Electrokinesis (EK)** : positif, cap 4. Booste les habiletés ; 1×/tour en Main Phase : dépenser 4 EK → piocher 1.
- **Guard Break (GB)** : positif, cap 2. À la fin de l'Offensive Roll Phase avec une Attaque : dépenser le jeton, lancer 1d6 → 4-5 : l'attaque devient **indéfendable**.

## Board (8 habiletés + défense)
| Habileté | Exigence | Effet |
|---|---|---|
| Hammered | 3/4/5 H | 4/5/7 dmg + **Throw Mjölnir** |
| Mighty Summon | H+WW+T | +2 GB, Heal 2 ; si Mjölnir sur ton board : +3 EK ; sinon Retrieve → **3 collateral** au porteur |
| Chain Lightning | HHH+TT | Lance 3d6 : dmg = somme des 2 meilleurs ; +2 collateral isolé |
| Odinforce | HH+WWW | 5 dmg & lance 5d6 : ≥2H → 1 Throw/Retrieve ; ≥2W → +1 CP ; +1 EK par T ; puis **+1 dmg × EK** |
| Bottled Lightning | TTTT | Throw/Retrieve ×2, +2 GB, puis 7 dmg **+1 × EK** |
| Lightning Rod | SUITE 4 | 7 dmg ; si l'adversaire a Mjölnir : 9 dmg ; sinon +1 EK |
| Thunder Bolt | SUITE 5 | Throw/Retrieve, +2 EK, 10 dmg |
| For Asgard! | TTTTT **ULT** | +1 GB, Throw/Retrieve ×4, **14 dmg** (indéfendable, non-interruptible) |
| **Thunder Wheel** (déf.) | lance 3 dés | ≥2H : 1 Throw/Retrieve ; prévient **2 × W** ; +1 EK par T |

## Cartes héros (15)
**Actions (6)** :
- Indomitable Will! (2 CP, Roll Phase, après attaque) : si l'attaque te mettrait à 0 PV → d6 : sur W (4-5), PV = 1 à la place.
- Invulnerability! (2 CP, Roll Phase) : défausse 2 EK → prévient TOUT le dmg entrant.
- He Is Worthy! (1 CP, Roll Phase) : change 1 de tes dés en 4 ou 5.
- Power Trip! (1 CP, Instant) : pioche 1, +2 EK.
- Time to Hammer! (0 CP, Instant) : Retrieve Mjölnir, +1 CP et +1 EK.
- Stormbreak! (0 CP, Instant, seulement si Thrown Mjölnir 2× ce tour) : pioche 1, +1 CP, +1 GB, +1 EK.

**Upgrades (9)** :
- Hammered II (0 CP!) : 5/6/7 + T/R ; 4-of-a-kind (chiffres) → +1 EK.
- Hammered III (2 CP) : 5/6/8 + T/R ; 3-of-a-kind → +1 EK.
- Mighty Summon II (2 CP) : Heal 3, collateral 4 ; + **BOOM BOOM!** (HH+TT) : +2 EK, 6 dmg.
- Chain Lightning II (2 CP) : lance **4d6** (2 meilleurs), collateral 3.
- Odinforce II (2 CP) : **6** dmg ; peut **relancer jusqu'à 5** des dés du jet ; reste idem.
- Bottled Lightning II (2 CP) : T/R ×3, 8 dmg + EK ; + **RICOCHET!** (TTT) : T/R jusqu'à **6 fois**.
- Lightning Rod II (2 CP) : SUITE 4 → T/R, +1 EK, **9 dmg** (inconditionnel).
- Thunder Bolt II (2 CP) : 12 dmg ; + **ASGARDIAN BRAWN** (WWW) : Heal 4.
- Thunder Wheel II (2 CP, déf.) : lance **4** dés ; **CHAQUE** paire de H → T/R ; prévient 2×W ; +1 EK par T.

## Interprétations à confirmer (⚠)
1. Odinforce/TW I « On 🔨🔨 » = déclenche UNE fois si ≥2 H (TW II dit « for every » → I = une fois).
2. Odinforce II : relance choisie AVANT de résoudre les effets (on résout le jet final uniquement).
3. GB : 1 seul jeton dépensable par attaque (pas les 2 d'un coup).
4. Collateral = indéfendable, non modifiable (comme isolé).
