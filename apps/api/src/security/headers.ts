export function createHelmetOptions(environment: 'development' | 'test' | 'production') {
  return {
    global: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' as const },
    crossOriginResourcePolicy: { policy: 'same-site' as const },
    referrerPolicy: { policy: 'no-referrer' as const },
    strictTransportSecurity:
      environment === 'production'
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
        : false,
  };
}

export const apiResponseHeaders = {
  'cache-control': 'no-store, max-age=0',
  pragma: 'no-cache',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
} as const;
