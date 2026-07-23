## 2025-03-09 - Initial codebase scan\n**Learning:** Just starting to analyze this codebase.\n**Action:** Need to find frontend and backend performance bottlenecks.
## 2025-03-09 - Fuzzy Search Optimization
**Learning:** The Levenshtein fuzzy search runs synchronously over 2000+ places on every keystroke when there are no exact matches. Allocating arrays (for `[name, ...words, ...aliases]`) and `Int32Array` rows inside this loop forces massive GC pauses.
**Action:** Unroll loops to avoid array spreading in hot paths and use module-level shared pre-allocated arrays (`Int32Array`) for single-threaded synchronous algorithms like Levenshtein distance.
