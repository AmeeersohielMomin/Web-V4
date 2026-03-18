import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

type PaidPlanId = 'starter' | 'pro';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    limit: '3 apps',
    description: 'Great for exploring IDEA.'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$19/mo',
    limit: '50 apps/mo',
    description: 'For individual builders shipping weekly.'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49/mo',
    limit: 'Unlimited',
    description: 'For teams and high-volume generation.'
  }
] as const;

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState('');

  const handleCheckout = async (planId: PaidPlanId) => {
    setError('');
    setLoadingPlan(planId);
    try {
      const response = await api.post('/api/platform/billing/checkout', { planId });
      const checkoutUrl = response.data?.data?.url;
      if (!checkoutUrl) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to start checkout');
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing - IDEA</title>
      </Head>
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900">Pricing</h1>
            <p className="mt-2 text-slate-600">Choose a plan that matches your build velocity.</p>
            {isAuthenticated && user && (
              <p className="mt-2 text-sm text-slate-500">
                Current plan: <span className="font-semibold capitalize">{user.plan || 'free'}</span>
              </p>
            )}
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = user?.plan === plan.id;
              return (
                <article
                  key={plan.id}
                  className={`rounded-2xl border p-6 shadow-sm ${
                    plan.id === 'starter'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                  <p
                    className={`mt-2 text-sm ${
                      plan.id === 'starter' ? 'text-slate-200' : 'text-slate-600'
                    }`}
                  >
                    {plan.limit}
                  </p>
                  <p
                    className={`mt-4 text-sm ${
                      plan.id === 'starter' ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    {plan.id === 'free' ? (
                      <Link
                        href={isAuthenticated ? '/dashboard' : '/signup'}
                        className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {isAuthenticated ? 'Go to dashboard' : 'Get started'}
                      </Link>
                    ) : !isAuthenticated ? (
                      <Link
                        href="/signup"
                        className={`inline-block rounded-lg px-4 py-2 text-sm font-semibold ${
                          plan.id === 'starter'
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        Start free trial
                      </Link>
                    ) : isCurrentPlan ? (
                      <span className="inline-block rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700">
                        Current plan
                      </span>
                    ) : (
                      <button
                        onClick={() => void handleCheckout(plan.id as PaidPlanId)}
                        disabled={loadingPlan === plan.id}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                          plan.id === 'starter'
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {loadingPlan === plan.id ? 'Redirecting...' : 'Start free trial'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
