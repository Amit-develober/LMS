'use client';

import Link from 'next/link';
import { formatDate, isOverdue } from '@/shared/utils/date';
import type { DashboardStats } from '@/shared/types';
import {
  BookOpen,
  BookCopy,
  BookCheck,
  BookX,
  Users,
  ScanLine,
  BookPlus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useDashboardStats, useRecentIssues, useRecentReturns, useLowAvailabilityBooks } from '../hooks/use-dashboard';

const statCardsConfig = [
  { label: 'Total Book Titles', key: 'total_book_titles', icon: BookOpen, color: '#5265d7', bg: '#edf0ff' },
  { label: 'Physical Copies', key: 'total_physical_copies', icon: BookCopy, color: '#8b5cf6', bg: '#ede9fe' },
  { label: 'Available Copies', key: 'available_copies', icon: BookCheck, color: '#16a34a', bg: '#dcfce7' },
  { label: 'Issued Copies', key: 'issued_copies', icon: BookX, color: '#ea580c', bg: '#fed7aa' },
  { label: 'Registered Students', key: 'total_students', icon: Users, color: '#0891b2', bg: '#cffafe' },
] as const;

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string }) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { data: stats, error: statsError } = useDashboardStats();
  const { data: recentIssues = [], error: issuesError } = useRecentIssues();
  const { data: recentReturns = [], error: returnsError } = useRecentReturns();
  const { data: lowAvailability = [], error: availabilityError } = useLowAvailabilityBooks();
  const dashboardError = statsError ?? issuesError ?? returnsError ?? availabilityError;

  return (
    <div className="space-y-6 animate-fade-in">
      {dashboardError && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--red-bg)',
            color: 'var(--red)',
            border: '1px solid var(--red-light)',
          }}
        >
          Some dashboard data could not be loaded.{' '}
          {dashboardError instanceof Error ? dashboardError.message : 'Please try again.'}
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Welcome back! Here&apos;s your library overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white
              transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7282e8, #5265d7)',
              boxShadow: '0 3px 10px rgba(82, 101, 215, 0.22)',
            }}
          >
            <ScanLine className="w-4 h-4" />
            Quick Scan
          </Link>
          <Link
            href="/issue"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200 hover:shadow-md active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--green-bg)',
              color: 'var(--green)',
              border: '1px solid var(--green-light)',
            }}
          >
            <BookPlus className="w-4 h-4" />
            Issue Book
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        {statCardsConfig.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={stats?.[card.key as keyof DashboardStats] ?? 0}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
          />
        ))}
      </div>

      {/* Quick Actions & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Issues */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <BookX className="w-5 h-5" style={{ color: 'var(--orange)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Recent Issues
              </h3>
            </div>
            <Link
              href="/history"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentIssues.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent issues</p>
              </div>
            ) : (
              recentIssues.map((record) => (
                <div key={record.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {record.book?.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {record.student?.full_name} • {record.student?.admission_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(record.issue_date)}
                    </p>
                    {isOverdue(record.due_date) && !record.return_date && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md mt-0.5"
                        style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Returns */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <BookCheck className="w-5 h-5" style={{ color: 'var(--green)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Recent Returns
              </h3>
            </div>
            <Link
              href="/history"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentReturns.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <BookCheck className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent returns</p>
              </div>
            ) : (
              recentReturns.map((record) => (
                <div key={record.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {record.book?.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {record.student?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green)' }}
                    >
                      <Clock className="w-3 h-3" />
                      {record.return_date && formatDate(record.return_date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Availability Warning */}
      {lowAvailability.length > 0 && (
        <div
          className="rounded-xl overflow-hidden animate-fade-in"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--orange)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Low Availability Books
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Book</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Available</th>
                  <th className="text-center px-3 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {lowAvailability.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/books/${book.id}`} className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                        {book.title}
                      </Link>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{book.author}</p>
                    </td>
                    <td className="text-center px-3 py-3 font-medium">{book.total_copies}</td>
                    <td className="text-center px-3 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: book.available_copies === 0 ? 'var(--red-bg)' : 'var(--orange-bg)',
                          color: book.available_copies === 0 ? 'var(--red)' : 'var(--orange)',
                        }}
                      >
                        {book.available_copies}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3 font-medium">{book.issued_copies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardContent />
    </div>
  );
}
