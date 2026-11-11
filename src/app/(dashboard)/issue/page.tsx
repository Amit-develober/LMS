'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBookById, getBooks, getStudents, issueBook } from '@/lib/firebase/db';
import { useToast } from '@/components/ui/toast';
import { getDefaultDueDate, getTodayDate, formatDate } from '@/lib/utils';
import { BookWithAvailability, Student } from '@/types';
import {
  BookPlus,
  Search,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  UserPlus,
  Sparkles,
} from 'lucide-react';

function IssueBookContent() {
  const searchParams = useSearchParams();
  const initialBookId = searchParams.get('book_id');
  const { showToast } = useToast();

  // Search and selection states
  const [bookSearch, setBookSearch] = useState('');
  const [booksList, setBooksList] = useState<BookWithAvailability[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookWithAvailability | null>(null);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [submitting, setSubmitting] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<{
    bookTitle: string;
    studentName: string;
    dueDate: string;
  } | null>(null);

  // Load initial book if passed via query param
  useEffect(() => {
    if (initialBookId) {
      loadBookById(initialBookId);
    }
  }, [initialBookId]);

  const loadBookById = async (id: string) => {
    setLoadingBooks(true);
    try {
      const book = await getBookById(id);
      if (book) {
        setSelectedBook(book);
        setBookSearch(book.title);
      } else {
        showToast('Selected book could not be found', 'error');
      }
    } catch {
      showToast('Error loading book details', 'error');
    } finally {
      setLoadingBooks(false);
    }
  };

  // Search books debounce
  useEffect(() => {
    if (!bookSearch.trim() || (selectedBook && selectedBook.title === bookSearch)) {
      setBooksList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingBooks(true);
      try {
        const books = await getBooks(bookSearch);
        setBooksList(books.slice(0, 6));
      } catch {
        // silent
      } finally {
        setLoadingBooks(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bookSearch, selectedBook]);

  // Search students debounce
  useEffect(() => {
    if (!studentSearch.trim() || (selectedStudent && selectedStudent.full_name === studentSearch)) {
      setStudentsList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingStudents(true);
      try {
        const students = await getStudents(studentSearch);
        setStudentsList(students.slice(0, 6));
      } catch {
        // silent
      } finally {
        setLoadingStudents(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearch, selectedStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !selectedStudent) {
      showToast('Please select both a book and a student', 'error');
      return;
    }

    if (selectedBook.available_copies <= 0) {
      showToast('No copies available for this book', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await issueBook(selectedBook.id, selectedStudent.id, dueDate);

      showToast(`Book issued successfully to ${selectedStudent.full_name}`, 'success');
      setIssueSuccess({
        bookTitle: selectedBook.title,
        studentName: selectedStudent.full_name,
        dueDate: dueDate,
      });

      // Update local availability
      setSelectedBook((prev) =>
        prev
          ? {
              ...prev,
              issued_copies: prev.issued_copies + 1,
              available_copies: prev.available_copies - 1,
            }
          : null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBook(null);
    setBookSearch('');
    setSelectedStudent(null);
    setStudentSearch('');
    setDueDate(getDefaultDueDate());
    setIssueSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Issue Book
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Lend a book copy to a registered student with atomic inventory tracking
        </p>
      </div>

      {/* Success Banner */}
      {issueSuccess && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                Book Successfully Issued!
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                <span className="font-semibold">{issueSuccess.bookTitle}</span> has been issued to{' '}
                <span className="font-semibold">{issueSuccess.studentName}</span>.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100/80 text-emerald-900 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Return Due Date: {formatDate(issueSuccess.dueDate)}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  Issue Another Book
                </button>
                <Link
                  href="/history"
                  className="px-4 py-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 font-medium text-xs border border-emerald-300 transition-colors"
                >
                  View Issue History
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selection & Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Book Selection */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h2 className="text-base font-semibold text-gray-900">Select Book</h2>
              </div>
              <Link
                href="/scan"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Scan QR instead <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by book title, author, or subject..."
                value={bookSearch}
                onChange={(e) => {
                  setBookSearch(e.target.value);
                  if (selectedBook && e.target.value !== selectedBook.title) {
                    setSelectedBook(null);
                  }
                }}
                className="input-field pl-9"
              />
              {loadingBooks && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-3" />
              )}

              {/* Autocomplete dropdown */}
              {booksList.length > 0 && !selectedBook && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {booksList.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setSelectedBook(book);
                        setBookSearch(book.title);
                        setBooksList([]);
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{book.title}</p>
                        <p className="text-xs text-gray-500">
                          {book.author} • {book.subject}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          book.available_copies > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {book.available_copies > 0
                          ? `${book.available_copies} available`
                          : 'Out of stock'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Book Preview */}
            {selectedBook && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{selectedBook.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      By {selectedBook.author} • {selectedBook.subject}
                      {selectedBook.class_grade && ` • Class ${selectedBook.class_grade}`}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200">
                        Total: {selectedBook.total_copies}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          selectedBook.available_copies > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Available: {selectedBook.available_copies}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Issued: {selectedBook.issued_copies}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null);
                    setBookSearch('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Student Selection */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h2 className="text-base font-semibold text-gray-900">Select Student</h2>
              </div>
              <Link
                href="/students/new"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> Register New Student
              </Link>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or admission number..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (selectedStudent && e.target.value !== selectedStudent.full_name) {
                    setSelectedStudent(null);
                  }
                }}
                className="input-field pl-9"
              />
              {loadingStudents && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-3" />
              )}

              {/* Students dropdown */}
              {studentsList.length > 0 && !selectedStudent && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {studentsList.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student);
                        setStudentSearch(student.full_name);
                        setStudentsList([]);
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{student.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Adm #{student.admission_number} • Class {student.class_name} - Sec{' '}
                          {student.section}
                        </p>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Preview */}
            {selectedStudent && (
              <div className="mt-4 p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{selectedStudent.full_name}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Admission Number:{' '}
                      <span className="font-semibold text-gray-900">
                        {selectedStudent.admission_number}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Class: {selectedStudent.class_name} | Section: {selectedStudent.section}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Due Date */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h2 className="text-base font-semibold text-gray-900">Due Date</h2>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Expected Return Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={getTodayDate()}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Standard loan period is 14 days. You can adjust this date if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Transaction Summary & Action */}
        <div className="space-y-6">
          <div className="card p-6 sticky top-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <BookPlus className="w-5 h-5 text-blue-600" />
              Issue Summary
            </h2>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Book</span>
                <span className="font-semibold text-gray-900 text-right truncate max-w-[180px]">
                  {selectedBook ? selectedBook.title : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Student</span>
                <span className="font-semibold text-gray-900 text-right truncate max-w-[180px]">
                  {selectedStudent ? selectedStudent.full_name : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Issue Date</span>
                <span className="font-semibold text-gray-900">{formatDate(getTodayDate())}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Due Date</span>
                <span className="font-semibold text-blue-600">
                  {dueDate ? formatDate(dueDate) : '—'}
                </span>
              </div>

              {selectedBook && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Stock After Issue:</span>
                    <span className="font-bold text-gray-900">
                      {Math.max(0, selectedBook.available_copies - 1)} copies left
                    </span>
                  </div>
                </div>
              )}
            </div>

            {selectedBook && selectedBook.available_copies <= 0 && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This book has zero available copies. You cannot issue it until a copy is returned.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !selectedBook ||
                !selectedStudent ||
                submitting ||
                (selectedBook && selectedBook.available_copies <= 0)
              }
              className="mt-6 w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Issuing Book...
                </>
              ) : (
                <>
                  <BookPlus className="w-4 h-4" />
                  Confirm & Issue Book
                </>
              )}
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}

export default function IssueBookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <IssueBookContent />
    </Suspense>
  );
}
