# Plan de match — battre value-greedy (strong-AI)

Feuille de route VIVANTE. On la suit, on la met à jour. Fini les tests ad-hoc sans direction.
Détail chiffré de chaque essai : `JOURNAL_STRONG_AI.md`. Spec d'origine : `PLAN_STRONG_AI.md`.

## 🎯 Objectif unique
Un agent qui **bat value-greedy de façon fiable (>50 %, IC au-dessus de 50 sur 800+ parties)**,
puis le remplace comme IA de `play.html`. C'est la SEULE ligne d'arrivée. Tant qu'on n'y est pas,
value-greedy reste le champion.

## 📊 Tableau des champions (winrate FIABLE vs value-greedy — jamais re-tester deux fois)
| Agent | vs value-greedy | Parties | Statut |
|---|---|---|---|
| value-greedy (déployé) | — (référence) | — | CHAMPION actuel |
| MCTS(v4 valeur) + priors uniformes, sims 500 | **44 %** | 968 | meilleur challenger |
| MCTS(v4 valeur) + priors uniformes, sims 800 | ? | — | test en attente |
| MCTS(v4) + priors WARM | 33 % (nuit) | 440 | ✗ les priors warm nuisent |
| Réseau v5 self-play (24+ rondes) | ~15 % | — | ✗ boucle ne cliquette pas |

## Le diagnostic qui oriente tout
MCTS + un bon réseau de VALEUR (v4) recherche mieux que le 1-coup de value-greedy, MAIS il explore
à l'AVEUGLE (priors uniformes → gaspille ses simulations). Le levier n°1 = **une bonne POLITIQUE
pour guider la recherche** (les priors warm nuisaient car ce réseau-politique était mauvais).

---

## PHASE 1 — De vrais priors (LE cœur, priorité absolue)
**Hypothèse :** MCTS(valeur v4 + une politique qui imite BIEN value-greedy comme prior) > value-greedy.
Logique AlphaZero : partir de coups de qualité value-greedy + chercher plus loin = dépasser le 1-coup.

Étapes :
1. **Gros dataset** de value-greedy qui joue (des MILLIERS de décisions, pas les 320 parties du
   warm-start raté). Réutiliser/étendre `warmstartGen.ts` (behavior-cloning), checkpointé.
2. **Entraîner une bonne tête POLITIQUE** dessus (train.py). La VALEUR reste le réseau v4.
3. **Câbler** un agent gate3 : valeur = v4, priors = cette politique.
4. **Gros test fiable** (800+ parties, checkpoint) vs value-greedy.

**Jalon P1 :** winrate > 50 % (IC au-dessus de 50) → on a battu value-greedy → Phase 3.
Sinon → Phase 2.

## PHASE 2 — Scaler (seulement si P1 proche mais < 50 %)
- Monter les sims (gros tests fiables ; le sims-800 en attente est un premier point).
- Tuner cPuct + l'échantillonnage des nœuds de chance (dés) — `mcts.ts` MAX_CHANCE.
- Gérer l'info cachée (ISMCTS) si le plafond vient de là.

## PHASE 3 — AlphaZero self-play + déploiement (seulement après avoir un net qui bat vg)
- Le self-play a échoué car il partait de zéro. Relancé À PARTIR d'un net qui bat déjà value-greedy,
  le cliquet peut enfin mordre.
- Remplacer `static/ai-weights.js` / la policy de `play.html` par le nouveau champion.

---

## 🔧 Règles d'infra (pour que ÇA AVANCE, plus de temps perdu)
1. **Runs LONGS avec checkpoint par défaut** — `calibration/v4uniform_run.mjs` (écrit chaque partie,
   survit aux kills). **Fini les tests de 88 parties pour les questions qui comptent.**
2. **≥ 400 parties** pour toute affirmation « on bat X » (88 = ±10 % = bruit, leçon apprise).
3. **On ne re-teste jamais** un agent déjà mesuré — le tableau ci-dessus est la mémoire.
4. **Franchise** : chaque étape = « ça avance d'un cran », JAMAIS « c'est réglé ». Il n'y a pas de
   test final unique — c'est un projet de plusieurs semaines.
5. Machine : la nuit, éviter le throttle (écran/veille — géré par le user) ; le checkpoint protège
   quoi qu'il arrive.

## ▶️ Prochaine action concrète
Phase 1, étape 1-2 : construire le générateur de gros dataset value-greedy + l'entraînement de la
tête politique. (En parallèle, le user peut lancer le sims-800 pour clore le levier « recherche seule ».)
