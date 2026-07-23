## 2024-05-24 - Avoid Object.entries for Large Dictionaries

**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.

## 2024-05-24 - Pre-compute string character codes in tight algorithmic loops

**Learning:** Repeatedly calling `.charCodeAt()` inside deeply nested or highly iterative loops (like Levenshtein distance calculations) causes measurable performance overhead due to repeated string evaluations.
**Action:** Pre-compute query/string character codes into a module-scoped or shared `Int32Array` before the tight loop executes. Replace the string method calls inside the algorithm with fast TypedArray lookups.
## 2026-07-23 - Optimize list rendering lookups with Set
**Learning:** Using `Array.includes()` inside a large list render loop (`.map`) creates an O(N * M) performance bottleneck (where N is the rendered list and M is the array to check against).
**Action:** Always pre-compute a `Set` wrapped in `useMemo` (e.g. `useMemo(() => new Set(arr), [arr])`) and use `Set.has()` for O(1) lookups during rendering to eliminate the nested iteration.
## 2024-05-19 - Set Lookup in Render Loop Optimization
**Learning:** Using `Array.includes()` inside `Array.map()` for rendering lists creates an $O(N \times M)$ performance bottleneck.
**Action:** When rendering lists that check membership against an array prop, convert the array prop to a `Set` using `useMemo(() => new Set(arr), [arr])` before the loop, and use `Set.has()` inside the loop to achieve $O(1)$ lookups.
