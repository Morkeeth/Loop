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

export function setDigestAudioUrl(digestId: string, audioUrl: string): void {
  const existing = digestStorage.get(digestId);
  if (existing) {
    digestStorage.set(digestId, {
      ...existing,
      audioUrl,
    });
  } else {
    // If content wasn't stored yet, at least persist the audio URL with minimal record
    digestStorage.set(digestId, {
      id: digestId,
      content: '',
      audioUrl,
      createdAt: new Date().toISOString(),
    });
  }
}
