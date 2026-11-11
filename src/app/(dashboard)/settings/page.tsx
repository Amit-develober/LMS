'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/components/ui/toast';
import {
  Settings,
  Library,
  User,
  Shield,
  QrCode,
  LogOut,
  CheckCircle2,
  Save,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // School library preferences (stored locally in localStorage or defaults)
  const [schoolName, setSchoolName] = useState('Delhi Public School');
  const [libraryName, setLibraryName] = useState('Central Senior Wing Library');
  const [loanPeriodDays, setLoanPeriodDays] = useState('14');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserId(user.uid);
      }
    });

    // Check localStorage for preferences
    const savedSchool = localStorage.getItem('qr_lib_school_name');
    const savedLibrary = localStorage.getItem('qr_lib_name');
    const savedPeriod = localStorage.getItem('qr_lib_loan_period');

    if (savedSchool) setSchoolName(savedSchool);
    if (savedLibrary) setLibraryName(savedLibrary);
    if (savedPeriod) setLoanPeriodDays(savedPeriod);

    return () => unsubscribe();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    localStorage.setItem('qr_lib_school_name', schoolName);
    localStorage.setItem('qr_lib_name', libraryName);
    localStorage.setItem('qr_lib_loan_period', loanPeriodDays);

    setTimeout(() => {
      setSaving(false);
      showToast('Library preferences saved successfully', 'success');
    }, 400);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      document.cookie = 'firebase_auth_token=; path=/; max-age=0';
      showToast('Logged out successfully', 'info');
      router.push('/login');
    } catch {
      showToast('Logout failed', 'error');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-blue-600" />
          Settings & Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage school library profile, default borrowing parameters, and system details
        </p>
      </div>

      {/* Library Profile Card */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Library className="w-5 h-5 text-blue-600" />
          School & Library Profile
        </h2>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">School Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="input-field"
              placeholder="e.g. St. Xavier's High School"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Library / Branch Name
            </label>
            <input
              type="text"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              className="input-field"
              placeholder="e.g. Senior Wing Library"
              required
            />
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Default Loan Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={loanPeriodDays}
              onChange={(e) => setLoanPeriodDays(e.target.value)}
              className="input-field"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Used when calculating the automatic due date upon issuing a book.
            </p>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* Authenticated Account Card */}
      <div className="card p-6 sm:p-8">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-600" />
          Librarian Account
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500">Email Address</span>
            <span className="font-semibold text-gray-900">{userEmail || 'Active Session'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-500">Account Role</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3" />
              Librarian (Admin)
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-500">User ID</span>
            <span className="font-mono text-xs text-gray-400">{userId || 'Authenticated'}</span>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2 transition-colors border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of System
          </button>
        </div>
      </div>

      {/* Architecture & Business Logic Card */}
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          Architecture & System Principles
        </h2>

        <div className="space-y-3 text-xs text-gray-600">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800">Shared QR Code per Book Title:</strong> All
              physical copies of a given book share one identical QR code. QR code labels never
              change even if total copies increase.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800">Calculated Dynamic Inventory:</strong> Available
              copies = Total Copies - Active Issues. Available count is never stored separately to
              prevent drift.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800">Firestore Records:</strong> Books, students, and
              issue history are stored in Firebase Firestore. Availability is calculated from active
              issue records.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800">Privacy & Security:</strong> QR codes encode only a
              stable unique token without exposing any student PII or private database keys.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
