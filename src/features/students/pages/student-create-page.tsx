'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addStudent, getStudents } from '@/features/students/services/students';
import { useToast } from '@/shared/components/ui/toast';
import { studentSchema, StudentFormInput } from '@/shared/validation/schemas';
import {
  UserPlus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User,
  Hash,
  GraduationCap,
} from 'lucide-react';

export default function NewStudentPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      const existing = await getStudents(data.admission_number.trim());
      const match = existing.find(
        (s) => s.admission_number.toLowerCase() === data.admission_number.trim().toLowerCase()
      );

      if (match) {
        showToast('A student with this admission number is already registered', 'error');
        setSubmitting(false);
        return;
      }

      const newId = await addStudent({
        full_name: data.full_name.trim(),
        admission_number: data.admission_number.trim(),
        class_name: data.class_name.trim(),
        section: data.section.trim(),
      });

      showToast(`Student ${data.full_name} registered successfully!`, 'success');
      router.push(`/students/${newId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast(msg, 'error');
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
                  Save Student Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
