# -*- coding: utf-8 -*-
"""PyTorch trainer for the Dice Throne value network (chantier 2026-07-04).

The TS engine stays the simulator/referee and the inference runtime (network.ts's forward()
reads the same JSON weights this script exports — that's what keeps browser play working with
zero export machinery). This script only owns TRAINING, on the GPU.

Architecture contract with engine-ts/src/sim/rl/network.ts — must never drift:
  - MLP, tanh after EVERY layer including the output (predictions in [-1, 1]).
  - JSON: {"sizes": [in, h1, ..., 1], "layers": [{"W": [[out x in]], "b": [out]}]}.
    nn.Linear.weight is [out, in], same layout as W — exported directly.
Parity is enforced by `parity` mode + engine-ts checkParity.ts (run by the orchestrator at
startup): same inputs through torch and through the TS forward() must match to ~1e-6.

Modes:
  init   --sizes 78,256,128,1 --out net.json [--seed 1]
  train  --net in.json --exp "dir/*.bin" --out out.json [--epochs 3 --batch 2048 --lr 1e-3]
  parity --net net.json --out bundle.json [--n 16 --seed 123]

Experience files (from genWorker.ts): "DTX1" | featDim u32 | count u32 | rows of
(featDim f32 + 1 f32 target), little-endian.
"""
import argparse
import glob
import json
import struct
import sys

import numpy as np
import torch
import torch.nn as nn


def build_model(sizes):
    layers = []
    for i in range(1, len(sizes)):
        layers.append(nn.Linear(sizes[i - 1], sizes[i]))
        layers.append(nn.Tanh())  # tanh on every layer, output included (network.ts contract)
    return nn.Sequential(*layers)


def export_json(model, sizes, path):
    out = {"sizes": sizes, "layers": []}
    for m in model:
        if isinstance(m, nn.Linear):
            out["layers"].append({
                "W": m.weight.detach().cpu().numpy().astype(float).tolist(),
                "b": m.bias.detach().cpu().numpy().astype(float).tolist(),
            })
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    sizes = data["sizes"]
    model = build_model(sizes)
    linears = [m for m in model if isinstance(m, nn.Linear)]
    assert len(linears) == len(data["layers"]), "layer count mismatch"
    with torch.no_grad():
        for lin, layer in zip(linears, data["layers"]):
            lin.weight.copy_(torch.tensor(layer["W"], dtype=torch.float32))
            lin.bias.copy_(torch.tensor(layer["b"], dtype=torch.float32))
    return model, sizes


def load_experience(patterns):
    xs, ys = [], []
    feat_dim = None
    paths = []
    for pat in patterns:
        paths.extend(sorted(glob.glob(pat)))
    if not paths:
        sys.exit(f"no experience files match {patterns}")
    for p in paths:
        with open(p, "rb") as f:
            raw = f.read()
        magic = raw[:4]
        if magic != b"DTX1":
            sys.exit(f"{p}: bad magic {magic!r}")
        fd, n = struct.unpack_from("<II", raw, 4)
        if feat_dim is None:
            feat_dim = fd
        elif fd != feat_dim:
            sys.exit(f"{p}: featDim {fd} != {feat_dim} (mixed encodings in buffer dir?)")
        rows = np.frombuffer(raw, dtype="<f4", offset=12, count=n * (fd + 1)).reshape(n, fd + 1)
        xs.append(rows[:, :fd])
        ys.append(rows[:, fd])
    X = np.concatenate(xs)
    y = np.concatenate(ys)
    return X, y, feat_dim, len(paths)


def cmd_init(args):
    sizes = [int(s) for s in args.sizes.split(",")]
    torch.manual_seed(args.seed)
    model = build_model(sizes)
    export_json(model, sizes, args.out)
    print(f"init: fresh net {sizes} -> {args.out}")


def cmd_train(args):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, sizes = load_json(args.net)
    model.to(device)
    X, y, feat_dim, nfiles = load_experience(args.exp)
    assert feat_dim == sizes[0], f"experience featDim {feat_dim} != net input {sizes[0]}"
    Xt = torch.tensor(X, dtype=torch.float32, device=device)
    yt = torch.tensor(y, dtype=torch.float32, device=device).unsqueeze(1)

    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    lossf = nn.MSELoss()
    n = Xt.shape[0]
    last = float("nan")
    for epoch in range(args.epochs):
        perm = torch.randperm(n, device=device)
        total, batches = 0.0, 0
        for i in range(0, n, args.batch):
            idx = perm[i:i + args.batch]
            opt.zero_grad()
            loss = lossf(model(Xt[idx]), yt[idx])
            loss.backward()
            opt.step()
            total += loss.item()
            batches += 1
        last = total / max(batches, 1)
    export_json(model.cpu(), sizes, args.out)
    print("TRAIN " + json.dumps({
        "samples": int(n), "files": nfiles, "epochs": args.epochs,
        "loss": last, "device": device,
    }))


def cmd_parity(args):
    model, sizes = load_json(args.net)
    rng = np.random.default_rng(args.seed)
    inputs = rng.uniform(-1, 1, size=(args.n, sizes[0])).astype(np.float32)
    with torch.no_grad():
        outputs = model(torch.tensor(inputs)).squeeze(1).numpy().astype(float).tolist()
    bundle = {"net": args.net, "inputs": inputs.astype(float).tolist(), "expected": outputs}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(bundle, f)
    print(f"parity bundle ({args.n} vectors) -> {args.out}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="mode", required=True)

    p = sub.add_parser("init")
    p.add_argument("--sizes", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--seed", type=int, default=1)
    p.set_defaults(fn=cmd_init)

    p = sub.add_parser("train")
    p.add_argument("--net", required=True)
    p.add_argument("--exp", required=True, nargs="+")
    p.add_argument("--out", required=True)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch", type=int, default=2048)
    p.add_argument("--lr", type=float, default=1e-3)
    p.set_defaults(fn=cmd_train)

    p = sub.add_parser("parity")
    p.add_argument("--net", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--n", type=int, default=16)
    p.add_argument("--seed", type=int, default=123)
    p.set_defaults(fn=cmd_parity)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
