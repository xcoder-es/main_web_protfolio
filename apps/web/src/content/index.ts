import { englishPages } from './en';
import { spanishPages } from './es';
import type { Locale, PageContent, PageKey } from './site';

const privacyPages: Readonly<Record<Locale, PageContent>> = {
  en: {
    eyebrow: 'Privacy',
    title: 'Privacy is treated as a system property.',
    description:
      'A plain-language explanation of the information this independent consulting platform collects, stores and shares.',
    lead: 'The platform collects only information needed to respond to enquiries, operate agreed work, reconcile payments, secure the service and meet applicable obligations.',
    sections: [
      {
        title: 'Information you provide',
        body: [
          'Contact enquiries may include your name, email address, phone number, subject and message. Project requests may also include your organisation, project type, budget range, timing and project context.',
          'Administrator notes may be added after an enquiry is received. Payment records contain the agreed description, amount, currency, status and provider references. This platform never receives or stores card details or PayPal account credentials.',
        ],
      },
      {
        title: 'Operational and security information',
        body: [
          'The API records metadata-only operational logs such as a correlation ID, route template, method, response status, duration and controlled error code. Request bodies, contact details, authentication tokens and provider secrets are excluded from application logs.',
          'IP addresses may be processed transiently for rate limiting and challenge verification. Verified payment callbacks are reduced to the event and reconciliation references needed to prevent duplicates and investigate payment state.',
        ],
      },
      {
        title: 'Service providers',
        body: [
          'The platform may use Render for hosting, Supabase for private database services, Clerk for administrator identity, Resend for email delivery, Cloudflare Turnstile for optional abuse verification and PayPal for payment approval and reconciliation.',
          'Each provider receives only the information required for its function. Public visitors are not required to create a Clerk account, and payment card information is handled by PayPal rather than this website.',
        ],
      },
      {
        title: 'Retention and deletion',
        body: [
          'The operational baseline is up to 30 days for logs and spam-classified enquiries, 180 days for notification and webhook summaries, two years for active enquiry and audit records, and six years for payment records. A contract, legal obligation, dispute or active engagement may require a different period.',
          'Retention is reviewed from the protected administrator workspace. When information is no longer required, it should be deleted or reduced to the minimum record needed for legal, financial or security purposes.',
        ],
      },
      {
        title: 'Your choices and contact',
        body: [
          'You may ask for access, correction or deletion where applicable by emailing capintobe@gmail.com. Include enough information to identify the relevant enquiry without sending passwords, payment credentials or other unnecessary sensitive data.',
          'Security is designed around restricted administrator access, private server credentials, encrypted provider connections, sanitized public errors and auditable administrative actions. No internet service can guarantee absolute security.',
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Privacidad',
    title: 'La privacidad se trata como una propiedad del sistema.',
    description:
      'Una explicación clara de la información que esta plataforma de consultoría independiente recopila, almacena y comparte.',
    lead: 'La plataforma recopila únicamente lo necesario para responder consultas, operar trabajos acordados, conciliar pagos, proteger el servicio y cumplir obligaciones aplicables.',
    sections: [
      {
        title: 'Información que proporcionas',
        body: [
          'Las consultas pueden incluir nombre, correo electrónico, teléfono, asunto y mensaje. Las solicitudes de proyecto también pueden incluir empresa, tipo de proyecto, presupuesto, plazo y contexto.',
          'Después de recibir una consulta pueden añadirse notas administrativas. Los registros de pago contienen descripción acordada, importe, moneda, estado y referencias del proveedor. Esta plataforma nunca recibe ni almacena datos de tarjeta o credenciales de PayPal.',
        ],
      },
      {
        title: 'Información operativa y de seguridad',
        body: [
          'La API registra únicamente metadatos operativos como identificador de correlación, plantilla de ruta, método, estado de respuesta, duración y código de error controlado. Los cuerpos de solicitud, datos de contacto, tokens de autenticación y credenciales de proveedores se excluyen de los logs de aplicación.',
          'Las direcciones IP pueden procesarse temporalmente para limitar solicitudes y verificar desafíos. Los callbacks de pago verificados se reducen a las referencias de evento y conciliación necesarias para evitar duplicados e investigar el estado del pago.',
        ],
      },
      {
        title: 'Proveedores de servicio',
        body: [
          'La plataforma puede utilizar Render para alojamiento, Supabase para servicios privados de base de datos, Clerk para identidad administrativa, Resend para correo, Cloudflare Turnstile para verificación opcional contra abuso y PayPal para aprobación y conciliación de pagos.',
          'Cada proveedor recibe únicamente la información necesaria para su función. Los visitantes no necesitan crear una cuenta de Clerk y los datos de tarjeta son gestionados por PayPal, no por este sitio.',
        ],
      },
      {
        title: 'Conservación y eliminación',
        body: [
          'La base operativa es de hasta 30 días para logs y consultas clasificadas como spam, 180 días para resúmenes de notificaciones y webhooks, dos años para consultas y auditoría, y seis años para registros de pago. Un contrato, obligación legal, disputa o proyecto activo puede exigir otro plazo.',
          'La conservación se revisa desde el espacio administrativo protegido. Cuando la información deja de ser necesaria, debe eliminarse o reducirse al mínimo registro requerido para fines legales, financieros o de seguridad.',
        ],
      },
      {
        title: 'Tus opciones y contacto',
        body: [
          'Puedes solicitar acceso, corrección o eliminación cuando corresponda escribiendo a capintobe@gmail.com. Incluye información suficiente para identificar la consulta sin enviar contraseñas, credenciales de pago u otros datos sensibles innecesarios.',
          'La seguridad se basa en acceso administrativo restringido, credenciales privadas del servidor, conexiones cifradas, errores públicos saneados y acciones administrativas auditables. Ningún servicio de internet puede garantizar seguridad absoluta.',
        ],
      },
    ],
  },
};

const baseRegistry: Readonly<Record<Locale, Readonly<Record<PageKey, PageContent>>>> = {
  en: englishPages,
  es: spanishPages,
};

const registry: Readonly<Record<Locale, Readonly<Record<PageKey, PageContent>>>> = {
  en: { ...baseRegistry.en, privacy: privacyPages.en },
  es: { ...baseRegistry.es, privacy: privacyPages.es },
};

export function getPageContent(locale: Locale, key: PageKey): PageContent {
  const page = registry[locale][key];
  if (key === 'contact') {
    return {
      ...page,
      primaryAction: {
        label: locale === 'en' ? 'Use the secure form' : 'Usar el formulario seguro',
        href: '#contact-form-title',
      },
    };
  }
  if (key === 'requestProject') {
    return {
      ...page,
      lead:
        locale === 'en'
          ? 'Use the secure form below to share the outcome, current state, timing and commercial context. The same request can be retried safely without creating duplicates.'
          : 'Usa el formulario seguro para compartir el resultado, el estado actual, el plazo y el contexto comercial. La misma solicitud puede reintentarse sin crear duplicados.',
      primaryAction: {
        label: locale === 'en' ? 'Start the secure request' : 'Iniciar solicitud segura',
        href: '#project-form-title',
      },
    };
  }
  return page;
}

export { registry as pages };
