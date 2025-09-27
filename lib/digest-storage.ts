// Shared digest storage for the application
// In production, this should be replaced with a proper database
export const digestStorage = new Map<string, {
  id: string;
  content: string;
  audioUrl?: string;
  createdAt: string;
}>();

export function storeDigest(digestId: string, content: string): void {
  console.log('Storing digest with ID:', digestId);
  digestStorage.set(digestId, {
    id: digestId,
    content,
    createdAt: new Date().toISOString(),
  });
  console.log('Digest stored. Total digests:', digestStorage.size);
}

export function getDigest(digestId: string) {
  console.log('Retrieving digest with ID:', digestId);
  console.log('Available digest IDs:', Array.from(digestStorage.keys()));
  const digest = digestStorage.get(digestId);
  console.log('Found digest:', !!digest);
  return digest;
}
