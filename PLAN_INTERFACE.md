# Plan — Interface « Jouer contre l'IA » (Dice Throne Simulator)

> Rédigé la nuit du 2026-07-03 pendant l'entraînement long. Objectif : une plateforme web
> où un **humain affronte le réseau entraîné**, avec le board, les dés et les cartes tels que
> designés. Ce fichier = le plan + l'état d'avancement. Voir aussi `STATUS_INTERFACE.md`.

## 0. Verdict honnête sur la faisabilité « en une nuit »
Faisable comme **fondation + prototype visuel + boucle jouable partielle**, PAS comme jeu complet
sans bug couvrant chaque carte/fenêtre. Le vrai morceau n'est pas le visuel mais **brancher un
humain dans la boucle de décision** du moteur (les fenêtres de réponse pass-pass des Stages 1-6),
aujourd'hui **synchrone IA-vs-IA**. Ça se fait, mais ça se valide mal à l'aveugle → à finir/polir
ensemble demain.

## 1. Architecture cible

### 1.1 Moteur → navigateur
- Nouveau point d'entrée `engine-ts/src/sim/browser.ts` qui réexporte l'API sim nécessaire :
  `createInitialGameState`, `playTurn`, `enumerateWindowActions`, `applyWindowAction`,
  `resolveAbilityPhase`, `finalizeDefenseRoll`, le chargement réseau (`fromJSON`) + `createValueGreedyPolicy`,
  et l'oracle de jet (`runOffensiveRoll`).
- Bundle esbuild dédié → `static/game-engine.js` (global `Game`), séparé du vieux `engine.js`
  (solveur de dés). Les poids `best.json` sont embarqués (inline) ou chargés en `fetch` local.

### 1.2 Rendre le moteur INTERACTIF (le point dur)
Le moteur appelle `policy.decide(...)` de façon synchrone. Pour insérer un humain :
- **Approche retenue : Policy asynchrone.** Le driver de tour devient `async` ; `Policy.decide`
  (et les `choose*`) renvoient des `Promise`. La `HumanPolicy` renvoie une promesse résolue quand
  l'UI envoie l'action cliquée ; la policy IA enveloppe sa décision synchrone dans `Promise.resolve`.
  L'UI affiche les `options` légales (déjà énumérées par le moteur) → l'humain clique → resolve.
- Avantage : **réutilise TOUTE la logique moteur** (fenêtres, énumération, application), on ne
  change que la SOURCE de la décision. Coût : rendre `async` les points d'attente (`playTurn`,
  `resolveResponseWindow`, `resolveDefense`…). Mécanique mais transverse → tâche cœur de demain.
- Repli si besoin : runner à base de générateur qui `yield` les points de décision.

### 1.3 Couche UI (vanilla, pas de framework — cohérent avec l'existant)
`static/play.html` + `static/play.css` + `static/play.js`. État de jeu ← moteur ; rendu ← DOM.
Composants : Board, Dés, Main (cartes), HUD (PV/CP/jetons), Journal, Zone de décision (les
options légales cliquables venant du moteur).

## 2. Le visuel (ce que le user a demandé explicitement)
- **Dés** : recréés en **SVG** avec les vrais symboles — HH : Hache (A, faces 1-3), Fer (B, 4-5),
  Frayeur (C, 6) ; BW : Espionnage (A, 1-2), Bâtons (B, 3-5), Veuve (C, 6). Animation de lancer,
  clic pour garder/relancer. Nets à toute taille.
- **Board** : scan réel en fond + **calque interactif** (la case d'habileté correspondant aux dés
  s'allume ; clic pour choisir quand plusieurs matchs). Alternative : grille recréée en HTML.
- **Cartes** : v1 = **composant HTML** rendu depuis les données vérifiées (nom, coût CP, type,
  texte) stylé « carte ». v2 = swap vers le **vrai scan** une fois le mapping `id→scan` établi
  (les scans sont nommés par timestamp, à mapper à l'œil — tâche dédiée).
- **Jetons** : icônes (Dreadful, Grim Pursuit, Agility, Covert Ops, Time Bomb 0:02/0:01, Head).
- Thème sombre par défaut (ambiance Dice Throne), responsive desktop-first.

## 3. Découpage en lots
1. **Bundle moteur navigateur** (`browser.ts` + esbuild) — vérifie compile/charge. ✅ objectif nuit
2. **Prototype visuel** (board + dés SVG + main + HUD + journal), prévisualisé via Artifact. ✅ nuit
3. **Pipeline assets** : downscale des scans (PIL) en tailles web. (partiel — nuit)
4. **Pont interactif async** (HumanPolicy + driver async) — cœur, demain.
5. **Boucle jouable** : ton tour (jet→garde→habileté→attaque) + tour IA + défense humaine. demain
6. **Mapping `id→scan`** pour afficher les vraies cartes. demain
7. **Cartes/jetons/fenêtres complets + polish**. demain+

## 4. Décisions prises par défaut (user endormi)
- L'humain choisit son héros au départ (HH ou BW) ; l'IA prend l'autre, pilotée par `best.json`.
- 1 humain vs 1 IA, desktop-first, thème sombre.
- v1 : cartes en rendu HTML (données vérifiées) ; vrais scans branchés progressivement.

## 5. Questions non résolues (à trancher demain)
- Board : scan-en-fond+calque VS grille 100% recréée en HTML ? (recommande : scan+calque)
- Cartes : investir le mapping `id→scan` (46 images à lire) OU rester en rendu HTML soigné ?
- Refacto async du moteur : OK pour rendre `playTurn`/`resolveDefense` async (touche le sim mais
  pas le chemin d'entraînement) ?
- Faut-il un mode « spectateur » (IA vs IA rejouée) en plus du mode jeu ?
