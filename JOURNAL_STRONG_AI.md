# Journal des tests — Strong AI (self-play AlphaZero)

Registre durable de tous les tests et décisions. Committé dans le repo → survit à un clear de
mémoire, à la fin de session, à un changement de machine. Complète (ne remplace pas)
`PLAN_STRONG_AI.md` (la spec/plan) et l'historique git (les messages de commit).

Métrique de référence dans tout ce document : **winrate du champion strong-AI contre `value-greedy`**
(l'IA actuellement déployée dans `play.html` : lookahead 1 coup guidé par le réseau v4 calibré).
`gen0` = réseau v5 à l'initialisation aléatoire. Toutes les parties : gate MCTS, 11 matchups (MB inclus).

---

## ⭐ OÙ ON EN EST (à lire en premier)

Le **self-play AlphaZero ne s'auto-améliore pas** sur ce jeu à cette échelle (1 PC) : **0 promotion
réelle sur ~9 rondes** (warm + recherche renforcée). Le warm-start donne un gain PONCTUEL
(15 % → 25 % → 33 % vs value-greedy) mais le cliquet ne mord jamais.

**MAIS le dossier n'est PAS clos** (2026-07-21, objection user justifiée) : le strong-AI est
**handicapé** — il délègue **27 % de ses décisions au greedy BÊTE** (`greedyHighestDamagePolicy`),
alors que value-greedy joue « fin » (réseau v4) partout. **Test jamais fait** = changer les délégués
en **value-greedy** + garder le réseau warm + recherche renforcée, puis mesurer vs value-greedy.
Intuition solide : le MCTS regarde plusieurs coups, value-greedy un seul → le multi-coups DEVRAIT
battre le 1-coup **si on ne l'handicape pas**. **C'est LE prochain test à lancer.**

---

## Chronologie des tests (2026-07-18 → 21)

### 1. Perf — solveur de dés allégé · commit `fb5a09f`
`oracle.completeOffensiveRoll` appelait `calculateOptimalKeep` (calcul coach-only : `_abilityDist`
×32 gardes + buildAbilityBoard) alors que l'IA ne lit que la garde optimale. Nouveau `optimalKeep`.
**Résultat : 2× plus rapide, bit-identique** (vérifié 6/6 parties, gagnant + tours ; 55 s → 28 s).

### 2. MB intégré au training · commits `5801ef5`, `2e1bc91`, `1198628`
`featuresV5` : `'mb'` + 4 jetons dans les registres (append-only → FEATURE_COUNT_V5 inchangé = 223,
donc le champion existant reste chargeable = warm-start possible). `'mb'` dans `TRAINABLE_HEROES`.
`selfplay2` : matchups **dérivés de TRAINABLE_HEROES** (l'ancienne liste codée en dur excluait MB).
Vérifié : état MB s'encode à 223, `forward2(champion)` l'accepte.

### 3. DIAGNOSTIC — le loop était CASSÉ · artifact `c025666e`
- Baseline champion vs value-greedy **PLATE à ~15 %** sur 24 rondes, aucune tendance.
- Les 6 « promotions » de la nuit 18-19 étaient **du bruit** (test de Wilson : aucune ne passe).
- **Test décisif : champion (24 rondes) vs gen0 (aléatoire) = 43,4 %** (IC 33-54, 88 parties) → le
  champion joue **au niveau du hasard**. Le loop ne produisait rien.
- Écarté : pas de bug de signe (câblage MCTS/cibles vérifié) ; réseau contrôle 73 % des décisions.

### 4. Fixes du gate · commit `57c2763`
- `gate3` matchups dérivés de TRAINABLE_HEROES (MB était entraîné mais **jamais jugé**, baseline
  l'ignorait).
- Promotion `chain2` : **borne basse de Wilson > 0,5** (au lieu de `winrate > 0,5` qui promouvait sur
  du bruit). Confirmé : les 6 promotions de la nuit avaient wilsonLow max 0,461 → toutes du bruit.

### 5. WARM-START value-greedy · commit `7516037` · artifact `0082b8ee`
`warmstartGen.ts` = behavior-cloning : value-greedy joue, on enregistre (featuresV5, one-hot du coup
choisi, résultat) en DTX2 ; on entraîne gen0 dessus. Pipeline : 320 parties, 18 k exemples, 15 époques.
- **champion_warm vs gen0 = 63 %** (IC 52-73, **significatif**) — ce que 24 rondes de self-play
  n'avaient jamais fait (43 %).
- **champion_warm vs value-greedy = 29,6 %** (vs 15 % du loop cassé). Gain ponctuel réel.

### 6. Self-play DEPUIS le warm-start · artifact `9ae864b6`
6 rondes (24-29), sims 120, depuis champion_warm. **0 promotion.** Le champion ne change jamais → les
baselines (22,5 / 25,8 / 27,8 %) sont **le même réseau = bruit** (±3 %), pas une montée. Le warm-start
tient (~25 % vs vg) mais le self-play n'ajoute rien. *(Run bridée à ~13 h : Windows a sous-cadencé le
CPU écran éteint + workers BELOW_NORMAL — passer « Performances élevées » pour les runs longues.)*

### 7. Recherche renforcée · commit `e95314a`
`maxChanceChildren` 6 → 20 (réglable par env `MAX_CHANCE`) dans selfplay2 + gate3 — les dés étaient
sous-échantillonnés (6 issues/nœud), rendant la valeur des nœuds de chance trop bruitée.

### 8. Test décisif recherche renforcée
**champion_warm vs value-greedy, sims 300 + MAX_CHANCE 20 = 33,3 %** (29-58, IC 24-44, 88 parties,
29 min). Contre ~27 % à recherche faible. **Progrès mais modeste** : l'IC recouvre l'avant, pas
nettement significatif.

### 9. Self-play RENFORCÉ
3 rondes (30-32), sims 300 + MAX_CHANCE 20, depuis champion_warm. **0 promotion** (gate candidat
0,33-0,41). Baseline r31 = 32,9 %. Champion toujours figé. → même avec recherche forte, le self-play
ne cliquette pas.

---

## Ce qui reste PLAYABLE / utile (acquis solides, indépendants du verdict strong-AI)

- **Solveur 2× plus rapide** (`fb5a09f`).
- **Mythic Brawler pleinement intégré et jouable** avec choix humains · commit `445a767` : le joueur
  choisit quelle Strength gagner (`mbStrengthPref`) et combien d'Ocean dépenser (`mbOceanSpend`) —
  c'étaient des actions auto. Boutons dans `play.js` (phases roll + défense). L'IA n'est jamais
  affectée. 12 tests MB verts.
- **Calibration des jetons MB** (commit `9014530`, antérieur) : Sky 4,2/2,4 > Mountain 2,9/1,9 >
  Ocean ~0/0,7/0,65 ; MB 47,5 → 54,6 % vs BW.
- **Gate anti-bruit** + MB dans le pipeline d'entraînement.

## Fichiers d'état (rl-py/weights2/, gitignorés)
- `champion_warm.json` = réseau warm-start (le meilleur strong-AI actuel, ~25-33 % vs vg).
- `champion_broken_24r.json` = ancien champion cassé (sauvegarde).
- `champion.json` = actuellement = champion_warm.
- Tampon d'expérience cassé archivé : `exp2_broken_pre_warm/`.

## Artifacts (rapports web publiés)
- Diagnostic loop cassé : `c025666e-462f-4c82-aab4-1b5701291a7b`
- Warm-start avant/après : `0082b8ee-c86f-491e-871c-7851c54bea5d`
- Self-play depuis warm : `9ae864b6-2748-44dc-a989-709c02c5cecc`

## Questions ouvertes
1. **[PRIORITÉ] Délégués value-greedy** : changer `delegates` de `greedyHighestDamagePolicy` →
   `createValueGreedyPolicy` dans selfplay2/gate3, garder le réseau warm, recherche renforcée, mesurer
   vs value-greedy. Le multi-coups battrait-il enfin le 1-coup une fois « fin partout » ?
2. Resserrer la copie warm (cible douce = softmax des scores value-greedy au lieu du one-hot).
3. ISMCTS (info cachée) — jamais implémenté, plafonne le potentiel.
4. Passer la machine en « Performances élevées » pour les runs longues (throttle nocturne).
