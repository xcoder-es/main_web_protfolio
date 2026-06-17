import type { AuthenticatedPrincipal } from './ports.js';

export class AdministratorAuthorizer {
  private readonly userIds: ReadonlySet<string>;
  private readonly emails: ReadonlySet<string>;

  public constructor(userIds: readonly string[], emails: readonly string[]) {
    this.userIds = new Set(userIds.map((value) => value.trim()).filter(Boolean));
    this.emails = new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean));
  }

  public isAllowed(principal: AuthenticatedPrincipal): boolean {
    if (this.userIds.has(principal.userId)) return true;
    if (principal.primaryEmail && this.emails.has(principal.primaryEmail.toLowerCase()))
      return true;
    return false;
  }

  public get configured(): boolean {
    return this.userIds.size > 0 || this.emails.size > 0;
  }
}

export class IdentityAccessError extends Error {
  public constructor(
    public readonly code: 'AUTHENTICATION_REQUIRED' | 'ADMIN_ACCESS_FORBIDDEN',
    message: string,
    public readonly statusCode: 401 | 403,
  ) {
    super(message);
    this.name = 'IdentityAccessError';
  }
}
