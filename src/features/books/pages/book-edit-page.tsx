'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getBookById, updateBook } from '@/features/books/services/books';
import { bookSchema, type BookFormInput } from '@/shared/validation/schemas';
import { useToast } from '@/shared/components/ui/toast';
import type { Book } from '@/shared/types';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [issuedCount, setIssuedCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookFormInput>({
    resolver: zodResolver(bookSchema),
  });

  const fetchBook = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookById(bookId);
      if (!data) {
        showToast('Book not found', 'error');
        router.push('/books');
        return;
      }
      setBook(data);
      reset({
        title: data.title,
        author: data.author,
        subject: data.subject,
        class_grade: data.class_grade || '',
        publisher: data.publisher || '',
        isbn: data.isbn || '',
        total_copies: data.total_copies,
      });

      setIssuedCount(data.issued_copies || 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [bookId, showToast, router, reset]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const onSubmit = async (data: BookFormInput) => {
    // Validation: cannot reduce copies below issued count
    if (data.total_copies < issuedCount) {
      showToast(
        `Cannot reduce copies below ${issuedCount} (currently issued)`,
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      await updateBook(bookId, {
        title: data.title.trim(),
        author: data.author.trim(),
        subject: data.subject.trim(),
        class_grade: data.class_grade?.trim() || null,
        publisher: data.publisher?.trim() || null,
        isbn: data.isbn?.trim() || null,
        total_copies: data.total_copies,
      });

      showToast('Book updated successfully!', 'success');
      router.push(`/books/${bookId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update book';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Book</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Editing &ldquo;{book?.title}&rdquo;
          </p>
        </div>
      </div>

      {issuedCount > 0 && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--orange-bg)', border: '1px solid var(--orange-light)', color: 'var(--orange)' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">This book has {issuedCount} active borrowing record(s)</p>
            <p className="text-xs mt-0.5 opacity-80">
              Total copies cannot be reduced below {issuedCount}. The QR code will remain unchanged.
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Book Title *</label>
            <input {...register('title')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Author *</label>
            <input {...register('author')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
            {errors.author && <p className="mt-1 text-xs text-red-500">{errors.author.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Subject *</label>
              <input {...register('subject')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
              {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Class / Grade</label>
              <input {...register('class_grade')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Publisher</label>
              <input {...register('publisher')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>ISBN</label>
              <input {...register('isbn')} className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Total Copies * {issuedCount > 0 && <span className="text-xs font-normal" style={{ color: 'var(--orange)' }}>(min: {issuedCount})</span>}
            </label>
            <input
              {...register('total_copies', { valueAsNumber: true })}
              type="number"
              min={issuedCount || 1}
              className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.total_copies && <p className="mt-1 text-xs text-red-500">{errors.total_copies.message}</p>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
