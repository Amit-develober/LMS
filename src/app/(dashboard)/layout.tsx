'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/shared/components/layout/sidebar';
import { ToastProvider } from '@/shared/components/ui/toast';
import { auth } from '@/shared/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);
      if (!user) {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!authChecked || !auth.currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Sidebar>{children}</Sidebar>
    </ToastProvider>
  );
}
