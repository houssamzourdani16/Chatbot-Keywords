# Message Sender Grouping - Final Implementation

## 🎯 Problem Solved

**Before:** Messages from same sender were processed individually with different wait times
**After:** All messages from same sender grouped together with identical wait times

---

## ✅ How It Works Now

### **Flow:**

```
Message 1 arrives (sender: "john")
  ↓
1. Check: Does "john" have saved messages? NO
2. Create new batch
3. Save message with product's wait_time (6s)
4. Start 6s timer
  ↓
Message 2 arrives (sender: "john", at 2s mark)
  ↓
1. Check: Does "john" have saved messages? YES ✓
2. UPDATE Message 1's wait_time to 6s (reset)
3. Add Message 2 to SAME batch
4. RESET batch timer to 6s
5. All messages waiting 6s total
  ↓
Message 3 arrives (sender: "john", at 5s mark)
  ↓
1. Check: Does "john" have saved messages? YES ✓
2. UPDATE Message 1 & 2's wait_time to 6s (reset)
3. Add Message 3 to SAME batch
4. RESET batch timer to 6s
5. All messages waiting 6s from now
  ↓
After 6 seconds (no new messages)
  ↓
Send ALL 3 messages together to n8n ✓
```

---

## 📊 Data Structure

### **Messages from Same Sender:**

| #   | Message | Batch ID | Status   | Wait Time | Expires At |
| --- | ------- | -------- | -------- | --------- | ---------- |
| 1   | "Hello" | batch123 | received | 6s        | t+6s       |
| 2   | "Hi"    | batch123 | received | 6s        | t+6s       |
| 3   | "Hey"   | batch123 | received | 6s        | t+6s       |

✅ **Same batch, same wait time, sent together**

---

## 🔍 Implementation Details

### **File: `/lib/services/batch-service.js`**

**Step 1: Check if Sender Exists**

```javascript
const existingMessages = await Message.find({
  user_id,
  product_id,
  sender_id,
  status: { $in: ["received", "processing"] },
});

const isExistingSender = existingMessages.length > 0;
```

**Step 2: If Existing Sender - Reset All Messages**

```javascript
if (isExistingSender && existingMessages.length > 0) {
  await Message.updateMany(
    { _id: { $in: existingMessages.map((m) => m._id) } },
    { $set: { waiting_time: finalWaitingTime } },
  );
}
```

**Step 3: Save New Message with Same Wait Time**

```javascript
const message = await Message.create({
  user_id,
  product_id,
  sender_id,
  batch_id: batch._id,
  waiting_time: finalWaitingTime, // Same as all other messages
  status: "received",
  ...other_fields,
});
```

**Step 4: Reset Batch Timer**

```javascript
// Batch's expires_at resets with each message
$set: {
  expires_at: finalExpiresAt;
}
```

---

## 📈 Behavior Examples

### **Example 1: Single Sender (Messages Within Wait Time)**

```
Product wait_time: 6s

11:00:00 - Message 1 arrives (sender: "user1")
           └─ Check: NO saved messages
           └─ Create batch_1
           └─ waiting_time: 6s
           └─ Timer: 6s from now (11:00:06)

11:00:02 - Message 2 arrives (sender: "user1")
           └─ Check: YES, has saved messages
           └─ UPDATE Message 1: waiting_time = 6s
           └─ ADD to batch_1
           └─ RESET Timer: 6s from now (11:00:08)

11:00:05 - Message 3 arrives (sender: "user1")
           └─ Check: YES, has saved messages
           └─ UPDATE Messages 1 & 2: waiting_time = 6s
           └─ ADD to batch_1
           └─ RESET Timer: 6s from now (11:00:11)

11:00:11 - Timer expires
           └─ Send ALL 3 messages to n8n together ✓
           └─ Mark batch_1 as "completed"
```

### **Example 2: Multiple Senders**

```
11:00:00 - Message 1 (sender: "user1") → batch_1
11:00:01 - Message 1 (sender: "user2") → batch_2 (different batch!)
11:00:02 - Message 2 (sender: "user1") → batch_1 (reused)
11:00:03 - Message 2 (sender: "user2") → batch_2 (reused)

Result:
  batch_1: [user1_msg1, user1_msg2] → sent together at 11:00:08
  batch_2: [user2_msg1, user2_msg2] → sent together at 11:00:09
```

---

## ✨ Key Features

✅ **Sender Existence Check** - Detects if sender has saved messages
✅ **Automatic Reset** - All messages reset to product's wait_time
✅ **Same Batch** - All messages grouped in one batch by atomic index
✅ **Synchronized Timer** - Batch timer resets with each message
✅ **Grouped Processing** - All messages sent to n8n together
✅ **Product Config** - Wait time always from product settings
✅ **Debounce** - True debounce: timer resets on each new message

---

## 🧪 Testing

### **Test Case 1: Same Sender Multiple Messages**

1. Send 3 messages from "user1" within 6 seconds
2. Expected: All 3 messages in same batch with wait_time=6s
3. Expected: All sent to n8n together after 6s from last message

### **Test Case 2: Multiple Senders**

1. Send message from "user1" at 0s
2. Send message from "user2" at 1s
3. Send message from "user1" at 2s
4. Expected: 2 separate batches, processed independently

### **Test Case 3: Wait Time Reset**

1. Send message 1 from "user1" at 0s (wait_time: 6s)
2. Send message 2 from "user1" at 5s
3. Check: Message 1's wait_time should still be 6s (not expired)
4. Expected: Both sent together at ~11s (5s + 6s)

---

## 🔄 Data Flow

```
Webhook receives message
  ↓
Check if sender has saved messages
  ├─ YES → Update ALL existing messages with wait_time
  └─ NO → Skip update
  ↓
Find or create batch (atomic upsert)
  ├─ FOUND → Reset batch timer
  └─ NEW → Create with product's wait_time
  ↓
Create new message with wait_time
  ↓
Return immediately to webhook (fire-and-forget)
  ↓
Batch processing starts asynchronously
  ├─ Timer expires
  ├─ Send to n8n
  └─ Mark as completed
```

---

## 📝 Console Logs

You'll see logs like:

```
📨 Sender 27682126791487541: EXISTING | Existing messages: 2
🔄 Reset waiting_time to 6s for 2 existing messages from sender 27682126791487541
✅ New message from sender 27682126791487541 created | batch: 6a97e8d0 | waiting_time: 6s | expires_at: ... | RESET existing messages ✓
```

---

## ✅ Result

**All requirements met:**
✓ Check sender_id if existing on saved messages
✓ If existing: save message AND reset wait_time on ALL messages with same sender_id
✓ Based on product's wait_time setting
✓ Process all together (same batch, grouped)
✓ No individual processing
