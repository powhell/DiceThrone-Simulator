# Analyse appariée de la vague cards_sm (EV par carte Spider-Man).
# valeur(carte) = Δwin apparié (carte en main de départ vs base, même seed+seating),
# converti en équivalent-dégâts via l'étalon sm_hp4 (+4 PV). Marges = ±1,96 SE.
import json, glob, math, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(__file__)
DIR = os.path.join(HERE, 'results_cards_sm')

def load(arm):
    out = {}
    p = os.path.join(DIR, arm + '.jsonl')
    if not os.path.exists(p): return out
    for line in open(p, encoding='utf-8'):
        if not line.strip(): continue
        r = json.loads(line)
        out[(r['seating'], r['seed'])] = r['hhScore']
    return out

base = load('base_sm')
def paired(arm):
    a = load(arm)
    ks = sorted(set(a) & set(base))
    if len(ks) < 50: return None
    diffs = [a[k] - base[k] for k in ks]
    n = len(diffs)
    m = sum(diffs) / n
    var = sum((d - m) ** 2 for d in diffs) / (n - 1)
    se = math.sqrt(var / n)
    return m, 1.96 * se, n

hp4 = paired('sm_hp4')
if not hp4:
    print('étalon sm_hp4 insuffisant'); raise SystemExit
per_hp = hp4[0] / 4.0
print(f"étalon +4 PV : Δwin {hp4[0]*100:+.1f} pts (n={hp4[2]} paires) -> 1 PV = {per_hp*100:.2f} pts de win")
print(f"{'carte':28s} {'valeur (dmg-equiv)':>18s} {'± marge':>8s} {'n paires':>9s}")
rows = []
for f in sorted(glob.glob(os.path.join(DIR, 'card_sm_*.jsonl'))):
    arm = os.path.basename(f)[:-6]
    r = paired(arm)
    if not r: continue
    val = r[0] / per_hp if per_hp else float('nan')
    moe = r[1] / abs(per_hp) if per_hp else float('nan')
    rows.append((val, moe, r[2], arm.replace('card_sm_', '')))
for val, moe, n, name in sorted(rows, reverse=True):
    print(f"{name:28s} {val:>18.1f} {moe:>8.1f} {n:>9d}")
