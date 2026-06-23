import { createSupabaseContext, type AuthMode, type SupabaseContext } from '@supabase/server';
import type { FastifyRequest } from 'fastify';

import type { ApiRuntimeConfig } from './config.js';

export type SupabaseServerContext = SupabaseContext;

export async function createSupabaseServerContext(
  request: FastifyRequest,
  config: ApiRuntimeConfig,
  auth: AuthMode | AuthMode[] = 'user',
): Promise<SupabaseServerContext> {
  if (!config.supabase) {
    throw new Error('Supabase server SDK is not configured');
  }

  const result = await createSupabaseContext(toFetchRequest(request), {
    auth,
    env: {
      url: config.supabase.url,
      publishableKeys: { default: config.supabase.publishableKey },
      secretKeys: { default: config.supabase.secretKey },
      jwks: new URL(config.supabase.jwksUrl),
    },
    cors: false,
  });

  if (result.error) throw result.error;
  return result.data;
}

function toFetchRequest(request: FastifyRequest): Request {
  const protocol = request.protocol;
  const host = request.headers.host ?? 'localhost';
  const url = `${protocol}://${host}${request.url}`;
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, String(value));
    }
  }

  return new Request(url, { method: request.method, headers });
}
