// Espace d'actions de la tête POLITIQUE (Phase 4, design §5d) : la tête produit ACTION_SLOTS
// logits ; chaque coup légal est projeté dans un bucket par hachage de sa clé stable
// `actionKey(a)` (gameNode.ts). Le softmax se calcule RESTREINT aux buckets des coups légaux du
// nœud — une collision entre deux coups légaux du même nœud est bénigne (prior partagé), et
// rare (typiquement < 15 coups légaux pour 256 buckets).
export const ACTION_SLOTS = 256

// FNV-1a 32 bits — stable, sans dépendance, suffisant pour disperser des clés texte courtes.
export function actionBucket(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % ACTION_SLOTS
}
