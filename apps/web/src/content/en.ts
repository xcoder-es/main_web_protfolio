import type { PageContent, PageKey } from './site';

export const englishPages: Readonly<Record<PageKey, PageContent>> = {
  home: {
    eyebrow: 'Independent technology leadership',
    title: 'Clearer technology decisions. Stronger systems. Practical AI.',
    description:
      'Carlos Pinto helps teams make hard technology decisions, modernise complex systems and ship useful AI-enabled products.',
    lead: 'Senior architecture, AI and product engineering support for teams that need clear judgement and hands-on delivery without adding a large consultancy layer.',
    primaryAction: { label: 'Request a project', href: '/request-a-project' },
    secondaryAction: { label: 'Explore the work', href: '/work' },
    sections: [
      {
        eyebrow: 'What I do',
        title: 'Turn uncertainty into an executable system.',
        body: [
          'I work with founders, executives and engineering leaders when a decision is important, the system is difficult or delivery risk is rising.',
        ],
        items: [
          {
            title: 'Technology strategy',
            body: 'Turn business intent into a coherent platform, operating model and investment sequence.',
            meta: 'Direction before delivery',
            href: '/services',
          },
          {
            title: 'AI product engineering',
            body: 'Design useful AI systems with explicit boundaries, evaluation, observability and human control.',
            meta: 'Applied, not ornamental',
            href: '/services',
          },
          {
            title: 'Architecture and modernisation',
            body: 'Untangle legacy constraints and shape systems that can evolve without permanent rewrites.',
            meta: 'Change without chaos',
            href: '/services',
          },
        ],
      },
      {
        eyebrow: 'Working principles',
        title: 'Small surface area, high leverage.',
        items: [
          {
            title: 'Truth over reassurance',
            body: 'The work begins with an honest reading of the system, incentives, constraints and delivery capability.',
          },
          {
            title: 'Validation over generation',
            body: 'AI accelerates the work, but evidence, tests and accountable human decisions remain the control plane.',
          },
          {
            title: 'Architecture as a decision system',
            body: 'Good architecture makes trade-offs visible, limits accidental complexity and preserves future options.',
          },
        ],
      },
      {
        eyebrow: 'Engagements',
        title: 'For work that needs senior judgement and execution.',
        body: [
          'Typical engagements include architecture recovery, AI strategy, platform design, technical due diligence, product rescue and fractional technology leadership.',
        ],
      },
    ],
  },
  services: {
    eyebrow: 'Services',
    title: 'Focused expertise for hard technology decisions.',
    description:
      'Architecture, AI and product services designed around outcomes rather than headcount.',
    lead: 'Each engagement starts by finding the real constraint: strategy, architecture, delivery capability or execution risk.',
    primaryAction: { label: 'Discuss an engagement', href: '/contact' },
    sections: [
      {
        title: 'Strategy and technical leadership',
        items: [
          {
            title: 'Technology strategy',
            body: 'Target architecture, capability roadmap, investment sequencing and decision governance.',
          },
          {
            title: 'Fractional CTO and architecture leadership',
            body: 'Executive-level technical direction with enough implementation depth to keep strategy honest.',
          },
          {
            title: 'Technical due diligence',
            body: 'A direct assessment of product, platform, team, delivery risk and technology debt.',
          },
        ],
      },
      {
        title: 'AI and intelligent products',
        items: [
          {
            title: 'AI product strategy',
            body: 'Select problems where AI creates durable value, then define the evidence required to prove it.',
          },
          {
            title: 'Agentic and retrieval systems',
            body: 'Design bounded agents, retrieval pipelines, evaluation loops, observability and human controls.',
          },
          {
            title: 'AI delivery acceleration',
            body: 'Introduce AI-assisted engineering without weakening quality, security or architectural integrity.',
          },
        ],
      },
      {
        title: 'Architecture and engineering',
        items: [
          {
            title: 'Platform and integration architecture',
            body: 'APIs, events, workflows, data boundaries, cloud services and operational responsibility.',
          },
          {
            title: 'Legacy modernisation',
            body: 'Incremental transition plans that preserve business continuity and reduce migration risk.',
          },
          {
            title: 'Product recovery',
            body: 'Stabilise delivery, reduce ambiguity and restore a credible path from backlog to outcome.',
          },
        ],
      },
    ],
  },
  work: {
    eyebrow: 'Selected work',
    title: 'Systems designed for real operating conditions.',
    description:
      'Representative areas of work across AI, enterprise platforms, data and product delivery.',
    lead: 'The examples below show the kind of work delivered without exposing confidential client information.',
    primaryAction: { label: 'Read the case studies', href: '/case-studies' },
    sections: [
      {
        title: 'Applied AI platforms',
        items: [
          {
            title: 'Multi-agent knowledge systems',
            body: 'Classification, retrieval, reranking, generation, evaluation and source-grounded responses behind clear application boundaries.',
            meta: 'AI · RAG · Evaluation',
          },
          {
            title: 'AI-assisted data migration',
            body: 'Schema discovery, mapping, validation and exception handling designed around deterministic controls.',
            meta: 'AI · Data · Workflow',
          },
          {
            title: 'Natural-language operations',
            body: 'Interfaces that translate intent into governed workflows, reports and domain actions.',
            meta: 'Agents · UX · Orchestration',
          },
        ],
      },
      {
        title: 'Enterprise systems',
        items: [
          {
            title: 'Headless domain platforms',
            body: 'Modular platforms with explicit contracts, event boundaries and independent delivery paths.',
            meta: 'Architecture · APIs · Events',
          },
          {
            title: 'Parallel validation engines',
            body: 'Controlled comparison of legacy and modernised processing with traceable variance analysis.',
            meta: 'Migration · Assurance · Data',
          },
          {
            title: 'Cloud and data foundations',
            body: 'Operational data flows, layered processing, observability and secure service integration.',
            meta: 'Cloud · Data · Reliability',
          },
        ],
      },
    ],
  },
  caseStudies: {
    eyebrow: 'Case studies',
    title: 'The decisions behind the systems.',
    description:
      'Condensed case studies focused on architecture, constraints and measurable change.',
    lead: 'Names and sensitive details are omitted. The emphasis is on reasoning, architecture and delivery approach.',
    sections: [
      {
        eyebrow: '01',
        title: 'Payroll knowledge assistant',
        body: [
          'The challenge was not simply to add a chatbot. It was to produce grounded answers across legislation, policies and internal knowledge while preserving trust.',
          'The solution separated classification, retrieval, reranking and generation behind application-owned contracts. Citations, evaluation and observable failure modes were treated as product requirements, not optional polish.',
        ],
        items: [
          {
            title: 'Result',
            body: 'A multi-source AI capability that could evolve without locking the product to one model or framework.',
          },
        ],
      },
      {
        eyebrow: '02',
        title: 'Parallel processing validation',
        body: [
          'A modern platform needed to prove equivalence against a long-lived legacy system before customer migration.',
          'The architecture introduced explicit run orchestration, deterministic comparison, high-precision calculations and traceable variance analysis rather than relying on manual sampling.',
        ],
        items: [
          {
            title: 'Result',
            body: 'A repeatable evidence system for migration readiness and exception investigation.',
          },
        ],
      },
      {
        eyebrow: '03',
        title: 'AI-first product delivery',
        body: [
          'The objective was to increase delivery speed without replacing engineering judgement with generated code.',
          'The operating model centred on specification quality, architectural constraints, automated checks and validation over generation.',
        ],
        items: [
          {
            title: 'Result',
            body: 'Faster iteration with a stronger review discipline and clearer ownership of technical decisions.',
          },
        ],
      },
    ],
  },
  about: {
    eyebrow: 'About',
    title: 'A technical strategist who still builds.',
    description:
      'Independent technology leadership grounded in architecture, engineering and applied AI.',
    lead: 'I work best where business ambition, complex systems and delivery pressure collide.',
    primaryAction: { label: 'Start a conversation', href: '/contact' },
    sections: [
      {
        title: 'Perspective',
        body: [
          'My work spans strategy, architecture, software engineering, AI systems, cloud platforms and technical leadership. The common thread is turning ambiguity into systems that people can operate and evolve.',
          'I favour explicit contracts, simple operating models and architecture that exposes trade-offs instead of hiding them behind fashionable terminology.',
        ],
      },
      {
        title: 'How I work',
        items: [
          {
            title: 'Directly',
            body: 'Problems are named clearly, including organisational and delivery constraints.',
          },
          {
            title: 'Practically',
            body: 'Strategy remains connected to code, systems, data, operations and real users.',
          },
          {
            title: 'Independently',
            body: 'Recommendations are not shaped by reseller incentives or a bench that needs utilisation.',
          },
        ],
      },
      {
        title: 'Based in Madrid. Working internationally.',
        body: [
          'Engagements can be remote, hybrid or on-site depending on scope, location and the stage of the work.',
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Start with the problem, not a sales process.',
    description:
      'Share the context, the constraint and what needs to change. You will receive a direct response.',
    lead: 'For a quick conversation, use email or WhatsApp. For a defined initiative, use the project request page.',
    primaryAction: { label: 'Email Carlos', href: 'mailto:capintobe@gmail.com' },
    secondaryAction: { label: 'Open WhatsApp', href: 'https://wa.me/34625038287' },
    sections: [
      {
        title: 'Useful context to include',
        items: [
          { title: 'The decision', body: 'What must become clearer, safer or faster?' },
          { title: 'The system', body: 'What exists today, and where is it failing?' },
          { title: 'The consequence', body: 'What happens if nothing changes?' },
        ],
      },
      {
        title: 'Contact details',
        body: [
          'Email: capintobe@gmail.com',
          'Phone and WhatsApp: +34 625 038 287',
          'Location: Madrid, Spain',
        ],
      },
    ],
  },
  requestProject: {
    eyebrow: 'Project request',
    title: 'Describe the work that matters.',
    description:
      'A structured starting point for architecture, AI, modernisation and product engagements.',
    lead: 'The self-hosted project form and secure submission flow are delivered in the next implementation issue. For now, send the same context by email or WhatsApp.',
    primaryAction: {
      label: 'Send project details by email',
      href: 'mailto:capintobe@gmail.com?subject=Project%20request',
    },
    secondaryAction: { label: 'Discuss on WhatsApp', href: 'https://wa.me/34625038287' },
    sections: [
      {
        title: 'Please cover',
        items: [
          { title: 'Outcome', body: 'The business or operational result the work must create.' },
          {
            title: 'Current state',
            body: 'Relevant products, systems, architecture, team and constraints.',
          },
          { title: 'Timing', body: 'Important dates, dependencies and decision windows.' },
          {
            title: 'Commercial context',
            body: 'Budget range, procurement expectations and decision authority.',
          },
        ],
      },
      {
        title: 'Good fit',
        body: [
          'The strongest fit is a meaningful problem with clear access to decision-makers, domain experts and the systems involved.',
        ],
      },
    ],
  },
  payment: {
    eyebrow: 'Secure payment',
    title: 'Pay an agreed project request.',
    description:
      'Payment links are created by Carlos with a fixed amount and verified by the server before success is displayed.',
    lead: 'Never enter an amount sent through an unverified message. Use only the unique payment link provided for your engagement.',
    sections: [
      {
        title: 'How it works',
        items: [
          {
            title: '1. Agreed request',
            body: 'The engagement, milestone and amount are confirmed before a link is created.',
          },
          {
            title: '2. PayPal approval',
            body: 'PayPal handles account or card approval. This website never receives card details.',
          },
          {
            title: '3. Server verification',
            body: 'The platform verifies order, amount, currency and provider status before recording payment.',
          },
        ],
      },
      {
        title: 'Need help?',
        body: [
          'Contact capintobe@gmail.com before paying if the title, amount, currency or project reference is unexpected.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy is treated as a system property.',
    description:
      'A plain-language overview of how this independent consulting website handles information.',
    lead: 'The website is designed to collect only what is needed to respond, operate the service and meet legal obligations.',
    sections: [
      {
        title: 'Information collected',
        body: [
          'Contact and project details you choose to submit, operational security logs, and payment references required to reconcile a transaction.',
          'Card details and PayPal credentials are not collected or stored by this platform.',
        ],
      },
      {
        title: 'How information is used',
        body: [
          'To respond to enquiries, assess potential work, deliver agreed services, secure the platform and maintain financial records.',
        ],
      },
      {
        title: 'Your choices',
        body: [
          'You may request access, correction or deletion where applicable by emailing capintobe@gmail.com.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Terms',
    title: 'Clear expectations before an engagement begins.',
    description: 'General website and enquiry terms for Carlos Pinto Digital Consulting.',
    lead: 'A proposal, statement of work or signed agreement will govern any paid engagement and will override these general website terms where they differ.',
    sections: [
      {
        title: 'Website information',
        body: [
          'Public content is provided for general information and does not constitute legal, financial or regulated professional advice.',
        ],
      },
      {
        title: 'Project discussions',
        body: [
          'An enquiry, call or draft proposal does not create a client relationship. Work begins only after commercial terms and scope are agreed.',
        ],
      },
      {
        title: 'Intellectual property and confidentiality',
        body: [
          'Ownership, licences, confidentiality and permitted use are defined in the engagement agreement for each project.',
        ],
      },
      {
        title: 'Payments',
        body: [
          'Payment links apply only to the named request and amount. Refunds, milestones and cancellation terms follow the governing engagement agreement.',
        ],
      },
    ],
  },
};
