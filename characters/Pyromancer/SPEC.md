# PYROMANCER — Spec vérifiée (scans user 2026-07-06)

Source : `characters/Pyromancer/board/*.jpg`, `leaflet/Screenshot_{20..24}.png`, `cards/*.jpg` (14 cartes).
50 PV / 2 CP (norme). Dé à **4 symboles** : **1-3 Flame (F)**, **4 Blaze (B)**, **5 Fiery Soul (S)**, **6 Meteor (M)**.

## Jetons — leaflet (textes vérifiés)
- **Fire Mastery (FM)** (positif, **stack 5** — augmentable par cartes) : à TON upkeep, tu dois « cool off » en retirant 1 jeton. Booste les habiletés.
- **Burn** (négatif, stack 1) : le porteur reçoit **2 dmg à son Upkeep**. **Persistant** (ne se retire pas tout seul).
- **Knockdown** (négatif, stack 1) : avant le début de son Offensive Roll Phase, le porteur **paie 2 CP** pour retirer le jeton, SINON il **saute son Offensive Roll Phase** puis retire le jeton.
- **Stun** (négatif, stack 1) : le porteur **ne peut RIEN faire** (pas de cartes, pas de défense, pas de jetons/passifs) pendant l'Attaque. À la fin de l'Attaque, l'infligeur retire le jeton et cible immédiatement le même adversaire avec une **Offensive Roll Phase additionnelle**.

## Board (8 attaques + défense)
| Habileté | Exigence | Effet |
|---|---|---|
| Fireball | 3/4/5 F | 4/6/8 dmg + **+1 FM** |
| Burning Soul | SS | **+2 FM par S** ; **1 collatéral par S** à tous les adversaires |
| Combustion | F+B+S+M (1 de chaque) | +1 FM ; puis retire jusqu'à 4 FM → **3 dmg indéfendables PAR jeton retiré** |
| Pyroblast | FFF+M | 6 dmg et lance 1d6 : F → +3 dmg ; B → inflige **Burn** ; S → +2 FM ; M → inflige **Knockdown** |
| Hot Streak | petite SUITE | +2 FM ; puis **5 + 1 dmg par FM** |
| Ignite | grande SUITE | +2 FM ; puis **4 + 2 dmg par FM** |
| Meteorite | MMMM | +2 FM ; inflige **Stun** ; puis **1 dmg indéfendable par FM** ; + **2 collatéraux** à tous |
| Scorch the Earth! **ULT** | MMMMM | +3 FM ; inflige **Knockdown & Burn** ; **12 dmg** ; + 2 collatéraux |
| **Molten Armor** (déf.) | Defense Roll **5** | **+1 FM par S** ; **1 dmg par F** à l'attaquant |

## Cartes (14 : 4 actions + 10 upgrades)
**Actions (4)** :
- Warm Up! (0 CP, Main) : +1 FM ; puis dépense des CP à volonté → **+1 FM par CP dépensé**.
- Fire Up! (3 CP, Main) : **augmente le stack limit de FM de 1** (permanent) ; puis +2 FM.
- Huzzah! (1 CP, Roll Phase, **Attack Modifier**) : lance 1d6 → F : +3 dmg ; B : inflige Burn ; S : +2 FM ; M : inflige Knockdown.
- Red Hot! (1 CP, Roll Phase, **Attack Modifier**) : **+1 dmg par FM**.

**Upgrades (10)** :
- Fireball II (1 CP) : 4/6/8 (idem) ; **+2 FM**.
- Burning Soul II (1 CP) : sur SSS → inflige **Burn** ; sur SSSS → **stack limit FM +1** ; +2 FM par S ; 1 collatéral par S.
- Combustion II (2 CP) : **4 dmg indéf. par jeton** retiré (reste idem).
- Pyroblast II (2 CP) : 6 dmg, lance **2d6** (mêmes effets, +3 dmg PAR F, +2 FM PAR S).
- Pyroblast III (3 CP) : idem II + **peut relancer 1 des 2 dés**.
- Hot Streak II (2 CP) : **6** + 1/FM ; + alt **SCORCH (FFBB)** : +2 FM, inflige **Burn**, 6 dmg.
- Ignite II (2 CP) : +2 FM, inflige **Burn**, puis **5 + 2/FM** ; + alt **BLAZING SOUL (BBSS)** : **stack limit FM +1**, **+5 FM**, inflige **Knockdown**.
- Meteorite II (2 CP) : collatéraux → **3** (reste idem) ; + alt **METEOROID (MMM)** : inflige **Knockdown, Burn ET Stun** (pas de dmg).
- Molten Armor II (1 CP, déf.) : +1 FM par S ; « On F/B » → inflige **Burn** ; 1 dmg par F.
- Molten Armor III (3 CP, déf.) : **+1 FM par S ET par M** ; « On F/B » → Burn ; **1 dmg par F + 1 par M**.

## Notes moteur
- 4 symboles de dé → le solveur A/B/C ne suffit pas, classification locale à 4 groupes.
- « Collateral dmg » = indéfendable, non modifiable (convention existante) ; en 1v1 « all opponents » = l'adversaire.
- Stun = l'attaque se résout SANS défense ni cartes du défenseur, puis l'infligeur enchaîne une Offensive Roll Phase complète (même mécanique moteur que Combo sm, mais déclenchée par l'attaquant).
- Fire Up!/Blazing Soul/Burning Soul II : cap FM permanent 5→6→7… (pattern featherCapBonus).

## Rulings confirmés par l'user (2026-07-06)
1. ✅ Molten Armor II/III « On [F][B], inflict Burn » : il faut **un F ET un B** (les deux) sur les 5 dés.
2. ✅ Knockdown : le porteur choisit lui-même (payer 2 CP ou sauter son Offensive Roll Phase).
3. ✅ Burning Soul : 2 FM **par** Fiery Soul roulé (4 avec la paire, 6 avec SSS…).
4. ✅ Un joueur peut porter Burn + Knockdown + Stun simultanément (stack 1 chacun).
