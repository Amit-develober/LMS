'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addBook } from '@/lib/firebase/db';
import { bookSchema, type BookFormInput } from '@/lib/validations';
import { useToast } from '@/components/ui/toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  BookPlus,
  Loader2,
  Download,
  Printer,
  QrCode,
  CheckCircle,
} from 'lucide-react';

export default function NewBookPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdBook, setCreatedBook] = useState<{
    id: string;
    title: string;
    qr_token: string;
  } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookFormInput>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      total_copies: 1,
    },
  });

  const onSubmit = async (data: BookFormInput) => {
    setLoading(true);
    try {
      const qr_token = crypto.randomUUID();
      const bookData = {
        title: data.title.trim(),
        author: data.author.trim(),
        subject: data.subject.trim(),
        class_grade: data.class_grade?.trim() || null,
        publisher: data.publisher?.trim() || null,
        isbn: data.isbn?.trim() || null,
        total_copies: data.total_copies,
        qr_token,
        is_archived: false,
      };

      const id = await addBook(bookData);

      setCreatedBook({
        id,
        title: data.title.trim(),
        qr_token,
      });
      showToast('Book registered successfully!', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register book';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrRef.current || !createdBook) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `QR-${createdBook.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    window.print();
  };

  const qrValue = createdBook
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${createdBook.qr_token}`
    : '';

  // Show success state with QR code
  if (createdBook) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-scale-in">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--green-bg)' }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Book Registered!
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            QR code generated for &ldquo;{createdBook.title}&rdquo;
          </p>

          {/* QR Code */}
          <div ref={qrRef} className="qr-printable inline-block">
            <div
              className="inline-flex flex-col items-center p-6 rounded-xl"
              style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg)' }}
            >
              <QRCodeSVG
                value={qrValue}
                size={200}
                level="H"
                includeMargin
                style={{ borderRadius: '8px' }}
              />
              <p className="text-sm font-semibold mt-3" style={{ color: 'var(--text-primary)' }}>
                {createdBook.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Same QR for all copies
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={downloadQR}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 hover:shadow-md"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
              }}
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              onClick={printQR}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => {
                setCreatedBook(null);
              }}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Add Another Book
            </button>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <button
              onClick={() => router.push('/books')}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              View All Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Register New Book
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Add a new book title to the library
          </p>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="e.g. Physics"
              className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Author <span className="text-red-500">*</span>
            </label>
            <input
              {...register('author')}
              placeholder="e.g. NCERT"
              className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.author && <p className="mt-1 text-xs text-red-500">{errors.author.message}</p>}
          </div>

          {/* Subject & Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Subject / Category <span className="text-red-500">*</span>
              </label>
              <input
                {...register('subject')}
                placeholder="e.g. Science"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
              />
              {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Class / Grade
              </label>
              <input
                {...register('class_grade')}
                placeholder="e.g. Class XI"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
          </div>

          {/* Publisher & ISBN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Publisher
              </label>
              <input
                {...register('publisher')}
                placeholder="e.g. NCERT Publications"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                ISBN
              </label>
              <input
                {...register('isbn')}
                placeholder="e.g. 978-0-13-468599-1"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
          </div>

          {/* Total Copies */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Total Number of Physical Copies <span className="text-red-500">*</span>
            </label>
            <input
              {...register('total_copies', { valueAsNumber: true })}
              type="number"
              min={1}
              placeholder="e.g. 10"
              className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.total_copies && <p className="mt-1 text-xs text-red-500">{errors.total_copies.message}</p>}
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <QrCode className="w-3 h-3 inline mr-1" />
              One QR code will be generated for all copies of this book
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white
                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <BookPlus className="w-4 h-4" />
                  Register Book
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-gray-100"
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
