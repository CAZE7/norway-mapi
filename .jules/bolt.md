## 2024-05-24 - Avoid Object.entries for Large Dictionaries
**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.
## 2026-07-23 - Optimize list rendering lookups with Set
**Learning:** Using `Array.includes()` inside a large list render loop (`.map`) creates an O(N * M) performance bottleneck (where N is the rendered list and M is the array to check against).
**Action:** Always pre-compute a `Set` wrapped in `useMemo` (e.g. `useMemo(() => new Set(arr), [arr])`) and use `Set.has()` for O(1) lookups during rendering to eliminate the nested iteration.
