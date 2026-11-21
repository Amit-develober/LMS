'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/features/dashboard/services/dashboard';
import { getBooks } from '@/features/books/services/books';
import { getIssueRecords } from '@/features/circulation/services/issue-records';
import type { IssueRecordWithDetails, BookWithAvailability } from '@/shared/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

function useDashboardIssueRecords(
  select: (records: IssueRecordWithDetails[]) => IssueRecordWithDetails[]
) {
  return useQuery({
    queryKey: ['dashboard', 'issue-records'],
    queryFn: () => getIssueRecords(),
    select,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentIssues() {
  return useDashboardIssueRecords((records) =>
    records.filter((r) => !r.return_date).slice(0, 5)
  );
}

export function useRecentReturns() {
  return useDashboardIssueRecords((records) =>
    records.filter((r) => !!r.return_date).slice(0, 5)
  );
}

export function useLowAvailabilityBooks() {
  return useQuery({
    queryKey: ['dashboard', 'low-availability'],
    queryFn: async (): Promise<BookWithAvailability[]> => {
      const books = await getBooks();
      return books.filter((b) => b.available_copies <= 3).slice(0, 5);
    },
    staleTime: 1000 * 60 * 2,
  });
}