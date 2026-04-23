# ADR-002: AI Usage, Limits, and Guardrails

## Status
Accepted

## Date
2026-04-23

## Context
The platform makes extensive use of AI-assisted development and automation,
including GitHub Copilot Coding Agent and potential runtime AI components
(e.g. summarization, drafting, analysis).

The platform operates in a **high-accountability regulatory context**
(GDPR, ISO 27001, NIS2, 231), where:
- legal responsibility is non-delegable
- decisions must be explainable
- accountability must be attributable to humans

Uncontrolled or autonomous AI behavior would create unacceptable legal
and operational risks.

Therefore, clear and enforceable guardrails are required.

## Decision
AI is allowed **exclusively as an assistive capability** and is governed
by the following rules.

### Principle: AI-Assisted, Human-Decided
AI may support humans, but **may never replace them** in decisions
that have legal, regulatory, or compliance impact.

The platform explicitly rejects:
- autonomous compliance decisions
- AI-driven approvals
- “AI-certified compliance” claims

### Allowed AI Capabilities
AI MAY be used to:
- draft documents, messages, or reports
- summarize content
- highlight inconsistencies or missing data
- suggest actions or next steps
- generate code under human review (Copilot)
- perform non-binding analysis or classification

All outputs are considered **proposals**, not outcomes.

### Prohibited AI Capabilities
AI MUST NOT:
- take final compliance or regulatory decisions
- decide whether incidents must be notified
- approve audits or attestations
- generate final legally binding documents
- override or bypass human validation
- act independently in tenant contexts

Any AI output used in decision-making must be explicitly reviewed and approved
by a human actor.

### Human-in-the-Loop Requirement
For every compliance-relevant action:
- a human actor must explicitly confirm or execute the action
- responsibility remains with the human role (DPO, Compliance Officer, Management)
- approvals must be traceable and auditable

AI cannot be the final actor in any workflow.

### Tenant Isolation and AI
AI usage must fully respect multitenancy constraints defined in ADR-001:
- AI context is strictly tenant-scoped
- no cross-tenant data may be mixed
- no shared memory across tenants
- no training, caching, or inference using data from other tenants

### Data Handling and Privacy
AI components must:
- use only explicitly provided input
- avoid retaining personal data beyond request scope
- avoid storing prompts or responses unless explicitly required and approved
- comply with data minimization principles

External AI services must be treated as data processors if used.

### Explainability and Auditability
AI-assisted actions:
- must be reproducible or explainable
- must not rely on opaque, irreversible reasoning
- must be logged when influencing workflows

At minimum, logs must record:
- AI involvement
- prompting context (high level)
- human action that accepted or rejected AI output

### Development-Time AI (Copilot)
AI used during development:
- must follow repository instructions and ADRs
- must not introduce architectural decisions autonomously
- must always be reviewed before merge
- is considered equivalent to junior developer output

Copilot-generated code has no special trust status.

## Alternatives Considered

### Fully Autonomous AI Workflows
Rejected because:
- violates accountability principles
- incompatible with NIS2 management responsibility
- creates unmanageable legal risk

### AI-Free Platform
Rejected because:
- unnecessary loss of productivity and quality
- AI assistance is acceptable if properly governed

## Consequences

### Positive
- Clear legal defensibility
- Alignment with regulatory expectations
- Safe adoption of AI capabilities
- Predictable audit posture
- Trust with enterprise and regulated customers

### Negative
- Increased implementation discipline
- Explicit human steps required
- Reduced automation in some workflows

These trade-offs are necessary and intentional.

## Implementation Notes
- This ADR is normative and binding.
- Any extension of AI capabilities requires review against this ADR.
- Any deviation requires a new ADR.

``
