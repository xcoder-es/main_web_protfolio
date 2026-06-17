export function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing administrator element: ${selector}`);
  return element;
}

export function clear(element: Element): void {
  element.replaceChildren();
}

export function textElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function statusBadge(status: string): HTMLSpanElement {
  const badge = textElement('span', humanize(status), 'admin-status-badge');
  badge.dataset.status = status;
  return badge;
}

export function emptyState(title: string, body: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-empty-message';
  wrapper.append(textElement('strong', title), textElement('p', body));
  return wrapper;
}

export function loadingState(rows = 3): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < rows; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'admin-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    fragment.append(skeleton);
  }
  return fragment;
}

export function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function relativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (absolute < 60) return formatter.format(seconds, 'second');
  if (absolute < 3_600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (absolute < 86_400) return formatter.format(Math.round(seconds / 3_600), 'hour');
  if (absolute < 2_592_000) return formatter.format(Math.round(seconds / 86_400), 'day');
  return formatDate(value);
}

export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function humanize(value: string): string {
  return value
    .replaceAll(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function truncate(value: string, length = 110): string {
  const normalized = value.replaceAll(/\s+/g, ' ').trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

export function metadataSummary(metadata: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(metadata).slice(0, 4);
  if (entries.length === 0) return 'No additional metadata';
  return entries
    .map(([key, value]) => `${humanize(key)}: ${primitive(value)}`)
    .join(' · ');
}

export function setBusy(button: HTMLButtonElement, busy: boolean, label?: string): void {
  if (busy) {
    button.dataset.originalLabel = button.textContent ?? '';
    if (label) button.textContent = label;
  } else if (button.dataset.originalLabel !== undefined) {
    button.textContent = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
  }
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

function primitive(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) return '—';
  return Array.isArray(value) ? value.map(primitive).join(', ') : '[object]';
}
