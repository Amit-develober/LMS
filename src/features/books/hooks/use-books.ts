'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooks, addBook, updateBook, getBookById } from '@/features/books/services/books';
import type { BookWithAvailability, Book } from '@/shared/types';

export function useBooks(search?: string, subjectFilter?: string, showArchived = false) {
  return useQuery({
    queryKey: ['books', { search, subjectFilter, showArchived }],
    queryFn: () => getBooks(search, subjectFilter, showArchived),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ['books', id],
    queryFn: () => getBookById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => addBook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Book, 'id' | 'created_at' | 'qr_token'>> }) =>
      updateBook(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['books', id] });
    },
  });
}

export function useArchiveBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      updateBook(id, { is_archived: archive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}