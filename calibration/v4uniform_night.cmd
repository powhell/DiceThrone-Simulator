@echo off
rem === GROS TEST NUIT robuste (checkpoint) — à lancer TOI-MÊME, indépendant de toute session ===
rem Double-clique ce fichier, ou dans un terminal : calibration\v4uniform_night.cmd
rem Ça écrit chaque partie dans calibration\results_v4uniform\games.jsonl au fur et à mesure.
rem Score à tout moment (autre terminal, meme pendant) : node calibration\v4uniform_check.mjs
cd /d "%~dp0.."

rem NB : ce script ne touche PAS a ta gestion d'alimentation. Si tu veux eviter le throttle
rem nocturne (workers ralentis ecran eteint), gere-le toi-meme (garde l'ecran allume, ou regle
rem tes options de veille comme tu veux). Le checkpoint fait qu'un ralentissement ne perd rien.

echo Lancement... (garde cette fenetre ouverte)
node calibration\v4uniform_run.mjs

echo.
echo === FINI. Score final : ===
node calibration\v4uniform_check.mjs
echo.
pause
