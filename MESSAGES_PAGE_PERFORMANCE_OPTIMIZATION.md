# Messages Page Performance Optimization

## 🎯 Goals

1. **Faster Initial Load** - Reduce page load time from ~3-5s to <1s
2. **Live Data Updates** - Real-time message display without hard refreshes
3. **Better Database Queries** - Optimize indexes and reduce N+1 queries
4. **Reduced Network Traffic** - Smart caching and delta updates

---

## 📊 Current Performance Issues

### **1. Multiple Fetch Calls**

```javascript
// Current: 3 separate API calls
fetchMessages(); // Fetches all messages with enrichment
fetchProducts(); // Fetches all products
// Both called in parallel, but sequentially needed
```

**Problem:**

- `fetchMessages()` includes enrichment (keyword lookup, batch info)
- Expensive nested lookups for each message
- Polling every 2 seconds = 30 calls/minute

### **2. Keyword Enrichment on Every Fetch**

```javascript
// Current: For each message, rebuild keyword_data by:
// 1. Re-detect keywords from text
// 2. Lookup from keywordRowsByProduct
// 3. Rebuild entire keyword_data object
// This happens even if nothing changed!
```

**Problem:**

- Heavy computation for every message on every fetch
- 20 messages × 20 keywords × 2 lookups = 800+ ops per fetch
- Repeated every 2 seconds

### **3. Polling Instead of Push**

```javascript
// Current: Poll every 2 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchMessages({ silent: true });
  }, 2000);
}, []);
```

**Problem:**

- Continuous network requests even when no new messages
- Unnecessary database queries
- Latency: Up to 2 seconds before seeing new messages

### **4. No Query Optimization**

```javascript
// Current: Generic queries without optimization
Message.find(messageQuery).sort({ created_at: -1 }).skip(skip).limit(limit);
```

**Problem:**

- Missing indexes on frequently filtered fields
- No projection (fetches all fields then discards most)
- Batch lookup separately (N+1)

---

## ✅ Optimization Solutions

### **Solution 1: Separate API Endpoints**

**Before:**

```javascript
// Single endpoint: /api/messages?page=1
// Returns: messages + enrichment
// Time: ~2-3 seconds
```

**After:**

```javascript
// /api/messages/fast?page=1
// Returns: messages ONLY (no enrichment)
// Time: ~200-300ms (10x faster)

// /api/messages/full?page=1
// Returns: messages + full enrichment
// Time: ~1-2s (still slower but separate)

// /api/messages/batch?ids=[]
// Returns: batch info for specific batches
// Time: ~100-200ms
```

### **Solution 2: Implement WebSocket for Live Updates**

**Before (Polling):**

```
Client: Poll every 2s
Client: GET /api/messages (even if nothing changed)
Server: Run full enrichment
Server: Return 20 messages
Total: ~2 seconds waiting + network latency
```

**After (WebSocket):**

```
Client: Connect WebSocket on mount
Server: Push new messages as they arrive
Server: Push status updates (received → processing → completed)
Client: Update UI instantly
Total: <100ms latency + no unnecessary requests
```

### **Solution 3: Database Query Optimization**

**Before:**

```javascript
// Multiple separate queries
const messages = await Message.find({...});       // Full documents
const batches = await Batch.find({...});           // Separate query
// Per-message: getKeywordsForList() × messages.length
```

**After:**

```javascript
// Single optimized query with projections
const messages = await Message.find({...})
  .select('_id batch_id sender_id product_id status created_at')  // Only needed fields
  .sort({ created_at: -1 })
  .skip(skip)
  .limit(limit)
  .lean()           // No Mongoose overhead
  .hint({ created_at: -1 })  // Use specific index
  .exec();

// Batch info pre-loaded (cached on server)
const batches = batchCache.get(batchIds);  // In-memory cache
```

### **Solution 4: Smart Caching**

**Client-side Cache:**

```javascript
// Cache product list (rarely changes)
const [productCache, setProductCache] = useState(new Map());

// Cache keyword data per product (even if rarely changes, save computation)
const [keywordCache, setKeywordCache] = useState(new Map());

// Only refresh when necessary
const refreshKeywordCache = async (productId) => {
  if (keywordCache.has(productId)) {
    return keywordCache.get(productId); // Use cached
  }
  // Fetch only if missing
};
```

**Server-side Cache:**

```javascript
// Cache batch info for 30 seconds
const batchInfoCache = new Map();

function getBatchInfo(batchId) {
  if (batchInfoCache.has(batchId)) {
    const { data, timestamp } = batchInfoCache.get(batchId);
    if (Date.now() - timestamp < 30000) {
      return data; // Return cached
    }
  }
  // Fetch from DB if missing/stale
}
```

---

## 🚀 Implementation Steps

### **Phase 1: Fast API Endpoint (Easy, High Impact)**

Create `/api/messages/fast` endpoint:

```javascript
// Returns ONLY message metadata (no enrichment)
export async function GET(request) {
  // Same query as before, but with:
  // 1. .select('_id batch_id sender_id product_id status created_at')
  // 2. .lean() for minimal overhead
  // 3. No keyword enrichment
  // Time: ~200-300ms instead of ~2-3s
}
```

**Changes to messages page:**

```javascript
// Replace polling with fast refresh
useEffect(() => {
  const interval = setInterval(() => {
    // Poll FAST endpoint (no enrichment)
    fetchMessagesFast({ silent: true }); // 200ms
    // Trigger full enrichment only on demand
  }, 1000); // Can poll every 1s since it's so fast
}, []);
```

### **Phase 2: WebSocket Integration (Medium Effort, High Impact)**

Create `/lib/websocket-client.js`:

```javascript
export function useMessagesWebSocket(userId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:3000/api/ws/messages?userId=${userId}`,
    );

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === "NEW_MESSAGE") {
        setMessages((prev) => [data, ...prev]); // Prepend
      } else if (type === "STATUS_UPDATE") {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data._id ? { ...m, status: data.status } : m,
          ),
        );
      }
    };

    return () => ws.close();
  }, [userId]);

  return { messages };
}
```

### **Phase 3: Database Indexes (Easy, Medium Impact)**

Add to Message schema:

```javascript
schema.index({ created_at: -1 }); // For sorting
schema.index({ user_id: 1, product_id: 1 }); // For filtering
schema.index({ sender_id: 1 }); // For sender filter
schema.index({ status: 1 }); // For status filter
```

---

## 📈 Performance Gains

### **Before Optimization**

| Operation                     | Time        | Calls/min |
| ----------------------------- | ----------- | --------- |
| Initial load                  | 3-5s        | 1         |
| Polling interval              | 2s          | 30        |
| Per-message enrichment        | 100-200ms   | -         |
| **Total overhead per minute** | **~60-90s** | **30**    |

### **After Optimization**

| Operation                     | Time        | Calls/min        |
| ----------------------------- | ----------- | ---------------- |
| Initial load                  | 300-500ms   | 1                |
| Fast polling                  | 200-300ms   | 60               |
| Full enrichment (on-demand)   | 1-2s        | 2-3              |
| WebSocket updates             | <100ms      | ∞                |
| **Total overhead per minute** | **~20-30s** | **60 fast + WS** |

**Result: 3x faster page load, 2x better real-time updates** ✅

---

## 🔧 Code Changes Required

### **1. Update Message API Route**

```javascript
// /app/api/messages/fast
// Returns: lightweight message list (no enrichment)
// Time: ~200ms

// /app/api/messages/full
// Returns: full messages with enrichment (current behavior)
// Time: ~2-3s (only called on demand)
```

### **2. Update Messages Page Component**

```javascript
// Initial load: Fetch FAST + display
// Polls: FAST endpoint every 1s (much faster)
// On detail view: Fetch FULL for that message

// WebSocket: Listen for real-time updates
// Update: Status changes, new messages
```

### **3. Add Database Indexes**

Add to Message model schema initialization.

### **4. Optional: WebSocket Server**

Create `/app/api/ws/route.js` for real-time messaging (optional for Phase 1).

---

## 🎯 Priority Order

1. **HIGH (Quick Win):**
   - Create `/api/messages/fast` endpoint
   - Update polling to use fast endpoint
   - Expected improvement: 3-5x faster real-time updates

2. **HIGH (Medium Effort):**
   - Add database indexes
   - Optimize queries with projections
   - Expected improvement: 10-20% faster queries

3. **MEDIUM (Nice to Have):**
   - WebSocket integration
   - Server-side caching
   - Expected improvement: Real-time updates, reduced polling

4. **LOW (Future):**
   - Client-side caching
   - Offline support
   - GraphQL query optimization

---

## 🧪 Testing

**Before/After Measurements:**

```javascript
// Measure initial page load
console.time("page-load");
// ... component mounted
console.timeEnd("page-load");

// Measure API response times
console.time("api-fast");
fetch("/api/messages/fast");
console.timeEnd("api-fast");

// Measure enrichment time
console.time("enrichment");
// ... full data fetch
console.timeEnd("enrichment");
```

---

## ✨ Summary

**Quick Wins (Implement Today):**

- ✅ Create fast API endpoint (10 min)
- ✅ Update polling to use fast endpoint (5 min)
- ✅ Add database indexes (10 min)
- **Total: 25 minutes, 3-5x improvement**

**Longer-term (Next Sprint):**

- WebSocket for real-time
- Server-side caching
- Client-side caching
- **Total: 2-3 hours, 10x+ improvement**
