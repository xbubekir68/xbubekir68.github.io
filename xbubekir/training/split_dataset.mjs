import {createHash} from "node:crypto";

// Vergleicht auch über verschiedene System-Prompts hinweg dieselben Gesprächsdaten.
export const dialogueKey = c => JSON.stringify(c.messages.filter(m => m.role !== "system"));
const hash = s => createHash("sha256").update(s).digest("hex");

export function splitDataset(records, fraction = 0.05) {
  const parents = new Map(), seen = new Map();
  const find = x => { if (!parents.has(x)) parents.set(x, x); if (parents.get(x) !== x) parents.set(x, find(parents.get(x))); return parents.get(x); };
  for (const r of records) {
    find(r.group);
    const key = dialogueKey(r.conversation);
    if (seen.has(key)) parents.set(find(r.group), find(seen.get(key)));
    seen.set(key, r.group);
  }
  const groups = new Map();
  for (const r of records) {
    const group = find(r.group);
    if (!groups.has(group)) groups.set(group, new Map());
    const entries = groups.get(group), key = dialogueKey(r.conversation), old = entries.get(key);
    entries.set(key, {...r, group, weight: Math.max(old?.weight || 1, r.weight || 1)});
  }
  const ordered = [...groups].sort(([a], [b]) => hash("xb-v2:" + a).localeCompare(hash("xb-v2:" + b)));
  const target = Math.max(1, Math.ceil([...groups.values()].reduce((n, g) => n + g.size, 0) * fraction));
  const train = [], evaluation = [], manifest = {train: [], eval: []};
  for (const [i, [group, entries]] of ordered.entries()) {
    // Mindestens eine Trainingsgruppe behalten, selbst bei kleinen Testdatensätzen.
    const heldOut = evaluation.length < target && i < ordered.length - 1;
    for (const r of entries.values()) {
      const count = heldOut ? 1 : r.weight;
      for (let k = 0; k < count; k++) {
        (heldOut ? evaluation : train).push(r.conversation);
        manifest[heldOut ? "eval" : "train"].push({group, hash: hash(dialogueKey(r.conversation))});
      }
    }
  }
  return {train, evaluation, manifest};
}
