import { AdministratorApi, AdministratorApiError } from '../admin/api-client';
import { loadClerkBrowser, type ClerkBrowser } from '../admin/clerk-client';
import type {
  AuditEvent,
  Diagnostics,
  LeadDetails,
  LeadRecord,
  LeadStatus,
  NotificationDetails,
  NotificationRecord,
  PaymentEvent,
  PaymentRequest,
} from '../admin/contracts';
import {
  clear,
  emptyState,
  formatDate,
  formatMoney,
  humanize,
  loadingState,
  metadataSummary,
  relativeDate,
  requiredElement,
  setBusy,
  statusBadge,
  textElement,
  truncate,
} from '../admin/view-helpers';

type ViewName = 'overview' | 'leads' | 'notifications' | 'payments' | 'audit';

type DashboardState = {
  activeView: ViewName;
  leads: readonly LeadRecord[];
  notifications: readonly NotificationRecord[];
  payments: readonly PaymentRequest[];
  audit: readonly AuditEvent[];
  diagnostics?: Diagnostics;
  selectedLeadId?: string;
};

const root = document.querySelector<HTMLElement>('[data-admin-dashboard]');
if (root) void bootstrap(root);

async function bootstrap(rootElement: HTMLElement): Promise<void> {
  const boot = requiredElement<HTMLElement>(rootElement, '[data-admin-boot]');
  const configuration = requiredElement<HTMLElement>(rootElement, '[data-admin-configuration]');
  const signIn = requiredElement<HTMLElement>(rootElement, '[data-admin-sign-in]');
  const shell = requiredElement<HTMLElement>(rootElement, '[data-admin-shell]');
  const authError = requiredElement<HTMLElement>(rootElement, '[data-admin-auth-error]');
  const signInNode = requiredElement<HTMLDivElement>(rootElement, '#admin-clerk-sign-in');
  const publishableKey = rootElement.dataset.clerkPublishableKey?.trim() ?? '';
  const apiBase = rootElement.dataset.apiBase?.replace(/\/$/, '') ?? '';
  const siteBase = rootElement.dataset.siteBase?.replace(/\/$/, '') ?? window.location.origin;

  if (!publishableKey || !apiBase) {
    boot.hidden = true;
    configuration.hidden = false;
    return;
  }

  let clerk: ClerkBrowser;
  try {
    clerk = await loadClerkBrowser(publishableKey);
  } catch (error) {
    boot.hidden = true;
    signIn.hidden = false;
    authError.textContent = error instanceof Error ? error.message : 'Authentication could not load.';
    return;
  }

  boot.hidden = true;
  if (!clerk.isSignedIn || !clerk.session) {
    signIn.hidden = false;
    clerk.mountSignIn(signInNode, {
      routing: 'hash',
      forceRedirectUrl: '/admin',
      signUpUrl: '/',
      appearance: {
        variables: {
          colorPrimary: '#0d1715',
          colorText: '#0d1715',
          colorBackground: '#fbfaf5',
          borderRadius: '2px',
        },
      },
    });
    return;
  }

  const api = new AdministratorApi(apiBase, () => clerk.session?.getToken() ?? Promise.resolve(null));
  try {
    const status = await api.status();
    requiredElement<HTMLElement>(rootElement, '[data-admin-environment]').textContent =
      `Verified · ${status.userId.slice(0, 12)}…`;
  } catch (error) {
    signIn.hidden = false;
    authError.textContent = authorizationMessage(error);
    renderSignedInButUnauthorized(signInNode, clerk);
    return;
  }

  signIn.hidden = true;
  shell.hidden = false;
  const userButton = requiredElement<HTMLDivElement>(rootElement, '#admin-clerk-user-button');
  clerk.mountUserButton(userButton, { afterSignOutUrl: '/admin' });

  const state: DashboardState = {
    activeView: viewFromHash(),
    leads: [],
    notifications: [],
    payments: [],
    audit: [],
  };
  const dashboard = createDashboard(rootElement, api, clerk, siteBase, state);
  dashboard.bind();
  dashboard.showView(state.activeView);
  await dashboard.refreshAll();
}

function createDashboard(
  rootElement: HTMLElement,
  api: AdministratorApi,
  clerk: ClerkBrowser,
  siteBase: string,
  state: DashboardState,
) {
  const globalStatus = requiredElement<HTMLElement>(rootElement, '[data-admin-global-status]');
  const toast = requiredElement<HTMLElement>(rootElement, '[data-admin-toast]');
  const leadList = requiredElement<HTMLElement>(rootElement, '[data-lead-list]');
  const leadDetail = requiredElement<HTMLElement>(rootElement, '[data-lead-detail]');
  const notificationList = requiredElement<HTMLElement>(rootElement, '[data-notification-list]');
  const paymentList = requiredElement<HTMLElement>(rootElement, '[data-payment-list]');
  const auditList = requiredElement<HTMLElement>(rootElement, '[data-audit-list]');
  const paymentForm = requiredElement<HTMLFormElement>(rootElement, '[data-payment-form]');
  const paymentFormError = requiredElement<HTMLElement>(rootElement, '[data-payment-form-error]');
  const paymentLeadSelect = requiredElement<HTMLSelectElement>(paymentForm, 'select[name="leadId"]');
  let toastTimer: number | undefined;

  const showToast = (message: string, stateName: 'success' | 'error' = 'success'): void => {
    toast.textContent = message;
    toast.dataset.state = stateName;
    toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4_500);
  };

  const setGlobalStatus = (message: string, stateName?: 'error'): void => {
    globalStatus.textContent = message;
    if (stateName) globalStatus.dataset.state = stateName;
    else delete globalStatus.dataset.state;
  };

  const handleError = async (error: unknown, fallback = 'The operation failed.'): Promise<void> => {
    if (error instanceof AdministratorApiError) {
      if (error.status === 401) {
        showToast('Your session expired. Sign in again.', 'error');
        await clerk.signOut({ redirectUrl: '/admin' });
        return;
      }
      if (error.status === 403) {
        showToast('This identity is not authorised for administration.', 'error');
        return;
      }
      const correlation = error.correlationId ? ` Reference: ${error.correlationId}.` : '';
      showToast(`${error.message}${correlation}`, 'error');
      return;
    }
    showToast(error instanceof Error ? error.message : fallback, 'error');
  };

  const refreshAll = async (): Promise<void> => {
    setGlobalStatus('Refreshing administrator data…');
    renderLoading();
    try {
      const [diagnostics, leads, notifications, payments, audit] = await Promise.all([
        api.diagnostics(),
        api.listLeads(),
        api.listNotifications(),
        api.listPayments(),
        api.audit({ limit: 100 }),
      ]);
      state.diagnostics = diagnostics;
      state.leads = leads;
      state.notifications = notifications;
      state.payments = payments;
      state.audit = audit;
      renderAll();
      setGlobalStatus(`Updated ${new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(new Date())}.`);
      window.setTimeout(() => setGlobalStatus(''), 2_500);
    } catch (error) {
      setGlobalStatus('Administrator data could not be refreshed.', 'error');
      await handleError(error);
    }
  };

  const renderLoading = (): void => {
    for (const selector of [
      '[data-overview-leads]',
      '[data-admin-diagnostics]',
      '[data-overview-audit]',
      '[data-lead-list]',
      '[data-notification-list]',
      '[data-payment-list]',
      '[data-audit-list]',
    ]) {
      const element = requiredElement<HTMLElement>(rootElement, selector);
      clear(element);
      element.append(loadingState());
    }
  };

  const renderAll = (): void => {
    renderNavigationCounts(rootElement, state);
    renderOverview(rootElement, state);
    renderLeadList(leadList, state.leads, state.selectedLeadId);
    renderNotifications(notificationList, state.notifications);
    renderPayments(paymentList, state.payments, state.leads, siteBase);
    renderAudit(auditList, state.audit);
    populateLeadSelect(paymentLeadSelect, state.leads);
  };

  const showView = (view: ViewName): void => {
    state.activeView = view;
    for (const section of rootElement.querySelectorAll<HTMLElement>('[data-admin-view]')) {
      section.hidden = section.dataset.adminView !== view;
    }
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-admin-nav]')) {
      if (button.dataset.adminNav === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    const hash = view === 'overview' ? '' : `#${view}`;
    history.replaceState(null, '', `${window.location.pathname}${hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadLeads = async (): Promise<void> => {
    const form = requiredElement<HTMLFormElement>(rootElement, '[data-lead-filters]');
    const values = new FormData(form);
    clear(leadList);
    leadList.append(loadingState());
    try {
      state.leads = await api.listLeads({
        search: formValue(values, 'search'),
        status: formValue(values, 'status'),
        type: formValue(values, 'type'),
      });
      renderLeadList(leadList, state.leads, state.selectedLeadId);
      renderNavigationCounts(rootElement, state);
      populateLeadSelect(paymentLeadSelect, state.leads);
    } catch (error) {
      clear(leadList);
      leadList.append(emptyState('Leads unavailable', 'Refresh or review service diagnostics.'));
      await handleError(error);
    }
  };

  const openLead = async (id: string): Promise<void> => {
    state.selectedLeadId = id;
    renderLeadList(leadList, state.leads, id);
    clear(leadDetail);
    leadDetail.append(loadingState(2));
    try {
      const details = await api.leadDetails(id);
      renderLeadDetail(leadDetail, details, {
        onStatus: async (status, button) => {
          setBusy(button, true, 'Updating…');
          try {
            await api.updateLeadStatus(id, status);
            showToast('Lead status updated.');
            await refreshAll();
            await openLead(id);
          } catch (error) {
            await handleError(error);
          } finally {
            setBusy(button, false);
          }
        },
        onNote: async (body, button) => {
          setBusy(button, true, 'Saving…');
          try {
            await api.addLeadNote(id, body);
            showToast('Note added.');
            state.audit = await api.audit({ limit: 100 });
            await openLead(id);
            renderOverview(rootElement, state);
            renderAudit(auditList, state.audit);
          } catch (error) {
            await handleError(error);
          } finally {
            setBusy(button, false);
          }
        },
        onArchive: async (button) => {
          if (!window.confirm('Archive this lead?')) return;
          setBusy(button, true, 'Archiving…');
          try {
            await api.archiveLead(id);
            showToast('Lead archived.');
            await refreshAll();
            await openLead(id);
          } catch (error) {
            await handleError(error);
          } finally {
            setBusy(button, false);
          }
        },
        onSpam: async (button) => {
          if (!window.confirm('Mark this lead as spam?')) return;
          setBusy(button, true, 'Updating…');
          try {
            await api.markLeadSpam(id);
            showToast('Lead marked as spam.');
            await refreshAll();
            await openLead(id);
          } catch (error) {
            await handleError(error);
          } finally {
            setBusy(button, false);
          }
        },
      });
    } catch (error) {
      clear(leadDetail);
      leadDetail.append(emptyState('Lead unavailable', 'The lead may have been removed or the session may have expired.'));
      await handleError(error);
    }
  };

  const loadNotifications = async (): Promise<void> => {
    const form = requiredElement<HTMLFormElement>(rootElement, '[data-notification-filters]');
    const values = new FormData(form);
    clear(notificationList);
    notificationList.append(loadingState());
    try {
      state.notifications = await api.listNotifications(formValue(values, 'status'));
      renderNotifications(notificationList, state.notifications);
      renderNavigationCounts(rootElement, state);
      renderOverview(rootElement, state);
    } catch (error) {
      await handleError(error);
    }
  };

  const retryNotification = async (id: string, button: HTMLButtonElement): Promise<void> => {
    setBusy(button, true, 'Retrying…');
    try {
      const notification = await api.retryNotification(id);
      showToast(notification.status === 'sent' ? 'Notification delivered.' : `Delivery is ${notification.status}.`);
      state.notifications = await api.listNotifications();
      renderNotifications(notificationList, state.notifications);
      renderNavigationCounts(rootElement, state);
      renderOverview(rootElement, state);
    } catch (error) {
      await handleError(error);
    } finally {
      setBusy(button, false);
    }
  };

  const showNotificationAttempts = async (id: string, button: HTMLButtonElement): Promise<void> => {
    setBusy(button, true, 'Loading…');
    try {
      const details = await api.notificationDetails(id);
      const card = button.closest<HTMLElement>('.admin-operation-card');
      if (card) renderNotificationAttempts(card, details);
    } catch (error) {
      await handleError(error);
    } finally {
      setBusy(button, false);
    }
  };

  const submitPayment = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    paymentFormError.textContent = '';
    const submit = requiredElement<HTMLButtonElement>(paymentForm, 'button[type="submit"]');
    const values = new FormData(paymentForm);
    const amount = Number(formValue(values, 'amount'));
    if (!Number.isFinite(amount) || amount <= 0) {
      paymentFormError.textContent = 'Enter a positive payment amount.';
      return;
    }
    const amountMinor = Math.round((amount + Number.EPSILON) * 100);
    const expiresLocal = formValue(values, 'expiresAt');
    const expiresAt = expiresLocal ? new Date(expiresLocal) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      paymentFormError.textContent = 'Choose a valid expiration date.';
      return;
    }

    setBusy(submit, true, 'Saving…');
    try {
      await api.createPayment({
        ...(formValue(values, 'leadId') ? { leadId: formValue(values, 'leadId') } : {}),
        title: formValue(values, 'title') ?? '',
        ...(formValue(values, 'description')
          ? { description: formValue(values, 'description') }
          : {}),
        amountMinor,
        currency: (formValue(values, 'currency') ?? '').toUpperCase(),
        ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      });
      paymentForm.reset();
      requiredElement<HTMLInputElement>(paymentForm, 'input[name="currency"]').value = 'EUR';
      paymentForm.hidden = true;
      showToast('Payment request saved as a draft.');
      state.payments = await api.listPayments();
      state.audit = await api.audit({ limit: 100 });
      renderPayments(paymentList, state.payments, state.leads, siteBase);
      renderOverview(rootElement, state);
      renderAudit(auditList, state.audit);
      renderNavigationCounts(rootElement, state);
    } catch (error) {
      paymentFormError.textContent = error instanceof AdministratorApiError ? error.message : 'Payment request could not be saved.';
      await handleError(error);
    } finally {
      setBusy(submit, false);
    }
  };

  const paymentAction = async (
    id: string,
    action: string,
    button: HTMLButtonElement,
  ): Promise<void> => {
    if (action === 'share') {
      const payment = state.payments.find((item) => item.id === id);
      if (payment) await sharePayment(payment, siteBase, showToast);
      return;
    }
    if (action === 'history') {
      setBusy(button, true, 'Loading…');
      try {
        const events = await api.paymentEvents(id);
        const card = button.closest<HTMLElement>('.admin-operation-card');
        if (card) renderPaymentEvents(card, events);
      } catch (error) {
        await handleError(error);
      } finally {
        setBusy(button, false);
      }
      return;
    }

    setBusy(button, true, action === 'activate' ? 'Activating…' : 'Cancelling…');
    try {
      if (action === 'activate') await api.activatePayment(id);
      else if (action === 'cancel') {
        if (!window.confirm('Cancel this payment request?')) return;
        await api.cancelPayment(id);
      }
      showToast(action === 'activate' ? 'Payment request activated.' : 'Payment request cancelled.');
      state.payments = await api.listPayments();
      state.audit = await api.audit({ limit: 100 });
      renderPayments(paymentList, state.payments, state.leads, siteBase);
      renderOverview(rootElement, state);
      renderAudit(auditList, state.audit);
      renderNavigationCounts(rootElement, state);
    } catch (error) {
      await handleError(error);
    } finally {
      setBusy(button, false);
    }
  };

  const loadAudit = async (): Promise<void> => {
    const form = requiredElement<HTMLFormElement>(rootElement, '[data-audit-filters]');
    const values = new FormData(form);
    clear(auditList);
    auditList.append(loadingState());
    try {
      state.audit = await api.audit({
        entityType: formValue(values, 'entityType'),
        entityId: formValue(values, 'entityId'),
        action: formValue(values, 'action'),
        limit: 250,
      });
      renderAudit(auditList, state.audit);
    } catch (error) {
      await handleError(error);
    }
  };

  const bind = (): void => {
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-admin-nav]')) {
      button.addEventListener('click', () => showView(asView(button.dataset.adminNav)));
    }
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-admin-open-view]')) {
      button.addEventListener('click', () => showView(asView(button.dataset.adminOpenView)));
    }
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-admin-refresh]')) {
      button.addEventListener('click', () => void refreshAll());
    }
    requiredElement<HTMLButtonElement>(rootElement, '[data-admin-sign-out]').addEventListener(
      'click',
      () => void clerk.signOut({ redirectUrl: '/admin' }),
    );
    requiredElement<HTMLFormElement>(rootElement, '[data-lead-filters]').addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void loadLeads();
      },
    );
    requiredElement<HTMLButtonElement>(rootElement, '[data-export-leads]').addEventListener(
      'click',
      (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const form = requiredElement<HTMLFormElement>(rootElement, '[data-lead-filters]');
        const values = new FormData(form);
        setBusy(button, true, 'Exporting…');
        void api
          .exportLeads({
            search: formValue(values, 'search'),
            status: formValue(values, 'status'),
            type: formValue(values, 'type'),
          })
          .then(() => showToast('Lead export downloaded.'))
          .catch(handleError)
          .finally(() => setBusy(button, false));
      },
    );
    leadList.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-lead-id]');
      if (button?.dataset.leadId) void openLead(button.dataset.leadId);
    });
    requiredElement<HTMLFormElement>(rootElement, '[data-notification-filters]').addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void loadNotifications();
      },
    );
    notificationList.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-notification-action]');
      const id = button?.dataset.notificationId;
      const action = button?.dataset.notificationAction;
      if (!button || !id || !action) return;
      if (action === 'retry') void retryNotification(id, button);
      if (action === 'attempts') void showNotificationAttempts(id, button);
    });
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-toggle-payment-form]')) {
      button.addEventListener('click', () => {
        paymentForm.hidden = !paymentForm.hidden;
        if (!paymentForm.hidden) requiredElement<HTMLInputElement>(paymentForm, 'input[name="title"]').focus();
      });
    }
    for (const button of rootElement.querySelectorAll<HTMLButtonElement>('[data-close-payment-form]')) {
      button.addEventListener('click', () => {
        paymentForm.hidden = true;
        paymentFormError.textContent = '';
      });
    }
    paymentForm.addEventListener('submit', (event) => void submitPayment(event));
    paymentList.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-payment-action]');
      const id = button?.dataset.paymentId;
      const action = button?.dataset.paymentAction;
      if (button && id && action) void paymentAction(id, action, button);
    });
    requiredElement<HTMLFormElement>(rootElement, '[data-audit-filters]').addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void loadAudit();
      },
    );
    window.addEventListener('hashchange', () => showView(viewFromHash()));
  };

  return { bind, refreshAll, showView };
}

function renderNavigationCounts(root: HTMLElement, state: DashboardState): void {
  setCount(root, 'leads', state.leads.filter((lead) => !['won', 'lost', 'archived', 'spam'].includes(lead.status)).length);
  setCount(root, 'notifications', state.notifications.filter((item) => item.status === 'failed').length);
  setCount(root, 'payments', state.payments.filter((item) => ['active', 'processing'].includes(item.status)).length);
}

function setCount(root: HTMLElement, name: string, count: number): void {
  const element = root.querySelector<HTMLElement>(`[data-nav-count="${name}"]`);
  if (!element) return;
  element.textContent = count > 0 ? String(count) : '';
  element.hidden = count === 0;
}

function renderOverview(root: HTMLElement, state: DashboardState): void {
  metric(root, 'open-leads', state.leads.filter((lead) => !['won', 'lost', 'archived', 'spam'].includes(lead.status)).length);
  metric(root, 'failed-notifications', state.notifications.filter((item) => item.status === 'failed').length);
  metric(root, 'active-payments', state.payments.filter((item) => ['active', 'processing'].includes(item.status)).length);
  const paid = state.payments.filter((item) => item.status === 'paid');
  const paidMetric = paid.length === 0 ? '0' : paidCurrencies(paid);
  requiredElement<HTMLElement>(root, '[data-metric="paid-total"]').textContent = paidMetric;

  const recentLeads = requiredElement<HTMLElement>(root, '[data-overview-leads]');
  clear(recentLeads);
  if (state.leads.length === 0) recentLeads.append(emptyState('No leads yet', 'New enquiries will appear here.'));
  else {
    for (const lead of state.leads.slice(0, 5)) recentLeads.append(compactLead(lead));
  }

  const diagnostics = requiredElement<HTMLElement>(root, '[data-admin-diagnostics]');
  clear(diagnostics);
  if (!state.diagnostics) diagnostics.append(emptyState('Diagnostics unavailable', 'Refresh the workspace.'));
  else {
    for (const check of state.diagnostics.checks) {
      const item = document.createElement('div');
      item.className = 'admin-diagnostic-item';
      item.append(textElement('strong', humanize(check.name)), statusBadge(check.state));
      diagnostics.append(item);
    }
  }

  const audit = requiredElement<HTMLElement>(root, '[data-overview-audit]');
  renderAudit(audit, state.audit.slice(0, 8));
}

function metric(root: HTMLElement, name: string, value: number): void {
  requiredElement<HTMLElement>(root, `[data-metric="${name}"]`).textContent = String(value);
}

function paidCurrencies(payments: readonly PaymentRequest[]): string {
  const currencies = new Set(payments.map((payment) => payment.currency));
  if (currencies.size !== 1) return `${payments.length} paid`;
  const currency = payments[0]?.currency ?? 'EUR';
  return formatMoney(
    payments.reduce((total, payment) => total + payment.amountMinor, 0),
    currency,
  );
}

function compactLead(lead: LeadRecord): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-compact-item';
  button.dataset.leadId = lead.id;
  const top = document.createElement('div');
  top.className = 'admin-item-topline';
  top.append(textElement('span', humanize(lead.leadType)), statusBadge(lead.status));
  button.append(top, textElement('strong', lead.name), textElement('p', truncate(lead.message, 80)));
  return button;
}

function renderLeadList(container: HTMLElement, leads: readonly LeadRecord[], selectedId?: string): void {
  clear(container);
  if (leads.length === 0) {
    container.append(emptyState('No matching leads', 'Adjust the filters or wait for a new enquiry.'));
    return;
  }
  for (const lead of leads) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-list-item';
    button.dataset.leadId = lead.id;
    button.setAttribute('aria-current', String(lead.id === selectedId));
    const top = document.createElement('div');
    top.className = 'admin-item-topline';
    top.append(textElement('span', relativeDate(lead.submittedAt)), statusBadge(lead.status));
    button.append(
      top,
      textElement('strong', lead.name),
      textElement('p', lead.company ? `${lead.company} · ${lead.email}` : lead.email),
      textElement('p', truncate(lead.message, 95)),
    );
    container.append(button);
  }
}

function renderLeadDetail(
  container: HTMLElement,
  details: LeadDetails,
  actions: Readonly<{
    onStatus(status: LeadStatus, button: HTMLButtonElement): Promise<void>;
    onNote(body: string, button: HTMLButtonElement): Promise<void>;
    onArchive(button: HTMLButtonElement): Promise<void>;
    onSpam(button: HTMLButtonElement): Promise<void>;
  }>,
): void {
  clear(container);
  const { lead } = details;
  const header = document.createElement('div');
  header.className = 'admin-detail-header';
  const title = document.createElement('div');
  title.append(textElement('p', humanize(lead.leadType), 'admin-kicker'), textElement('h2', lead.name));
  header.append(title, statusBadge(lead.status));
  container.append(header);

  const meta = document.createElement('div');
  meta.className = 'admin-detail-meta';
  meta.append(textElement('span', `Submitted ${formatDate(lead.submittedAt)}`), textElement('span', lead.language.toUpperCase()));
  container.append(meta);

  const grid = document.createElement('div');
  grid.className = 'admin-detail-grid';
  grid.append(
    detailField('Email', lead.email, `mailto:${lead.email}`),
    detailField('Phone', lead.phone ?? 'Not provided', lead.phone ? `tel:${lead.phone}` : undefined),
    detailField('Company', lead.company ?? 'Not provided'),
    detailField('Project type', lead.projectType ? humanize(lead.projectType) : lead.subject ?? 'Not provided'),
    detailField('Budget', lead.budgetRange ? humanize(lead.budgetRange) : 'Not provided'),
    detailField('Timeline', lead.timeline ? humanize(lead.timeline) : 'Not provided'),
  );
  container.append(grid, textElement('div', lead.message, 'admin-detail-message'));

  const shortcuts = document.createElement('div');
  shortcuts.className = 'admin-action-row';
  shortcuts.append(actionLink('Email', `mailto:${lead.email}`));
  if (lead.phone) shortcuts.append(actionLink('Call', `tel:${lead.phone}`));
  if (lead.phone) shortcuts.append(actionLink('WhatsApp', `https://wa.me/${lead.phone.replaceAll(/\D/g, '')}`, true));
  container.append(shortcuts);

  const statusSection = document.createElement('section');
  statusSection.className = 'admin-detail-section';
  statusSection.append(textElement('h3', 'Lead state'));
  const statusRow = document.createElement('div');
  statusRow.className = 'admin-action-row';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Lead status');
  for (const status of ['new', 'reviewing', 'qualified', 'contacted', 'won', 'lost', 'archived', 'spam'] as const) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = humanize(status);
    option.selected = status === lead.status;
    select.append(option);
  }
  const update = button('Update status', 'admin-primary-button');
  update.addEventListener('click', () => void actions.onStatus(select.value as LeadStatus, update));
  const archive = button('Archive', 'admin-quiet-button');
  archive.addEventListener('click', () => void actions.onArchive(archive));
  const spam = button('Mark spam', 'admin-danger-button');
  spam.addEventListener('click', () => void actions.onSpam(spam));
  statusRow.append(select, update, archive, spam);
  statusSection.append(statusRow);
  container.append(statusSection);

  const notesSection = document.createElement('section');
  notesSection.className = 'admin-detail-section';
  notesSection.append(textElement('h3', 'Internal notes'));
  const textarea = document.createElement('textarea');
  textarea.rows = 3;
  textarea.maxLength = 4000;
  textarea.placeholder = 'Add context, next action or decision…';
  textarea.setAttribute('aria-label', 'New lead note');
  const saveNote = button('Add note', 'admin-primary-button');
  saveNote.addEventListener('click', () => {
    const body = textarea.value.trim();
    if (body.length < 2) {
      textarea.setAttribute('aria-invalid', 'true');
      textarea.focus();
      return;
    }
    textarea.removeAttribute('aria-invalid');
    void actions.onNote(body, saveNote);
  });
  notesSection.append(textarea, saveNote);
  const noteList = document.createElement('div');
  noteList.className = 'admin-note-list';
  if (details.notes.length === 0) noteList.append(emptyState('No notes', 'Add the first internal note.'));
  else {
    for (const note of [...details.notes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
      const item = document.createElement('article');
      item.className = 'admin-note';
      item.append(textElement('p', note.body), textElement('small', `${formatDate(note.createdAt)} · ${note.authorPrincipalId}`));
      noteList.append(item);
    }
  }
  notesSection.append(noteList);
  container.append(notesSection);

  const historySection = document.createElement('section');
  historySection.className = 'admin-detail-section';
  historySection.append(textElement('h3', 'Lead audit'));
  const history = document.createElement('div');
  history.className = 'admin-timeline';
  renderAudit(history, details.audit);
  historySection.append(history);
  container.append(historySection);
}

function detailField(label: string, value: string, href?: string): HTMLDivElement {
  const field = document.createElement('div');
  field.className = 'admin-detail-field';
  field.append(textElement('span', label));
  if (href) field.append(actionLink(value, href, href.startsWith('http')));
  else field.append(textElement('strong', value));
  return field;
}

function actionLink(label: string, href: string, external = false): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  link.className = 'admin-secondary-button';
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  return element;
}

function renderNotifications(container: HTMLElement, notifications: readonly NotificationRecord[]): void {
  clear(container);
  if (notifications.length === 0) {
    container.append(emptyState('No notifications', 'Delivery attempts will appear here.'));
    return;
  }
  for (const notification of notifications) {
    const card = document.createElement('article');
    card.className = 'admin-operation-card';
    const layout = document.createElement('div');
    layout.className = 'admin-operation-card-grid';
    const content = document.createElement('div');
    const top = document.createElement('div');
    top.className = 'admin-card-topline';
    top.append(textElement('span', formatDate(notification.updatedAt)), statusBadge(notification.status));
    content.append(
      top,
      textElement('strong', humanize(notification.templateKey)),
      textElement('p', `To ${notification.recipient}`),
    );
    if (notification.lastErrorMessage) content.append(textElement('p', `${notification.lastErrorCode ?? 'Delivery error'} · ${notification.lastErrorMessage}`));
    const actions = document.createElement('div');
    actions.className = 'admin-operation-actions';
    if (notification.status === 'failed' || notification.status === 'pending') {
      const retry = button('Retry', 'admin-primary-button');
      retry.dataset.notificationAction = 'retry';
      retry.dataset.notificationId = notification.id;
      actions.append(retry);
    }
    const attempts = button('Attempts', 'admin-secondary-button');
    attempts.dataset.notificationAction = 'attempts';
    attempts.dataset.notificationId = notification.id;
    actions.append(attempts);
    layout.append(content, actions);
    card.append(layout);
    container.append(card);
  }
}

function renderNotificationAttempts(card: HTMLElement, details: NotificationDetails): void {
  card.querySelector('[data-notification-attempts]')?.remove();
  const wrapper = document.createElement('div');
  wrapper.dataset.notificationAttempts = 'true';
  wrapper.className = 'admin-detail-section';
  wrapper.append(textElement('h3', 'Delivery attempts'));
  if (details.attempts.length === 0) wrapper.append(emptyState('No attempts', 'This notification has not been dispatched.'));
  else {
    const timeline = document.createElement('div');
    timeline.className = 'admin-timeline';
    for (const attempt of details.attempts) {
      const item = document.createElement('article');
      item.className = 'admin-timeline-item';
      item.append(textElement('span', '', 'admin-timeline-marker'));
      const content = document.createElement('div');
      const top = document.createElement('div');
      top.className = 'admin-timeline-meta';
      top.append(textElement('span', `Attempt ${attempt.attemptNumber}`), statusBadge(attempt.status));
      content.append(top, textElement('h3', attempt.errorCode ?? attempt.providerMessageId ?? humanize(attempt.status)), textElement('p', attempt.errorMessage ?? formatDate(attempt.finishedAt ?? attempt.startedAt)));
      item.append(content);
      timeline.append(item);
    }
    wrapper.append(timeline);
  }
  card.append(wrapper);
}

function renderPayments(
  container: HTMLElement,
  payments: readonly PaymentRequest[],
  leads: readonly LeadRecord[],
  siteBase: string,
): void {
  clear(container);
  if (payments.length === 0) {
    container.append(emptyState('No payment requests', 'Create a fixed, server-owned request when commercial terms are agreed.'));
    return;
  }
  const leadNames = new Map(leads.map((lead) => [lead.id, lead.name]));
  for (const payment of payments) {
    const card = document.createElement('article');
    card.className = 'admin-operation-card';
    const layout = document.createElement('div');
    layout.className = 'admin-operation-card-grid';
    const content = document.createElement('div');
    const top = document.createElement('div');
    top.className = 'admin-card-topline';
    top.append(textElement('span', formatDate(payment.createdAt)), statusBadge(payment.status));
    content.append(
      top,
      textElement('strong', payment.title),
      textElement('p', payment.description ?? 'No description'),
    );
    const details = document.createElement('div');
    details.className = 'admin-operation-details';
    details.append(
      operationField('Amount', formatMoney(payment.amountMinor, payment.currency)),
      operationField('Lead', payment.leadId ? leadNames.get(payment.leadId) ?? payment.leadId : 'Not linked'),
      operationField('Expires', formatDate(payment.expiresAt)),
    );
    content.append(details);
    const actions = document.createElement('div');
    actions.className = 'admin-operation-actions';
    if (payment.status === 'draft' || payment.status === 'failed') actions.append(paymentButton('Activate', 'activate', payment.id, 'admin-primary-button'));
    if (['draft', 'active', 'processing', 'failed'].includes(payment.status)) actions.append(paymentButton('Cancel', 'cancel', payment.id, 'admin-danger-button'));
    if (payment.status === 'active' || payment.status === 'processing') actions.append(paymentButton('Share', 'share', payment.id, 'admin-secondary-button'));
    actions.append(paymentButton('History', 'history', payment.id, 'admin-secondary-button'));
    const link = new URL('/payment', siteBase);
    link.searchParams.set('token', payment.publicToken);
    const shareValue = document.createElement('input');
    shareValue.type = 'text';
    shareValue.readOnly = true;
    shareValue.value = link.href;
    shareValue.setAttribute('aria-label', `Payment link for ${payment.title}`);
    content.append(shareValue);
    layout.append(content, actions);
    card.append(layout);
    container.append(card);
  }
}

function operationField(label: string, value: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.append(textElement('span', label), textElement('strong', value));
  return wrapper;
}

function paymentButton(
  label: string,
  action: string,
  id: string,
  className: string,
): HTMLButtonElement {
  const element = button(label, className);
  element.dataset.paymentAction = action;
  element.dataset.paymentId = id;
  return element;
}

function renderPaymentEvents(card: HTMLElement, events: readonly PaymentEvent[]): void {
  card.querySelector('[data-payment-events]')?.remove();
  const wrapper = document.createElement('div');
  wrapper.dataset.paymentEvents = 'true';
  wrapper.className = 'admin-detail-section';
  wrapper.append(textElement('h3', 'Payment history'));
  const timeline = document.createElement('div');
  timeline.className = 'admin-timeline';
  if (events.length === 0) timeline.append(emptyState('No events', 'The request has no recorded events.'));
  else {
    for (const event of [...events].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))) {
      timeline.append(auditLikeItem(event.eventType, event.provider, event.occurredAt, metadataSummary(event.payload)));
    }
  }
  wrapper.append(timeline);
  card.append(wrapper);
}

function renderAudit(container: HTMLElement, events: readonly AuditEvent[]): void {
  clear(container);
  if (events.length === 0) {
    container.append(emptyState('No audit events', 'Actions will appear here as the system is used.'));
    return;
  }
  for (const event of events) {
    container.append(auditLikeItem(event.action, `${event.actorType}${event.actorId ? ` · ${event.actorId}` : ''}`, event.createdAt, metadataSummary(event.metadata)));
  }
}

function auditLikeItem(title: string, actor: string, date: string, detail: string): HTMLElement {
  const item = document.createElement('article');
  item.className = 'admin-timeline-item';
  item.append(textElement('span', '', 'admin-timeline-marker'));
  const content = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'admin-timeline-meta';
  meta.append(textElement('span', actor), textElement('span', formatDate(date)));
  content.append(meta, textElement('h3', humanize(title)), textElement('p', detail));
  item.append(content);
  return item;
}

function populateLeadSelect(select: HTMLSelectElement, leads: readonly LeadRecord[]): void {
  const selected = select.value;
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'No linked lead';
  select.append(blank);
  for (const lead of leads.filter((item) => !['archived', 'spam'].includes(item.status))) {
    const option = document.createElement('option');
    option.value = lead.id;
    option.textContent = `${lead.name} · ${lead.email}`;
    select.append(option);
  }
  select.value = selected;
}

async function sharePayment(
  payment: PaymentRequest,
  siteBase: string,
  notify: (message: string, state?: 'success' | 'error') => void,
): Promise<void> {
  const url = new URL('/payment', siteBase);
  url.searchParams.set('token', payment.publicToken);
  try {
    if (navigator.share) {
      await navigator.share({
        title: payment.title,
        text: `Secure payment request: ${formatMoney(payment.amountMinor, payment.currency)}`,
        url: url.href,
      });
      notify('Payment link shared.');
      return;
    }
    await navigator.clipboard.writeText(url.href);
    notify('Payment link copied.');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    notify('The payment link could not be shared.', 'error');
  }
}

function formValue(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function asView(value: string | undefined): ViewName {
  return value === 'leads' || value === 'notifications' || value === 'payments' || value === 'audit'
    ? value
    : 'overview';
}

function viewFromHash(): ViewName {
  return asView(window.location.hash.slice(1));
}

function authorizationMessage(error: unknown): string {
  if (error instanceof AdministratorApiError && error.status === 403) {
    return 'You signed in successfully, but this identity is not on the administrator allowlist.';
  }
  if (error instanceof AdministratorApiError && error.status === 503) {
    return 'Administrator identity is not fully configured on the API service.';
  }
  return error instanceof Error ? error.message : 'Administrator access could not be verified.';
}

function renderSignedInButUnauthorized(container: HTMLElement, clerk: ClerkBrowser): void {
  clear(container);
  const card = document.createElement('div');
  card.className = 'admin-auth-card';
  card.append(
    textElement('p', 'Access denied', 'admin-kicker'),
    textElement('h2', 'This account is not authorised.'),
    textElement('p', 'Use an administrator identity or update the server-side allowlist.'),
  );
  const signOut = button('Sign out', 'admin-primary-button');
  signOut.addEventListener('click', () => void clerk.signOut({ redirectUrl: '/admin' }));
  card.append(signOut);
  container.append(card);
}
