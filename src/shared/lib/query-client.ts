'use client';

import { QueryClient } from '@tanstack/react-query';
import { FirestoreRequestTimeoutError } from '@/shared/firebase/firestore-timeout';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        retry: (failureCount, error) =>
          !(error instanceof FirestoreRequestTimeoutError) && failureCount < 1,
        retryDelay: 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}