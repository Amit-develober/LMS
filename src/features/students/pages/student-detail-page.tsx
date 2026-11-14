'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getStudentById } from '@/features/students/services/students';
import { getIssueRecords, returnBook } from '@/features/circulation/services/issue-records';
import { useToast } from '@/shared/components/ui/toast';
import { formatDate, isOverdue } from '@/shared/utils/date';
import { Student, IssueRecordWithDetails } from '@/shared/types';
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  BookPlus,
  BookCheck,
  Edit,
  Loader2,
} from 'lucide-react';

export default function StudentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<IssueRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const studentData = await getStudentById(id);
      if (!studentData) {
        showToast('Student record not found', 'error');
        router.push('/students');
        return;
      }
      setStudent(studentData);

      const recordsData = await getIssueRecords({ studentId: id });
      setRecords(recordsData);
    } catch {
      showToast('Error loading student details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleReturnBook = async (recordId: string, bookTitle: string) => {
    setReturningId(recordId);
    try {
      await returnBook(recordId);
      showToast(`Returned copy of ${bookTitle} successfully`, 'success');
      fetchStudentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error returning book';
      showToast(msg, 'error');
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!student) return null;

  const activeBorrows = records.filter((r) => !r.return_date);
  const returnedBorrows = records.filter((r) => r.return_date);
  const overdueBorrows = activeBorrows.filter((r) => isOverdue(r.due_date));

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
      </Link>

      {/* Header Profile Card */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
              {student.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                  {student.admission_number}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Class {student.class_name} • Section {student.section}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Student registered on {formatDate(student.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              href={`/students/${student.id}/edit`}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </Link>
            <Link
              href="/issue"
              className="btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <BookPlus className="w-3.5 h-3.5" />
              Issue New Book
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 text-center">
          <div className="p-3 rounded-xl bg-blue-50/50">
            <p className="text-xs font-semibold text-blue-700">Currently Borrowed</p>
            <p className="text-2xl font-bold text-blue-900 mt-0.5">{activeBorrows.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/50">
            <p className="text-xs font-semibold text-rose-700">Overdue Books</p>
            <p className="text-2xl font-bold text-rose-900 mt-0.5">{overdueBorrows.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/50">
            <p className="text-xs font-semibold text-emerald-700">Total Returned</p>
            <p className="text-2xl font-bold text-emerald-900 mt-0.5">{returnedBorrows.length}</p>
          </div>
        </div>
      </div>

      {/* Currently Borrowed Books Section */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Currently Borrowed Books ({activeBorrows.length})
        </h2>

        {activeBorrows.length === 0 ? (
          <div className="py-8 text-center px-4 rounded-xl border border-dashed border-gray-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">No active book loans</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This student does not currently hold any unreturned books.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {activeBorrows.map((rec) => {
              const overdue = isOverdue(rec.due_date);
              return (
                <div
                  key={rec.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/books/${rec.book?.id}`}
                          className="font-bold text-sm text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {rec.book?.title}
                        </Link>
                        {overdue && (
                          <span className="badge-overdue text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        By {rec.book?.author} • {rec.book?.subject}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Issued: {formatDate(rec.issue_date)}
                        </span>
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            overdue ? 'text-rose-600' : 'text-gray-600'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {formatDate(rec.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={returningId === rec.id}
                    onClick={() => handleReturnBook(rec.id, rec.book?.title || 'Book')}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-center shadow-sm disabled:opacity-50"
                  >
                    {returningId === rec.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookCheck className="w-3.5 h-3.5" />
                    )}
                    Return Book
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Borrowing History Section */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          Past Loan History ({returnedBorrows.length})
        </h2>

        {returnedBorrows.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No past returned loans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Author</th>
                  <th className="py-2.5 px-3">Issued On</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Returned On</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returnedBorrows.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      <Link href={`/books/${rec.book?.id}`} className="hover:text-blue-600">
                        {rec.book?.title}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{rec.book?.author}</td>
                    <td className="py-2.5 px-3 text-gray-600">{formatDate(rec.issue_date)}</td>
                    <td className="py-2.5 px-3 text-gray-600">{formatDate(rec.due_date)}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-medium">
                      {rec.return_date ? formatDate(rec.return_date) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="badge-returned text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Returned
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
