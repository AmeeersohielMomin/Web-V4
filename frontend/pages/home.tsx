import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">Redirecting to landing page...</p>
      </div>
    </div>
  );
}
