## 2024-05-24 - Avoid Object.entries for Large Dictionaries

**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.

## 2024-05-24 - Pre-compute string character codes in tight algorithmic loops

**Learning:** Repeatedly calling `.charCodeAt()` inside deeply nested or highly iterative loops (like Levenshtein distance calculations) causes measurable performance overhead due to repeated string evaluations.
**Action:** Pre-compute query/string character codes into a module-scoped or shared `Int32Array` before the tight loop executes. Replace the string method calls inside the algorithm with fast TypedArray lookups.
