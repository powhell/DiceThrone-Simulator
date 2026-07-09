# PLAN — Vrai agent Dice Throne fort (jouable à haut niveau)

**But du user (2026-07-09, sans ambiguïté) :** un VRAI adversaire IA performant, contre qui
s'entraîner à haut niveau pour progresser. Pas un bot jetable. On prend le temps de le faire
bien, sur plusieurs sessions.

Ce document est la source de vérité du projet. Chaque session le lit, exécute la phase courante,
et met à jour l'état à la fin.

---

## 1. Diagnostic honnête de l'existant (pourquoi c'est faible)

Lu dans le code (`rl/network.ts`, `rl/trainCore.ts`, `rl/features.ts`, `rl/valueGreedyPolicy.ts`) :

| Pièce | État réel | Conséquence |
|---|---|---|
| Réseau | MLP 24→12, **une seule sortie valeur**, pas de tête politique | Capacité minuscule ; ne propose pas de coups |
| Décision | **1 coup d'anticipation** (`scoreCandidatesByReplay`) | Aveugle à la valeur différée (brade cartes, ne cash pas l'EK) |
| Entraînement | **TD(0) auto-joué**, LR constant, pas de target net / clipping / replay buffer | Instable (le code note un collapse 50-75 %→5-16 %) ; apprend un jeu faible |
| Sélection d'attaque | lookahead **dégâts-directs seulement** (v1 gap) | Sous-évalue les kits non-dégât (Thor, etc.) |
| Features | layout **change quand on ajoute un héros** | Re-train à zéro à chaque perso |

**Conclusion : ce n'était pas "presque bon", c'était structurellement incapable d'être fort.**
On ne l'améliore pas par plus d'entraînement ni un plus gros réseau seul — il faut **la recherche**
et **une boucle d'entraînement stable**.

## 2. Cible technique

Un agent **AlphaZero adapté à Dice Throne**. Difficulté spécifique du jeu :
- **Hasard** (dés) → nœuds de chance dans l'arbre.
- **Information imparfaite** (main adverse cachée) → **ISMCTS** (Information Set MCTS) par
  déterminisation (échantillonner des mains adverses plausibles, chercher, agréger).

Composants :
1. **Interface de décision unifiée** — TOUTE décision (garder dés déjà exact via solveur ; sinon :
   quelle attaque, quelle carte, défense, réponses…) exposée comme un nœud avec `legalActions`,
   `apply`, `isChance`, `currentPlayer`, `isTerminal`. Le moteur a déjà `decide`/`DecisionRequest`
   + `resolveResponseWindow` (Stages 1-4) — à FINIR d'unifier.
2. **ISMCTS** guidé par le réseau (PUCT), nœuds de chance pour les dés, déterminisation des mains.
3. **Réseau politique + valeur**, plus large, features agnostiques au perso (taille fixe).
4. **Boucle AlphaZero** : self-play(MCTS) → (état, politique=visites MCTS, résultat) → entraînement
   supervisé ; replay buffer ; gating best-vs-candidate. Remplace le TD(0).
5. **Mode jeu haut niveau** : l'humain affronte l'agent MCTS via l'UI interactive existante.

## 3. Ordre de construction (phases — chacune doit battre la précédente, mesuré)

- **Phase 0 — Cadre & garde-fous** *(en cours)* : ce plan ; suite de parties de référence + métrique
  de force (winrate vs greedy ET vs le réseau actuel) pour prouver chaque gain. Le solveur de dés
  exact reste tel quel (il est optimal).
- **Phase 1 — Interface de décision unifiée pour la recherche.** Faire passer TOUTES les décisions
  par un nœud enEnumérable + un pas de simulation clonable. Réutiliser `DecisionRequest`,
  `applyWindowAction`, `cloneForLookahead`. Livrable : un `GameNode` sur lequel un algo générique
  peut jouer une partie complète sans hook spécial.
- **Phase 2 — MCTS (info parfaite d'abord).** MCTS/PUCT guidé par le réseau VALEUR actuel (réutilisé
  comme évaluateur), dés = nœuds de chance. On triche temporairement en révélant la main adverse.
  **Test A/B : MCTS(k simulations) vs 1-coup actuel.** S'il gagne → la recherche est le levier (preuve).
- **Phase 3 — Information imparfaite (ISMCTS).** Déterminisation des mains adverses (échantillon
  depuis l'info publique : deck/défausse connus). Agrégation. Re-mesure.
- **Phase 4 — Réseau politique+valeur & features stables.** Deux têtes ; features agnostiques au
  perso (identité en embedding fixe, emplacements génériques) → ajouter un héros ne redimensionne
  plus l'entrée (fix du "re-train à zéro"). Init depuis warm-start si possible.
- **Phase 5 — Boucle d'entraînement AlphaZero.** Self-play piloté par ISMCTS ; cibles = visites MCTS
  (politique) + résultat (valeur) ; replay buffer ; entraînement stable (clipping, LR schedule,
  target/gating). Parallélisation (`trainParallel` existe). Gating : ne promeut un réseau que s'il
  bat le meilleur courant.
- **Phase 6 — Montée en puissance & évaluation.** Boucles longues, courbe de force, table
  d'équilibre RE-générée avec l'agent fort (= vrai guide tournoi). Réserve CPU raisonnable (cf.
  [[feedback_resource_usage]]).
- **Phase 7 — Jeu haut niveau.** Brancher l'agent MCTS dans `interactive.ts`/l'UI pour que l'humain
  joue contre lui. Réglage du budget de recherche (force vs temps de réponse).

## 4. Décisions ouvertes (à trancher en construisant)

- ISMCTS pur vs PIMC (Perfect-Information Monte Carlo) simple au début — commencer simple.
- Budget de recherche par coup (simulations) : force vs vitesse d'entraînement.
- Taille du réseau : viser ~256+ unités / structure par blocs joueur — à calibrer.
- Garder le solveur de dés exact comme "expert" dans l'arbre (les nœuds de garde-dés ne sont pas
  cherchés, ils sont résolus) — gros gain de perf, à confirmer.

## 5. État courant

- **Phase 0 en cours.** Prochaine action : figer la métrique de force (banc de réf) puis attaquer
  Phase 1 (interface `GameNode`).
- Le prototype existant (réseau 24/12 + value-greedy) reste en place comme **baseline à battre**,
  pas comme produit.

## 5b. Phase 1 — inventaire des points de décision à unifier

Pour que la recherche pilote une partie via UNE seule API `legalActions/apply`, tout ça doit
passer par un nœud enumérable. État actuel (source : `policy.ts`) :

**Déjà unifié** (via `decide(DecisionRequest)` + `resolveResponseWindow`) : fenêtres `mainPhase`,
`defense`, `offensiveRoll`, `defenseRoll`.

**Hooks bespoke à migrer vers le modèle unifié :**
1. `chooseAbility` — quelle habileté activer (résolution d'attaque) ← **le plus important**
2. `chooseAttackModifierCards` — cartes modificatrices de l'attaquant
3. `chooseRollManipulationCards` — Six-It!/So Wild!/Twice/Samesies!/Try Try/One More Time!
4. `chooseCardsToDiscard` — vente en Discard Phase
5. `chooseSabotageReroll` — BW
6. `chooseMidRollCards` — BW (Red Room Training, mid-roll)
7. `chooseHeadlessMayhem` / `chooseHorrifyBonus` — HH
8. `chooseGrimPursuitSpend` / `chooseGrimPursuitReroll` — HH (modes a/b)
9. `chooseGuardBreakSpend` — TH/DU
10. `chooseFmMine` — FM
11. `chooseNevermoreActivation` — RV
12. `chooseDiscardForRoar` — Naraxus

**Nœuds de CHANCE (dés) à modéliser explicitement :** roll offensif, roll défensif, et les
sous-jets d'habiletés (Chain Lightning, Odinforce, dé de Guard Break, Vegas Baby!, etc.).

**Info cachée :** main adverse (déterminisation en Phase 3). Deck/défausse = publics.

**Nœud "expert" non cherché :** la garde des dés (solveur DP exact) — la recherche ne branche pas
dessus, elle appelle le solveur. Idem le sous-jet des dés = nœud de chance échantillonné.

**Livrable Phase 1 :** `engine-ts/src/sim/search/gameNode.ts` — un `GameNode` avec
`currentActor` (joueur | chance), `legalActions()`, `apply(action, rng)`, `isTerminal()`,
`clone()`, exposant TOUS les points ci-dessus de façon homogène ; + un pilote qui joue une partie
complète via cette seule API (parité prouvée vs `playTurn`).

## 6. Journal (append à chaque session)

- 2026-07-09 : plan créé après constat que l'existant est structurellement faible (réseau minuscule,
  TD(0) instable, 1-coup, features fragiles). Décision : rebuild façon AlphaZero+ISMCTS. Voir
  [[project_strong_ai_build]].
