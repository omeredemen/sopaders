# sopaders

> App name: **sopaders** (Kurdish: *şop* = track, *ders* = lesson). The internal identifiers
> `study-tracker` (IndexedDB name, backup `app` id, localStorage key) keep the original name on purpose,
> because renaming them would orphan existing user data and backups.

Offline-first PWA for tracking study progress for Turkish exams (KPSS, AGS, …).
Runs on Android phones and desktops. Data is stored locally in IndexedDB; cloud
sync (Supabase) will be added later behind the same repository interfaces.

- **UI language:** Turkish. **Code, comments, identifiers, commit messages:** English.
- **Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, Dexie (IndexedDB),
  React Router, Recharts, PapaParse + SheetJS (import), vite-plugin-pwa, Vitest.

## Commands

```bash
npm run dev         # dev server on http://localhost:5173
npm run dev -- --host   # also expose on LAN (test on a phone; note: no service worker over http)
npm test            # run all unit tests once
npm run test:watch  # watch mode
npm run typecheck   # tsc, no emit
npm run build       # typecheck + production build into dist/
npm run preview     # serve the production build
```

Node is installed via nvm (`~/.nvm`). In a non-interactive shell run
`export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` first.

## Architecture

Dependencies point inwards only:

```
features/*  ──►  data/ (interfaces + hooks)  ──►  domain/  ◄── config/
                    │
                    └─ data/dexie/ (implementation; only createRepositories.ts imports it)
```

| Layer | Rules |
|---|---|
| `src/domain/` | Pure TypeScript. **No React, no Dexie, no browser APIs** (except `crypto.getRandomValues`). Types, business rules, calculations. Every module has a `*.test.ts`. Functions take "today" etc. as parameters instead of reading the clock, so they stay testable. |
| `src/config/` | Static app configuration (topic statuses). Pure data. |
| `src/data/` | Repository **interfaces** (`repositories.ts`), the change feed, `RepositoryProvider`, `useRepoQuery`, and `createRepositories.ts`, **the single place that picks the storage backend**. |
| `src/data/dexie/` | IndexedDB implementation. Nothing outside `src/data/` imports from here. |
| `src/features/<name>/` | One folder per feature: `pages/`, `components/`, `hooks/`, plus feature logic. Features talk to storage only through `useRepositories()` / `useRepoQuery()`, never Dexie. |
| `src/shared/` | Feature-independent UI primitives (`components/`) and helpers (`lib/`). |

### Folder structure

```
src/
├── main.tsx, App.tsx          # bootstrap; App.tsx holds the route table
├── index.css                  # Tailwind entry + theme tokens
├── config/topicStatuses.ts    # THE status list
├── domain/
│   ├── types.ts               # Exam, Lesson, Topic, TrialTest, TrialTestWrongTopic, BaseRecord
│   ├── records.ts             # newId (UUID v4), createRecord/updateRecord/softDelete, byOrder
│   ├── statuses.ts            # getTopicStatus, nextTopicStatus, isDoneStatus
│   ├── net.ts                 # calculateNet, validateTrialCounts
│   ├── dates.ts               # LocalDate helpers, daysLeft, effectiveDeadline
│   ├── pace.ts                # dailyPace
│   ├── statusSummary.ts       # summarizeStatuses, summarizeByLesson
│   ├── exam.ts                # validateExam
│   ├── importPlan.ts          # planTopicImport (dedupe/match lessons), name normalization
│   ├── dashboard.ts           # buildExamDashboard (all dashboard numbers for one exam)
│   ├── ordering.ts            # moveItem
│   ├── trials.ts              # netSeriesByLesson, netStats, topicsToMarkForReview
│   ├── backup.ts              # backup file format, parseBackupFile (validation), mergeByUpdatedAt
│   └── index.ts               # barrel export
├── data/
│   ├── repositories.ts        # interfaces + Repositories bundle + errors
│   ├── repositoryContract.ts  # shared test suite every backend must pass
│   ├── changeEmitter.ts       # in-process pub/sub for "data changed"
│   ├── createRepositories.ts  # ← backend switch
│   ├── RepositoryProvider.tsx # React context: useRepositories()
│   ├── useRepoQuery.ts        # query hook that re-runs on changes
│   └── dexie/                 # db.ts (schema), Dexie*Repository.ts, cascade.ts, ordering.ts
├── features/
│   ├── exams/  lessons/  topics/  trials/  dashboard/  settings/
│   └── import-export/
│       ├── parsers/           # TopicParser + csv/xlsx/text parsers + registry, tableRows (header detection, encoding)
│       ├── logic/             # applyTopicImport (plan → lessons + topics)
│       ├── components/        # ImportPreview, BackupSection
│       └── pages/             # TopicImportPage (/exams/:examId/import)
├── shared/
│   ├── components/            # AppLayout, PageHeader, Button/IconButton, Modal, ConfirmDialog,
│   │                          # Toast, FormField, InlineAddForm, EditableName, EmptyState, Icon
│   ├── hooks/useAction.ts     # run a write, toast success/error
│   └── lib/format.ts          # Turkish date/number/percent formatting

└── test/setup.ts              # loads fake-indexeddb for tests
```

## Data model & conventions

- Every record extends `BaseRecord`: `id` (UUID v4, client-generated), `createdAt`,
  `updatedAt` (ISO timestamps), `deletedAt` (`null` or ISO timestamp).
- **Deletes are soft.** Repositories set `deletedAt` and cascade:
  exam → lessons → topics + trial tests → wrong-topic links. Reads filter out
  deleted records. Tombstones stay in the DB so deletions can be synced later.
- **Every write bumps `updatedAt`.** Sync and backup merging will be last-write-wins on it.
- **Calendar dates are `LocalDate` strings (`YYYY-MM-DD`)**, never `Date` objects or
  timestamps. Use `daysBetween`/`daysLeft` from `domain/dates.ts`. Day math is done in
  UTC on date parts, so DST and timezones can't cause off-by-one errors.
- **Net is never stored.** It's always `calculateNet(correct, wrong, exam.wrongPenalty)`.
  `wrongPenalty = 0` means no penalty.
- **Daily pace** = unfinished topics / days left to `effectiveDeadline(exam)`
  (study deadline, or exam date). Deadline today counts as 1 day; past deadline → `overdue`.
  "Unfinished" = any status with `countsAsDone: false`.
- Ordering: lessons and topics have an integer `order`. New items append at the end;
  `reorder(parentId, orderedIds)` rewrites `order` to 0..n-1.
- Names are cleaned with `cleanName` (trim + collapse spaces). Name comparisons use
  `normalizeName` (Turkish-locale lowercase: I→ı, İ→i).
- Repositories validate input (domain validators) and throw `ValidationError` / `NotFoundError`.
- Cross-entity business rules (e.g. "saving a trial test marks wrong topics as Needs review")
  live in the feature as a function that calls several repositories, not inside a repository.

### Reading data in components

```tsx
const { data: lessons, loading, error } = useRepoQuery(
  (repos) => repos.lessons.listByExam(examId),
  [examId],          // re-run when these change
  ['lessons'],       // …and when these entities are written
);
```

Wrap these in feature hooks (e.g. `features/lessons/hooks/useLessons.ts`) so pages stay
simple. Writes go through feature action hooks (`useLessonActions`, `useTopicActions`) that call
repositories via `useAction()`, which turns failures into an error toast. Subscribers refresh automatically.

### UI conventions

- Routes: `/exams` (list), `/exams/:examId` (lessons + topics), `/dashboard/:examId`,
  `/trials/:examId` (list), `/trials/:examId/new`, `/trials/:examId/:trialId` (edit), `/settings`.
  Exam-scoped sections use `/<section>` → `ActiveExamRedirect` → `/<section>/:examId`. The active exam
  (last opened, `useRememberActiveExam`) is a per-device preference stored in localStorage, not synced data.
  Use `ExamSwitcher` in the page header to switch exams.
- Features don't import each other's internals in a cycle. Pages compose components across
  features (e.g. `ExamDetailPage` puts `TopicList` inside `LessonSection`). `LessonSection`
  knows nothing about topics.
- Dialogs: render `Modal`/`ConfirmDialog` conditionally (`{open && <Modal…/>}`) so state resets.
  Use `ConfirmDialog` before every delete. Don't use `window.confirm`.
- Status colors always appear next to the status label (`StatusChip`), never alone.
- Mobile first: rows must fit in 360px width. Let controls wrap (`flex-wrap`) instead of overflowing.
- Format numbers/dates only via `shared/lib/format.ts` (Turkish: `3,4`, `%43`, `1 Aralık 2026`, net `28,75`).
- Charts (Recharts): wrap in an element with class `chart` so `index.css` styles grid/axis/dots for
  light and dark mode. Line 2px, dots r=4 with a 2px surface-colored ring, hairline horizontal grid,
  `isAnimationActive={false}`, custom tooltip (value first, then label). One series per chart
  (small multiples per lesson) means no legend. Always show the key numbers as text next to the chart,
  so nothing is available only on hover.

### Trial tests
- `features/trials/logic/saveTrialTest.ts` is the cross-repository use case: save the test, then set
  **newly added** wrong topics (`topicsToMarkForReview`) to `REVIEW_TOPIC_STATUS_ID`. Re-saving an old
  test must not re-mark topics the user has reviewed since.
- Net is computed on display with the exam's `wrongPenalty`. Changing the penalty updates all nets.

### Dexie gotchas

- Schema changes: add a new `this.version(n).stores(...)` in `db.ts`; never edit an old version.
- Inside a Dexie transaction, every awaited step must be a Dexie call. Don't `await`
  non-Dexie promises (fetch, timers) inside one, and don't early-return from helper
  functions mid-transaction. Either can auto-commit the transaction too early
  (`PrematureCommitError`).

## How to…

### Add a topic status
1. Append `{ id, label, color, countsAsDone }` to `TOPIC_STATUSES` in `src/config/topicStatuses.ts`.
   Array position = tap-cycle order and chart/legend order.
2. Never rename or remove an id that may already be stored. Unknown ids fall back to the default
   status at read time.
3. Pick a color that keeps the set distinguishable for colorblind users, and always render the label next to the color.
4. Run `npm test`. No other code changes are needed.

### Add an import format
1. Create `src/features/import-export/parsers/<format>Parser.ts` implementing `TopicParser`
   (`parse(source, options) → Promise<{ lesson, topic }[]>`). Parse only. Matching lessons and
   skipping duplicates is done by `planTopicImport` in the domain. For table-like formats, reuse
   `tableToTopicRows` (header detection) and `readSourceText` (UTF-8 / Windows-1254 decoding).
   Load big libraries with dynamic `import()` inside `parse` (see xlsxParser).
2. Append it to `TOPIC_PARSERS` in `parsers/registry.ts`.
3. Add a `<format>Parser.test.ts`.

### Backup & restore
- `repos.backup.exportAll()` returns every table **including soft-deleted records**; the file is
  `createBackupFile(...)` (`{ app, schemaVersion, exportedAt, data }`).
- `parseBackupFile` validates before anything is written. When the stored shape changes, bump
  `BACKUP_SCHEMA_VERSION` and migrate older files inside `parseBackupFile`.
- Restore `merge` = `mergeByUpdatedAt` per table (newest `updatedAt` wins, ties keep local, so a
  later local delete is kept). `replace` = clear + write. The same merge rule is meant for Supabase sync.
- The restore UI first runs `previewMerge(local, backup)` (dry run) and explains the outcome. If a merge
  would change nothing (same-device backup, or things deleted or edited here since), it says why and points
  to "Tümünü değiştir" instead of silently reporting "0 yeni".
- Sample import files for manual testing are in `samples/`.

### PWA
- `vite-plugin-pwa` in `vite.config.ts`: manifest, `registerType: 'prompt'`, precache of all build
  files (including lazy chunks) so the app works fully offline. The SW only exists in production builds.
- `shared/pwa/UpdatePrompt` registers the SW and shows "Yeni sürüm hazır → Güncelle". It never auto-reloads.
- `shared/pwa/useInstallPrompt` captures `beforeinstallprompt` (imported in `main.tsx` so it is
  listening from startup). `persistentStorage.ts` asks for persistent storage at startup.
- Hosting: `vercel.json` / `netlify.toml` (SPA fallback, `sw.js` never cached). Deploy and Android
  install steps are in README.md. Changing the domain means a new origin with empty storage.
- Keep the main chunk < 500 kB: lazy-load big or rarely used things (route `lazy`, `React.lazy`, dynamic `import()`).

### Add a feature
1. Create `src/features/<name>/` with `pages/`, `components/`, `hooks/` as needed.
2. Put any pure logic in `src/domain/<topic>.ts` with tests, not in components.
3. If it needs new stored data: add the type to `domain/types.ts` (extending `BaseRecord`),
   a repository interface to `data/repositories.ts` (and to the `Repositories` bundle),
   tests to `data/repositoryContract.ts`, a Dexie implementation + schema version in `data/dexie/`,
   and wire it in `createDexieRepositories`.
4. Add the route in `App.tsx` and, if it's top-level, a nav item in `shared/components/AppLayout.tsx`.

### Add a storage backend (e.g. Supabase)
1. Create `src/data/supabase/` with classes implementing every interface in `data/repositories.ts`
   and a `createSupabaseRepositories()` returning a `Repositories` bundle.
2. Make `changes` emit after writes (and for realtime events from other devices).
3. Run `describeRepositoryContract('Supabase', ...)` against a test project.
4. Switch the return value in `src/data/createRepositories.ts`. Nothing else changes.

## Testing

- Vitest, `node` environment by default; `fake-indexeddb` is loaded globally (`src/test/setup.ts`).
  Component tests can opt into jsdom with `// @vitest-environment jsdom`.
- Domain: one `*.test.ts` per module, plain inputs/outputs.
- Repositories: behaviour is specified once in `repositoryContract.ts`; each backend runs it.
  Use a unique DB name per test (`createDexieRepositories(\`test-${newId()}\`)`).

## Roadmap

1. ✅ Setup, architecture, domain logic + tests, CLAUDE.md
2. ✅ Exams, lessons, topics with statuses
3. ✅ Dashboard (countdown, status summary, daily pace)
4. ✅ Trial tests + wrong-topic review marking + net trend chart
5. ✅ File import (CSV/XLSX/text) + JSON backup/restore
6. ✅ PWA (manifest, icons, offline) + deploy (Vercel/Netlify) + Android install guide
7. Next: Supabase sync (see "Add a storage backend")
