import Head from 'next/head';
import Link from 'next/link';

const processSteps = [
  {
    title: 'Describe your app',
    description: 'Tell IDEA what you want with a single prompt.',
    visual: 'Input'
  },
  {
    title: 'AI generates the code',
    description: 'Backend, frontend, auth, and data layer generated together.',
    visual: 'Code'
  },
  {
    title: 'Preview and download',
    description: 'Run the live preview, then export production-ready files.',
    visual: 'Preview'
  }
];

const featureCards = [
  {
    title: 'Design DNA',
    description:
      'Every app is visually unique — 10 professional palettes, 7 layout styles.'
  },
  {
    title: 'Live Preview',
    description: 'See your app render in real-time as code is generated.'
  },
  {
    title: 'Multi-Provider AI',
    description:
      'Use Gemini (free), OpenAI, Anthropic, or run locally with Ollama.'
  }
];

const plans = [
  {
    name: 'Free',
    price: '$0/mo',
    limit: '3 apps',
    cta: 'Get started',
    href: '/signup'
  },
  {
    name: 'Starter',
    price: '$19/mo',
    limit: '50 apps/mo',
    cta: 'Start free trial',
    href: '/signup'
  },
  {
    name: 'Pro',
    price: '$49/mo',
    limit: 'Unlimited',
    cta: 'Start free trial',
    href: '/signup'
  }
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>IDEA — AI Full-Stack App Builder</title>
        <meta
          name="description"
          content="Generate complete full-stack applications with AI. Frontend, backend, database, auth — all generated in seconds. Live preview included."
        />
        <meta property="og:title" content="IDEA — AI Full-Stack App Builder" />
        <meta
          property="og:description"
          content="Describe your idea. Get complete code."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="landing-root min-h-screen bg-[#f6f4ef] text-slate-900">
        <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
          <div className="absolute -top-20 left-0 h-80 w-80 rounded-full bg-[#ffd87a] blur-3xl" />
          <div className="absolute right-0 top-52 h-96 w-96 rounded-full bg-[#b8f2e6] blur-3xl" />
        </div>

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="font-mono text-sm tracking-wide text-slate-800">IDEA PLATFORM</div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-950">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-xs uppercase tracking-wide text-slate-600">
              AI App Builder
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Build a full-stack app in seconds
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-700 sm:text-lg">
              Describe your idea. AI generates the complete code — frontend, backend,
              database, auth. Live preview included.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start building free →
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border-2 border-slate-900/10 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-slate-100">
                <p className="font-mono text-xs text-emerald-300">Generating app structure...</p>
                <div className="space-y-2 text-xs">
                  <p className="animate-fade-up">+ backend/src/modules/auth/auth.routes.ts</p>
                  <p className="animate-fade-up [animation-delay:150ms]">
                    + frontend/pages/dashboard.tsx
                  </p>
                  <p className="animate-fade-up [animation-delay:300ms]">
                    + backend/src/modules/project/project.service.ts
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3 text-slate-900">
                  <p className="text-xs font-semibold">Live Preview</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="h-12 rounded-md bg-[#ffe7a8]" />
                    <div className="h-12 rounded-md bg-[#bfe7ff]" />
                    <div className="col-span-2 h-8 rounded-md bg-[#d6ffce]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">Build in 3 steps</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Step {index + 1}
                </p>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                <div className="mt-4 rounded-xl bg-slate-100 px-3 py-6 text-center font-mono text-xs text-slate-700">
                  {step.visual} illustration
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">Feature highlights</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-3xl font-bold">Template showcase</h2>
            <Link href="/templates/preview" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
              Browse all templates →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {['Minimal', 'Modern', 'Classic'].map((variant, index) => (
              <article key={variant} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 h-4 w-24 rounded bg-slate-300" />
                  <div className="space-y-2">
                    <div className="h-8 rounded bg-white" />
                    <div className="h-8 rounded bg-white" />
                    <div
                      className="h-16 rounded"
                      style={{
                        background:
                          index === 0
                            ? '#d4f2d2'
                            : index === 1
                              ? '#d0e8ff'
                              : '#ffe0cc'
                      }}
                    />
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{variant}</h3>
                <p className="text-sm text-slate-600">Screenshot preview of the {variant.toLowerCase()} variant.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-6 shadow-sm ${
                  plan.name === 'Starter'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                <p
                  className={`mt-2 text-sm ${
                    plan.name === 'Starter' ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {plan.limit}
                </p>
                <Link
                  href={plan.href}
                  className={`mt-6 inline-block rounded-lg px-4 py-2 text-sm font-semibold ${
                    plan.name === 'Starter'
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-3xl font-bold">Ready to build your app?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Launch your first generated project in minutes.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start building free →
            </Link>
          </div>
        </section>
      </main>

      <style jsx global>{`
        .landing-root {
          font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        }

        .landing-root .font-mono {
          font-family: 'IBM Plex Mono', 'Consolas', monospace;
        }

        @keyframes fadeUp {
          0% {
            transform: translateY(8px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fade-up {
          animation: fadeUp 800ms ease forwards;
        }
      `}</style>
    </>
  );
}
