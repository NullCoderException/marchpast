"""PROTOTYPE check for the extraction test (wayfinder ticket #11).

Validates the model's draft against the draft schema shape, checks quotes are
verbatim from the prompt sources, and prints the draft next to ground-truth.json
for eyeballing. Throwaway: no tests, no error handling beyond what runs.
"""
import json
import math
import sys

draft_path = sys.argv[1] if len(sys.argv) > 1 else "run1.output.txt"
raw = open(draft_path, encoding="utf-8").read().strip()
if raw.startswith("```"):
    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
try:
    b = json.loads(raw)
    print("PARSE: ok")
except Exception as e:
    print("PARSE: FAILED", e)
    sys.exit(1)

gt = json.load(open("ground-truth.json", encoding="utf-8"))
errs = []


def req(obj, key, where):
    if key not in obj:
        errs.append(f"{where}: missing {key}")


for k in ["schema_version", "title", "date", "extent", "scale_unit", "end", "sources", "units", "phases"]:
    req(b, k, "battle")
unit_ids = {u.get("id") for u in b.get("units", [])}
print("UNITS:", sorted(unit_ids))
src_keys = set(b.get("sources", {}).keys())
print("SOURCES:", sorted(src_keys))
states = {"intact", "engaged", "broken", "destroyed"}
kinds = {"detachment", "intent"}


def mins(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


prev_t = None
for i, p in enumerate(b.get("phases", [])):
    w = f"phase[{i}] {p.get('id')}"
    for k in ["id", "label", "t", "playback_rate", "caption", "references", "units"]:
        req(p, k, w)
    t = p.get("t")
    if prev_t is not None and t and mins(t) <= mins(prev_t):
        errs.append(f"{w}: t {t} not > {prev_t}")
    prev_t = t
    if not p.get("references"):
        errs.append(f"{w}: no references")
    for r in p.get("references", []):
        if r.get("source") not in src_keys:
            errs.append(f"{w}: reference to unknown source {r.get('source')}")
    ids = [u.get("id") for u in p.get("units", [])]
    if set(ids) != unit_ids:
        errs.append(f"{w}: units {ids} != roster")
    for u in p.get("units", []):
        uw = f"{w}/{u.get('id')}"
        pos = u.get("position", {})
        if not (isinstance(pos.get("lat"), (int, float)) and isinstance(pos.get("lon"), (int, float))):
            errs.append(f"{uw}: bad position {pos}")
        if not isinstance(u.get("heading"), (int, float)) or not (0 <= u["heading"] < 360):
            errs.append(f"{uw}: bad heading {u.get('heading')}")
        if u.get("state") not in states:
            errs.append(f"{uw}: bad state {u.get('state')}")
        s = u.get("strength", 1)
        if not (isinstance(s, (int, float)) and 0 <= s <= 1):
            errs.append(f"{uw}: bad strength {s}")
        for m in u.get("moves", []) or []:
            if m.get("kind") not in kinds:
                errs.append(f"{uw}: bad move kind {m.get('kind')}")
            if not isinstance(m.get("to", {}).get("lat"), (int, float)):
                errs.append(f"{uw}: bad move.to")
print(f"SHAPE: {len(errs)} problems")
for e in errs:
    print("  -", e)

# Quotes must be verbatim from the two source texts in the prompt.
srcs = open("nelson-memorandum.txt", encoding="utf-8").read() + open("mahan-ch23.txt", encoding="utf-8").read()


def norm(s):
    s = s.replace("’", "'").replace("“", '"').replace("”", '"').replace("—", "--")
    return " ".join(s.split())


nsrc = norm(srcs)
q_total = q_ok = 0
for p in b.get("phases", []):
    for r in p.get("references", []):
        q = r.get("quote")
        if q:
            q_total += 1
            if norm(q) in nsrc:
                q_ok += 1
            else:
                print(f"  QUOTE NOT VERBATIM ({p.get('id')}): {q[:100]!r}")
print(f"QUOTES: {q_ok}/{q_total} verbatim")

# Side-by-side with ground truth.
cape = gt["cape_trafalgar"]
COSLAT = math.cos(math.radians(36.2))


def nm(a, b2):
    dlat = (a["lat"] - b2["lat"]) * 60
    dlon = (a["lon"] - b2["lon"]) * 60 * COSLAT
    return math.hypot(dlat, dlon)


def brg(frm, to):
    dlat = to["lat"] - frm["lat"]
    dlon = (to["lon"] - frm["lon"]) * COSLAT
    return (math.degrees(math.atan2(dlon, dlat)) + 360) % 360


print("\nPHASES (draft): distance and bearing are from Cape Trafalgar")
print(f"{'t':>5} {'id':32} {'wind':>5}  {'unit':18} {'hdg':>4} {'state':9} {'str':>4}  position            moves")
for p in b.get("phases", []):
    wind = p.get("wind", {}).get("from", "") if p.get("wind") else ""
    first = True
    for u in p.get("units", []):
        pos = u.get("position", {})
        ok = isinstance(pos.get("lat"), (int, float))
        d = nm(pos, cape) if ok else float("nan")
        bg = brg(cape, pos) if ok else float("nan")
        mv = ", ".join(
            f"{m.get('kind')}->({m.get('to', {}).get('lat')},{m.get('to', {}).get('lon')})" for m in (u.get("moves") or [])
        )
        t_col = p.get("t") if first else ""
        id_col = (p.get("id") or "")[:32] if first else ""
        w_col = str(wind) if first else ""
        print(f"{t_col:>5} {id_col:32} {w_col:>5}  {str(u.get('id')):18} {str(u.get('heading', '')):>4} {str(u.get('state', '')):9} {str(u.get('strength', 1)):>4}  {d:5.1f} nm @ {bg:5.1f}    {mv}")
        first = False

print("\nGROUND TRUTH times:", [(g["id"], g["t"]) for g in gt["phases"]])
print("DRAFT times       :", [(p.get("id"), p.get("t")) for p in b.get("phases", [])])
print("\nGROUND TRUTH states/strength (combined-fleet):",
      [(g["t"], g["units"]["combined-fleet"]["state"], g["units"]["combined-fleet"]["strength"]) for g in gt["phases"]])
print("\nNOTES per phase:")
for p in b.get("phases", []):
    print(f"- {p.get('t')} {p.get('id')}: {p.get('notes', '(none)')}")
print("\nCAPTIONS:")
for p in b.get("phases", []):
    print(f"- {p.get('t')} {p.get('label')}: {p.get('caption')}")
print("\nREFERENCES:")
for p in b.get("phases", []):
    for r in p.get("references", []):
        print(f"- {p.get('id')}: {r.get('source')} | {r.get('locator')} | quote={'yes' if r.get('quote') else 'no'}")
print("\nBATTLE-LEVEL:", {k: b.get(k) for k in ["title", "date", "extent", "scale_unit", "map", "end"]})
print("PLAYBACK RATES:", [(p.get("id"), p.get("playback_rate")) for p in b.get("phases", [])])
print("SOURCES TABLE:", json.dumps(b.get("sources"), indent=1))
