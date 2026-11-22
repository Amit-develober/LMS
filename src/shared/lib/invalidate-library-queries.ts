import type { QueryClient } from '@tanstack/react-query';

export async function invalidateLibraryQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['books'] }),
    queryClient.invalidateQueries({ queryKey: ['students'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['issue-history'] }),
  ]);
}
