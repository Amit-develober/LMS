'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getBooks, updateBook } from '@/features/books/services/books';
import { useToast } from '@/shared/components/ui/toast';
import type { BookWithAvailability } from '@/shared/types';
import {
  Plus,
  Search,
  BookOpen,
  Eye,
  Edit,
  Archive,
  Loader2,
} from 'lucide-react';

export default function BooksPage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<BookWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBooks(search, subjectFilter, showArchived);
      setBooks(data);

      const unique = Array.from(new Set(data.map((b) => b.subject))).sort();
      setSubjects(unique);
    } catch (error) {
      console.error('Error fetching books:', error);
      showToast('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, showArchived, showToast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleArchive = async (bookId: string, archive: boolean) => {
    try {
      await updateBook(bookId, { is_archived: archive });
      showToast(archive ? 'Book archived' : 'Book restored', 'success');
      fetchBooks();
    } catch {
      showToast('Failed to update book', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Books
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage your library book collection
          </p>
        </div>
        <Link
          href="/books/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white
            transition-all duration-200 hover:shadow-lg active:scale-[0.98] w-fit"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          <Plus className="w-4 h-4" />
          Add New Book
        </Link>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4 flex flex-col sm:flex-row gap-3"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${showArchived ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}`}
            style={!showArchived ? { border: '1px solid var(--border)', color: 'var(--text-secondary)' } : { border: '1px solid' }}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>
      </div>

      {/* Books Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No books found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {search || subjectFilter ? 'Try adjusting your filters' : 'Add your first book to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Book</th>
                  <th className="text-left px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Available</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Issued</th>
                  <th className="text-right px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{book.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {book.author} {book.class_grade && `• ${book.class_grade}`}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
                      >
                        {book.subject}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3.5 font-semibold">{book.total_copies}</td>
                    <td className="text-center px-3 py-3.5">
                      <span
                        className="inline-flex min-w-[28px] justify-center px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: book.available_copies > 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                          color: book.available_copies > 0 ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {book.available_copies}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3.5">
                      <span
                        className="inline-flex min-w-[28px] justify-center px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: book.issued_copies > 0 ? 'var(--orange-bg)' : 'var(--bg)',
                          color: book.issued_copies > 0 ? 'var(--orange)' : 'var(--text-muted)',
                        }}
                      >
                        {book.issued_copies}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/books/${book.id}`}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </Link>
                        <Link
                          href={`/books/${book.id}/edit`}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </Link>
                        <button
                          onClick={() => handleArchive(book.id, !book.is_archived)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title={book.is_archived ? 'Restore' : 'Archive'}
                        >
                          <Archive className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
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
