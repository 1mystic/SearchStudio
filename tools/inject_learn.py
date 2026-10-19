"""Insert/replace the `learn: {...},` block in each algorithm file from learn_content.py."""
import json, re, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from learn_content import L
root = pathlib.Path(__file__).resolve().parent.parent
done = []
for f in sorted((root / "algorithms").rglob("*.js")):
    if f.name.startswith("_"): continue
    s = f.read_text()
    m = re.search(r'id: "([^"]+)"', s)
    if not m or m.group(1) not in L: print("no learn content for", f); continue
    block = "  learn: " + json.dumps(L[m.group(1)], ensure_ascii=False, indent=2).replace("\n", "\n  ") + ",\n"
    s = re.sub(r"  learn: \{.*?\n  \},\n", "", s, flags=re.S)
    s = re.sub(r'(\n  complexity: [^\n]*\n)', lambda mm: mm.group(1) + block, s, count=1)
    f.write_text(s); done.append(m.group(1))
print(len(done), "files updated")
