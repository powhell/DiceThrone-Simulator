# DUELIST — Spec vérifiée (scans user 2026-07-07)

Source : `characters/Duelist/board/*.jpg` (3), `leaflet/Screenshot_{26..30}.png` (5), `cards/*.jpg` (14 cartes).
50 PV / 2 CP (norme). Dé : **1-3 Blade (A)**, **4-5 Boot (B)**, **6 Pierce (C)**.

## Footwork Track (mécanique centrale — leaflet, texte vérifié)
5 positions (haut → bas) : **+3 Offensive / +1 Offensive / NEUTRAL / +1 Defensive / +3 Defensive**.
Effets (icônes vérifiées + ruling user 2026-07-07) : Offensive = **+1 / +3 dmg** (Attack Modifier) ; Defensive +1 = **pige 1 carte** (icône carte) ; Defensive +3 = **prévient 3 dmg** (icône bouclier).
Le jeton Footwork **démarre en Neutral** (Hero Setup).
- « Take a Step » = déplacer le jeton d'une case vers l'avant (up) ou l'arrière (down).
- **En attaquant** : gagne l'**Offensive Bonus** de la position FINALE du jeton. *Attack Modifier*.
- **Quand attaqué avec des dégâts NORMAUX** : gagne le **Defensive Bonus** de la position FINALE du jeton.
- Les bonus Off./Déf. se résolvent **avant le calcul du total final de dmg pendant la Defensive Roll Phase**.
- **Un seul Bonus résolu par tour.**

## Jetons — leaflet (textes vérifiés)
- **Guard Break** (positif, **stack 2**) : IDENTIQUE à celui de Thor — à la fin de son Offensive Roll Phase avec une Attaque, peut dépenser le jeton et lancer 1d6 : sur **4-5** l'attaque devient **indéfendable**.
- **Disarm** (négatif, **stack 1**) : à SON Upkeep, le porteur **peut choisir de défausser 1 carte** ; s'il ne le fait pas (ou ne peut pas), il **saute sa Income Phase**. Puis retire le jeton.

## Passif
- **Reposition** (PASSIVE, Upkeep) : à ton Upkeep, choisis avant (up) ou arrière (down) ; tu **DOIS prendre 1 ou 2 Steps** dans cette direction. Si tu recules avec CE passif → **gagne Guard Break**.

## Board (8 attaques + défense)
| Habileté | Exigence | Effet |
|---|---|---|
| Blade Flurry | 3/4/5 Blades | 4/5/6 dmg ; sur 4-of-a-kind (chiffres) → may take 1 Step |
| Balestra | AABB (2 Blades + 2 Boots) | may take up to 2 Steps ; puis **6 dmg** |
| Feint Attack | AACC (2 Blades + 2 Pierce) | gagne **Guard Break** ; may take 1 Step ; puis **2 dmg indéfendables** |
| En Garde | CBBB (1 Pierce + 3 Boots) | **8 dmg** et lance **4d6** : sur **Pierce** → inflige **Disarm** |
| Strike | petite SUITE | **7 dmg** |
| Strike (large) | grande SUITE | may take 1 Step ; puis **10 dmg** |
| Bladestorm | CCCC (4 Pierce) | gagne **Guard Break** ; inflige **Disarm** ; may take up to 2 Steps ; puis **8 dmg** |
| Master of the Blade! **ULT** | CCCCC (5 Pierce) | gagne **2 Guard Break** ; inflige **Disarm** ; may take up to 4 Steps ; puis **11 dmg** |
| **Retreat** (déf.) | Defense Roll **4** | **1 dmg par 2 Blades** à l'attaquant ; **pour CHAQUE Boot ou Pierce roulé, tu DOIS prendre 1 Step backward** |

## Cartes (14 : 5 upgrades + 9 actions)
**Upgrades** :
- Blade Flurry II (2 CP) : 5/6/7 dmg ; le Step passe au **3-of-a-kind**.
- Balestra II (2 CP) : up to 2 Steps ; **8 dmg** ; + alt **FANCY FEET (BBB)** : gagne Guard Break, may take up to 3 Steps (pas de dmg).
- Feint Attack II (2 CP) : **2 Guard Break** ; 1 Step ; **3 dmg indéfendables**.
- Bladestorm II (2 CP) : **2 Guard Break** ; Disarm ; up to 2 Steps ; **9 dmg** ; + alt **BLADEWIND (CCC)** : **3 collatéraux**.
- Retreat II (2 CP, déf.) : **1 dmg PAR Blade** (au lieu de par 2) ; reste idem.

**Actions** :
- Pick It Up (0 CP, Roll Phase, **Attack Modifier**) : si l'adversaire a Disarm → retire-le et **+3 dmg** à l'attaque.
- Sashay (2 CP, Main) : 1 Step forward + **2 dmg** OU 1 Step backward + **heal 2**.
- Courageous Advance! (2 CP, Main) : take up to **2 Steps forward**.
- I Hate Waiting (1 CP, après avoir été Attaqué) : up to **2 Steps backward**.
- Burst Forward (1 CP, Roll Phase, **Attack Modifier**) : **1 Step forward**.
- Quick Footwork (1 CP, Roll Phase) : change 1 dé en **4 ou 5**.
- All in the Wrists (1 CP, Main) : inflige **Disarm** à jusqu'à 2 adversaires.
- Confident Footing (1 CP, Main) : si en **Neutral** → gagne **2 Guard Break**.
- Blade Barrage (2 CP, Roll Phase, **Attack Modifier**) : lance 5d6 → **+1 dmg par Blade** ; sur 2 Boots → may take 1 Step.

## Notes moteur
- Footwork = état persistant à 5 valeurs (−2..+2) → entre dans la clé du solveur ET les features RL.
- Offensive Bonus = +1/+3 dmg (Attack Modifier) ; Defensive Bonus : position −1 = pige 1 carte, position −2 = prévient 3 dmg (✅ ruling user + icônes).
- Retreat déplace le jeton PENDANT la Defensive Roll Phase → la position finale (après les Steps forcés) détermine le Defensive Bonus (le leaflet dit « final position » + « resolved before determining the final dmg total »).
- Guard Break : réutiliser tel quel le code Thor (jeton, pré-armement UI, policy hook chooseGuardBreakSpend).
- « Up to X Steps » = optionnel, 0 à X, direction au choix par Step (à confirmer, Q3).

## Rulings user (2026-07-07)
1. ✅ Bonus : Off. +1/+3 dmg ; Déf. +1 = **pige 1 carte**, +3 = **prévient 3 dmg** (confirmé icônes leaflet).
2. ✅ (« je crois que oui ») Un seul Bonus par tour — la 2ᵉ attaque du même tour (Combo sm / phase Stun py) n'en a pas.
3. ✅ Direction des Steps « up to X » : libre par Step (« tu peux avancer ou reculer comme tu veux ») ; la contrainte « une seule direction » n'existe que pour le passif Reposition à l'Upkeep.
4. ✅ Bord de piste : les Steps au-delà des extrémités sont perdus ; Reposition à un bout = forcé de partir dans l'autre direction.
5. ✅ Retreat : les Steps backward forcés bougent toujours le jeton (« for each ») — la position finale donne le bonus défensif de l'attaque en cours.
6. ✅ **CORRIGÉ 2026-07-08 : Reposition — TOUT recul (1 ou 2 steps) donne le Guard Break.** (La lecture du 07-07 « seulement exactement 1 step » était erronée — re-vérifié par l'user à la table.)
