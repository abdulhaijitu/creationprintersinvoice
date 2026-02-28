

## চারটি পেইজের সমস্যা ও উন্নতির বিশ্লেষণ

---

### ১. Payments পেইজ (`src/pages/Payments.tsx`)

**ত্রুটি:**
- **Refund আসলে Delete করে** (লাইন 200-204) — "Refund" বলে payment রেকর্ড পুরোপুরি মুছে দেয়, কোনো audit trail থাকে না
- **Unused imports** — `isPast`, `isToday` import করা হয়েছে (লাইন 3) কিন্তু ব্যবহৃত হয়নি
- **Stats label বিভ্রান্তিকর** — "Pending Due" ও "Due Amount" দুটো আলাদা কার্ড কিন্তু পার্থক্য স্পষ্ট না; "Due Amount" আসলে "Overdue Amount" হওয়া উচিত
- **Pagination নেই** — সব পেমেন্ট একসাথে লোড হয়, 1000+ রেকর্ডে সমস্যা হবে
- **Table footer summary নেই** — ফিল্টার করা পেমেন্টের মোট পরিমাণ দেখা যায় না

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- Stats label পরিষ্কার করা: "Due Amount" → "Overdue Amount"
- Unused imports সরানো
- Table footer-এ filtered payments-এর Total Paid ও Total Due summary
- "Refund" dialog-এর description-এ সতর্কবার্তা যোগ করা যে এটি রেকর্ড মুছে ফেলবে

---

### ২. Quotations পেইজ (`src/pages/Quotations.tsx`)

**ত্রুটি:**
- **Pagination নেই** — সব quotation একসাথে লোড, 1000 row limit hit করবে
- **`isEditable` সবসময় `true` রিটার্ন করে** (লাইন 299) কিন্তু Tooltip বলছে "Only draft quotations can be edited" (লাইন 563) — contradictory code vs tooltip
- **Unused variable** — `deleteId` ও `quotationToDelete` দুটোই একই কাজ করে, redundant

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- Dead tooltip কোড সরানো (যেহেতু `isEditable` সবসময় true, disabled edit বাটন কখনোই দেখা যায় না — লাইন 548-566 dead code)

---

### ৩. Price Calculations পেইজ (`src/pages/PriceCalculations.tsx`)

**ত্রুটি:**
- **Pagination নেই** — একই 1000 row limit সমস্যা
- **Sorting নেই** — টেবিল হেডারে sort করা যায় না
- **Date/Status ফিল্টার নেই** — শুধু search আছে
- **View ও Edit বাটন একই রাউটে যায়** (লাইন 257, 266 দুটোই `/price-calculation/${id}`) — Edit-এর আলাদা route নেই, তাই Edit বাটন misleading

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- SortableTableHeader যোগ
- View ও Edit বাটন যেহেতু একই route, Edit বাটন রিমুভ করে শুধু View রাখা (অথবা View-এর label "View / Edit" করা)

---

### ৪. Delivery Challans পেইজ (`src/pages/DeliveryChallans.tsx`)

**ত্রুটি:**
- **Pagination নেই** — সব challan একসাথে লোড
- **Sorting নেই** — টেবিল হেডারে sort করা যায় না
- **Search input-এ Search আইকন নেই** (লাইন 200-205) — অন্য সব পেইজে আছে, এখানে নেই; inconsistent
- **Status change dropdown নেই** — ডেস্কটপ টেবিলে শুধু View, Print, Delete আছে; status change করতে detail drawer খুলতে হয়

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- SortableTableHeader যোগ
- Search input-এ Search আইকন যোগ (consistency)
- Desktop dropdown-এ status change options (Mark Dispatched, Mark Delivered) যোগ

---

### Implementation Plan

#### ফাইল ১: `src/pages/Payments.tsx`
- Unused imports (`isPast`, `isToday`) সরানো
- Stats label "Due Amount" → "Overdue Amount" পরিবর্তন
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- Table footer summary (Total Paid, Total Due) যোগ
- Refund dialog-এ warning text আপডেট ("This will permanently delete the payment record")

#### ফাইল ২: `src/pages/Quotations.tsx`
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- Dead code (disabled Edit tooltip block, লাইন 548-566) সরানো

#### ফাইল ৩: `src/pages/PriceCalculations.tsx`
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- SortableTableHeader import ও যোগ
- Duplicate Edit বাটন সরানো (View-এই যথেষ্ট)

#### ফাইল ৪: `src/pages/DeliveryChallans.tsx`
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- SortableTableHeader import ও যোগ
- Search input-এ `Search` আইকন যোগ
- Desktop dropdown-এ status change options যোগ (Draft→Dispatched, Dispatched→Delivered)

