'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addStudent, searchStudents } from '@/features/students/services/students';
import { FirestoreRequestTimeoutError } from '@/shared/firebase/firestore-timeout';
import { invalidateLibraryQueries } from '@/shared/lib/invalidate-library-queries';
import { useToast } from '@/shared/components/ui/toast';
import { studentSchema, type StudentFormInput } from '@/shared/validation/schemas';
import {
  UserPlus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User,
  Hash,
  GraduationCap,
} from 'lucide-react';

type PendingStudentRegistration = {
  id: string;
  data: Parameters<typeof addStudent>[0];
};

function getRegistrationError(error: unknown): string {
  if (error instanceof FirestoreRequestTimeoutError) {
    return `${error.message} The save may still complete. Retry safely; it reuses the same student ID.`;
  }
  return error instanceof Error ? error.message : 'Failed to register student';
}

export default function NewStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<PendingStudentRegistration | null>(null);
  const [registrationError, setRegistrationError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentFormInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      admission_number: '',
      class_name: '',
      section: 'A',
    },
  });

  const onSubmit = async (data: StudentFormInput) => {
    if (submitting) return;
    setSubmitting(true);
    setRegistrationError('');
    let attempt = pendingAttempt;

    try {
      if (!attempt) {
        const studentData = {
          full_name: data.full_name.trim(),
          admission_number: data.admission_number.trim(),
          class_name: data.class_name.trim(),
          section: data.section.trim(),
        };
        const existing = await searchStudents(studentData.admission_number);
        const match = existing.find(
          (student) =>
            student.admission_number.toLowerCase() === studentData.admission_number.toLowerCase()
        );

        if (match) {
          showToast('A student with this admission number is already registered', 'error');
          return;
        }

        attempt = { id: crypto.randomUUID(), data: studentData };
        setPendingAttempt(attempt);
      }

      const newId = await addStudent(attempt.data, attempt.id);
      await invalidateLibraryQueries(queryClient);

      setPendingAttempt(null);
      showToast(`Student ${attempt.data.full_name} registered successfully!`, 'success');
      router.push(`/students/${newId}`);
    } catch (err: unknown) {
      setRegistrationError(getRegistrationError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          Register Student
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Add a new student profile to enable library book loans and history tracking
        </p>
      </div>

      {/* Form Card */}
      <div className="card p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {registrationError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {registrationError}
              {pendingAttempt && (
                <p className="mt-1">
                  Your form is preserved. Retry uses the same student ID to avoid duplicate records.
                </p>
              )}
            </div>
          )}
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Ravi Kumar"
                {...register('full_name')}
                disabled={submitting || !!pendingAttempt}
                className={`input-field pl-9 ${errors.full_name ? 'border-rose-400' : ''}`}
              />
            </div>
            {errors.full_name && (
              <p className="text-xs text-rose-600 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Admission Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Admission Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. ADM-2024-001"
                {...register('admission_number')}
                disabled={submitting || !!pendingAttempt}
                className={`input-field pl-9 font-mono ${
                  errors.admission_number ? 'border-rose-400' : ''
                }`}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Must be unique across the school.</p>
            {errors.admission_number && (
              <p className="text-xs text-rose-600 mt-1">{errors.admission_number.message}</p>
            )}
          </div>

          {/* Class and Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. XI or 11"
                  {...register('class_name')}
                  disabled={submitting || !!pendingAttempt}
                  className={`input-field pl-9 ${errors.class_name ? 'border-rose-400' : ''}`}
                />
              </div>
              {errors.class_name && (
                <p className="text-xs text-rose-600 mt-1">{errors.class_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Section <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. A, B, Science"
                {...register('section')}
                disabled={submitting || !!pendingAttempt}
                className={`input-field ${errors.section ? 'border-rose-400' : ''}`}
              />
              {errors.section && (
                <p className="text-xs text-rose-600 mt-1">{errors.section.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              href="/students"
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Student...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {pendingAttempt ? 'Retry Registration' : 'Save Student Profile'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
