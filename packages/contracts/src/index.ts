export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

export type ApiError = {
  code: string;
  message: string;
  correlationId: CorrelationId;
  fieldErrors?: Record<string, string[]>;
};
