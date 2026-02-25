

## বাংলা টেক্সট অপসারণ — সম্পূর্ণ ইংরেজি অ্যাপ

অ্যাপের ৬টি ফাইলে বাংলা ভাষার টেক্সট পাওয়া গেছে। সব বাংলা টেক্সট ইংরেজিতে রিপ্লেস করা হবে।

---

### পরিবর্তনসমূহ

#### 1. `src/components/invoice/CostingTemplateDialog.tsx` (সবচেয়ে বেশি — ~15টি বাংলা স্ট্রিং)

| লাইন | বর্তমান (বাংলা) | নতুন (ইংরেজি) |
|------|-----------------|----------------|
| 135 | `টেমপ্লেটের নাম দিন` | `Please enter a template name` |
| 139 | `সেভ করার জন্য অন্তত একটি costing item থাকতে হবে` | `At least one costing item is required to save` |
| 157 | `টেমপ্লেট সেভ হয়েছে` | `Template saved successfully` |
| 164 | `টেমপ্লেট সেভ করতে সমস্যা হয়েছে` | `Failed to save template` |
| 240 | `বারবার ব্যবহৃত costing items সেভ করে রিইউজ করুন` | `Save and reuse frequently used costing items` |
| 355 | `টেমপ্লেটের নাম *` | `Template Name *` |
| 358 | `যেমন: Business Card Costing` | `e.g. Business Card Costing` |
| 365 | `বিবরণ (ঐচ্ছিক)` | `Description (Optional)` |
| 368 | `এই টেমপ্লেট সম্পর্কে কিছু লিখুন...` | `Write something about this template...` |
| 379 | `সংরক্ষিত হবে` | `Items to save` |
| 394 | `মোট:` | `Total:` |
| 406 | `বাতিল করুন` | `Cancel` |
| 419 | `টেমপ্লেট সেভ করুন` | `Save Template` |
| 432 | `টেমপ্লেট কিভাবে লোড করবেন?` | `How to load template?` |
| 434 | `আপনার বর্তমান costing items আছে...` | `You have existing costing items. Replace with template or append at the end?` |
| 446 | `বর্তমান items মুছে যাবে` | `Current items will be removed` |
| 457 | `বর্তমান items এর পরে যোগ হবে` | `Will be added after current items` |
| 463 | `বাতিল করুন` | `Cancel` |

#### 2. `src/components/invoice/ImportPriceCalculationDialog.tsx` (~6টি বাংলা স্ট্রিং)

| লাইন | বর্তমান | নতুন |
|------|---------|------|
| 209 | `Price Calculation থেকে Import করুন` | `Import from Price Calculation` |
| 212 | `একটি Price Calculation সিলেক্ট করুন...` | `Select a Price Calculation to import its costing items into the Invoice` |
| 220 | `Job description বা customer name দিয়ে সার্চ করুন...` | `Search by job description or customer name...` |
| 246 | `কোনো Price Calculation পাওয়া যায়নি` | `No Price Calculations found` |
| 249 | `এই customer-এর জন্য কোনো calculation নেই` | `No calculations found for this customer` |
| 300 | `Import করুন` | `Import` |
| 311 | `বাতিল করুন` | `Cancel` |

#### 3. `src/components/invoice/ApplyItemTemplateDialog.tsx` (1টি)

| লাইন | বর্তমান | নতুন |
|------|---------|------|
| 119 | `⚠️ বর্তমান costing items প্রতিস্থাপন হবে।` | `⚠️ Existing costing items will be replaced.` |

#### 4. `src/pages/CostingItemTemplates.tsx` (2টি)

| লাইন | বর্তমান | নতুন |
|------|---------|------|
| 284 | `কোনো টেমপ্লেট নেই` | `No Templates Found` |
| 286 | `নতুন টেমপ্লেট তৈরি করতে "New Template" বাটনে ক্লিক করুন` | `Click "New Template" to create your first template` |
| 579 | `এই টেমপ্লেট মুছে ফেলা হবে...` | `This template will be permanently deleted. This action cannot be undone.` |
| 581 | `আগের ইনভয়েসে এই টেমপ্লেট থেকে প্রয়োগ করা costing data প্রভাবিত হবে না।` | `Costing data applied from this template in previous invoices will not be affected.` |

#### 5. `src/components/settings/SmsNotificationSettings.tsx` (1টি)

| লাইন | বর্তমান | নতুন |
|------|---------|------|
| 91 | `API Key ও Sender ID সিক্রেট হিসেবে কনফিগার করতে হবে` | `API Key and Sender ID must be configured as secrets` |

#### 6. `src/pages/Settings.tsx` — Bengali ফিল্ড লেবেল রাখা হবে

Settings পেইজে "Company Name (Bengali)" ও "Address (Bengali)" ফিল্ড আছে — এগুলো **data input fields** (ইউজার নিজের কোম্পানির বাংলা নাম/ঠিকানা দেয়), তাই লেবেল ইংরেজিতেই আছে এবং কোনো পরিবর্তন দরকার নেই।

---

### টেকনিক্যাল নোট
- শুধু হার্ডকোডেড বাংলা স্ট্রিং ইংরেজিতে রিপ্লেস হবে
- কোনো লজিক বা স্ট্রাকচার পরিবর্তন হবে না
- ৫টি ফাইলে মোট ~25টি স্ট্রিং পরিবর্তন

