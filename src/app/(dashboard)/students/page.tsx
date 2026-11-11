'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getStudents } from '@/lib/firebase/db';
import { useToast } from '@/components/ui/toast';
import { StudentWithBorrowInfo } from '@/types';
import {
  Users,
  Search,
  Plus,
  BookOpen,
  Loader2,
  GraduationCap,
  Filter,
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithBorrowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const { showToast } = useToast();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudents(search, selectedClass === 'all' ? undefined : selectedClass);
      setStudents(data);
    } catch {
      showToast('Error loading student records', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedClass, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // Unique classes for filter
  const classesList = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Registered Students
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage student library profiles, track active loans, and monitor overdue returns
          </p>
        </div>
        <Link
          href="/students/new"
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="input-field py-2 text-xs font-medium w-36"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">No students found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No student records match "${search}". Try searching with a different term.`
                : 'Get started by registering your first student.'}
            </p>
            <Link
              href="/students/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Student
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Admission #</th>
                  <th className="py-3 px-4">Class & Sec</th>
                  <th className="py-3 px-4">Active Loans</th>
                  <th className="py-3 px-4">Total Borrowed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-100">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/students/${student.id}`}
                            className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors block"
                          >
                            {student.full_name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      {student.admission_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 px-2 py-0.5 rounded bg-gray-100">
                        <GraduationCap className="w-3 h-3 text-gray-500" />
                        Class {student.class_name} - {student.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {student.active_borrows > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <BookOpen className="w-3 h-3" />
                          {student.active_borrows} active
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 font-medium">
                      {student.total_borrows} books
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/students/${student.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          View Profile
                        </Link>
                        <Link
                          href={`/students/${student.id}/edit`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
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
