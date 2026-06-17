import { contactSubmissionSchema, projectRequestSubmissionSchema } from '@carlos-pinto/contracts';

const copy = {
  en: {
    connecting: 'Connecting securely…',
    sending: 'Sending your request…',
    success: 'Thank you. Your request was received.',
    duplicate: 'This request was already received safely.',
    validation: 'Review the highlighted fields and try again.',
    offline: 'You appear to be offline. Reconnect and try again.',
    unavailable: 'The service is waking up or temporarily unavailable. Try again shortly.',
    generic: 'The request could not be sent. Try again.',
  },
  es: {
    connecting: 'Conectando de forma segura…',
    sending: 'Enviando tu solicitud…',
    success: 'Gracias. Tu solicitud fue recibida.',
    duplicate: 'Esta solicitud ya fue recibida de forma segura.',
    validation: 'Revisa los campos señalados e inténtalo de nuevo.',
    offline: 'Parece que no tienes conexión. Reconéctate e inténtalo de nuevo.',
    unavailable:
      'El servicio está iniciando o no está disponible temporalmente. Inténtalo de nuevo en breve.',
    generic: 'No fue posible enviar la solicitud. Inténtalo de nuevo.',
  },
} as const;

type Locale = keyof typeof copy;
type FormKind = 'contact' | 'project';
type ApiErrorPayload = Readonly<{
  code?: string;
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;

declare global {
  interface Window {
    turnstile?: { reset: (target?: string | HTMLElement) => void };
  }
}

for (const candidate of document.querySelectorAll<HTMLFormElement>('form[data-lead-form]')) {
  initialise(candidate);
}

function initialise(form: HTMLFormElement): void {
  const locale = form.dataset.locale === 'es' ? 'es' : 'en';
  const kind: FormKind = form.dataset.formKind === 'project' ? 'project' : 'contact';
  const apiBase = (form.dataset.apiBase || 'http://localhost:3000').replace(/\/$/, '');
  const endpoint = kind === 'project' ? '/api/public/project-requests' : '/api/public/contact';
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const success = form.parentElement?.querySelector<HTMLElement>('[data-form-success]');
  let startedAt = new Date().toISOString();
  let idempotencyKey = createIdempotencyKey();
  let wakeRequested = false;

  const wake = (): void => {
    if (wakeRequested) return;
    wakeRequested = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void fetch(`${apiBase}/api/public/status`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));
  };

  form.addEventListener('focusin', wake, { once: true });
  form.addEventListener('pointerenter', wake, { once: true });
  form.addEventListener('touchstart', wake, { once: true, passive: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    if (!navigator.onLine) {
      setStatus(status, copy[locale].offline, 'error');
      return;
    }

    const payload = createPayload(form, kind, locale, startedAt, idempotencyKey);
    const parsed =
      kind === 'project'
        ? projectRequestSubmissionSchema.safeParse(payload)
        : contactSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'request');
        if (field !== 'metadata' && field !== 'antiSpam') setFieldError(form, field, issue.message);
      }
      setStatus(status, copy[locale].validation, 'error');
      focusFirstInvalid(form);
      return;
    }

    setBusy(submit, true);
    setStatus(status, copy[locale].connecting, 'progress');
    try {
      setStatus(status, copy[locale].sending, 'progress');
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result = await readPayload(response);
      if (!response.ok) {
        applyServerErrors(form, result);
        if (result.code === 'SPAM_VERIFICATION_FAILED') resetTurnstile(form);
        const message =
          response.status === 503
            ? copy[locale].unavailable
            : response.status === 429
              ? result.message || copy[locale].unavailable
              : result.message || copy[locale].generic;
        setStatus(status, message, 'error');
        focusFirstInvalid(form);
        return;
      }

      setStatus(
        status,
        result.created === false ? copy[locale].duplicate : copy[locale].success,
        'success',
      );
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
      form.reset();
      idempotencyKey = createIdempotencyKey();
      startedAt = new Date().toISOString();
      resetTurnstile(form);
    } catch {
      setStatus(
        status,
        navigator.onLine ? copy[locale].unavailable : copy[locale].offline,
        'error',
      );
    } finally {
      setBusy(submit, false);
    }
  });
}

function createPayload(
  form: HTMLFormElement,
  kind: FormKind,
  locale: Locale,
  startedAt: string,
  idempotencyKey: string,
): Record<string, unknown> {
  const values = new FormData(form);
  const antiSpam = {
    website: text(values, 'website'),
    ...(text(values, 'cf-turnstile-response')
      ? { turnstileToken: text(values, 'cf-turnstile-response') }
      : {}),
  };
  const metadata = {
    idempotencyKey,
    language: locale,
    pageUrl: window.location.href,
    startedAt,
    consent: values.has('consent'),
  };

  if (kind === 'project') {
    return {
      name: text(values, 'name'),
      email: text(values, 'email'),
      ...(text(values, 'company') ? { company: text(values, 'company') } : {}),
      projectType: text(values, 'projectType'),
      summary: text(values, 'summary'),
      budgetRange: text(values, 'budgetRange'),
      timeline: text(values, 'timeline'),
      metadata,
      antiSpam,
    };
  }
  return {
    name: text(values, 'name'),
    email: text(values, 'email'),
    ...(text(values, 'phone') ? { phone: text(values, 'phone') } : {}),
    subject: text(values, 'subject'),
    message: text(values, 'message'),
    metadata,
    antiSpam,
  };
}

function text(values: FormData, name: string): string {
  const value = values.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function readPayload(response: Response): Promise<ApiErrorPayload & { created?: boolean }> {
  try {
    return (await response.json()) as ApiErrorPayload & { created?: boolean };
  } catch {
    return {};
  }
}

function clearErrors(form: HTMLFormElement): void {
  for (const element of form.querySelectorAll<HTMLElement>('[data-field-error]'))
    element.textContent = '';
  for (const element of form.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
    element.removeAttribute('aria-invalid');
  }
}

function applyServerErrors(form: HTMLFormElement, payload: ApiErrorPayload): void {
  for (const [path, messages] of Object.entries(payload.fieldErrors ?? {})) {
    const field = path.split('.')[0] ?? path;
    if (field === 'antiSpam' || field === 'turnstileToken') continue;
    setFieldError(form, field, messages[0] ?? payload.message ?? 'Invalid value');
  }
}

function setFieldError(form: HTMLFormElement, field: string, message: string): void {
  const control = form.elements.namedItem(field);
  if (control instanceof HTMLElement) control.setAttribute('aria-invalid', 'true');
  const error = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
  if (error) error.textContent = message;
}

function focusFirstInvalid(form: HTMLFormElement): void {
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

function setBusy(button: HTMLButtonElement | null, busy: boolean): void {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

function setStatus(
  element: HTMLElement | null,
  message: string,
  state: 'progress' | 'success' | 'error',
): void {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = state;
}

function resetTurnstile(form: HTMLFormElement): void {
  const widget = form.querySelector<HTMLElement>('.cf-turnstile');
  if (widget && window.turnstile) window.turnstile.reset(widget);
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
}
