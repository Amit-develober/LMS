'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/lib/firebase/client';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Library, Eye, EyeOff, Loader2, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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
    setLoading(true);
    setError('');

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      }

      document.cookie = 'firebase_auth_token=true; path=/; max-age=86400; SameSite=Lax';
      router.replace('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? err.code
        : undefined;
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Sign in instead.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        setError('Email or password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
      </div>

      <div className="w-full max-w-md animate-scale-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Library className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">QR Library System</h1>
          <p className="text-slate-400 text-sm">
            {isSignUp ? 'Create an account to manage your school library' : 'Sign in to manage your school library'}
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="librarian@school.edu"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
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
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white
                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            {isSignUp ? 'Already have an account?' : 'New librarian?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            <span>School Library Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
