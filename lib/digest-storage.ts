// Shared digest storage for the application
// In production, this should be replaced with a proper database
export const digestStorage = new Map<string, {
  id: string;
  content: string;
  audioUrl?: string;
  createdAt: string;
}>();

export function storeDigest(digestId: string, content: string): void {
  digestStorage.set(digestId, {
    id: digestId,
    content,
    createdAt: new Date().toISOString(),
  });
}

export function getDigest(digestId: string) {
  return digestStorage.get(digestId);
}
