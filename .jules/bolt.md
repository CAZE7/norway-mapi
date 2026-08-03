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

## 2024-07-24 - Avoid intermediate array allocations in frequent tight loops

**Learning:** Frequent array creation operations like `[...arr, item].forEach(...)` or `.slice(...).map(...)` inside rapidly executing intervals (such as Leaflet map syncing or processing data arrays) create excessive intermediate arrays. This results in heavy memory allocation and triggers frequent Garbage Collection (GC) pauses, which cause UI stuttering and degrade performance.
**Action:** Replace functional array chaining with direct `for` loops and fixed-size pre-allocated arrays where appropriate. E.g., replace `slice(start, end).map(fn)` with a pre-allocated `new Array(batchSize)` populated via a `for` loop, eliminating the intermediate array entirely.

## 2024-05-14 - Refactor cache population to skip prototype chain lookups

**Learning:** `for...in` loops on raw JSON objects incur prototype chain lookups. Refactoring to `Object.entries(raw).forEach` is a cleaner approach to avoid these lookups, although in simple caching benchmarks, `for...in` can sometimes be highly optimized by the JIT compiler making it appear faster or comparable in specific microbenchmarks. The refactor improves safety and avoids prototype iteration.
**Action:** Use `Object.entries().forEach` or `Object.entries()` with `for...of` loops instead of `for...in` when iterating over object keys and values directly to ensure clean, prototype-safe iteration.

## 2024-05-18 - Avoid array methods requiring callbacks in tight loops

**Learning:** Using array search methods like `.find()` inside consecutive loops over fallback candidates introduces unnecessary micro-overhead because it forces the JS engine to allocate and invoke a new callback function closure for every check. While this doesn't change the O(N) complexity compared to a loop, standard `for` loops are objectively faster as they eliminate this function overhead completely. Additionally, parallelizing a fallback sequence (using `Promise.all` across fallbacks) is dangerous as it prevents short-circuiting and spams APIs with redundant requests.
**Action:** When micro-optimizing small arrays inside repetitive structures, prefer basic `for` loops with a manual `break` over functional array iterators like `.find()`. Never use `Promise.all` to execute a sequence of fallback requests that are supposed to short-circuit upon the first success.

## 2024-05-18 - Performance Optimization Pattern: Distance Matrix Caching
**Learning:** In routing or 2-opt optimization algorithms, redundantly executing mathematical operations like `haversine` distance inside N^2 loops generates major CPU bottlenecks. Caching intermediate values drastically speeds up computation. However, string allocation (e.g. tracking keys by `id1|id2` using a `Map`) introduces overhead that negates the math speedups.
**Action:** Always pre-calculate symmetric distances, assign each unique node an integer ID index, and store the output in a 1D typed array (like `Float64Array`) accessed via row/col translation (`i * N + j`) to ensure highly-performant O(1) mathematical memory lookups instead of String mapping for tight mathematical loops.
