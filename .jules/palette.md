## 2024-05-18 - Missing Confirmation Dialog on Destructive Action

**Learning:** Found that the "Route leeren" button immediately cleared the user state without warning. In a routing app, losing an entire route can be extremely frustrating for users. Adding an alert dialog for destructive actions prevents data loss and improves user confidence.
**Action:** Always wrap state-clearing actions in an AlertDialog with clear description of consequences.
