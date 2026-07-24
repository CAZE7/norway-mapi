## 2024-05-24 - Avoid Object.entries for Large Dictionaries

**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.

## 2024-05-24 - Pre-compute string character codes in tight algorithmic loops

**Learning:** Repeatedly calling `.charCodeAt()` inside deeply nested or highly iterative loops (like Levenshtein distance calculations) causes measurable performance overhead due to repeated string evaluations.
**Action:** Pre-compute query/string character codes into a module-scoped or shared `Int32Array` before the tight loop executes. Replace the string method calls inside the algorithm with fast TypedArray lookups.

## 2026-07-23 - Optimize list rendering lookups with Set

**Learning:** Using `Array.includes()` inside a large list render loop (`.map`) creates an O(N \* M) performance bottleneck (where N is the rendered list and M is the array to check against).
**Action:** Always pre-compute a `Set` wrapped in `useMemo` (e.g. `useMemo(() => new Set(arr), [arr])`) and use `Set.has()` for O(1) lookups during rendering to eliminate the nested iteration.

## 2024-05-19 - Set Lookup in Render Loop Optimization

**Learning:** Using `Array.includes()` inside `Array.map()` for rendering lists creates an $O(N \times M)$ performance bottleneck.
**Action:** When rendering lists that check membership against an array prop, convert the array prop to a `Set` using `useMemo(() => new Set(arr), [arr])` before the loop, and use `Set.has()` inside the loop to achieve $O(1)$ lookups.

## 2024-06-25 - Avoid Full Distance Matrix Recalculation in 2-opt loops

**Learning:** Recalculating a full $O(N^2)$ distance matrix on every route improvement during a 2-opt loop introduces massive overhead that dwarfs the actual optimization calculations.
**Action:** In 2-opt loops, avoid recalculating or maintaining a full matrix. Instead, calculate the distances dynamically for only the specific affected nodes (e.g., using haversine directly on the 4 affected node pairs) during evaluation to drastically reduce inner loop overhead.

## 2024-05-25 - Avoid temporary array allocations in render/sync loops

**Learning:** Creating intermediate arrays via spread operators (`[...arr]`), `.slice()`, or `.map()` inside high-frequency recursive timeouts or React `useEffect` loops leads to significant temporary memory allocations and Garbage Collection pressure, hurting rendering/UI performance (e.g., when syncing thousands of map markers).
**Action:** Replace chaining array methods with direct `for` loops. When collecting batches of items, pre-allocate arrays (e.g., `new Array(batchSize)`) and populate them by index to eliminate intermediary allocations and significantly reduce execution overhead.
## 2024-05-24 - Parallelize independent network requests

**Learning:** Running network calls in sequence inside a `for...of` loop creates an unnecessary performance bottleneck by blocking on each network request, even when the requests are fully independent.
**Action:** Use `Promise.all` alongside `.map()` to execute independent network calls concurrently. This allows the process to overlap the network latency of multiple requests, resulting in significantly faster overall resolution time.
