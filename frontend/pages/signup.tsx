import { FEATURES } from '@/config/features';

// Conditionally export auth pages based on feature flag
export { default } from '@/templates/auth/pages/signup';

// If auth is disabled, this file won't be used, but Next.js requires it
export async function getStaticProps() {
  if (!FEATURES.auth) {
    return {
      notFound: true
    };
  }
  return {
    props: {}
  };
}
