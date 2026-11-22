'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, getStudentById, addStudent, updateStudent } from '@/features/students/services/students';
import { invalidateLibraryQueries } from '@/shared/lib/invalidate-library-queries';
import type { Student, StudentWithBorrowInfo } from '@/shared/types';

export function useStudents(search?: string, classNameFilter?: string) {
  return useQuery({
    queryKey: ['students', { search, classNameFilter }],
    queryFn: () => getStudents(search, classNameFilter),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => getStudentById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => addStudent(data),
    onSuccess: () => {
      return invalidateLibraryQueries(queryClient);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
    }) => updateStudent(id, updates),
    onSuccess: () => {
      return invalidateLibraryQueries(queryClient);
    },
  });
}