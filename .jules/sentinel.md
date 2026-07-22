## 2024-05-24 - Fix DoS vulnerability in custom place imports
**Vulnerability:** String replacement functions `escapeHtml` and `escapeXml` would crash the application if provided with `undefined` or `null` values.
**Learning:** This occurred because custom places could be imported via JSON without strict type enforcement for all fields (like `description`), leading to unexpected `undefined` values being passed to the string sanitization functions.
**Prevention:** Always ensure sanitization functions gracefully handle falsy or unexpected input types by returning a safe default value or coercing the input to a string.
