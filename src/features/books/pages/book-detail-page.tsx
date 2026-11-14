'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getBookById } from '@/features/books/services/books';
import { getIssueRecords } from '@/features/circulation/services/issue-records';
import { useToast } from '@/shared/components/ui/toast';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate, isOverdue } from '@/shared/utils/date';
import type { Book, IssueRecordWithDetails } from '@/shared/types';
import {
  ArrowLeft,
  Edit,
  Download,
  Printer,
  BookPlus,
  BookCheck,
  QrCode,
  Loader2,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { showToast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [issuedCount, setIssuedCount] = useState(0);
  const [activeRecords, setActiveRecords] = useState<IssueRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBook = useCallback(async () => {
    setLoading(true);
    try {
      const bookData = await getBookById(bookId);

      if (!bookData) {
        showToast('Book not found', 'error');
        router.push('/books');
        return;
      }
      setBook(bookData);
      setIssuedCount(bookData.issued_copies || 0);

      const records = await getIssueRecords({ bookId, activeOnly: true });
      setActiveRecords(records);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [bookId, showToast, router]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const downloadQR = () => {
    if (!qrRef.current || !book) return;
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
      link.download = `QR-${book.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading || !book) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const availableCopies = book.total_copies - issuedCount;
  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${book.qr_token}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{book.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            by {book.author} {book.class_grade && `• ${book.class_grade}`}
          </p>
        </div>
        <Link
          href={`/books/${book.id}/edit`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Edit className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Info & Inventory */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{book.total_copies}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>Total Copies</p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: 'var(--green-bg)', border: '1px solid var(--green-light)' }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{availableCopies}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--green)' }}>Available</p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: 'var(--orange-bg)', border: '1px solid var(--orange-light)' }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{issuedCount}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--orange)' }}>Issued</p>
            </div>
          </div>

          {/* Book Details */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Book Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Subject', value: book.subject },
                { label: 'Class/Grade', value: book.class_grade || '—' },
                { label: 'Publisher', value: book.publisher || '—' },
                { label: 'ISBN', value: book.isbn || '—' },
                { label: 'Added On', value: formatDate(book.created_at) },
                { label: 'Status', value: book.is_archived ? 'Archived' : 'Active' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Link
              href={`/issue?book_id=${book.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white
                transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: availableCopies > 0 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#9ca3af',
                pointerEvents: availableCopies > 0 ? 'auto' : 'none',
              }}
            >
              <BookPlus className="w-4 h-4" />
              Issue This Book
            </Link>
            <Link
              href={`/return?book_id=${book.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                pointerEvents: issuedCount > 0 ? 'auto' : 'none',
                opacity: issuedCount > 0 ? 1 : 0.5,
              }}
            >
              <BookCheck className="w-4 h-4" />
              Return Book
            </Link>
          </div>

          {/* Active Borrowing Records */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--orange)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Active Borrowing Records ({activeRecords.length})
              </h3>
            </div>
            {activeRecords.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <BookCheck className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All copies are available</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {activeRecords.map((record) => (
                  <div key={record.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {record.student?.full_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {record.student?.admission_number} • {record.student?.class_name}-{record.student?.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        Issued: {formatDate(record.issue_date)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: isOverdue(record.due_date) ? 'var(--red)' : 'var(--text-muted)' }}>
                        Due: {formatDate(record.due_date)}
                        {isOverdue(record.due_date) && (
                          <span className="ml-1">
                            <AlertTriangle className="w-3 h-3 inline" />
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Side Panel */}
        <div>
          <div
            className="rounded-xl p-5 sticky top-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>QR Code</h3>
            </div>

            <div ref={qrRef} className="qr-printable text-center">
              <div
                className="inline-flex flex-col items-center p-4 rounded-xl w-full"
                style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg)' }}
              >
                <QRCodeSVG
                  value={qrValue}
                  size={180}
                  level="H"
                  includeMargin
                />
                <p className="text-xs font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {book.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Same QR for all copies
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={downloadQR}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                  transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                  transition-all hover:bg-gray-100"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-medium">Token:</span>{' '}
                <code className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg)' }}>
                  {book.qr_token}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
