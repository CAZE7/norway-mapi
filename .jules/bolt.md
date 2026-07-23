## 2024-05-24 - Avoid Object.entries for Large Dictionaries

**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.
## 2024-05-19 - Set Lookup in Render Loop Optimization
**Learning:** Using `Array.includes()` inside `Array.map()` for rendering lists creates an $O(N \times M)$ performance bottleneck.
**Action:** When rendering lists that check membership against an array prop, convert the array prop to a `Set` using `useMemo(() => new Set(arr), [arr])` before the loop, and use `Set.has()` inside the loop to achieve $O(1)$ lookups.
