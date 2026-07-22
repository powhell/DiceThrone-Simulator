@echo off
rem === GROS TEST NUIT robuste (checkpoint) — à lancer TOI-MÊME, indépendant de toute session ===
rem Double-clique ce fichier, ou dans un terminal : calibration\v4uniform_night.cmd
rem Ça écrit chaque partie dans calibration\results_v4uniform\games.jsonl au fur et à mesure.
rem Score à tout moment (autre terminal, meme pendant) : node calibration\v4uniform_check.mjs
cd /d "%~dp0.."

rem Empeche l'ecran ET le systeme de s'endormir pendant le calcul (le throttle qui a tue les runs).
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

echo Lancement... (garde cette fenetre ouverte)
node calibration\v4uniform_run.mjs

echo.
echo === FINI. Score final : ===
node calibration\v4uniform_check.mjs
echo.
pause
