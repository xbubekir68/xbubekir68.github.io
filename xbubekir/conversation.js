// Nur der gewählte Gesprächspfad geht an das Modell. Andere Antworten bleiben lokal.
export function revisionWork(chat, index) {
  return {...chat, msgs: structuredClone(chat.msgs.slice(0, index + 1))};
}

export function acceptRevision(chat, work, index) {
  const answer = work.msgs.slice(index + 1);
  if (!answer.some(m => m.role === "assistant" && !m.skip) || work.msgs[index]?.skip) return false;
  if (!chat.msgs.slice(index + 1).some(m => m.role === "assistant" && !m.skip)) {
    chat.msgs = work.msgs;
    return true;
  }
  const user = chat.msgs[index];
  const variants = structuredClone(user.variants || [null]);
  variants[user.variantIndex || 0] = structuredClone(chat.msgs.slice(index + 1));
  work.msgs[index].variantIndex = variants.length;
  work.msgs[index].variants = [...variants, null]; // aktiver Pfad liegt ausschließlich in msgs
  chat.msgs = work.msgs;
  return true;
}

export function selectVariant(chat, index, selected) {
  const user = chat.msgs[index], variants = user?.variants;
  if (!variants || !Number.isInteger(selected) || selected < 0 || selected >= variants.length || selected === user.variantIndex) return false;
  const next = variants[selected];
  if (!Array.isArray(next)) return false;
  variants[user.variantIndex || 0] = structuredClone(chat.msgs.slice(index + 1));
  variants[selected] = null;
  user.variantIndex = selected;
  chat.msgs.splice(index + 1, Infinity, ...next);
  return true;
}

export function editBranch(chat, index, content, id, now = Date.now()) {
  if (chat.msgs[index]?.role !== "user" || !content.trim()) return null;
  const msgs = structuredClone(chat.msgs.slice(0, index));
  for (const m of msgs) { delete m.variants; delete m.variantIndex; }
  msgs.push({role: "user", content: content.trim()});
  return {...chat, id, title: content.trim().replace(/\s+/g, " ").slice(0, 60), created: now, updated: now, msgs};
}
