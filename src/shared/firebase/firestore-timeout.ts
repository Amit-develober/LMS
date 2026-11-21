const FIRESTORE_REQUEST_TIMEOUT_MS = 15_000;

export class FirestoreRequestTimeoutError extends Error {
  constructor(operation: string) {
    super(`${operation} did not complete within 15 seconds.`);
    this.name = 'FirestoreRequestTimeoutError';
  }
}

export async function withFirestoreTimeout<T>(
  operation: Promise<T>,
  description: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new FirestoreRequestTimeoutError(description)),
          FIRESTORE_REQUEST_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
