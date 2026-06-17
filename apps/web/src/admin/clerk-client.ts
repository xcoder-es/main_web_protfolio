export type ClerkSession = Readonly<{
  getToken(): Promise<string | null>;
}>;

export type ClerkBrowser = Readonly<{
  isSignedIn: boolean;
  session?: ClerkSession | null;
  load(options?: Readonly<Record<string, unknown>>): Promise<void>;
  mountSignIn(node: HTMLDivElement, options?: Readonly<Record<string, unknown>>): void;
  mountUserButton(node: HTMLDivElement, options?: Readonly<Record<string, unknown>>): void;
  signOut(options?: Readonly<{ redirectUrl?: string }>): Promise<void>;
}>;

declare global {
  interface Window {
    Clerk?: ClerkBrowser;
    __internal_ClerkUICtor?: unknown;
  }
}

export async function loadClerkBrowser(publishableKey: string): Promise<ClerkBrowser> {
  const domain = deriveFrontendDomain(publishableKey);
  await loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
  await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
    'data-clerk-publishable-key': publishableKey,
  });

  const clerk = window.Clerk;
  if (!clerk) throw new Error('ClerkJS did not initialize.');
  await clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });
  return clerk;
}

function deriveFrontendDomain(publishableKey: string): string {
  const encoded = publishableKey.split('_')[2];
  if (!encoded) throw new Error('The Clerk publishable key is invalid.');

  let domain: string;
  try {
    domain = atob(encoded).slice(0, -1);
  } catch {
    throw new Error('The Clerk publishable key could not be decoded.');
  }
  if (!/^[a-z0-9.-]+$/i.test(domain) || domain.includes('..')) {
    throw new Error('The Clerk frontend domain is invalid.');
  }
  return domain;
}

function loadScript(src: string, attributes: Readonly<Record<string, string>> = {}): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error('Authentication assets failed to load.')), {
      once: true,
    });
    if (!existing) document.head.append(script);
  });
}
