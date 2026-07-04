# Statut — Interface « Jouer contre l'IA » (nuit 2026-07-03 → 04)

Travail autonome pendant l'entraînement. Voir `PLAN_INTERFACE.md` pour l'architecture.

## 🎮 v1 JOUABLE — ouvre `static/play.html` dans un navigateur (double-clic, aucun serveur)
Ton tour est **interactif** : jouer des cartes en Main Phase, lancer/garder/relancer les dés (3 jets),
choisir parmi les habiletés que tes dés forment, attaquer. L'IA joue son tour et défend. Fin de partie
avec bannière victoire/défaite/nul. **Vérifié headless (jsdom)** : une partie complète de 12 tours via de
vrais clics DOM, 0 erreur, HP/jetons/journal à jour.

### La décision d'archi qui a débloqué v1
Au lieu de rendre tout le moteur `async` (coûteux + risqué + ralentirait le lookahead RL), constat :
l'humain n'a besoin de contrôle interactif que sur **son propre tour**. Le driver UI pilote ça via les
primitives SYNCHRONES du moteur (`enumerateWindowActions`/`applyWindowAction`, `rollDice`,
`resolveAbilityPhase` avec le choix d'habileté injecté). Le tour de l'IA = `playTurn` synchrone. →
**Zéro async, zéro impact entraînement, jouable ce soir.** Le pont async n'est nécessaire que pour la
**défense interactive** (v2, ci-dessous).

## ✅ Fait cette nuit (vérifié)
1. **Plan/architecture** — `PLAN_INTERFACE.md` (le pont interactif async + l'UI + le découpage).
2. **Bundle moteur navigateur** — `engine-ts/src/sim/browser.ts` (nouveau point d'entrée) bundlé via
   esbuild → **`static/game-engine.js` (131 Ko, global `Game`)**. Compile 0 erreur : le moteur sim
   (Stages 1-6) n'a **aucune dépendance Node** dans le chemin de jeu (les `hero.json` sont inlinés).
   - Build : `cd engine-ts && npx esbuild src/sim/browser.ts --bundle --format=iife --global-name=Game --outfile=../static/game-engine.js`
3. **API vérifiée fonctionnellement** (test jetable, passé) : créer une partie, lire main/PV/jetons,
   récupérer les données de carte pour le rendu, créer la **policy IA depuis un réseau**, jouer un
   tour via `playTurn`, et **énumérer les options légales** d'un humain (`enumerateWindowActions`
   → `pass, playInstant, ...`). C'est exactement ce que l'UI affichera en boutons.
4. **Prototype visuel interactif** (Artifact, self-contained) :
   https://claude.ai/code/artifact/8ae1e880-f9e6-43bb-9672-134d7b6a986c
   - Dés recréés en **SVG** avec les vrais symboles HH (Hache/Fer/Frayeur), lancer + garder au clic,
     **matcher d'habiletés live** (patterns réels : Cleave, Ride Down, Sow Despair, Spectral…).
   - HUD PV/CP/jetons (Dreadful, Grim Pursuit, Head, Agility, Covert Ops, Time Bomb), panneau plateau,
     main de cartes (rendues depuis `hero.json`), journal. Thème sombre « table sous projecteur ».

## 🆕 v2 en cours (nuit, vérifié headless — refais F5 sur play.html)
- ✅ **Adversaire = réseau entraîné** (`static/ai-weights.js` généré de best.json) — il joue ses upgrades, dépense CP/Covert Ops, défend. (+ polyfill `structuredClone` pour vieux navigateurs.)
- ✅ **Manipuler tes propres dés** avant l'habileté (phase « alter » : So Wild!/Twice As Wild!/Tip It!/Helping Hand! — pour viser un ult).
- ✅ **Main Phase 2** (après l'attaque).
- ✅ **Choix à l'Upkeep** quand tu as ≥4 Dreadful : Terrorize / Donner la Tête / Rien.

## ✅ v2b — DÉFENSE INTERACTIVE (fait, vérifié)
Quand l'IA t'attaque, son tour est **décomposé** : on t'annonce l'habileté entrante + les dégâts, puis
tu **joues tes cartes défensives** (Not This Time!, Spirited Reprisal!, Recoil!, Elude!) via un panneau
de boutons, ou tu encaisses. Ton jet de défense (Hallowed/Sabotage) + le résultat s'affichent au journal.
- **Comment** (sans rendre le moteur async → zéro impact entraînement) : **replay déterministe**. Le rng
  est snapshotable (`mulberry32Stateful`) ; on sonde ta prochaine décision de défense en résolvant l'attaque
  sur un **clone** (rng restauré), on te la montre, puis on rejoue avec ton choix injecté ; résolution finale
  UNE fois pour de vrai. Driver : `runAiTurnUpToAttack`→`nextDefenseDecision`→`chooseDefense`→`resolveAiAttack`
  →`finishAiTurn` (interactive.ts). Contrôles verrouillés hors de ton tour (plus de double « Terminer »).
- **Vérifié** : `tests/sim/interactive-defense.test.ts` (3 tests, dont *le clone reproduit la résolution
  réelle exactement — HP+CP+rng*) + suite **234 verte** + e2e jsdom (partie complète, 6 défenses jouées, 0 err).

## 🔜 Reste (v2c)
- **Manipuler les dés de l'IA** quand elle attaque (fenêtre d'altération côté défenseur — le driver passe
  auto pour l'instant).
- **Afficher/animer les jets bonus** (Spectral Assault, Sabotage, Agility) — corrects mais instantanés/invisibles aujourd'hui.
- Vente de cartes pour CP en Main Phase ; vraies images de cartes (mapping scans).

## 🔜 Reste à faire (par ordre de valeur — historique)
1. **Brancher le réseau entraîné comme adversaire** : quand l'entraînement finit, générer
   `static/ai-weights.js` (`window.AI_WEIGHTS = {…best.json}`) via un script type gen-assets ; play.js le
   détecte déjà (`Game.fromJSON` + `createValueGreedyPolicy`) et sinon retombe sur l'IA gloutonne. **1 script.**
2. **Défense interactive** (le seul vrai « async ») : aujourd'hui, quand l'IA t'attaque, ta défense est
   auto-résolue (greedy). Pour que TU joues tes cartes défensives / vois ton jet de défense pendant
   l'attaque IA, il faut te brancher dans `resolveResponseWindow` au milieu du tour IA → là seulement une
   `HumanPolicy` async (ou un pas-à-pas piloté UI) est utile. Périmètre limité (défense uniquement).
3. **Choix Terrorize / Headless Mayhem** à l'Upkeep (v1 = auto greedy) → un prompt UI.
4. **Vraies images de cartes** : mapping `id → scan` (scans nommés par timestamp, à mapper à l'œil ;
   PIL 11 dispo pour downscaler). En attendant : rendu HTML des cartes (déjà en place, correct).
5. **Board scan + calque interactif**, altération de dés adverses, animations, polish.

## Comment tester tout de suite
Ouvre `static/play.html` dans Chrome/Edge/Firefox (double-clic — aucun serveur requis, le moteur est
tout en JS local sans dépendance réseau). Joue quelques tours : relance tes dés, choisis une habileté,
attaque. Si un bug d'affichage apparaît (je n'ai pas pu cliquer visuellement, seulement headless), note-le.

## Fichiers touchés cette nuit
- `PLAN_INTERFACE.md`, `STATUS_INTERFACE.md` (nouveaux, racine)
- `engine-ts/src/sim/browser.ts` (nouveau, point d'entrée navigateur)
- `static/game-engine.js` (généré, bundle sim+IA pour le navigateur)
- Prototype visuel : Artifact (lien ci-dessus) — non commité, aperçu seulement.

## Questions non résolues (pour demain)
- OK pour rendre `playTurn`/`resolveDefense` **async** (pont interactif) ?
- Cartes : investir le mapping `id→scan` (46 images) OU garder le rendu HTML soigné ?
- Board : scan-en-fond + calque VS grille 100% HTML recréée ?
- Humain peut-il jouer les DEUX héros (choix au départ), ou on se concentre sur HH d'abord ?
