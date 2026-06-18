import type { PageContent, PageKey } from './site';

export const spanishPages: Readonly<Record<PageKey, PageContent>> = {
  home: {
    eyebrow: 'Liderazgo tecnológico independiente',
    title: 'Decisiones tecnológicas claras. Sistemas más sólidos. IA práctica.',
    description:
      'Carlos Pinto ayuda a equipos a tomar decisiones tecnológicas difíciles, modernizar sistemas complejos y entregar productos útiles con IA.',
    lead: 'Apoyo senior en arquitectura, IA e ingeniería de producto para equipos que necesitan criterio claro y ejecución práctica sin añadir una gran capa de consultoría.',
    primaryAction: { label: 'Solicitar proyecto', href: '/es/solicitar-proyecto' },
    secondaryAction: { label: 'Explorar el trabajo', href: '/es/trabajo' },
    sections: [
      {
        eyebrow: 'Qué hago',
        title: 'Convertir incertidumbre en un sistema ejecutable.',
        body: [
          'Trabajo con fundadores, ejecutivos y líderes de ingeniería cuando una decisión es importante, el sistema es difícil o el riesgo de entrega aumenta.',
        ],
        items: [
          {
            title: 'Estrategia tecnológica',
            body: 'Convertir la intención del negocio en una plataforma, un modelo operativo y una secuencia de inversión coherentes.',
            meta: 'Dirección antes que entrega',
            href: '/es/servicios',
          },
          {
            title: 'Ingeniería de productos con IA',
            body: 'Diseñar sistemas de IA útiles con límites explícitos, evaluación, observabilidad y control humano.',
            meta: 'Aplicada, no decorativa',
            href: '/es/servicios',
          },
          {
            title: 'Arquitectura y modernización',
            body: 'Desenredar restricciones heredadas y construir sistemas capaces de evolucionar sin reescrituras permanentes.',
            meta: 'Cambio sin caos',
            href: '/es/servicios',
          },
        ],
      },
      {
        eyebrow: 'Principios de trabajo',
        title: 'Poca superficie, mucho impacto.',
        items: [
          {
            title: 'Verdad antes que tranquilidad',
            body: 'El trabajo comienza con una lectura honesta del sistema, los incentivos, las restricciones y la capacidad real de entrega.',
          },
          {
            title: 'Validación antes que generación',
            body: 'La IA acelera el trabajo, pero la evidencia, las pruebas y las decisiones humanas responsables siguen siendo el plano de control.',
          },
          {
            title: 'Arquitectura como sistema de decisión',
            body: 'La buena arquitectura hace visibles los compromisos, limita la complejidad accidental y preserva opciones futuras.',
          },
        ],
      },
      {
        eyebrow: 'Proyectos',
        title: 'Para trabajos que necesitan criterio senior y ejecución.',
        body: [
          'Los proyectos habituales incluyen recuperación arquitectónica, estrategia de IA, diseño de plataformas, due diligence técnico, rescate de producto y liderazgo tecnológico fraccional.',
        ],
      },
    ],
  },
  services: {
    eyebrow: 'Servicios',
    title: 'Experiencia enfocada para decisiones tecnológicas difíciles.',
    description:
      'Servicios de arquitectura, IA y producto diseñados alrededor de resultados, no de cantidad de consultores.',
    lead: 'Cada proyecto empieza identificando la restricción real: estrategia, arquitectura, capacidad de entrega o riesgo de ejecución.',
    primaryAction: { label: 'Hablar sobre un proyecto', href: '/es/contacto' },
    sections: [
      {
        title: 'Estrategia y liderazgo técnico',
        items: [
          {
            title: 'Estrategia tecnológica',
            body: 'Arquitectura objetivo, hoja de ruta de capacidades, secuencia de inversión y gobierno de decisiones.',
          },
          {
            title: 'CTO fraccional y liderazgo de arquitectura',
            body: 'Dirección técnica ejecutiva con suficiente profundidad de implementación para mantener honesta la estrategia.',
          },
          {
            title: 'Due diligence técnico',
            body: 'Evaluación directa del producto, la plataforma, el equipo, el riesgo de entrega y la deuda tecnológica.',
          },
        ],
      },
      {
        title: 'IA y productos inteligentes',
        items: [
          {
            title: 'Estrategia de producto con IA',
            body: 'Seleccionar problemas donde la IA crea valor duradero y definir la evidencia necesaria para demostrarlo.',
          },
          {
            title: 'Sistemas agénticos y de recuperación',
            body: 'Diseñar agentes acotados, recuperación, evaluación, observabilidad y controles humanos.',
          },
          {
            title: 'Aceleración de entrega con IA',
            body: 'Introducir ingeniería asistida por IA sin debilitar calidad, seguridad ni integridad arquitectónica.',
          },
        ],
      },
      {
        title: 'Arquitectura e ingeniería',
        items: [
          {
            title: 'Arquitectura de plataforma e integración',
            body: 'APIs, eventos, flujos, límites de datos, servicios cloud y responsabilidad operativa.',
          },
          {
            title: 'Modernización de sistemas heredados',
            body: 'Planes incrementales que preservan continuidad del negocio y reducen el riesgo de migración.',
          },
          {
            title: 'Recuperación de producto',
            body: 'Estabilizar la entrega, reducir ambigüedad y recuperar una ruta creíble desde el backlog al resultado.',
          },
        ],
      },
    ],
  },
  work: {
    eyebrow: 'Trabajo seleccionado',
    title: 'Sistemas diseñados para condiciones reales de operación.',
    description:
      'Áreas representativas de trabajo en IA, plataformas empresariales, datos y entrega de producto.',
    lead: 'Los ejemplos muestran el tipo de trabajo entregado sin revelar información confidencial de clientes.',
    primaryAction: { label: 'Ver casos de estudio', href: '/es/casos-de-estudio' },
    sections: [
      {
        title: 'Plataformas de IA aplicada',
        items: [
          {
            title: 'Sistemas de conocimiento multiagente',
            body: 'Clasificación, recuperación, reranking, generación, evaluación y respuestas con fuentes detrás de límites claros.',
            meta: 'IA · RAG · Evaluación',
          },
          {
            title: 'Migración de datos asistida por IA',
            body: 'Descubrimiento de esquemas, mapeo, validación y gestión de excepciones con controles deterministas.',
            meta: 'IA · Datos · Flujos',
          },
          {
            title: 'Operaciones en lenguaje natural',
            body: 'Interfaces que traducen intención en flujos gobernados, informes y acciones de dominio.',
            meta: 'Agentes · UX · Orquestación',
          },
        ],
      },
      {
        title: 'Sistemas empresariales',
        items: [
          {
            title: 'Plataformas de dominio headless',
            body: 'Plataformas modulares con contratos explícitos, límites de eventos y caminos de entrega independientes.',
            meta: 'Arquitectura · APIs · Eventos',
          },
          {
            title: 'Motores de validación paralela',
            body: 'Comparación controlada entre procesamiento heredado y moderno con análisis trazable de diferencias.',
            meta: 'Migración · Garantía · Datos',
          },
          {
            title: 'Fundaciones cloud y de datos',
            body: 'Flujos operativos, procesamiento por capas, observabilidad e integración segura de servicios.',
            meta: 'Cloud · Datos · Confiabilidad',
          },
        ],
      },
    ],
  },
  caseStudies: {
    eyebrow: 'Casos de estudio',
    title: 'Las decisiones detrás de los sistemas.',
    description: 'Casos condensados centrados en arquitectura, restricciones y cambio medible.',
    lead: 'Los nombres y detalles sensibles se omiten. El foco está en el razonamiento, la arquitectura y la entrega.',
    sections: [
      {
        eyebrow: '01',
        title: 'Asistente de conocimiento de nómina',
        body: [
          'El reto no era añadir un chatbot, sino responder con fundamento sobre legislación, políticas y conocimiento interno sin perder confianza.',
          'La solución separó clasificación, recuperación, reranking y generación detrás de contratos propios. Las citas, la evaluación y los fallos observables se trataron como requisitos de producto.',
        ],
        items: [
          {
            title: 'Resultado',
            body: 'Una capacidad de IA multifuente capaz de evolucionar sin depender de un solo modelo o framework.',
          },
        ],
      },
      {
        eyebrow: '02',
        title: 'Validación de procesamiento paralelo',
        body: [
          'Una plataforma moderna debía demostrar equivalencia frente a un sistema heredado antes de migrar clientes.',
          'La arquitectura introdujo orquestación explícita, comparación determinista, alta precisión y análisis trazable de diferencias.',
        ],
        items: [
          {
            title: 'Resultado',
            body: 'Un sistema repetible de evidencia para preparación de migraciones e investigación de excepciones.',
          },
        ],
      },
      {
        eyebrow: '03',
        title: 'Entrega de producto AI-first',
        body: [
          'El objetivo era aumentar velocidad sin reemplazar el juicio de ingeniería por código generado.',
          'El modelo operativo se centró en calidad de especificación, restricciones arquitectónicas, controles automatizados y validación antes que generación.',
        ],
        items: [
          {
            title: 'Resultado',
            body: 'Iteraciones más rápidas con mayor disciplina de revisión y propiedad clara de las decisiones técnicas.',
          },
        ],
      },
    ],
  },
  about: {
    eyebrow: 'Sobre mí',
    title: 'Un estratega técnico que todavía construye.',
    description:
      'Liderazgo tecnológico independiente basado en arquitectura, ingeniería e IA aplicada.',
    lead: 'Trabajo mejor donde se cruzan la ambición del negocio, los sistemas complejos y la presión por entregar.',
    primaryAction: { label: 'Iniciar conversación', href: '/es/contacto' },
    sections: [
      {
        title: 'Perspectiva',
        body: [
          'Mi trabajo abarca estrategia, arquitectura, ingeniería de software, sistemas de IA, plataformas cloud y liderazgo técnico. El hilo común es convertir ambigüedad en sistemas que las personas puedan operar y evolucionar.',
          'Prefiero contratos explícitos, modelos operativos simples y arquitectura que muestre los compromisos en vez de ocultarlos detrás de terminología de moda.',
        ],
      },
      {
        title: 'Cómo trabajo',
        items: [
          {
            title: 'De forma directa',
            body: 'Los problemas se nombran con claridad, incluidas las restricciones organizacionales y de entrega.',
          },
          {
            title: 'De forma práctica',
            body: 'La estrategia permanece conectada con código, sistemas, datos, operaciones y usuarios reales.',
          },
          {
            title: 'De forma independiente',
            body: 'Las recomendaciones no responden a incentivos de reventa ni a equipos que necesiten ocupación.',
          },
        ],
      },
      {
        title: 'En Madrid. Trabajando internacionalmente.',
        body: [
          'Los proyectos pueden ser remotos, híbridos o presenciales según el alcance, la ubicación y la etapa del trabajo.',
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'Contacto',
    title: 'Empieza por el problema, no por un proceso de ventas.',
    description:
      'Comparte el contexto, la restricción y lo que debe cambiar. Recibirás una respuesta directa.',
    lead: 'Para una conversación rápida, usa email o WhatsApp. Para una iniciativa definida, utiliza la página de solicitud de proyecto.',
    primaryAction: { label: 'Escribir por email', href: 'mailto:capintobe@gmail.com' },
    secondaryAction: { label: 'Abrir WhatsApp', href: 'https://wa.me/34625038287' },
    sections: [
      {
        title: 'Contexto útil',
        items: [
          { title: 'La decisión', body: '¿Qué debe ser más claro, seguro o rápido?' },
          { title: 'El sistema', body: '¿Qué existe hoy y dónde está fallando?' },
          { title: 'La consecuencia', body: '¿Qué ocurre si nada cambia?' },
        ],
      },
      {
        title: 'Datos de contacto',
        body: [
          'Email: capintobe@gmail.com',
          'Teléfono y WhatsApp: +34 625 038 287',
          'Ubicación: Madrid, España',
        ],
      },
    ],
  },
  requestProject: {
    eyebrow: 'Solicitud de proyecto',
    title: 'Describe el trabajo que realmente importa.',
    description:
      'Un punto de partida estructurado para proyectos de arquitectura, IA, modernización y producto.',
    lead: 'El formulario autogestionado y su flujo seguro se implementan en el siguiente issue. Mientras tanto, envía el mismo contexto por email o WhatsApp.',
    primaryAction: {
      label: 'Enviar detalles por email',
      href: 'mailto:capintobe@gmail.com?subject=Solicitud%20de%20proyecto',
    },
    secondaryAction: { label: 'Hablar por WhatsApp', href: 'https://wa.me/34625038287' },
    sections: [
      {
        title: 'Incluye',
        items: [
          {
            title: 'Resultado',
            body: 'El resultado de negocio u operativo que el trabajo debe crear.',
          },
          {
            title: 'Estado actual',
            body: 'Productos, sistemas, arquitectura, equipo y restricciones relevantes.',
          },
          { title: 'Tiempo', body: 'Fechas importantes, dependencias y ventanas de decisión.' },
          {
            title: 'Contexto comercial',
            body: 'Rango de presupuesto, compras y autoridad para decidir.',
          },
        ],
      },
      {
        title: 'Buen encaje',
        body: [
          'El mejor encaje es un problema significativo con acceso claro a responsables de decisión, expertos de dominio y sistemas involucrados.',
        ],
      },
    ],
  },
  payment: {
    eyebrow: 'Pago seguro',
    title: 'Paga una solicitud de proyecto acordada.',
    description:
      'Los enlaces de pago los crea Carlos con un importe fijo y el servidor los verifica antes de mostrar éxito.',
    lead: 'Nunca introduzcas un importe enviado mediante un mensaje no verificado. Usa únicamente el enlace único de tu proyecto.',
    sections: [
      {
        title: 'Cómo funciona',
        items: [
          {
            title: '1. Solicitud acordada',
            body: 'Se confirman proyecto, hito e importe antes de crear el enlace.',
          },
          {
            title: '2. Aprobación en PayPal',
            body: 'PayPal gestiona la aprobación. Este sitio nunca recibe datos de tarjeta.',
          },
          {
            title: '3. Verificación del servidor',
            body: 'La plataforma verifica pedido, importe, moneda y estado antes de registrar el pago.',
          },
        ],
      },
      {
        title: '¿Necesitas ayuda?',
        body: [
          'Escribe a capintobe@gmail.com antes de pagar si el título, importe, moneda o referencia no son los esperados.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacidad',
    title: 'La privacidad se trata como una propiedad del sistema.',
    description:
      'Resumen claro de cómo este sitio de consultoría independiente maneja la información.',
    lead: 'El sitio está diseñado para recopilar únicamente lo necesario para responder, operar el servicio y cumplir obligaciones legales.',
    sections: [
      {
        title: 'Información recopilada',
        body: [
          'Datos de contacto y proyecto que decidas enviar, registros operativos de seguridad y referencias necesarias para conciliar pagos.',
          'La plataforma no recopila ni almacena datos de tarjeta ni credenciales de PayPal.',
        ],
      },
      {
        title: 'Uso de la información',
        body: [
          'Responder consultas, evaluar proyectos, prestar servicios acordados, proteger la plataforma y mantener registros financieros.',
        ],
      },
      {
        title: 'Tus opciones',
        body: [
          'Puedes solicitar acceso, corrección o eliminación cuando corresponda escribiendo a capintobe@gmail.com.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Términos',
    title: 'Expectativas claras antes de comenzar.',
    description:
      'Términos generales del sitio y de las consultas para Carlos Pinto Digital Consulting.',
    lead: 'Una propuesta, alcance de trabajo o acuerdo firmado regirá cualquier proyecto pagado y prevalecerá sobre estos términos generales cuando exista diferencia.',
    sections: [
      {
        title: 'Información del sitio',
        body: [
          'El contenido público es informativo y no constituye asesoría legal, financiera ni profesional regulada.',
        ],
      },
      {
        title: 'Conversaciones de proyecto',
        body: [
          'Una consulta, llamada o propuesta preliminar no crea una relación profesional. El trabajo comienza cuando se acuerdan alcance y condiciones comerciales.',
        ],
      },
      {
        title: 'Propiedad intelectual y confidencialidad',
        body: [
          'La propiedad, licencias, confidencialidad y usos permitidos se definen en el acuerdo de cada proyecto.',
        ],
      },
      {
        title: 'Pagos',
        body: [
          'Los enlaces de pago aplican únicamente a la solicitud e importe indicados. Reembolsos, hitos y cancelaciones siguen el acuerdo correspondiente.',
        ],
      },
    ],
  },
};
