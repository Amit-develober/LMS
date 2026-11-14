'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getBookByQrToken } from '@/features/books/services/books';
import { getIssueRecords } from '@/features/circulation/services/issue-records';
import { formatDate, isOverdue } from '@/shared/utils/date';
import type { Book, IssueRecordWithDetails } from '@/shared/types';
import {
  Camera,
  Keyboard,
  ArrowLeft,
  BookOpen,
  BookPlus,
  BookCheck,
  Loader2,
  AlertCircle,
  Search,
  X,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const params = useParams();
  const rawToken = params?.token;
  const tokenFromUrl = Array.isArray(rawToken) ? rawToken[0] : (rawToken as string | undefined);

  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [issuedCount, setIssuedCount] = useState(0);
  const [activeRecords, setActiveRecords] = useState<IssueRecordWithDetails[]>([]);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraSecureContext, setCameraSecureContext] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);

  const lookupBook = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    setBook(null);

    try {
      const bookData = await getBookByQrToken(token);
      if (!bookData) {
        setError('Invalid QR code. No book found with this token.');
        return;
      }

      setBook(bookData);
      setIssuedCount(bookData.issued_copies || 0);

      const records = await getIssueRecords({ bookId: bookData.id, activeOnly: true });
      setActiveRecords(records);
    } catch {
      setError('An error occurred while looking up the book.');
    } finally {
      setLoading(false);
    }
  }, []);

  // If token is in URL, auto-lookup
  useEffect(() => {
    if (tokenFromUrl) {
      lookupBook(tokenFromUrl);
    }
  }, [tokenFromUrl, lookupBook]);

  const startScanner = async () => {
    setCameraError('');
    const isSecureContext = window.isSecureContext;
    setCameraSecureContext(isSecureContext);
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setScanning(false);
      setCameraError(
        'Camera access requires a secure HTTPS connection. Open this site using its HTTPS address; changing camera permissions will not enable the camera on an HTTP address.'
      );
      return;
    }

    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // Extract token from URL or use as-is
          let token = decodedText;
          try {
            const url = new URL(decodedText);
            const parts = url.pathname.split('/');
            token = parts[parts.length - 1];
          } catch {
            // Not a URL, use as token directly
          }

          scanner.stop().catch(console.error);
          setScanning(false);
          setMode('manual');
          lookupBook(token);
        },
        () => {}
      );
    } catch (err: unknown) {
      setScanning(false);
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission is blocked. Allow camera access for this site in your browser settings, then tap Try Again.'
        );
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraError('No camera was found on this device.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraError('The camera is being used by another app. Close that app and try again.');
      } else {
        setCameraError(err instanceof Error ? err.message : 'Camera could not be started.');
      }
      setMode('camera');
    }
  };

  const stopScanner = async () => {
    try {
      const scanner = html5QrCodeRef.current as { stop: () => Promise<void> } | null;
      if (scanner) await scanner.stop();
    } catch { /* ignore */ }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualLookup = () => {
    const token = manualToken.trim();
    if (!token) {
      setError('Please enter a QR token');
      return;
    }
    lookupBook(token);
  };

  const availableCopies = book ? book.total_copies - issuedCount : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Scan QR Code</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Scan a book QR code or enter the token manually
          </p>
        </div>
      </div>

      {/* Scan Mode Toggle */}
      {!book && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setMode('camera'); startScanner(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                ${mode === 'camera' ? 'text-white' : ''}`}
              style={{
                background: mode === 'camera' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--bg)',
                color: mode === 'camera' ? 'white' : 'var(--text-secondary)',
                border: mode === 'camera' ? 'none' : '1px solid var(--border)',
              }}
            >
              <Camera className="w-4 h-4" />
              Camera Scan
            </button>
            <button
              onClick={() => { stopScanner(); setMode('manual'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all`}
              style={{
                background: mode === 'manual' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--bg)',
                color: mode === 'manual' ? 'white' : 'var(--text-secondary)',
                border: mode === 'manual' ? 'none' : '1px solid var(--border)',
              }}
            >
              <Keyboard className="w-4 h-4" />
              Manual Entry
            </button>
          </div>

          <div className={mode === 'camera' ? 'text-center' : 'hidden'}>
            <div id="qr-reader" ref={scannerRef} className="mx-auto max-w-sm rounded-xl overflow-hidden" />
            {scanning && (
              <p className="text-sm mt-3 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Point your camera at a QR code...
              </p>
            )}
            {cameraError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border p-4 text-left"
                style={{ backgroundColor: 'var(--red-bg)', borderColor: 'var(--red-light)', color: 'var(--red)' }}
              >
                <p className="text-sm font-medium">{cameraError}</p>
                {cameraSecureContext && (
                  <p className="mt-2 text-xs">
                    On Android, open the site controls beside the address bar, choose Permissions, and allow Camera.
                    On iPhone, tap aA in the address bar, choose Website Settings, and allow Camera. Then return here.
                  </p>
                )}
                {cameraSecureContext && (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>

          {mode === 'manual' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                QR Token / Book Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Enter QR token (UUID)..."
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
                />
                <button
                  onClick={handleManualLookup}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Look Up
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--red-bg)', border: '1px solid var(--red-light)', color: 'var(--red)' }}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{error}</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Make sure you are scanning a valid QR code from this library system.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Book Result */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}

      {book && !loading && (
        <div className="space-y-4 animate-scale-in">
          {/* Book found header */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                    Book Found
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{book.title}</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  by {book.author} {book.class_grade && `• ${book.class_grade}`}
                </p>
              </div>
              <button
                onClick={() => { setBook(null); setManualToken(''); setError(''); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Inventory */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{book.total_copies}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--green-bg)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>{availableCopies}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--green)' }}>Available</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--orange-bg)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>{issuedCount}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--orange)' }}>Issued</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/issue?book_id=${book.id}`)}
                disabled={availableCopies <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                <BookPlus className="w-4 h-4" />
                Issue Book
              </button>
              <button
                onClick={() => router.push(`/return?book_id=${book.id}`)}
                disabled={issuedCount === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <BookCheck className="w-4 h-4" />
                Return Book
              </button>
            </div>
          </div>

          {/* Active Borrowing Records */}
          {activeRecords.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <User className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                <h3 className="font-semibold text-sm">Active Borrowing Records ({activeRecords.length})</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {activeRecords.map((record) => (
                  <div key={record.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {record.student?.full_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {record.student?.admission_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(record.issue_date)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: isOverdue(record.due_date) ? 'var(--red)' : 'var(--text-muted)' }}>
                        Due: {formatDate(record.due_date)}
                        {isOverdue(record.due_date) && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
