import Head from 'next/head';

interface SEOHeadProps {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
}

export default function SEOHead({
  title,
  description = 'IDEA Platform - AI-powered full-stack application builder. Generate complete working codebases from natural language descriptions.',
  url = 'https://idea-platform.dev',
  image = '/og-image.png',
  type = 'website'
}: SEOHeadProps) {
  const fullTitle = title ? `${title} - IDEA Platform` : 'IDEA Platform - AI App Builder';

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'IDEA Platform',
            description,
            url,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any',
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '0',
              highPrice: '49',
              priceCurrency: 'USD'
            }
          })
        }}
      />
    </Head>
  );
}
