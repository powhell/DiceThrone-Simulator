@echo off
rem Superviseur de la chaîne RL — détaché de toute session Claude (les tâches de fond de
rem session se faisaient tuer, nuits des 11-12 juillet perdues). Chaque invocation fait
rem 2 rondes et REPREND automatiquement (chain_log.jsonl) ; 12 invocations = ~24 rondes max.
cd /d "%~dp0"
set GATE_WR=0.55
for /l %%i in (1,1,12) do (
  node chain2.mjs 2 8 25 150 3 >> chain_day.log 2>&1
)
echo SUPERVISOR_DONE >> chain_day.log
