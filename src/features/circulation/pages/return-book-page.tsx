'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBookById, getBooks } from '@/features/books/services/books';
import { getIssueRecords, returnBook } from '@/features/circulation/services/issue-records';
import { useToast } from '@/shared/components/ui/toast';
import { formatDate, isOverdue } from '@/shared/utils/date';
import { BookWithAvailability, IssueRecordWithDetails } from '@/shared/types';
import {
  BookCheck,
  Search,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

function ReturnBookContent() {
  const searchParams = useSearchParams();
  const initialBookId = searchParams.get('book_id');
  const { showToast } = useToast();

  // Book search & selection
  const [bookSearch, setBookSearch] = useState('');
  const [booksList, setBooksList] = useState<BookWithAvailability[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookWithAvailability | null>(null);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Active records for selected book
  const [activeRecords, setActiveRecords] = useState<IssueRecordWithDetails[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Return action state
  const [selectedRecord, setSelectedRecord] = useState<IssueRecordWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<{
    bookTitle: string;
    studentName: string;
  } | null>(null);

  // Load book from query param
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
        fetchActiveRecords(book.id);
      } else {
        showToast('Selected book could not be found', 'error');
      }
    } catch {
      showToast('Error loading book details', 'error');
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchActiveRecords = async (bookId: string) => {
    setLoadingRecords(true);
    try {
      const records = await getIssueRecords({ bookId, activeOnly: true });
      setActiveRecords(records);
    } catch {
      showToast('Error fetching records', 'error');
    } finally {
      setLoadingRecords(false);
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

  const handleSelectBook = (book: BookWithAvailability) => {
    setSelectedBook(book);
    setBookSearch(book.title);
    setBooksList([]);
    setSelectedRecord(null);
    setReturnSuccess(null);
    fetchActiveRecords(book.id);
  };

  const handleConfirmReturn = async () => {
    if (!selectedRecord || !selectedBook) return;

    setSubmitting(true);
    try {
      await returnBook(selectedRecord.id);

      showToast(
        `Returned copy from ${selectedRecord.student.full_name} successfully`,
        'success'
      );
      setReturnSuccess({
        bookTitle: selectedBook.title,
        studentName: selectedRecord.student.full_name,
      });

      // Update local state
      setActiveRecords((prev) => prev.filter((r) => r.id !== selectedRecord.id));
      setSelectedBook((prev) =>
        prev
          ? {
              ...prev,
              issued_copies: Math.max(0, prev.issued_copies - 1),
              available_copies: Math.min(prev.total_copies, prev.available_copies + 1),
            }
          : null
      );
      setSelectedRecord(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSelection = () => {
    setSelectedBook(null);
    setBookSearch('');
    setActiveRecords([]);
    setSelectedRecord(null);
    setReturnSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Return Book
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select the active borrower to return a book copy and automatically restore inventory
        </p>
      </div>

      {/* Success Banner */}
      {returnSuccess && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                Book Returned Successfully!
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                A physical copy of <span className="font-semibold">{returnSuccess.bookTitle}</span>{' '}
                borrowed by <span className="font-semibold">{returnSuccess.studentName}</span> has
                been checked back into inventory.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetSelection}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  Return Another Book
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 font-medium text-xs border border-emerald-300 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Search Bar */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            Identify Book Title
          </h2>
          <Link
            href="/scan"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Scan QR Code <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by book title or author..."
            value={bookSearch}
            onChange={(e) => {
              setBookSearch(e.target.value);
              if (selectedBook && e.target.value !== selectedBook.title) {
                setSelectedBook(null);
                setActiveRecords([]);
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
                  onClick={() => handleSelectBook(book)}
                  className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{book.title}</p>
                    <p className="text-xs text-gray-500">
                      {book.author} • {book.subject}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      book.issued_copies > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {book.issued_copies} issued
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Book Banner */}
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
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200">
                    Total: {selectedBook.total_copies}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Available: {selectedBook.available_copies}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Currently Issued: {selectedBook.issued_copies}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={resetSelection}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Active Borrowing Records List */}
      {selectedBook && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Active Borrowing Records ({activeRecords.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Because physical copies share the same QR code, select the student who is returning
                their copy:
              </p>
            </div>
          </div>

          {loadingRecords ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : activeRecords.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-gray-700">All copies are in the library</p>
              <p className="text-xs text-gray-500 mt-1">
                There are no currently active issue records for this book.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {activeRecords.map((record) => {
                const overdue = isOverdue(record.due_date);
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <div
                    key={record.id}
                    className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900">
                            {record.student?.full_name}
                          </h4>
                          {overdue && (
                            <span className="badge-overdue text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Adm #{record.student?.admission_number} • Class{' '}
                          {record.student?.class_name} - {record.student?.section}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Issued: {formatDate(record.issue_date)}
                          </span>
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              overdue ? 'text-rose-600' : 'text-gray-600'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {formatDate(record.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select for Return'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal / Drawer when a record is selected */}
      {selectedRecord && selectedBook && (
        <div className="card p-6 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border-2 border-blue-200 shadow-lg animate-scaleIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Confirm Book Return</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Return copy of <span className="font-semibold text-gray-900">{selectedBook.title}</span> from{' '}
                <span className="font-semibold text-gray-900">
                  {selectedRecord.student.full_name}
                </span>{' '}
                (Adm #{selectedRecord.student.admission_number}).
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>
                  New available copies:{' '}
                  <strong className="text-emerald-700">
                    {selectedBook.available_copies + 1}
                  </strong>
                </span>
                <span>
                  Remaining issued:{' '}
                  <strong className="text-amber-700">
                    {Math.max(0, selectedBook.issued_copies - 1)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReturn}
                className="btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Return...
                  </>
                ) : (
                  <>
                    <BookCheck className="w-4 h-4" />
                    Confirm Return
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnBookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ReturnBookContent />
    </Suspense>
  );
}
