import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface TemplateVariant {
  id: string;
  name: string;
  description: string;
  preview: string;
  style: string;
  features: string[];
  gradient: string;
  color: string;
}

interface ModuleTemplates {
  [key: string]: TemplateVariant[];
}

export default function SelectTemplates() {
  const router = useRouter();
  const [projectData, setProjectData] = useState<any>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key: string]: string }>({});
  const [previewModule, setPreviewModule] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.modules || data.modules.length === 0) {
        router.push('/builder/select-modules');
        return;
      }
      setProjectData(data);
      
      // Set default templates
      const defaults: { [key: string]: string } = {};
      data.modules.forEach((module: string) => {
        defaults[module] = availableTemplates[module]?.[0]?.id || '';
      });
      setSelectedTemplates(defaults);
    } else {
      router.push('/builder/new');
    }
  }, []);

  const availableTemplates: ModuleTemplates = {
    auth: [
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean and simple authentication forms with minimal styling',
        preview: '📄',
        style: 'Clean, White, Simple',
        gradient: 'from-gray-100 to-gray-200',
        color: 'gray',
        features: ['Lightweight', 'Fast loading', 'Easy to customize', 'Mobile-first']
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with gradients and smooth animations',
        preview: '🎨',
        style: 'Gradient, Animated, Glassmorphism',
        gradient: 'from-purple-400 via-pink-500 to-red-500',
        color: 'purple',
        features: ['Eye-catching', 'Smooth transitions', 'Modern UI', 'Dark mode ready']
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional professional design with enterprise feel',
        preview: '💼',
        style: 'Professional, Corporate, Structured',
        gradient: 'from-blue-500 to-indigo-600',
        color: 'blue',
        features: ['Enterprise-ready', 'Formal design', 'Accessibility focused', 'Trusted look']
      }
    ],
    blog: [
      {
        id: 'magazine',
        name: 'Magazine',
        description: 'Publication-style layout with featured articles',
        preview: '📰',
        style: 'Grid, Featured, Editorial',
        gradient: 'from-orange-400 to-red-500',
        color: 'orange',
        features: ['Hero posts', 'Category filters', 'Rich media', 'SEO optimized']
      }
    ]
  };

  const handleTemplateSelect = (moduleId: string, templateId: string) => {
    setSelectedTemplates({
      ...selectedTemplates,
      [moduleId]: templateId
    });
  };

  const handleNext = () => {
    if (!projectData) return;
    
    const data = { ...projectData, templates: selectedTemplates };
    localStorage.setItem('builderProject', JSON.stringify(data));
    router.push('/builder/select-backend');
  };

  const handleBack = () => {
    router.push('/builder/select-modules');
  };

  if (!projectData) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />
      
      {/* Top Navigation */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/builder/select-modules')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-white">{projectData?.projectName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Step 3 of 5</span>
            <span className="text-sm font-medium text-purple-400">Choose Design</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Choose your design style
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Select a template for each module. All designs are fully<br />customizable after generation.
          </p>
        </div>

        {/* Template Selection for Each Module */}
        {projectData.modules.map((moduleId: string) => {
          const templates = availableTemplates[moduleId];
          if (!templates || templates.length === 0) return null;

          return (
            <div key={moduleId} className="mb-16 last:mb-0">
              <div className="mb-6 flex items-center justify-center space-x-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <h3 className="text-xl font-bold capitalize text-white px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                  {moduleId}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(moduleId, template.id)}
                    className={`relative text-left p-6 rounded-2xl transition-all ${
                      selectedTemplates[moduleId] === template.id
                        ? 'bg-white/[0.07] border-2 border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {selectedTemplates[moduleId] === template.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Gradient Accent */}
                    <div className={`h-1 rounded-full mb-6 bg-gradient-to-r ${template.gradient}`} />
                    
                    {/* Preview Icon */}
                    <div className="text-5xl text-center mb-5">
                      {template.preview}
                    </div>
                    
                    {/* Template Info */}
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-lg text-white mb-2">{template.name}</h4>
                      <span className="inline-block text-xs px-3 py-1 bg-white/10 text-gray-300 rounded-lg">
                        {template.style}
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-400 text-center mb-5 leading-relaxed">{template.description}</p>
                    
                    {/* Features */}
                    <div className="space-y-2 mb-5">
                      {template.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs text-gray-300">
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Preview Button */}
                    <Link
                      href={`/templates/preview?variant=${template.id}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full block text-center py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all"
                    >
                      View Preview →
                    </Link>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Navigation */}
        <div className="mt-16 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBack}
            className="h-12 px-6 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all flex items-center justify-center space-x-2 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          
          <button
            onClick={handleNext}
            className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 group"
          >
            <span>Continue</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
