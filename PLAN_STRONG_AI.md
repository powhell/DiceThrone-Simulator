# PLAN — Vrai agent Dice Throne fort (jouable à haut niveau)

**But du user (2026-07-09, sans ambiguïté) :** un VRAI adversaire IA performant, contre qui
s'entraîner à haut niveau pour progresser. Pas un bot jetable. On prend le temps de le faire
bien, sur plusieurs sessions.

Ce document est la source de vérité du projet. Chaque session le lit, exécute la phase courante,
et met à jour l'état à la fin. Raffiné avec le vocabulaire **codebase-design** (deep module /
seam / depth) le 2026-07-09.

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

Composants : (1) le **seam central `GameNode`** (§2b), (2) **MCTS/PUCT** guidé par le réseau avec
nœuds de chance + déterminisation, (3) **réseau politique+valeur** plus large, features agnostiques
au perso, (4) **boucle AlphaZero** self-play(MCTS)→cibles→train stable + gating, (5) **mode jeu
haut niveau** dans l'UI interactive.

## 2b. Le seam central : `GameNode` (design deep-module)

Tout le projet repose sur **un seul seam**. Bien le placer est LA décision de conception ; ce qui
va derrière (tout `turn.ts`, le solveur DP, le rng) est l'implémentation profonde.

### Le vrai problème : inverser le contrôle (push → pull)

Le moteur actuel **POUSSE** les décisions : `turn.ts` pilote la partie et, à chaque fenêtre,
rappelle `policies[p].decide(state, p, req)` (voir `resolveResponseWindow`, `decision.ts:48`). Un
algo de recherche a besoin de l'inverse — **TIRER** : *à ce nœud, donne-moi les coups légaux ; j'en
choisis un ; avance.* Le `GameNode` est l'adaptateur qui convertit le modèle *push* du moteur en
modèle *pull* pour la recherche.

Bonne nouvelle : le modèle décision-agnostique existe déjà. `resolveResponseWindow` prend des
closures `enumerate(state,p,ctx) → WindowAction[]` et `apply(state,p,action,ctx,rng)` — c'est
exactement `legalActions` + transition. **`GameNode` généralise ce couple à TOUS les points de
décision d'une partie entière** (§5b), pas juste une fenêtre.

### L'interface (petite — c'est le but)

```ts
type Actor =
  | { kind: 'player'; idx: 0 | 1 }   // à ce joueur de décider
  | { kind: 'chance' }               // un jet de dés doit être échantillonné
  | { kind: 'terminal' }             // partie finie

interface GameNode {
  currentActor(): Actor
  legalActions(): Action[]           // énumérable ; vide si chance/terminal
  apply(action: Action): GameNode    // avance jusqu'au PROCHAIN point de décision
  sampleChance(rng: RNG): GameNode    // nœud de chance : échantillonne une issue de dés
  determinize(rng: RNG): GameNode     // Phase 3 : fixe une main adverse plausible (info publique)
  isTerminal(): boolean
  reward(idx: 0 | 1): number          // à terminal : +1 / -1 (0 sinon)
  clone(): GameNode                   // la recherche clone des milliers de fois
}
```

Un caller (MCTS) apprend **~7 méthodes** et joue une partie complète, tous héros, toutes cartes,
toutes fenêtres d'interruption. **Depth = ce levier** : énormément de comportement (2800 lignes de
`turn.ts` + le solveur DP + les 10 kits) derrière une interface minuscule.

**Test de suppression :** si on supprime `GameNode`, chaque caller de recherche devrait connaître
tous les hooks bespoke (`chooseAbility`, `chooseGuardBreakSpend`, `chooseFmMine`, dés, fenêtres…).
La complexité réapparaît chez N callers → le module gagne sa place.

### Design-it-twice : comment matérialiser le *pull*

Deux interfaces candidates pour suspendre/reprendre le moteur à chaque décision :

- **(A) Générateur/coroutine.** Jouer le tour comme un générateur qui `yield` à chaque décision et
  reprend avec l'action choisie. Nœud = générateur suspendu. **Rejeté** : un générateur JS n'est
  pas clonable à bas coût → casse MCTS (qui a besoin de milliers de `clone()`). Mauvais sur le
  critère *clonabilité*.
- **(B) Rejeu déterministe par script.** Nœud = `{ snapshot de GameState, script d'actions, graine
  rng }`. `apply(action)` ajoute l'action au script et **rejoue le moteur de façon déterministe**
  jusqu'au prochain point de décision. `clone()` = `structuredClone(state)` + copie du script
  (bon marché). **Choisi** — et **déjà prouvé** : `interactive.ts` fait précisément ça pour la
  défense (`defensePolicy(script, probe)` + `savedRng`, rejeu sur un clone). Phase 1 = généraliser
  ce pont d'une fenêtre à la partie entière.

  *Risque perf (noté) :* rejouer depuis le début du tour à chaque `apply` coûte cher sous MCTS.
  Mitigation : **snapshotter l'état à chaque décision** (le nœud avance depuis le dernier snapshot,
  pas depuis le début du tour) — c'est un seam INTERNE, invisible dans l'interface ci-dessus, donc
  optimisable sans toucher les callers.

### Le solveur de dés = module profond réutilisé (nœud "expert", non cherché)

La garde des dés reste `calculateOptimalKeep` (DP exact, optimal). La recherche **ne branche pas**
sur les 2^5 gardes ; à un nœud de garde, `GameNode` **délègue** au solveur et renvoie sa décision.
Un adaptateur derrière le seam, gros gain de perf. (Une seule variante aujourd'hui → seam
hypothétique ; on ne le généralise pas tant que rien ne varie.)

## 3. Ordre de construction (phases — chacune a un TEST ROUGE mesurable avant de coder)

Discipline **tdd** : chaque phase démarre par un test qui échoue, et doit **battre la précédente,
mesuré**. Le solveur de dés exact reste tel quel (optimal).

- **Phase 0 — Cadre & métrique** *(FAIT 2026-07-09)* : ce plan + un banc de force (winrate vs
  greedy ET vs le réseau actuel, N parties, intervalle de confiance). **Rouge :** le banc n'existe
  pas encore comme fonction appelable renvoyant `{winrate, ci}`. → **Vert :**
  `benchStrength(polA, polB, opts)` dans `engine-ts/src/sim/bench.ts` (+ `wilson()` exporté),
  6 tests dans `tests/sim/bench.test.ts`. Paires miroir (même graine, sièges échangés) → banc
  exactement symétrique, variance réduite. ⚠️ Poids réseau périmés, voir §5.
- **Phase 1 — `GameNode` (le seam).** Migrer TOUS les points de décision (§5b) derrière l'interface
  §2b, via rejeu-par-script généralisé depuis `interactive.ts`.
  **Rouge (test de parité) :** un pilote générique qui joue une partie ENTIÈRE via
  `GameNode.legalActions/apply` produit un résultat **identique** (HP + rng + log) à `playTurn`,
  pour les mêmes politiques et graines, sur un lot de seeds. Vert = le seam est fidèle.
- **Phase 2 — MCTS (info parfaite d'abord).** MCTS/PUCT guidé par le réseau VALEUR actuel
  (réévalué comme évaluateur), dés = nœuds de chance. On triche : main adverse révélée.
  **Rouge (A/B) :** MCTS(k sim) vs 1-coup actuel, winrate **> 55 %** sur N parties (CI ne
  chevauchant pas 50 %). Vert = la recherche est le levier (preuve).
- **Phase 3 — Info imparfaite (ISMCTS/PIMC).** Déterminiser la main adverse depuis l'info publique
  (deck/défausse connus). **Décision tranchée :** commencer **PIMC** (déterminiser 1× par rollout),
  pas ISMCTS complet — plus simple, éprouvé.
  **Rouge :** l'agent PIMC bat l'agent Phase 2 "triche" retiré de l'info cachée (i.e. > 55 % vs un
  MCTS qui n'a plus le droit de voir la main).
- **Phase 4 — Réseau politique+valeur & features stables.** Deux têtes ; features agnostiques au
  perso (identité en embedding fixe, emplacements génériques) → ajouter un héros ne redimensionne
  plus l'entrée. **Rouge :** ajouter un 11e héros factice ne change pas `FEATURE_COUNT` ; et le
  réseau 2-têtes égale/bat l'évaluateur valeur-seule à budget de recherche égal.
- **Phase 5 — Boucle AlphaZero.** Self-play piloté par (IS)MCTS ; cibles = visites MCTS (politique)
  + résultat (valeur) ; replay buffer ; entraînement stable (clipping, LR schedule, target/gating).
  Remplace le TD(0). **Rouge :** sur 3 générations, le gating ne promeut que des réseaux qui battent
  le meilleur courant (> 55 %), et la courbe de force **monte** au lieu de collapser.
- **Phase 6 — Montée en puissance & évaluation.** Boucles longues, courbe de force, table
  d'équilibre RE-générée avec l'agent fort (= vrai guide tournoi). Réserve CPU raisonnable (cf.
  [[feedback_resource_usage]]).
- **Phase 7 — Jeu haut niveau + refonte UX.** Brancher l'agent (IS)MCTS dans `interactive.ts`/l'UI.
  Réglage du budget de recherche (force vs temps de réponse). **Refonte de l'interface « jouer
  contre l'IA »** (user 2026-07-09 : « l'interface je ne l'aime pas vraiment » — APRÈS le réseau) :
  maquetter 2-3 directions avec le skill `prototype` (mode UI), le user choisit, puis implémenter ;
  `artifact-design` pour le rendu soigné. Voir [[project_interface_ui]].

## 4. Décisions ouvertes — TRANCHÉES (revisiter seulement si un test le contredit)

- **ISMCTS pur vs PIMC :** **PIMC d'abord** (Phase 3). Simple, éprouvé ; on montera à ISMCTS si la
  mesure le justifie.
- **Solveur de dés dans l'arbre :** **non cherché** — nœud expert délégué (§2b). Confirmé.
- **Contrôle push→pull :** **rejeu-par-script** (option B, §2b), pas de générateur. Confirmé par le
  précédent `interactive.ts`.
- **Budget de recherche / taille du réseau :** **paramétrés, non figés.** Calibrés par la mesure en
  Phases 2 et 4 respectivement — on ne devine pas maintenant.

## 5. État courant

- **Phase 1 EN COURS (tranches 1-3 FAITES 2026-07-09).** `engine-ts/src/sim/search/gameNode.ts` :
  - T1 : rejeu-par-script (sonde sur clone + matérialisation), hook `activateAbility`, pilote
    `playMatchViaGameNode`. T2 : fenêtres `decide` (les 2 joueurs), script unifié multi-hooks,
    `actionKey` stable. T3 : **nœuds de CHANCE** — le hasard entre deux décisions = un segment ;
    nœud = {base, script, BANDE de tirages figée, flux de continuation} ; `sampleChance(rng)`
    re-échantillonne le suffixe (MCTS branche), `continueChance()` suit le flux original (chemin
    parité). Zéro modif du moteur (on contrôle l'objet rng injecté, pas les sites d'appel).
  - **Parité prouvée** : `tests/sim/gameNode.parity.test.ts`, 11/11 (9 duels × graines + 2 tests
    d'exposition). Durée stable ~150 s (sondes dominées par le DP des dés, en cache).
  - Reste : hooks héros bespoke §5b (chooseAttackModifierCards, chooseRollManipulationCards,
    chooseCardsToDiscard, hooks HH/BW/FM/RV/TH/DU/SM…), élargir la parité aux 10 héros, puis
    Phase 2 (MCTS sur ce seam).
- La métrique du projet = `benchStrength` (`engine-ts/src/sim/bench.ts`) : `{winrate, ci}` Wilson
  95 % sur parties décisives, paires miroir, draws/timeouts comptés à part.
- Baseline à battre = l'actuel value-greedy 24/12 (reste en place comme adversaire de référence,
  pas comme produit). **Précision (2026-07-09, corrigée le même jour) : les poids TS
  (`engine-ts/src/sim/rl/weights/*.json`, 92 entrées) sont périmés vs FEATURE_COUNT=168 — MAIS le
  réseau courant réel est celui du pipeline Python : `rl-py/weights/best.json` →
  `static/ai-weights.js` (sizes [168,256,128,1], tag 2026-07-09-v4-10heros). C'est LUI le
  « réseau actuel » de la Phase 2 (chargeable via `fromJSON` + `createValueGreedyPolicy`,
  vérifié). Les poids TS 92 peuvent être supprimés/archivés.**
- **Outillage en place :** skills `tdd`, `codebase-design`, `diagnosing-bugs`, `handoff` dans
  `.claude/skills/` — à utiliser (chaque phase = rouge d'abord ; le vocab deep-module ci-dessus).

## 5b. Phase 1 — inventaire des points de décision à unifier derrière `GameNode`

Pour que la recherche pilote une partie via `legalActions/apply`, tout ça doit passer par le seam.

**Déjà unifié** (via `decide(DecisionRequest)` + `resolveResponseWindow`) : fenêtres `mainPhase`,
`defense`, `offensiveRoll`, `defenseRoll`. ← le modèle `enumerate/apply` à généraliser.

**Hooks bespoke à migrer vers le modèle unifié :**
1. `chooseAbility` — quelle habileté activer ← **le plus important**
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
13. **Combo (SM)** — dépenser le jeton → Offensive Roll Phase additionnelle (déjà câblé côté sim
    ET interactif depuis 2026-07-09 ; à exposer comme action `GameNode`).

**Nœuds de CHANCE (dés) à modéliser explicitement :** roll offensif, roll défensif, et les
sous-jets d'habiletés (Chain Lightning, Odinforce, dé de Guard Break, Vegas Baby!, etc.).

**Info cachée :** main adverse (déterminisation Phase 3). Deck/défausse = publics.

**Livrable Phase 1 :** `engine-ts/src/sim/search/gameNode.ts` — l'interface §2b, exposant TOUS les
points ci-dessus de façon homogène ; + un pilote générique qui joue une partie complète via cette
seule interface. **Parité prouvée vs `playTurn`** (test rouge de la Phase 1).

## 5c. Phase 1 — design détaillé (`Action` + test de parité)

**Principe : un coup est OPAQUE pour la recherche.** MCTS n'interprète pas les coups. Contrat
minimal : `legalActions()` renvoie une liste stable, `apply(a)` avance, et chaque coup a une **clé
texte stable** `actionKey(a)` — identité des enfants dans l'arbre, et plus tard index de la tête
politique du réseau (Phase 4). Le type `Action` peut donc être une grosse union interne ; sa forme
est une implémentation derrière le seam, pas dans l'interface §2b.

**Trois sortes de nœuds :**
- **Joueur** — `legalActions()` énumère ; `apply(a)` avance.
- **Chance (dés)** — `sampleChance(rng)` échantillonne (6^n issues = trop pour énumérer). Concerne
  roll offensif/défensif + sous-jets d'habiletés (Chain Lightning, Odinforce, dé de Guard Break…).
- **Expert (garde des dés)** — **non cherché** : le nœud délègue à `calculateOptimalKeep` (DP exact)
  et applique sa réponse. La combinatoire la plus lourde est déjà résolue optimalement.

**Le type `Action`** — réutilise `WindowAction` (types.ts) là où c'est déjà unifié, étend pour les
hooks §5b :
```ts
type Action =
  // déjà unifiées (WindowAction) : le couple enumerate/apply existe deja
  | { kind: 'pass' } | { kind: 'playCard'; cardId } | { kind: 'alterDie'; cardId; dieIndex; delta }
  | { kind: 'rerollDie'; cardId; dieIndex } | { kind: 'rerollAll'; cardId; dieIndices? } | { kind: 'sell'; cardId }
  // hooks bespoke a migrer (§5b) :
  | { kind: 'activateAbility'; abilityName }          // chooseAbility (le + important)
  | { kind: 'spendToken'; token; amount }             // GuardBreak / GrimPursuit / Combo / EK
  | { kind: 'craft'; ... } | { kind: 'nevermore'; ... } | ...
// actionKey(a): string  -> cle stable (identite arbre + index politique)
```

**Test de parité (le ROUGE de la Phase 1) :** rejouer une partie DEUX fois, mêmes politiques + même
graine — une fois par `playTurn`, une fois pilotée par le `GameNode` (à chaque nœud joueur, on
demande à la MÊME `Policy.decide` quel coup légal prendre). **Exiger PV finaux + vainqueur + état du
rng IDENTIQUES**, sur un lot de graines × plusieurs duels de héros. Vert = le `GameNode` ré-expose
exactement les décisions du moteur, ni plus ni moins (rien cassé/oublié en inversant le contrôle).

**Ordre d'attaque suggéré (tdd, un hook à la fois) :** commencer par `activateAbility` (le plus
important + le plus impactant sur la force), puis les nœuds de chance des dés, puis les hooks par
héros. Le test de parité tourne en continu — il vire au rouge dès qu'un hook migré diverge.

## 6. Journal (append à chaque session)

- 2026-07-09 : plan créé après constat que l'existant est structurellement faible (réseau minuscule,
  TD(0) instable, 1-coup, features fragiles). Décision : rebuild façon AlphaZero+ISMCTS. Voir
  [[project_strong_ai_build]].
- 2026-07-09 (raffinage codebase-design) : ajouté §2b (le seam `GameNode`), l'insight
  **push→pull / inversion de contrôle**, et le fait que `resolveResponseWindow` (couple
  `enumerate/apply`) + le rejeu-par-script de `interactive.ts` sont **déjà le germe** du seam.
  Design-it-twice tranché : rejeu-par-script (B) vs générateur (A) → B (clonabilité). Décisions
  ouvertes §4 toutes tranchées. Chaque phase a désormais un **test rouge mesurable**. Skills
  mattpocock installés.
- 2026-07-09 (détail Phase 1) : ajouté §5c — `Action` opaque + `actionKey` stable, 3 sortes de
  nœuds (joueur / chance échantillonné / expert-dés délégué au solveur), type `Action` esquissé,
  spec du test de parité, ordre d'attaque tdd (`activateAbility` en premier). Phase 7 : ajout de la
  refonte UX de l'UI de jeu (user n'aime pas l'interface actuelle — APRÈS le réseau, via
  `prototype`/`artifact-design`). Plan jugé PRÊT à exécuter phases 0-1-2 ; phases 3-5 = direction
  juste, détail à concevoir quand leur prédécesseur est vert (délibéré, pas un manque).
- 2026-07-09 (Phase 0 FAITE, tdd) : banc de force `benchStrength` + `wilson` dans
  `engine-ts/src/sim/bench.ts`, 6 tests verts (`tests/sim/bench.test.ts`). Le test de symétrie
  (rouge) a attrapé un vrai défaut : l'alternance de sièges NON appariée d'evalNets.ts (graine
  différente par siège) ne garantit pas bench(B,A) = miroir de bench(A,B) → corrigé en paires
  miroir (même graine, sièges échangés), qui réduit aussi la variance. Fumée : le banc accepte un
  agent réseau (`createValueGreedyPolicy`). TROUVÉ en branchant la baseline : les poids TS
  `rl/weights/best.json` sont périmés (92 vs 168) ; corrigé plus tard le même jour — le vrai
  réseau courant est `rl-py/weights/best.json` → `static/ai-weights.js` (168, v4-10heros), voir §5.
- 2026-07-09 (interlude bug user + Phase 1 tranche 1) : (a) Diagnostic « SM n'utilise pas son
  Combo » (IA-vs-humain) via boucle différentielle playTurn-vs-driver : AUCUN Combo dû raté sur
  250+ tours IA (greedy ET réseau, humain passif ET attaquant) ; par contre trouvé+corrigé le bug
  INVERSE — `resolveAiAttack` ne posait jamais `gameOver` (pas de `checkGameOver`), l'IA
  « combotait un cadavre » ; fix interactive.ts + garde dans `aiComboPending` + test de régression ;
  play.js logue désormais POURQUOI un Combo détenu n'est pas dépensable (règle : ORP sans Attaque).
  (b) Phase 1 tranche 1 : `gameNode.ts` (rejeu-par-script, sonde/matérialisation), hook
  `activateAbility` exposé, parité 9/9. 355 tests + 9 parité + 6 banc verts.
