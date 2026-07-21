# Journal des tests — Strong AI (self-play AlphaZero)

Registre durable de tous les tests et décisions. Committé dans le repo → survit à un clear de
mémoire, à la fin de session, à un changement de machine. Complète (ne remplace pas)
`PLAN_STRONG_AI.md` (la spec/plan) et l'historique git (les messages de commit).

Métrique de référence dans tout ce document : **winrate du champion strong-AI contre `value-greedy`**
(l'IA actuellement déployée dans `play.html` : lookahead 1 coup guidé par le réseau v4 calibré).
`gen0` = réseau v5 à l'initialisation aléatoire. Toutes les parties : gate MCTS, 11 matchups (MB inclus).

---

## ⭐ OÙ ON EN EST (à lire en premier)

**⚠️ CORRECTION 2026-07-21 (test fiable) : on NE bat PAS value-greedy — l'optimisme précédent était
du BRUIT.** Les tests à 88 parties (±10 %) donnaient 44 %, 46 % « au bord de la parité ». Un GROS test
fiable (440 parties, ±5 %) de MCTS(v4 + priors warm) vs value-greedy = **33,3 %** (IC 29-38), **nettement
sous 50 %**. Les « améliorations » 44→46 étaient des flukes de petits échantillons. Ce qui reste SOLIDE
(gros effets, réels même à 88 parties) : loop cassé 15 % → **warm-start 25 %** (vrai bond). Au-delà, les
variantes MCTS(v4/warm, sims, priors) se regroupent autour de **~33 %** une fois mesurées proprement.

**Leçon : ne JAMAIS conclure sur 88 parties (±10 %).** Pour toute question fine (« bat-on X ? »), 400+
parties obligatoires. Le user l'avait dit deux fois.

**Incertitude honnête restante :** les priors warm ont peut-être NUI (v4+uniforme montrait 44 % en petit
test, v4+priors big test = 33 %). Possible que de MEILLEURS priors aident. Mais aucun chiffre >40 % n'a
jamais été confirmé à grande échelle → prudence maximale.

**État réel : notre meilleur agent ≈ 33 % vs value-greedy. value-greedy reste nettement le meilleur.**

Ce qui a fait monter les chiffres (PAS le self-play — lui, 0 promotion sur ~9 rondes) :
1. **Warm-start** (imiter value-greedy au lieu de partir du hasard) : remonte le plancher 15 → 25 %.
2. **Profondeur de recherche** (sims 120→300→800, dés 6→20) : extrait plus du réseau, 25 → 37 %.
3. **Meilleur évaluateur** (réseau v4 au lieu du warm faible dans le MCTS) : 33 → 44 % à sims égaux.

**PROCHAIN TEST : MCTS(v4) à sims plus élevés (600-800)** — la recherche montait déjà avec le warm,
avec le bon réseau ça devrait franchir 50 %. Levier bonus : **priors informés** (le v4 n'a pas de tête
politique → priors uniformes ; ajouter un prior heuristique focaliserait la recherche).

**Correction 2026-07-21 :** mon hypothèse « strong-AI handicapé par le greedy délégué » était FAUSSE —
les délégués `greedyHighestDamagePolicy` sont **symétriques** (l'adversaire value-greedy joue aussi au
greedy bête sur les mêmes 27 % via le `delegates` partagé du GameNode). Le 33-37 % est donc DÉJÀ la
comparaison propre « MCTS(warm) vs value-greedy 1-coup ». Ne PAS relancer un test de délégués.

**PROCHAIN TEST (LE bon, jamais fait) : MCTS branché sur le réseau v4** (celui, bien meilleur, que
value-greedy utilise) au lieu du réseau warm faible, vs value-greedy. Puisque la recherche aide ET que
le v4 est un meilleur évaluateur, MCTS-v4 devrait battre le 1-coup value-greedy à des sims raisonnables.
Câblage : un agent dans gate3 avec `evaluate` = valeur du réseau v4 (features.ts + `forward`), priors
uniformes (le v4 n'a pas de tête politique). **C'est le test définitif de viabilité.**

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

### 10. Scaling des sims (2026-07-21) — la recherche est un LEVIER
champion_warm vs value-greedy, MAX_CHANCE 20, à sims croissants : **120 → ~27 %, 300 → 33,3 %,
800 → 37,3 %** (31-52, IC 28-48, 88 parties, 48 min). Montée **monotone** → la profondeur de recherche
aide vraiment, gains lents (logarithmiques) car réseau warm faible. Motive le test v4-MCTS (cf. tête).

### 11. TEST DÉFINITIF — MCTS(réseau v4) vs value-greedy (commit gate3 v4MctsAgent)
MCTS avec le bon réseau v4 (au lieu du warm) comme évaluateur, priors uniformes, sims 300, MAX_CHANCE
20 : **44,2 %** (38-48, IC 34-55, 88 parties, 28 min). **+11 points vs le warm à sims égaux (33 %).**
3 lots sur 4 à ~50/50, un seul lot malchanceux. **Au bord de la parité** → le projet est viable, il
reste des leviers (sims plus hauts + priors informés) pour passer 50 %.

### 12. MCTS(v4) à sims 800
Même config, sims 800 : **46,5 %** (40-46, IC 36-57, 88 parties, 29 min). ⚠️ **CHIFFRE NON FIABLE**
(88 parties, ±10 %) — voir test #13 qui le contredit.

### 13. GROS test fiable — MCTS(v4 + priors warm) vs value-greedy (440 parties)
sims 300, MAX_CHANCE 20, **440 parties** (±5 %) : **33,3 %** (141-282, IC **29-38**), 124 min. Verdict
FIABLE : **nettement sous 50 %, on ne bat pas value-greedy.** Contredit les petits tests #11/#12 (44/46 %
= bruit). Les priors warm n'ont pas aidé (peut-être nui vs uniforme, non confirmé à grande échelle).
**Conclusion : l'optimisme « parité » était un artefact de petits échantillons.** Meilleur agent réel ≈ 33 %.

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
