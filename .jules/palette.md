## 2024-07-24 - Semantic ARIA attributes for Sidebars\n**Learning:** Implementing semantic states like `aria-pressed` for toggle buttons and `aria-expanded` for disclosure widgets is critical for screen reader users to understand UI state correctly.\n**Action:** Always ensure custom toggle elements and expansible buttons receive appropriate ARIA state attributes when developing UI components.
## 2024-05-18 - Missing Confirmation Dialog on Destructive Action

**Learning:** Found that the "Route leeren" button immediately cleared the user state without warning. In a routing app, losing an entire route can be extremely frustrating for users. Adding an alert dialog for destructive actions prevents data loss and improves user confidence.
**Action:** Always wrap state-clearing actions in an AlertDialog with clear description of consequences.
