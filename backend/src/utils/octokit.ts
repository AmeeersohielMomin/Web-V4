type OctokitModule = {
  Octokit: new (options: { auth: string }) => any;
};

// Keep a real runtime import so CommonJS builds can load ESM-only packages.
const importEsm = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<OctokitModule>;

let octokitCtorPromise: Promise<OctokitModule['Octokit']> | null = null;

export async function getOctokit() {
  if (!octokitCtorPromise) {
    octokitCtorPromise = importEsm('@octokit/rest').then((mod) => mod.Octokit);
  }

  return octokitCtorPromise;
}
