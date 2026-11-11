'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getStudentById, updateStudent, getStudents } from '@/lib/firebase/db';
import { useToast } from '@/components/ui/toast';
import { studentSchema, StudentFormInput } from '@/lib/validations';
import {
  ArrowLeft,
  Loader2,
  User,
  Hash,
  GraduationCap,
  Save,
} from 'lucide-react';

export default function EditStudentPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormInput>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    async function loadStudent() {
      try {
        const data = await getStudentById(id);
        if (!data) {
          showToast('Student not found', 'error');
          router.push('/students');
          return;
        }

        reset({
          full_name: data.full_name,
          admission_number: data.admission_number,
          class_name: data.class_name,
          section: data.section,
        });
      } catch {
        showToast('Error loading student', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [id, reset, router, showToast]);

  const onSubmit = async (data: StudentFormInput) => {
    setSubmitting(true);
    try {
      const allStudents = await getStudents(data.admission_number.trim());
      const duplicate = allStudents.find(
        (s) =>
          s.id !== id &&
          s.admission_number.toLowerCase() === data.admission_number.trim().toLowerCase()
      );

      if (duplicate) {
        showToast('Another student already has this admission number', 'error');
        setSubmitting(false);
        return;
      }

      await updateStudent(id, {
        full_name: data.full_name.trim(),
        admission_number: data.admission_number.trim(),
        class_name: data.class_name.trim(),
        section: data.section.trim(),
      });

      showToast('Student details updated successfully', 'success');
      router.push(`/students/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/students/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Profile
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Edit Student Details
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Update student name, admission number, class, or section
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
                {...register('admission_number')}
                className={`input-field pl-9 font-mono ${
                  errors.admission_number ? 'border-rose-400' : ''
                }`}
              />
            </div>
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
              href={`/students/${id}`}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
