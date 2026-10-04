const recentConversationAlerts = new Map();

export function claimConversationAlert(
  id,
  group = false,
  now = Date.now(),
  cooldownMs = 2500,
) {
  if (!id) return true;
  const key = `${group ? "group" : "dm"}:${id}`;
  for (const [candidate, expiresAt] of recentConversationAlerts)
    if (expiresAt <= now) recentConversationAlerts.delete(candidate);
  if ((recentConversationAlerts.get(key) || 0) > now) return false;
  recentConversationAlerts.set(key, now + cooldownMs);
  return true;
}

export function resetConversationAlertClaims() {
  recentConversationAlerts.clear();
}
