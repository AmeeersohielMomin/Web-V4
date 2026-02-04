import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Deployment() {
  const router = useRouter();
  const [projectData, setProjectData] = useState<any>(null);
  const [deploymentMethod, setDeploymentMethod] = useState<'download' | 'github'>('download');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('builderProject');
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.backends) {
        router.push('/builder/select-backend');
        return;
      }
      setProjectData(data);
    } else {
      router.push('/builder/new');
    }
  }, []);

  const handleGenerateAndDownload = async () => {
    if (!projectData) return;

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/project/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectName: projectData.projectName,
          modules: projectData.modules,
          templates: projectData.templates,
          backends: projectData.backends
        })
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectData.projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Project generated and downloaded successfully!');
      
      // Clear localStorage and redirect to dashboard
      localStorage.removeItem('builderProject');
      router.push('/dashboard');
    } catch (error) {
      console.error('Generation error:', error);
      alert('❌ Failed to generate project. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!projectData || !githubRepo || !githubToken) {
      alert('Please provide GitHub repository name and personal access token');
      return;
    }

    // Sanitize repo name: remove spaces, special chars, convert to lowercase
    const sanitizedRepo = githubRepo
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-z0-9-_.]/g, '')  // Remove invalid characters
      .replace(/^[^a-z0-9]+/, '')  // Must start with alphanumeric
      .replace(/[^a-z0-9]+$/, '');  // Must end with alphanumeric

    if (!sanitizedRepo) {
      alert('❌ Invalid repository name. Use only letters, numbers, hyphens, and underscores.');
      return;
    }

    if (sanitizedRepo !== githubRepo) {
      const confirm = window.confirm(
        `Repository name will be sanitized to: "${sanitizedRepo}"\n\nContinue?`
      );
      if (!confirm) return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/project/deploy-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectName: projectData.projectName,
          modules: projectData.modules,
          templates: projectData.templates,
          backends: projectData.backends,
          githubRepo: sanitizedRepo,
          githubToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'GitHub deployment failed');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully pushed to GitHub!\n\nRepository: ${result.data.repoUrl}\n\nYou can now clone it:\ngit clone ${result.data.cloneUrl}`);
        
        // Clear localStorage and redirect to dashboard
        localStorage.removeItem('builderProject');
        router.push('/dashboard');
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error: any) {
      console.error('GitHub deployment error:', error);
      const errorMessage = error.message || 'Failed to push to GitHub';
      
      if (errorMessage.includes('Invalid GitHub token')) {
        alert('❌ Invalid GitHub Token\n\nPlease check:\n1. Token is valid and not expired\n2. Token has "repo" scope enabled\n3. No extra spaces in the token\n\nCreate a new token at: https://github.com/settings/tokens');
      } else if (errorMessage.includes('already exists')) {
        alert('❌ Repository Already Exists\n\nPlease choose a different repository name.');
      } else {
        alert(`❌ GitHub Deployment Failed\n\n${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    router.push('/builder/select-backend');
  };

  if (!projectData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Top Navigation */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/builder/select-backend')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-white">{projectData.projectName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Step 5 of 5</span>
            <span className="text-sm font-medium text-green-400">Deploy</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-violet-500 via-emerald-500 to-green-500 rounded-full transition-all duration-700 ease-out" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-6">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to deploy
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Choose how you want to receive your project.<br />Both options include complete source code.
          </p>
        </div>

        {/* Project Summary */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-white">Project Summary</h2>
          
          <div className="space-y-5">
            <div>
              <span className="text-sm font-semibold text-gray-400 block mb-2">Project Name</span>
              <span className="text-white text-lg font-semibold">{projectData.projectName}</span>
            </div>
            
            <div>
              <span className="text-sm font-semibold text-gray-400 block mb-2">Modules</span>
              <div className="flex flex-wrap gap-2">
                {projectData.modules.map((module: string) => (
                  <span key={module} className="bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1.5 rounded-lg text-xs capitalize font-medium">
                    {module}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-sm font-semibold text-gray-400 block mb-2">Templates</span>
              <div className="space-y-1.5">
                {Object.entries(projectData.templates).map(([module, template]: [string, any]) => (
                  <div key={module} className="flex items-center space-x-2 text-sm">
                    <span className="capitalize text-gray-500">{module}:</span>
                    <span className="font-medium text-white">{template}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-sm font-semibold text-gray-400 block mb-2">Backends</span>
              <div className="space-y-1.5">
                {Object.entries(projectData.backends).map(([module, backend]: [string, any]) => (
                  <div key={module} className="flex items-center space-x-2 text-sm">
                    <span className="capitalize text-gray-500">{module}:</span>
                    <span className="font-medium text-white">{backend}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Method Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 text-white">Deployment Method</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Download Option */}
            <button
              onClick={() => setDeploymentMethod('download')}
              className={`relative text-left p-6 rounded-2xl transition-all ${
                deploymentMethod === 'download'
                  ? 'bg-white/[0.07] border-2 border-green-500 shadow-lg shadow-green-500/20'
                  : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
              }`}
            >
              {deploymentMethod === 'download' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="mb-4">
                <div className="text-4xl mb-3">📦</div>
                <h3 className="font-semibold text-lg text-white">Download ZIP</h3>
              </div>
              
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Download your project as a ZIP file and extract it locally
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Instant download</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No setup required</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete source code</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Ready to extract and use</span>
                </div>
              </div>
            </button>

            {/* GitHub Option */}
            <button
              onClick={() => setDeploymentMethod('github')}
              className={`relative text-left p-6 rounded-2xl transition-all ${
                deploymentMethod === 'github'
                  ? 'bg-white/[0.07] border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
              }`}
            >
              {deploymentMethod === 'github' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="mb-4">
                <div className="text-4xl mb-3">🐙</div>
                <h3 className="font-semibold text-lg text-white">Push to GitHub</h3>
              </div>
              
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Automatically create a GitHub repository and push your code
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Auto repository creation</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Version control ready</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Collaboration enabled</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>CI/CD integration ready</span>
                </div>
              </div>
            </button>
          </div>

        </div>

        {/* GitHub Configuration */}
        {deploymentMethod === 'github' && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-bold text-lg mb-6 text-white">GitHub Configuration</h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2.5">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="my-awesome-project"
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use lowercase letters, numbers, hyphens (-), and underscores (_)
                </p>
                {githubRepo && (
                  <p className="text-xs text-blue-400 mt-2 flex items-center space-x-1">
                    <span>→ Will create:</span>
                    <span className="font-mono bg-blue-500/10 px-2 py-0.5 rounded">{githubRepo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_.]/g, '')}</span>
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2.5">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Need a token? <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Create one here</a> (requires 'repo' scope)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBack}
            disabled={isGenerating}
            className="h-12 px-6 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
          
          {deploymentMethod === 'download' ? (
            <button
              onClick={handleGenerateAndDownload}
              disabled={isGenerating}
              className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2 group"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate & Download</span>
                  <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePushToGithub}
              disabled={isGenerating || !githubRepo || !githubToken}
              className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center space-x-2 group"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Pushing to GitHub...</span>
                </>
              ) : (
                <>
                  <span>Generate & Push to GitHub</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
