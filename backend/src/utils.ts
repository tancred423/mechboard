export function generateId(): string {
  return crypto.randomUUID();
}

export function validateEncounterConfig(config: unknown): boolean {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;

  if (!Array.isArray(c.cards)) return false;
  if (c.cards.length > 50) return false;

  for (const card of c.cards) {
    if (!card || typeof card !== "object") return false;
    const cardObj = card as Record<string, unknown>;

    if (typeof cardObj.id !== "string") return false;
    if (typeof cardObj.name !== "string") return false;
    if (cardObj.name.length > 100) return false;
    if (cardObj.selectionMode !== "single" && cardObj.selectionMode !== "multi") return false;
    if (!Array.isArray(cardObj.options)) return false;
    if (cardObj.options.length > 20) return false;

    for (const option of cardObj.options) {
      if (!option || typeof option !== "object") return false;
      const optObj = option as Record<string, unknown>;

      if (typeof optObj.id !== "string") return false;
      if (typeof optObj.name !== "string") return false;
      if (optObj.name.length > 50) return false;
      if (optObj.selected !== undefined && typeof optObj.selected !== "boolean") return false;
    }
  }

  return true;
}
