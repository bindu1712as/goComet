# goCometUI System Design Diagrams

## 1. High-Level Architecture

```mermaid
flowchart LR
    A[Developer / CI Trigger] --> B[Playwright CLI]
    B --> C[Config Layer]
    C --> D[Test Layer]
    D --> E[Fixture Layer]
    E --> F[Page Object Layer]
    F --> G[Utility Layer]
    G --> H[Playwright Engine]
    H --> I[Application Under Test]

    G --> G1[Logger]
    G --> G2[Self-Healing Utility]
    G -. on failure path .-> J[AI Failure Intelligence]
```

## 2. Layered Component View

```mermaid
flowchart TB
    subgraph L1[Execution Layer]
      T1[tests/login/*]
      T2[tests/search/search.spec.ts]
    end

    subgraph L2[Fixture Composition]
      F1[testfixtures.ts]
    end

    subgraph L3[Page Objects]
      P1[LoginPage]
      P2[DashboardPage]
      P3[SearchPage]
    end

    subgraph L4[Utilities]
      U1[env.ts]
      U2[logger.ts]
      U3[src/utils/selfHealingLocator.ts]
    end

    subgraph L5[AI Modules]
      A1[failureCollector]
      A2[failureClassifier]
      A3[vectorStore]
      A4[ragAnalyzer]
      A5[failureAnalyzer]
      A6[reportGenerator]
    end

    T1 --> F1
    T2 --> F1
    F1 --> P1
    F1 --> P2
    F1 --> P3
    P1 --> U2
    P3 --> U3
    U3 --> U2
    A1 --> A2 --> A3 --> A4 --> A5 --> A6
```

## 3. End-to-End Test Command Flow

```mermaid
sequenceDiagram
    participant User as User/CI
    participant NPM as npm script
    participant PW as Playwright CLI
    participant CFG as Config
    participant FX as Fixtures
    participant Test as Test File
    participant Pages as POM Layer
    participant AUT as OrangeHRM
    participant Rep as Reporters

    User->>NPM: npm test
    NPM->>PW: playwright test
    PW->>CFG: load [playwright.config.ts](playwright.config.ts#L3)
    PW->>PW: discover tests under tests/
    PW->>FX: initialize [framework/fixtures/testfixtures.ts](framework/fixtures/testfixtures.ts#L16)
    FX-->>Test: inject page objects
    Test->>Pages: call page methods
    Pages->>AUT: browser interactions
    AUT-->>Pages: UI responses
    Pages-->>Test: assertions pass/fail
    PW->>Rep: emit html + allure outputs
```

## 4. Search Self-Healing Decision Diagram

```mermaid
flowchart TD
    A[SearchPage.searchInput] --> B[healLocator start]
    B --> C{Primary usable?}
    C -- Yes --> D[Return primary locator]
    C -- No --> E[Fallback 1 getByRole]
    E --> F{usable?}
    F -- Yes --> G[Attach healing report + return]
    F -- No --> H[Fallback 2 getByLabel]
    H --> I{usable?}
    I -- Yes --> G
    I -- No --> J[Fallback 3 getByPlaceholder]
    J --> K{usable?}
    K -- Yes --> G
    K -- No --> L[Fallback 4 getByText]
    L --> M{usable?}
    M -- Yes --> G
    M -- No --> N[Fallback 5 CSS]
    N --> O{usable?}
    O -- Yes --> G
    O -- No --> P[Fallback 6 XPath]
    P --> Q{usable?}
    Q -- Yes --> G
    Q -- No --> R[Throw exhaustive failure error]
```

## 5. AI Failure Analysis Architecture

```mermaid
flowchart LR
    F[Test Failure Event] --> C1[failureCollector]
    C1 --> C2[failureClassifier]
    C2 --> C3[vectorStore.findSimilar]
    C3 --> C4[ragAnalyzer context builder]
    C4 --> C5[failureAnalyzer]
    C5 --> C6[reportGenerator]
    C6 --> O1[reports/failure-analysis-*.html]
    C6 --> O2[reports/failure-analysis-*.json]
    C6 --> O3[reports/failure-analysis-*.md]

    C3 --> DB[(artifacts/failures.json)]
```

## 6. CI/CD Diagram - Jenkins

```mermaid
flowchart TD
    A[Repo Commit] --> B[Jenkins Pipeline Trigger]
    B --> C[Setup: Node + npm install]
    C --> D[TypeCheck]
    D --> E[Install Browsers]
    E --> F[Run Playwright Tests]
    F --> G{Failure?}
    G -- Yes --> H[Analyze Failures stage]
    G -- No --> I[Success path]
    H --> J[Publish HTML + Archive Artifacts]
    I --> J
```

## 7. CI/CD Diagram - GitHub Actions

```mermaid
flowchart TD
    A[Push/PR/Schedule/Dispatch] --> B[test job matrix]
    B --> C[Checkout + setup-node]
    C --> D[npm ci + playwright install]
    D --> E[Run tests by browser matrix]
    E --> F[Upload report/artifact/log bundles]
    F --> G[summary job]
    E --> H[pages-deploy job]
    E --> I[failure-notification job]
```

## 8. Component Interaction Matrix

| Producer | Consumer | Interface | Purpose |
|---|---|---|---|
| tests/search/search.spec.ts | SearchPage | searchAndVerify | Search scenario orchestration |
| SearchPage | healLocator | function call | Runtime locator recovery |
| healLocator | Playwright Locator API | count/isVisible/isEnabled | Candidate validation |
| failureCollector | ragAnalyzer/failureAnalyzer | FailureArtifact model | Failure context handoff |
| vectorStore | ragAnalyzer | findSimilar | Retrieve historical examples |
| failureAnalyzer | reportGenerator | RootCauseAnalysis | Convert analysis to outputs |

## 9. Code Reference Index
- Search page object: [framework/pages/searchPage.ts](framework/pages/searchPage.ts#L4)
- Active self-healing: [src/utils/selfHealingLocator.ts](src/utils/selfHealingLocator.ts#L65)
- Legacy self-healing cache implementation: [framework/utils/selfHealingLocator.ts](framework/utils/selfHealingLocator.ts#L65)
- Fixture composition: [framework/fixtures/testfixtures.ts](framework/fixtures/testfixtures.ts#L16)
- Failure analyzer entry: [framework/ai/failureAnalyzer.ts](framework/ai/failureAnalyzer.ts#L25)
- Report generation entry: [framework/ai/reportGenerator.ts](framework/ai/reportGenerator.ts#L39)
