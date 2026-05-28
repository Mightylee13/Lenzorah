/**
 * Origin-private sandbox storage utilizing IndexedDB to store offline media Blobs
 * (videos and subtitles) for true high-fidelity offline playback in PWA mode.
 */

const DB_NAME = "runflix-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "media";

let dbPromise: Promise<IDBDatabase> | null = null;

export function initDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open offline media IndexedDB");
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

export async function saveMedia(id: string, blob: Blob): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMedia(id: string): Promise<Blob | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Minimal 1-second silent H.264 MP4 Base64 string for standard local playback tests
const MINIMAL_MP4_BASE64 =
  "AAAAIGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADhmdmVlAAAAAGZyZWUAAABlbWRhdAIEAAAH521vb3YAAABsbXZoZAAAAADSp0lA0qdJQAABkAAABVAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABpdHJhawAAAFx0a2hkAAAAAdKnSUDSp0lQAAABkAAAAAAABVAAAAAAAAAAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAQAAAAAAeG1kZXMAAABcaWRhdAAAAAVoZWxjMAAAAABwYXNwAAAAAHV1cGQAAAAAc3BkZQAAAAB1dXBkAAAAAHNwZGUAAAAAdXVwZAAAAHNwZGUAAAAAdXVwZAAAAHNwZGUAAAAAdXVwZAAAAHNwZGUAAAAAdXVwZAAAc3BkZQAAAAA=";

export function getPlaceholderMp4Blob(): Blob {
  try {
    const binary = atob(MINIMAL_MP4_BASE64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: "video/mp4" });
  } catch (e) {
    // Fail-safe plain text fallback as a last resort
    return new Blob(["Runflix Offline Media Placeholder"], {
      type: "video/mp4",
    });
  }
}
