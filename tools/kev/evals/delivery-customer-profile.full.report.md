Design review — src/routes/prototypes/delivery-customer-profile/index.tsx
Method: manifest -> 23 skills -> checker per skill (fan-out) -> feisty per finding

FINDINGS THAT SURVIVED FEISTY

1. recursica-skill-badge -- "What warning and alert are for... is uncovered. Until this is answered, do not reach for either."
   index.tsx:42-55 (getStatusVariant) maps Inactive (line 49) and Suspended (line 51) to alert.

2. recursica-skill-loader -- "Loading start and completion are both announced, politely, from a live region."
   No aria-live/role="status" anywhere in src/; index.tsx:104-109 loader is silent to AT.

3. recursica-skill-loader -- "Wait is real, unknown length, >~3s; nothing shorter shows a loader."
   index.tsx:59,64 set loading on mount and on every mode change; the Loader at 104-109 renders immediately with no threshold. The mock API resolves in 1000 ms (src/api/delay.ts).

4. recursica-skill-screen-scaffolding -- "Every page has a footer."
   index.tsx:102-205 renders no footer, and no shared shell in the repo supplies one.

FINDINGS RAISED BY CHECKERS, REFUTED BY FEISTY

- defaults: "discard user's place/data on error/refresh" -- reset path reachable only through the dev-only mode switcher.
- feedback-messaging: full-page error/not-found copy should be a toast -- empty/loading/error states are listed as unowned by the design router.
- forms: read-only fields should use read-only-field -- that skill's own rule says plain text when nothing is editable.
- forms: error/not-found copy should be bulleted microcopy -- rule is scoped to form field help/validation text.
- naming-terminology: "Customer Not Found" / "Error Loading Profile" are fragments -- noun-headed, same shape as "Page Not Found".
- naming-terminology: object loses its name on destination screen -- a record's profile is named by the record.
- screen-priority: no "order history summary" -- Total Orders / Lifetime Value / Last Order are that summary.
- screen-scaffolding: missing breadcrumb -- no prototype in the repo has a shell to attach one to.
- loader: no reserved layout space -- rule targets region-level loaders, not a full initial load.
- loader: focus not moved into new content -- the only trigger is the separate mode switcher.
- typography-semantics: no computed max-width -- the enclosing Container caps at 960px.

UNCHECKED

- Render-only items (reading measure, casing enforcement, grid alignment, small viewports).
- Heading import is unmapped in the manifest.
