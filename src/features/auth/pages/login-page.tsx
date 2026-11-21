'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/shared/firebase/client';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { loginSchema, type LoginFormData } from '@/shared/validation/schemas';
import { Library, Eye, EyeOff, Loader2, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<'email' | 'google' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoadingAction('email');
    setError('');

    try {
      await setPersistence(auth, browserLocalPersistence);
      if (isCreatingAccount) {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? err.code
        : undefined;
      if (code === 'auth/email-already-in-use' || code === 'auth/account-exists-with-different-credential') {
        setError('An account with this email already exists. Sign in instead.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        setError('Email or password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const signInWithGoogle = async () => {
    setLoadingAction('google');
    setError('');

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? err.code
        : undefined;
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #f8f9fd 0%, #eff2fc 55%, #f6f7fb 100%)',
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #dce2ff, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, #e1f3ed, transparent)' }}
        />
      </div>

      <div className="w-full max-w-md animate-scale-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #7282e8, #5265d7)',
              boxShadow: '0 8px 28px rgba(82, 101, 215, 0.22)',
            }}
          >
            <Library className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>QR Library System</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to manage your school library
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loadingAction !== null}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all
              disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md flex
              items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {loadingAction === 'google' && <Loader2 className="w-4 h-4 animate-spin" />}
            {loadingAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or with email</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in"
                style={{
                  backgroundColor: 'var(--red-bg)',
                  color: 'var(--red)',
                  border: '1px solid var(--red-light)',
                }}
              >
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="librarian@school.edu"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-2xl text-sm placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                style={{
                  backgroundColor: '#fbfcff',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isCreatingAccount ? 'Create a password' : 'Enter your password'}
                  autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm placeholder-slate-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  style={{
                    backgroundColor: '#fbfcff',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loadingAction !== null}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white
                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7282e8, #5265d7)',
                boxShadow: '0 5px 16px rgba(82, 101, 215, 0.25)',
              }}
            >
              {loadingAction === 'email' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isCreatingAccount ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isCreatingAccount ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isCreatingAccount ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => {
                setIsCreatingAccount(!isCreatingAccount);
                setError('');
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isCreatingAccount ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <BookOpen className="w-3.5 h-3.5" />
            <span>School Library Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
