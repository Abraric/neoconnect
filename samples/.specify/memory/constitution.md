<!--
SYNC IMPACT REPORT
==================
Version change: [template/unversioned] → 1.0.0
Bump rationale: MINOR — initial population of all principles and governance from blank template.

Modified principles:
  [PRINCIPLE_1_NAME] → I. Code Quality
  [PRINCIPLE_2_NAME] → II. Testing Standards
  [PRINCIPLE_3_NAME] → III. User Experience Consistency
  [PRINCIPLE_4_NAME] → IV. Performance Requirements
  [PRINCIPLE_5_NAME] → removed (user requested exactly 4 principles)

Added sections:
  - Core Principles (4 principles)
  - Quality Gates
  - Governance

Removed sections:
  - [SECTION_2_NAME] / [SECTION_3_NAME] placeholders replaced by Quality Gates

Templates:
  ✅ .specify/templates/plan-template.md — Constitution Check section present; gates
     will be derived from this document at plan time; no structural change needed.
  ✅ .specify/templates/spec-template.md — Success Criteria and Requirements sections
     already align with Code Quality and Performance principles; no change needed.
  ✅ .specify/templates/tasks-template.md — Testing phases and Polish phase align with
     Testing Standards and Performance principles; no change needed.
  ✅ .specify/templates/constitution-template.md — source template; not modified.
  ✅ .claude/commands/speckit.*.md — no outdated principle references found.

Deferred TODOs: none — all placeholders resolved.
-->

# Neostat Constitution

## Core Principles

### I. Code Quality

Every line of code merged into the project MUST meet the following non-negotiable standards:

- **Readability first**: Code MUST be written for the next reader, not the current author.
  Functions and variables MUST have meaningful, self-documenting names; abbreviations are
  prohibited unless universally understood in the domain.
- **Single responsibility**: Each module, class, and function MUST have one clear purpose.
  Files exceeding 300 lines or functions exceeding 40 lines MUST be refactored before merge.
- **No dead code**: Commented-out code, unused imports, and unreachable branches MUST be
  removed before any PR is approved.
- **Consistent style**: All code MUST pass the project's configured linter and formatter
  with zero warnings. Style rules are enforced at CI gate — no exceptions.
- **Review gate**: Every change MUST be reviewed by at least one other contributor before
  merge. Self-merges to main/master are prohibited.

**Rationale**: Unreadable or inconsistent code compounds technical debt exponentially.
Enforcing quality at the point of contribution is cheaper than remediation post-merge.

### II. Testing Standards

Testing is non-negotiable and MUST follow a test-driven discipline:

- **Test-first (TDD)**: For all new features, tests MUST be written and confirmed to fail
  before implementation begins. The Red-Green-Refactor cycle is mandatory.
- **Coverage floor**: Unit test coverage MUST not drop below 80% on any merge to main.
  Coverage regressions that cross this threshold MUST be resolved before merge.
- **Three-tier testing**: Every feature MUST include unit tests, integration tests (covering
  service boundaries), and at least one end-to-end acceptance test tied to a user story.
- **Tests as documentation**: Test names MUST follow the pattern
  `given_[state]_when_[action]_then_[outcome]` so the test suite reads as a living spec.
- **No flaky tests**: A test that fails non-deterministically MUST be quarantined and fixed
  within one sprint. Flaky tests in the main suite are a blocking defect.
- **Independent test execution**: Each test MUST be runnable in isolation without depending
  on execution order, shared mutable state, or external network calls (use mocks/stubs).

**Rationale**: Untested code is a liability. Consistent testing discipline enables
refactoring confidence, faster debugging, and acts as a contract for future contributors.

### III. User Experience Consistency

All user-facing surfaces MUST present a coherent, predictable experience:

- **Design system adherence**: UI components MUST be drawn exclusively from the project's
  established design system. Custom one-off components require documented justification and
  design review approval.
- **Error messaging**: All user-visible error states MUST provide actionable guidance.
  Generic error messages ("Something went wrong") are prohibited; messages MUST explain
  what happened and what the user can do next.
- **Interaction patterns**: Equivalent actions MUST behave identically across all screens
  and surfaces. Navigation, confirmation dialogs, loading states, and form validation
  MUST follow documented UX patterns.
- **Accessibility (a11y)**: All interactive elements MUST meet WCAG 2.1 AA standards.
  Keyboard navigation, screen-reader labels, and sufficient color contrast are mandatory,
  not optional enhancements.
- **Feedback latency**: The UI MUST acknowledge every user action within 100 ms. If an
  operation takes longer, a loading/progress indicator MUST appear within that window.

**Rationale**: Inconsistent UX erodes user trust and increases support burden. Predictable
patterns reduce cognitive load and enable users to build accurate mental models of the product.

### IV. Performance Requirements

Performance targets are first-class requirements, not post-launch concerns:

- **Response time**: All API endpoints MUST respond within 200 ms at p95 under documented
  baseline load. Endpoints exceeding this threshold MUST be flagged in PR review and
  tracked to resolution.
- **Page/screen load**: Initial page or screen render MUST complete within 2 seconds on a
  mid-tier device and a 4G connection. Core Web Vitals (LCP, CLS, FID/INP) MUST remain
  in the "Good" range.
- **Regression prevention**: Performance benchmarks MUST be run in CI on every PR touching
  critical paths. A measured regression of >10% in any tracked metric is a merge blocker.
- **Efficient data access**: N+1 query patterns are prohibited. All database queries
  touching user-facing paths MUST be reviewed for index coverage before merge.
- **Resource budgets**: Front-end JS bundles MUST not exceed 250 KB (gzipped) for the
  initial load. New dependencies that increase the budget by >10 KB MUST be justified.

**Rationale**: Performance is a feature. Degraded performance directly impacts user
retention and business outcomes. Catching regressions at PR time is orders of magnitude
cheaper than fixing them in production.

## Quality Gates

All work MUST clear the following gates before merge to main:

| Gate | Enforcement | Blocking? |
|------|-------------|-----------|
| Linter + formatter pass (zero warnings) | CI | Yes |
| Unit test coverage ≥ 80% | CI | Yes |
| No new flaky tests introduced | CI + reviewer | Yes |
| Performance benchmarks within 10% of baseline | CI | Yes |
| Peer code review approved | GitHub PR | Yes |
| Accessibility audit pass (WCAG 2.1 AA) | Manual / CI tool | Yes |
| Dead code / commented-out blocks removed | Reviewer checklist | Yes |

Gates apply equally to feature work, bug fixes, and refactors. Exceptions require explicit
written justification in the PR and a follow-up ticket to resolve within one sprint.

## Governance

This constitution supersedes all informal conventions, prior tribal knowledge, and
individual preferences. It is the authoritative source for how work is done on Neostat.

**Amendment procedure**:
1. Propose amendment as a PR modifying this file with a written rationale.
2. Require approval from at least two contributors (or the project owner if sole contributor).
3. Bump version per semantic versioning rules defined below.
4. Update `LAST_AMENDED_DATE` to the merge date.
5. Propagate any changes to dependent templates (plan, spec, tasks) in the same PR.

**Versioning policy**:
- **MAJOR**: Backward-incompatible change — removal or redefinition of a principle that
  invalidates prior work.
- **MINOR**: New principle, section, or materially expanded guidance added.
- **PATCH**: Clarifications, wording fixes, or non-semantic refinements.

**Compliance review**: All PR reviewers MUST verify compliance with this constitution as
part of every review. Non-compliance is a valid blocking reason. The plan-template
Constitution Check section operationalises this gate for feature planning.

**Version**: 1.0.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14
