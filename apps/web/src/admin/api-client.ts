import type {
  ApiErrorPayload,
  AuditEvent,
  Diagnostics,
  LeadDetails,
  LeadRecord,
  LeadStatus,
  NotificationDetails,
  NotificationRecord,
  PaymentEvent,
  PaymentRequest,
} from './contracts';

export class AdministratorApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly correlationId?: string,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'AdministratorApiError';
  }
}

export type TokenProvider = () => Promise<string | null>;

export class AdministratorApi {
  public constructor(
    private readonly baseUrl: string,
    private readonly tokenProvider: TokenProvider,
  ) {}

  public status(): Promise<Readonly<{ available: boolean; authentication: string; userId: string }>> {
    return this.request('/api/admin/status');
  }

  public diagnostics(): Promise<Diagnostics> {
    return this.request('/api/admin/diagnostics');
  }

  public listLeads(filter: Readonly<{ search?: string; status?: string; type?: string }> = {}): Promise<readonly LeadRecord[]> {
    return this.request(`/api/admin/leads${queryString(filter)}`);
  }

  public leadDetails(id: string): Promise<LeadDetails> {
    return this.request(`/api/admin/leads/${encodeURIComponent(id)}`);
  }

  public updateLeadStatus(id: string, status: LeadStatus): Promise<LeadRecord> {
    return this.request(`/api/admin/leads/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public addLeadNote(id: string, body: string): Promise<Readonly<{ id: string }>> {
    return this.request(`/api/admin/leads/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  public archiveLead(id: string): Promise<LeadRecord> {
    return this.request(`/api/admin/leads/${encodeURIComponent(id)}/archive`, { method: 'POST' });
  }

  public markLeadSpam(id: string): Promise<LeadRecord> {
    return this.request(`/api/admin/leads/${encodeURIComponent(id)}/spam`, { method: 'POST' });
  }

  public async exportLeads(filter: Readonly<{ search?: string; status?: string; type?: string }> = {}): Promise<void> {
    const response = await this.authenticatedFetch(`/api/admin/leads/export.csv${queryString(filter)}`);
    if (!response.ok) throw await this.toError(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'leads.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  public listNotifications(status?: string): Promise<readonly NotificationRecord[]> {
    return this.request(`/api/admin/notifications${queryString(status ? { status } : {})}`);
  }

  public notificationDetails(id: string): Promise<NotificationDetails> {
    return this.request(`/api/admin/notifications/${encodeURIComponent(id)}`);
  }

  public retryNotification(id: string): Promise<NotificationRecord> {
    return this.request(`/api/admin/notifications/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
  }

  public listPayments(): Promise<readonly PaymentRequest[]> {
    return this.request('/api/admin/payment-requests');
  }

  public createPayment(input: Readonly<{
    leadId?: string;
    title: string;
    description?: string;
    amountMinor: number;
    currency: string;
    expiresAt?: string;
  }>): Promise<PaymentRequest> {
    return this.request('/api/admin/payment-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public activatePayment(id: string): Promise<PaymentRequest> {
    return this.request(`/api/admin/payment-requests/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
  }

  public cancelPayment(id: string): Promise<PaymentRequest> {
    return this.request(`/api/admin/payment-requests/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }

  public paymentEvents(id: string): Promise<readonly PaymentEvent[]> {
    return this.request(`/api/admin/payment-requests/${encodeURIComponent(id)}/events`);
  }

  public audit(filter: Readonly<{
    entityType?: string;
    entityId?: string;
    action?: string;
    limit?: number;
  }> = {}): Promise<readonly AuditEvent[]> {
    return this.request(`/api/admin/audit${queryString(filter)}`);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.authenticatedFetch(path, init);
    if (!response.ok) throw await this.toError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.tokenProvider();
    if (!token) {
      throw new AdministratorApiError(401, 'AUTHENTICATION_REQUIRED', 'Your session has expired.');
    }
    const headers = new Headers(init.headers);
    headers.set('accept', headers.get('accept') ?? 'application/json');
    headers.set('authorization', `Bearer ${token}`);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }

  private async toError(response: Response): Promise<AdministratorApiError> {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = {};
    }
    return new AdministratorApiError(
      response.status,
      payload.code ?? `HTTP_${response.status}`,
      payload.message ?? 'The administrator request failed.',
      payload.correlationId,
      payload.fieldErrors,
    );
  }
}

function queryString(values: Readonly<Record<string, string | number | undefined>>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && String(value).trim()) query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
