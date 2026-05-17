import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamic SEO meta tag updater.
 * Updates document title, description, OG tags, canonical URLs, and JSON-LD schemas.
 */
export function useSEO(meta: {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  schema?: Record<string, any>;
}) {
  const location = useLocation();

  useEffect(() => {
    const baseTitle = 'RUNFlix';

    // Title
    document.title = meta.title
      ? `${meta.title} — ${baseTitle}`
      : `${baseTitle} — Movies & TV Series Downloads`;

    // Meta description
    let descEl = document.querySelector('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.setAttribute('name', 'description');
      document.head.appendChild(descEl);
    }
    if (meta.description) {
      descEl.setAttribute('content', meta.description);
    }

    // OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title || baseTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && meta.description) ogDesc.setAttribute('content', meta.description);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && meta.image) ogImage.setAttribute('content', meta.image);

    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) ogType.setAttribute('content', meta.type || 'website');

    // Twitter
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', meta.title || baseTitle);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc && meta.description) twDesc.setAttribute('content', meta.description);

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    const currentHref = window.location.href;
    canonicalLink.setAttribute('href', currentHref);

    // JSON-LD Structured Data Schema
    let schemaScript = document.getElementById('seo-json-ld');
    if (schemaScript) {
      schemaScript.remove();
    }

    if (meta.schema) {
      schemaScript = document.createElement('script');
      schemaScript.setAttribute('id', 'seo-json-ld');
      schemaScript.setAttribute('type', 'application/ld+json');
      schemaScript.textContent = JSON.stringify(meta.schema);
      document.head.appendChild(schemaScript);
    }

    // Cleanup — restore defaults on unmount
    return () => {
      document.title = `${baseTitle} — Movies & TV Series Downloads`;
      const script = document.getElementById('seo-json-ld');
      if (script) {
        script.remove();
      }
    };
  }, [meta.title, meta.description, meta.image, meta.type, meta.schema, location.pathname]);
}
