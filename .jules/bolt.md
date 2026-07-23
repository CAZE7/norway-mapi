## 2024-05-24 - Avoid Object.entries for Large Dictionaries
**Learning:** Initializing maps from large static JSON caches using `Object.entries()` causes significant performance slowdowns and massive memory overhead by allocating an intermediate array of key/value tuples for iteration.
**Action:** Use a `for...in` loop to iterate directly over the keys and access the dictionary values instead. This pattern dramatically decreases memory consumption and CPU usage without requiring any intermediate array allocations.
