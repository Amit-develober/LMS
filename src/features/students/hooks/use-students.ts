'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, getStudentById, addStudent, updateStudent } from '@/features/students/services/students';
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
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Student> }) => updateStudent(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', id] });
    },
  });
}