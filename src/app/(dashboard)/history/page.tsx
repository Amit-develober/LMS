'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getIssueRecords, returnBook } from '@/lib/firebase/db';
import { useToast } from '@/components/ui/toast';
import { formatDate, isOverdue } from '@/lib/utils';
import { IssueRecordWithDetails } from '@/types';
import {
  ClipboardList,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  BookCheck,
  Download,
} from 'lucide-react';

export default function IssueHistoryPage() {
  const [records, setRecords] = useState<IssueRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [returningId, setReturningId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let filtered = await getIssueRecords();

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate = new Date();
        if (dateFilter === 'today') {
          fromDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
          fromDate.setDate(now.getDate() - 7);
        } else if (dateFilter === '30days') {
          fromDate.setDate(now.getDate() - 30);
        }
        const fromIso = fromDate.toISOString().split('T')[0];
        filtered = filtered.filter((r) => r.issue_date >= fromIso);
      }

      // Apply search filter client-side across joined book & student data
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.book?.title.toLowerCase().includes(q) ||
            r.student?.full_name.toLowerCase().includes(q) ||
            r.student?.admission_number.toLowerCase().includes(q)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter((r) => {
          if (statusFilter === 'returned') return !!r.return_date;
          if (statusFilter === 'active') return !r.return_date && !isOverdue(r.due_date);
          if (statusFilter === 'overdue') return !r.return_date && isOverdue(r.due_date);
          return true;
        });
      }

      setRecords(filtered);
    } catch {
      showToast('Error loading history', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, search, statusFilter, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  const handleReturnBook = async (recordId: string, bookTitle: string) => {
    setReturningId(recordId);
    try {
      await returnBook(recordId);
      showToast(`Returned copy of ${bookTitle} successfully`, 'success');
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error returning book';
      showToast(msg, 'error');
    } finally {
      setReturningId(null);
    }
  };

  // CSV Export utility
  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Book Title',
      'Author',
      'Student Name',
      'Admission Number',
      'Class',
      'Issue Date',
      'Due Date',
      'Return Date',
      'Status',
    ];
    const rows = records.map((r) => {
      let status = 'Active';
      if (r.return_date) status = 'Returned';
      else if (isOverdue(r.due_date)) status = 'Overdue';

      return [
        `"${r.book?.title || ''}"`,
        `"${r.book?.author || ''}"`,
        `"${r.student?.full_name || ''}"`,
        `"${r.student?.admission_number || ''}"`,
        `"${r.student?.class_name || ''}-${r.student?.section || ''}"`,
        r.issue_date,
        r.due_date,
        r.return_date || 'Not returned',
        status,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `library_issues_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported issue history to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Issue History & Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete audit trail of all book loans, active borrows, and return timestamps
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={records.length === 0}
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by book title, student name, or admission #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="overdue">Overdue Only</option>
              <option value="returned">Returned Only</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field text-xs font-medium"
            >
              <option value="all">All Dates</option>
              <option value="today">Issued Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center px-4">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">No issue records found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No transactions match your current filters. Try resetting the filters.'
                : 'No book loans have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((rec) => {
                  const overdue = !rec.return_date && isOverdue(rec.due_date);
                  const returned = !!rec.return_date;

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <Link
                          href={`/books/${rec.book?.id}`}
                          className="hover:text-blue-600 transition-colors block max-w-[220px] truncate"
                        >
                          {rec.book?.title}
                        </Link>
                        <span className="text-[11px] text-gray-500 font-normal">
                          {rec.book?.author}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/students/${rec.student?.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 block"
                        >
                          {rec.student?.full_name}
                        </Link>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {rec.student?.admission_number} • Class {rec.student?.class_name}-
                          {rec.student?.section}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                        {formatDate(rec.issue_date)}
                      </td>

                      <td
                        className={`py-3.5 px-4 font-medium whitespace-nowrap ${
                          overdue ? 'text-rose-600 font-bold' : 'text-gray-600'
                        }`}
                      >
                        {formatDate(rec.due_date)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rec.return_date ? (
                          <span className="text-emerald-700 font-semibold">
                            {formatDate(rec.return_date)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not returned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {returned ? (
                          <span className="badge-returned text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Returned
                          </span>
                        ) : overdue ? (
                          <span className="badge-overdue text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue
                          </span>
                        ) : (
                          <span className="badge-issued text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!returned && (
                          <button
                            type="button"
                            disabled={returningId === rec.id}
                            onClick={() => handleReturnBook(rec.id, rec.book?.title || 'Book')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            {returningId === rec.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <BookCheck className="w-3 h-3" />
                            )}
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
