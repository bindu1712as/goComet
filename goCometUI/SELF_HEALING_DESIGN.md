# Self-Healing Locator Design - Search Flow

## 1. Design Scope

This design describes the active runtime self-healing implementation used by SearchPage.

Primary code paths:
- [framework/pages/searchPage.ts](framework/pages/searchPage.ts#L19)
- [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L65)

Legacy parallel implementation for context:
- [framework/utils/selfHealingLocator.ts](framework/utils/selfHealingLocator.ts#L18)

## 2. Architectural Intent

Goal:
- Prevent transient selector drift from failing the Search test when equivalent fallback locators can recover safely.

Non-goals:
- Global framework-wide auto-healing across all pages.
- Silent masking of complete element unavailability.

Design properties:
- Deterministic fallback order.
- Explicit candidate validation.
- Observability through logs and report attachment.
- Hard failure when all strategies fail.

## 3. Components

### 3.1 Caller component

File: [framework/pages/searchPage.ts](framework/pages/searchPage.ts#L19)

Responsibilities:
- Build options object with:
  - logical name
  - primary locator
  - primary description
  - ordered fallback descriptors
- Invoke healLocator and consume resolved locator.

### 3.2 Healing engine component

File: [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L65)

Responsibilities:
- Evaluate primary candidate usability.
- Iterate fallback array in order.
- Validate each candidate via count/visible/enabled.
- Emit runtime logs and report attachments.
- Throw exhaustive error if unresolved.

### 3.3 Validation component

File: [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L154)

Rule set:
- count > 0
- isVisible is true
- isEnabled is true

### 3.4 Reporting component

File: [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L182)

Outputs:
- Text attachment in Playwright report containing:
  - Locator Name
  - Failed Locator
  - Recovered Using
  - Recovery Method
  - Recovery Duration

## 4. Decision Tree

```mermaid
flowchart TD
    A[Start healLocator] --> B[Check primary candidate]
    B --> C{Primary usable}
    C -- Yes --> D[Return primary result]
    C -- No --> E[Log primary failure]
    E --> F[Loop fallback descriptors]
    F --> G[Build candidate locator]
    G --> H[Validate candidate]
    H --> I{usable}
    I -- Yes --> J[Build HealResult healed=true]
    J --> K[Attach recovery report]
    K --> L[Return recovered locator]
    I -- No --> M{More fallbacks}
    M -- Yes --> F
    M -- No --> N[Attach failure summary]
    N --> O[Throw exhaustive failure error]
```

## 5. Retry Strategy and Fallback Ordering

Current ordering in [framework/pages/searchPage.ts](framework/pages/searchPage.ts#L24):
1. getByRole textbox with search name
2. getByLabel search
3. getByPlaceholder search
4. getByText search
5. css class oxd-input
6. xpath placeholder contains Search

Rationale:
- Prioritize semantic accessibility locators first.
- Move to less semantic CSS/XPath only after semantic candidates fail.

No implicit retry loops:
- Each candidate evaluated once per invocation.
- Decision remains predictable and bounded.

## 6. Logging Strategy

Mechanism:
- process stdout lines with ISO timestamps [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L172).

Emitted events:
- Primary resolved
- Primary failed
- Fallback i started
- Fallback i rejected
- Recovery success with method
- Exhaustion failure summary

Operational impact:
- Visible in local console output.
- Captured in CI step logs automatically.

## 7. Runtime Sequence

```mermaid
sequenceDiagram
    participant Spec as Search Spec
    participant SP as SearchPage
    participant HL as healLocator
    participant V as isLocatorUsable
    participant PW as Playwright Engine
    participant R as test.info attachments

    Spec->>SP: searchAndVerify
    SP->>HL: healLocator(options)
    HL->>V: validate primary
    V->>PW: count + visible + enabled
    alt primary valid
        HL-->>SP: HealResult primary
    else primary invalid
        loop each fallback
            HL->>V: validate fallback
            V->>PW: count + visible + enabled
            alt fallback valid
                HL->>R: attach recovery report
                HL-->>SP: HealResult healed
            else invalid
                HL->>HL: continue next fallback
            end
        end
        HL->>R: attach failure summary
        HL-->>SP: throw Error
    end
```

## 8. Component Diagram

```mermaid
flowchart LR
    S[SearchPage.searchInput] --> H[healLocator function]
    H --> V[Candidate validator]
    H --> L[stdout logger]
    H --> A[test.info attachment writer]
    V --> P[Playwright Locator API]
    P --> U[Browser DOM]
```

## 9. Line-by-Line Execution Walkthrough

Entry and options parsing:
- Function declaration in [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L65)
- Option destructuring and timer start in [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L69)

Primary check path:
- Primary usability call [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L73)
- Success fast-return block [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L75)

Fallback path:
- Primary failure log lines [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L86)
- Fallback loop [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L89)
- Candidate build and usability check [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L96)
- Recovery result composition [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L100)
- Recovery attach call [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L114)

Exhaustion path:
- Exhaustive message construction [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L126)
- Failure attachment [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L138)
- Final throw [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L148)

Validator internals:
- Count check [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L156)
- Visibility and enabled checks [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L160)

## 10. Design Advantages and Tradeoffs

Advantages:
- Runtime recovery without broad framework mutation.
- Explicit observability for architecture reviews and demos.
- Controlled fail-fast when no safe candidate is available.

Tradeoffs:
- Added resolution latency when primary fails.
- Candidate quality is only as strong as descriptor design.
- Duplicate utility implementations increase cognitive load until consolidated.

## 11. Suggested Next Enhancements

1. Add optional telemetry sink for healed counts per build.
2. Add candidate timeout budget per attempt.
3. Introduce fallback confidence scoring and best-first strategy.
4. Merge legacy and active implementations under one interface.
