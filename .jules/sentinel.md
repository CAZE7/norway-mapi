## 2024-05-24 - Fix DoS vulnerability in custom place imports

**Vulnerability:** String replacement functions `escapeHtml` and `escapeXml` would crash the application if provided with `undefined` or `null` values.
**Learning:** This occurred because custom places could be imported via JSON without strict type enforcement for all fields (like `description`), leading to unexpected `undefined` values being passed to the string sanitization functions.
**Prevention:** Always ensure sanitization functions gracefully handle falsy or unexpected input types by returning a safe default value or coercing the input to a string.

## 2026-07-23 - Fix Main Thread Lockup DoS from Focus Trap Deadlocks

**Vulnerability:** Radix UI's internal focus trap in `Sheet` and `Dialog` components causes an infinite loop and crashes the main thread (0 FPS, UI lockup) when used in combination with certain interactive elements like the Leaflet map and search components. An attacker or normal user could trigger this simply by focusing or clicking the search bar while the sidebar is active, essentially causing a client-side Denial of Service.
**Learning:** Certain UI libraries enforce focus trapping to prevent users from interacting with the background. When these traps conflict with other elements trying to claim or manage focus (such as interactive maps or custom input handlers), the back-and-forth stealing of focus can result in a synchronous infinite loop on the main thread.
**Prevention:** Disable the focus trap by explicitly setting `modal={false}` on `Sheet` and `Dialog` Radix components when they co-exist with complex interactive UI elements like Leaflet maps that handle their own focus or events.
