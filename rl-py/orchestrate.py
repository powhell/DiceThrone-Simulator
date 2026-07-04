# -*- coding: utf-8 -*-
"""Training orchestrator: gen (TS, CPU x workers) -> train (PyTorch, GPU) -> eval -> best gating.

Per round:
  1. Spawn `--workers` genWorker.ts processes (TS engine, self-play with the CURRENT weights,
     Monte-Carlo targets). CPU-bound; default 4 workers = the thermally-validated setting.
  2. Train the in-memory PyTorch model (GPU) for `--epochs` passes over the rolling experience
     buffer (last `--buffer-rounds` rounds of files), then export current.json.
  3. Every `--eval-every` rounds: evalNets.ts current-vs-best (seat-alternated). Winrate >= 55%
     promotes current -> best.json. A vs-greedy sanity eval is logged too (metric is saturated,
     kept only as a floor check).
Everything is checkpointed per round; Ctrl+C at any time loses at most the round in flight.

TensorBoard: rl-py/runs/<stamp> — loss, winrate vs best/greedy, and the TERRORIZE CANARY
(the decision whose silent regression sank a previous run; now it's a first-class curve).
View with: rl-py\\venv\\Scripts\\tensorboard --logdir rl-py/runs

Run (from repo root):
  rl-py\\venv\\Scripts\\python rl-py\\orchestrate.py --rounds 100
Resume is automatic: if weights/current.json exists, training continues from it.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time

import torch
from torch.utils.tensorboard import SummaryWriter

# Unbuffered stdout: when output is redirected to a file/pipe, Python block-buffers and
# the per-round lines sit invisible for many minutes — looks like a frozen run.
sys.stdout.reconfigure(line_buffering=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as trainer  # build_model / export_json / load_json / load_experience

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "engine-ts")
RLPY = os.path.join(ROOT, "rl-py")
WEIGHTS = os.path.join(RLPY, "weights")
EXP = os.path.join(RLPY, "experience")
CURRENT = os.path.join(WEIGHTS, "current.json")
BEST = os.path.join(WEIGHTS, "best.json")


def run_ts(script, *args):
    """Run an engine-ts tsx script, return stdout (raises on failure)."""
    cmd = "npx tsx " + script + " " + " ".join(f'"{a}"' for a in args)
    r = subprocess.run(cmd, shell=True, cwd=ENGINE, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{script} failed:\n{r.stdout}\n{r.stderr}")
    return r.stdout


def scrape_json(stdout, prefix):
    for line in stdout.splitlines():
        if line.startswith(prefix):
            return json.loads(line[len(prefix):])
    raise RuntimeError(f"no '{prefix}' line in output:\n{stdout}")


def parity_gate(net_path):
    bundle = os.path.join(WEIGHTS, "parity_bundle.json")
    subprocess.run(
        [sys.executable, os.path.join(RLPY, "train.py"), "parity",
         "--net", net_path, "--out", bundle, "--n", "16"],
        check=True, capture_output=True,
    )
    out = run_ts("src/sim/rl/checkParity.ts", bundle)
    if "PARITY OK" not in out:
        raise RuntimeError("parity gate failed: " + out)
    print("  " + out.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=100)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--games-per-round", type=int, default=48, help="total per round, split across workers")
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=2048)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--buffer-rounds", type=int, default=25, help="rolling experience window")
    ap.add_argument("--eval-every", type=int, default=5)
    ap.add_argument("--eval-games", type=int, default=12, help="per matchup (x4 matchups)")
    ap.add_argument("--hidden", default="256,128")
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    os.makedirs(WEIGHTS, exist_ok=True)
    os.makedirs(EXP, exist_ok=True)

    feat = int(run_ts("src/sim/rl/printFeatureCount.ts").strip())
    sizes = [feat] + [int(h) for h in args.hidden.split(",")] + [1]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"FEATURE_COUNT={feat} | sizes={sizes} | device={device}"
          + (f" ({torch.cuda.get_device_name(0)})" if device == "cuda" else ""))

    if os.path.exists(CURRENT):
        model, loaded_sizes = trainer.load_json(CURRENT)
        if loaded_sizes != sizes:
            sys.exit(f"current.json sizes {loaded_sizes} != requested {sizes}; "
                     f"move it away to start fresh or match --hidden.")
        print(f"resuming from {CURRENT}")
    else:
        torch.manual_seed(args.seed)
        model = trainer.build_model(sizes)
        trainer.export_json(model, sizes, CURRENT)
        print("fresh network initialized -> current.json")
    if not os.path.exists(BEST):
        shutil.copyfile(CURRENT, BEST)

    parity_gate(CURRENT)

    model.to(device)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    lossf = torch.nn.MSELoss()

    stamp = time.strftime("%Y%m%d-%H%M%S")
    writer = SummaryWriter(os.path.join(RLPY, "runs", stamp))
    print(f"TensorBoard: rl-py/runs/{stamp}  (view: rl-py\\venv\\Scripts\\tensorboard --logdir rl-py/runs)")

    games_per_worker = max(1, args.games_per_round // args.workers)
    t_start = time.time()

    for rnd in range(1, args.rounds + 1):
        t0 = time.time()

        # ---- 1. generate experience (TS workers, CPU) ----
        procs = []
        for w in range(args.workers):
            out_bin = os.path.join(EXP, f"round{rnd:05d}_w{w}.bin")
            seed = args.seed + rnd * 10007 + w * 101
            cmd = (f'npx tsx src/sim/rl/genWorker.ts {games_per_worker} '
                   f'"{CURRENT}" "{out_bin}" {seed}')
            procs.append(subprocess.Popen(cmd, shell=True, cwd=ENGINE,
                                          stdout=subprocess.PIPE, text=True))
        tz_off = tz_taken = games = paid_up = free_up = 0
        gps = 0.0
        for p in procs:
            stdout, _ = p.communicate()
            if p.returncode != 0:
                raise RuntimeError(f"genWorker failed (round {rnd}):\n{stdout}")
            s = scrape_json(stdout, "SUMMARY ")
            tz_off += s["terrorizeOffered"]; tz_taken += s["terrorizeTaken"]
            paid_up += s["paidUpgrades"]; free_up += s["freeUpgrades"]
            games += s["games"]; gps += s["gamesPerSec"]
        gen_sec = time.time() - t0

        # ---- prune buffer ----
        files = sorted(glob.glob(os.path.join(EXP, "round*_w*.bin")))
        keep_from = f"round{max(1, rnd - args.buffer_rounds + 1):05d}"
        for f in files:
            if os.path.basename(f)[:10] < keep_from:
                os.remove(f)

        # ---- 2. train (GPU) ----
        t1 = time.time()
        X, y, fd, nfiles = trainer.load_experience([os.path.join(EXP, "round*_w*.bin")])
        assert fd == feat
        Xt = torch.tensor(X, dtype=torch.float32, device=device)
        yt = torch.tensor(y, dtype=torch.float32, device=device).unsqueeze(1)
        n = Xt.shape[0]
        last = float("nan")
        for _ in range(args.epochs):
            perm = torch.randperm(n, device=device)
            total, batches = 0.0, 0
            for i in range(0, n, args.batch):
                idx = perm[i:i + args.batch]
                opt.zero_grad()
                loss = lossf(model(Xt[idx]), yt[idx])
                loss.backward()
                opt.step()
                total += loss.item(); batches += 1
            last = total / max(batches, 1)
        model.cpu()
        trainer.export_json(model, sizes, CURRENT)
        model.to(device)
        train_sec = time.time() - t1

        tz_rate = tz_taken / tz_off if tz_off else 0.0
        writer.add_scalar("loss/mse", last, rnd)
        writer.add_scalar("canary/terrorize_rate", tz_rate, rnd)
        writer.add_scalar("canary/paid_upgrades_per_game", paid_up / games, rnd)
        writer.add_scalar("canary/free_upgrades_per_game", free_up / games, rnd)
        writer.add_scalar("gen/games_per_sec", gps, rnd)
        writer.add_scalar("buffer/samples", n, rnd)
        elapsed = time.time() - t_start
        print(f"[round {rnd}/{args.rounds}] {games} games ({gen_sec:.0f}s gen, {train_sec:.1f}s train) "
              f"| buffer {n} samples | loss {last:.4f} | terrorize {tz_taken}/{tz_off} ({tz_rate:.0%}) "
              f"| upgrades paid/free {paid_up}/{free_up} | {elapsed:.0f}s total")

        # ---- 3. eval + best gating ----
        if rnd % args.eval_every == 0 or rnd == args.rounds:
            out = run_ts("src/sim/rl/evalNets.ts", CURRENT, BEST,
                         str(args.eval_games), str(20000 + rnd))
            r = scrape_json(out, "RESULT ")
            wr = r["aWinrate"]
            writer.add_scalar("eval/winrate_vs_best", wr, rnd)
            out_g = run_ts("src/sim/rl/evalNets.ts", CURRENT, "greedy",
                           str(max(4, args.eval_games // 2)), str(30000 + rnd))
            rg = scrape_json(out_g, "RESULT ")
            writer.add_scalar("eval/winrate_vs_greedy", rg["aWinrate"], rnd)
            promoted = ""
            if wr >= 0.55:
                shutil.copyfile(CURRENT, BEST)
                promoted = " -> PROMOTED to best.json"
            print(f"  eval vs best: {wr:.1%} ({r['aWins']}-{r['bWins']}, {r['draws']} draws)"
                  f" | vs greedy: {rg['aWinrate']:.1%}{promoted}")

    writer.close()
    print("done.")


if __name__ == "__main__":
    main()
