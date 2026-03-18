import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateVariant {
  id: string;
  name: string;
  description: string;
  style: string;
  features: string[];
}

interface ModuleTemplates {
  [key: string]: TemplateVariant[];
}

const availableTemplates: ModuleTemplates = {
  auth: [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and simple authentication forms with minimal styling',
      style: 'Simple and clean',
      features: ['Lightweight', 'Mobile-first', 'Easy to customize']
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Contemporary layout with richer visual hierarchy',
      style: 'Contemporary UI',
      features: ['Strong visual polish', 'Smooth interactions', 'Premium look']
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional enterprise-friendly design',
      style: 'Professional and structured',
      features: ['Formal layout', 'Accessibility focused', 'Trusted look']
    }
  ],
  blog: [
    {
      id: 'magazine',
      name: 'Magazine',
      description: 'Publication style with featured article flow',
      style: 'Editorial grid',
      features: ['Hero posts', 'Category filters', 'SEO-oriented structure']
    }
  ]
};

export default function SelectTemplates() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [projectData, setProjectData] = useState<any>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (!saved) {
      void router.push('/builder/new');
      return;
    }

    const data = JSON.parse(saved);
    if (!data.modules || data.modules.length === 0) {
      void router.push('/builder/select-modules');
      return;
    }

    setProjectData(data);

    const defaults: { [key: string]: string } = {};
    data.modules.forEach((moduleId: string) => {
      defaults[moduleId] = availableTemplates[moduleId]?.[0]?.id || '';
    });
    setSelectedTemplates(defaults);
  }, [router]);

  const handleTemplateSelect = (moduleId: string, templateId: string) => {
    setSelectedTemplates({
      ...selectedTemplates,
      [moduleId]: templateId
    });
  };

  const handleNext = () => {
    if (!projectData) {
      return;
    }

    const data = { ...projectData, templates: selectedTemplates };
    localStorage.setItem('builderProject', JSON.stringify(data));
    void router.push('/builder/select-backend');
  };

  if (!projectData) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {user && <Navbar user={user} onLogout={logout} />}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <button
            onClick={() => void router.push('/builder/select-modules')}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Step 4 of 5</span>
                <span className="font-semibold text-slate-900">Choose Templates</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-4/5 rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{projectData.projectName}</p>
              <h1 className="mt-4 text-3xl font-bold text-slate-900">Choose design templates</h1>
              <p className="mt-2 text-sm text-slate-600">Pick one template variant for each selected module.</p>
            </div>

            {projectData.modules.map((moduleId: string) => {
              const templates = availableTemplates[moduleId];
              if (!templates || templates.length === 0) {
                return null;
              }

              return (
                <div key={moduleId} className="mb-8 last:mb-0">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{moduleId}</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    {templates.map((template) => {
                      const selected = selectedTemplates[moduleId] === template.id;

                      return (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(moduleId, template.id)}
                          className={`rounded-xl border p-4 text-left transition ${
                            selected
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                          <p className="mt-1 text-xs text-slate-600">{template.style}</p>
                          <p className="mt-2 text-sm text-slate-600">{template.description}</p>
                          <ul className="mt-3 space-y-1 text-xs text-slate-600">
                            {template.features.map((feature) => (
                              <li key={feature}>{feature}</li>
                            ))}
                          </ul>
                          <Link
                            href={`/templates/preview?variant=${template.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 inline-block text-xs font-medium text-sky-700 hover:text-sky-800"
                          >
                            Open preview
                          </Link>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleNext}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue
              </button>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
