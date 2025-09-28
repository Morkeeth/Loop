// Shared digest storage for the application
// In production, this should be replaced with a proper database
export const digestStorage = new Map<string, {
  id: string;
  content: string;
  audioUrl?: string;
  createdAt: string;
}>();

export function storeDigest(digestId: string, content: string, audioUrl?: string): void {
  const existing = digestStorage.get(digestId);

  digestStorage.set(digestId, {
    id: digestId,
    content,
    audioUrl: audioUrl ?? existing?.audioUrl,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

export function updateDigestAudio(digestId: string, audioUrl: string): void {
  const existing = digestStorage.get(digestId);

  digestStorage.set(digestId, {
    id: digestId,
    content: existing?.content ?? '',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    audioUrl,
  });
}

export function getDigest(digestId: string) {
  return digestStorage.get(digestId);
}
