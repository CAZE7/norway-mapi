## 2024-05-24 - Fix DoS vulnerability in custom place imports

**Vulnerability:** String replacement functions `escapeHtml` and `escapeXml` would crash the application if provided with `undefined` or `null` values.
**Learning:** This occurred because custom places could be imported via JSON without strict type enforcement for all fields (like `description`), leading to unexpected `undefined` values being passed to the string sanitization functions.
**Prevention:** Always ensure sanitization functions gracefully handle falsy or unexpected input types by returning a safe default value or coercing the input to a string.

## 2026-07-23 - Fix Main Thread Lockup DoS from Focus Trap Deadlocks

**Vulnerability:** Radix UI's internal focus trap in `Sheet` and `Dialog` components causes an infinite loop and crashes the main thread (0 FPS, UI lockup) when used in combination with certain interactive elements like the Leaflet map and search components. An attacker or normal user could trigger this simply by focusing or clicking the search bar while the sidebar is active, essentially causing a client-side Denial of Service.
**Learning:** Certain UI libraries enforce focus trapping to prevent users from interacting with the background. When these traps conflict with other elements trying to claim or manage focus (such as interactive maps or custom input handlers), the back-and-forth stealing of focus can result in a synchronous infinite loop on the main thread.
**Prevention:** Disable the focus trap by explicitly setting `modal={false}` on `Sheet` and `Dialog` Radix components when they co-exist with complex interactive UI elements like Leaflet maps that handle their own focus or events.

## 2024-07-24 - Persistent Client-Side DoS via Unvalidated JSON Import

**Vulnerability:** The application allowed importing a JSON array directly into `customPlaces` and `localStorage` without validating the type of its properties. This insecure deserialization vector allowed an attacker to provide an object with malicious types (e.g., passing `{}` for a string property like `description`). When React attempts to render these objects as children, it crashes the entire application. Because the data is persisted in `localStorage` and loaded on initialization, this results in a persistent client-side Denial of Service (DoS) where the application immediately crashes on load, requiring manual intervention (clearing localStorage) to fix.
**Learning:** Even in purely client-side static applications without a backend, importing and deserializing arbitrary JSON files into the application state is dangerous. If the data is persisted and rendered, missing schema validation can lead to persistent application crashes and client-side DoS vulnerabilities.
**Prevention:** Always validate imported data structures against a strict schema (e.g., using `zod`) before merging them into the application state or persisting them to storage, ensuring that untrusted data strictly matches the expected types.

## 2024-05-24 - [MEDIUM] Fix XSS vulnerability in Chart component

**Vulnerability:** The `ChartStyle` functional component used `dangerouslySetInnerHTML` on a `<style>` tag to render dynamic CSS generated from chart configurations. If a user can inject malicious payload like `</style><script>alert(1)</script>` into configuration, it might lead to Cross-Site Scripting (XSS).
**Learning:** Using `children` on `<style>` tags directly in React prevents XSS because React automatically mitigates XSS by transforming elements into valid CSS characters (e.g. `</style>` is output as `</\73 tyle>`).
**Prevention:** Avoid `dangerouslySetInnerHTML` for `<style>` tags in React; always use standard `children` content instead so React handles escaping.

## 2024-07-24 - Insecure SSL Certificate Verification in Python Scripts

**Vulnerability:** Disabled SSL certificate verification (`ctx.check_hostname = False` and `ctx.verify_mode = ssl.CERT_NONE`) in `audit_places.py` and `audit_places_v2.py`.
**Learning:** Hardcoding insecure defaults for `ssl.create_default_context()` makes HTTPS requests susceptible to Man-in-the-Middle (MITM) attacks as any certificate, even invalid ones, would be accepted.
**Prevention:** Avoid modifying `ssl.create_default_context()` to disable hostname checking and verification unless strictly necessary for debugging against known self-signed certificates in isolated test environments. In production, always require valid certificates.

## 2024-05-24 - Fix Insecure SSL Certificate Verification

**Vulnerability:** The Python script `audit_places.py` used insecure SSL context settings (`ctx.check_hostname = False` and `ctx.verify_mode = ssl.CERT_NONE`), making requests vulnerable to Man-in-the-Middle (MitM) attacks by ignoring SSL certificate validation.
**Learning:** Hardcoding overrides that disable SSL verification compromises data integrity and confidentiality, allowing attackers to intercept or alter traffic undetected. Always use default, secure SSL contexts unless explicitly debugging in a controlled environment.
**Prevention:** Avoid disabling `check_hostname` and `verify_mode` in production code. Rely on `ssl.create_default_context()` to handle secure validation out of the box. Use libraries like `requests` which provide secure defaults by default.
