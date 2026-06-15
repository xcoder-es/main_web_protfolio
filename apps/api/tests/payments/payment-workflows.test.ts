import type { Clock, IdGenerator } from '@carlos-pinto/contracts';
import { describe, expect, it } from 'vitest';

import { PaymentsService } from '../../src/payments/application/service.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
import { FakePaymentGateway } from './fake-payment-gateway.js';

const clock: Clock = { now: () => new Date('2026-06-15T12:00:00.000Z') };

function ids(): IdGenerator {
  let value = 1;
  return {
    generate: () => `00000000-0000-4000-8000-${String(value++).padStart(12, '0')}`,
  };
}

function harness() {
  const persistence = new InMemoryPersistence();
  const gateway = new FakePaymentGateway();
  const service = new PaymentsService({
    paymentRequests: persistence.paymentRequests,
    paymentEvents: persistence.paymentEvents,
    audit: persistence.auditEvents,
    unitOfWork: persistence,
    gateway,
    clock,
    ids: ids(),
  });
  return { persistence, gateway, service };
}

const administrator = {
  type: 'administrator' as const,
  id: 'user_admin_123',
  correlationId: 'request-payment-admin-0001',
};
const visitor = {
  type: 'visitor' as const,
  correlationId: 'request-payment-visitor-0001',
};

describe('payment workflows', () => {
  it('creates, activates, orders and captures using the persisted amount only', async () => {
    const { persistence, gateway, service } = harness();
    const created = await service.createRequest(
      {
        title: 'Architecture engagement',
        amountMinor: 12500,
        currency: 'eur',
      },
      administrator,
    );
    expect(created.status).toBe('draft');
    expect(created.currency).toBe('EUR');

    const active = await service.activate(created.id, administrator);
    const order = await service.createProviderOrder(active.publicToken, visitor);
    const duplicateOrder = await service.createProviderOrder(active.publicToken, visitor);

    expect(order).toMatchObject({ orderId: 'ORDER-123', created: true });
    expect(duplicateOrder).toEqual({ orderId: 'ORDER-123', created: false });
    expect(gateway.createCalls).toHaveLength(1);
    expect(gateway.createCalls[0]?.money).toEqual({ amountMinor: 12500, currency: 'EUR' });

    const paid = await service.captureProviderOrder(active.publicToken, 'ORDER-123', visitor);
    const duplicateCapture = await service.captureProviderOrder(
      active.publicToken,
      'ORDER-123',
      visitor,
    );

    expect(paid.status).toBe('paid');
    expect(duplicateCapture.status).toBe('paid');
    expect(gateway.captureCalls).toHaveLength(1);
    expect(await persistence.paymentEvents.listByPaymentRequestId(created.id)).toHaveLength(4);
    expect(await persistence.auditEvents.listByEntity('payment_request', created.id)).toHaveLength(4);
  });

  it('rejects provider amount mismatches without marking the request paid', async () => {
    const { persistence, gateway, service } = harness();
    const created = await service.createRequest(
      { title: 'Security review', amountMinor: 12500, currency: 'EUR' },
      administrator,
    );
    await service.activate(created.id, administrator);
    await service.createProviderOrder(created.publicToken, visitor);
    gateway.captureMoney = { amountMinor: 1, currency: 'EUR' };

    await expect(
      service.captureProviderOrder(created.publicToken, 'ORDER-123', visitor),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH', statusCode: 409 });
    expect((await persistence.paymentRequests.getById(created.id))?.status).toBe('processing');
  });

  it('enforces lifecycle transitions and validates owner input', async () => {
    const { service } = harness();
    await expect(
      service.createRequest(
        { title: 'x', amountMinor: 0, currency: 'bad' },
        administrator,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PAYMENT_REQUEST', statusCode: 400 });

    const created = await service.createRequest(
      { title: 'Consulting deposit', amountMinor: 5000, currency: 'EUR' },
      administrator,
    );
    const cancelled = await service.cancel(created.id, administrator);
    expect(cancelled.status).toBe('cancelled');
    await expect(service.activate(created.id, administrator)).rejects.toMatchObject({
      code: 'INVALID_PAYMENT_TRANSITION',
      statusCode: 409,
    });
  });
});
