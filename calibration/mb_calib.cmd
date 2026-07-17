@echo off
rem Vague de calibration des jetons Mythic Brawler (CALIB_SET=mb) — détachée de toute session.
rem Reprise automatique : relancer ce .cmd reprend où il en était (results_mb/*.jsonl).
cd /d "%~dp0.."
set CALIB_SET=mb
node calibration\run.mjs --seeds 1800 --workers 4 >> calibration\mb_calib.log 2>&1
