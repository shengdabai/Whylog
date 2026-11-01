---
status: "accepted"
date: 2026-08-21
decision-makers: ["Tony"]
consulted: []
informed: []
---

# Build WHYLOG as a local-first web workbench

## Context and Problem Statement

The existing repository stores personal decision history as Markdown and JSON, but it has no guided project-decision workflow. The product must preserve the original longitudinal data model while adding fast ADR authoring and portable MADR output.

## Decision Drivers

* Data ownership and offline use
* Compatibility with Git and plain Markdown
* Low operational burden for one primary user
* Explicit separation between facts and assumptions

## Considered Options

* Local-first static React workbench with Markdown and JSON export
* Cloud-hosted full-stack collaboration application
* Prompt-only skill with no visual workbench

## Decision Outcome

Chosen option: "Local-first static React workbench", because it satisfies the current hard constraints without introducing an account system, server maintenance, or a second source of truth.

### Consequences

* Good, because the tool works without an account and data remains portable.
* Good, because the generated decision can live next to code in `docs/decisions`.
* Bad, because users must export or back up browser data themselves.
* Neutral, because team synchronization can be added later if repeated collaboration needs appear.

### Confirmation

Run unit tests, type checking, a production build, and browser acceptance on desktop and mobile. Create a real example, reload it, and download a readable MADR file.

## More Information

Revisit when three or more decisions require concurrent multi-user editing, or when the number of records makes client-side search noticeably slow.
