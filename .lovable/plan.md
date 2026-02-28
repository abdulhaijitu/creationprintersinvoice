

## Edit Bill Modal — Match AddBillDialog Design

The current Edit Bill uses a basic inline `Dialog` with plain text inputs (lines 694-801 in VendorDetail.tsx). The goal is to create a dedicated `EditBillDialog` component that mirrors the `AddBillDialog` design — with line items table, calendar pickers, client's job select, and the same layout sections.

### Current State
- **AddBillDialog** (`src/components/vendor/AddBillDialog.tsx`): Rich UI with line items table, `CalendarWithJumps`, client combobox, discount, net payable summary
- **Edit Bill**: Basic inline `Dialog` in `VendorDetail.tsx` with plain `<Input type="date">` and simple amount/discount fields
- **DB**: `vendor_bills` stores `amount`, `discount`, `net_amount`, `description` — no separate line items table. Line items are serialized into the `description` field as text

### Plan

#### 1. Create `EditBillDialog` component
**File:** `src/components/vendor/EditBillDialog.tsx`

- Clone the `AddBillDialog` structure (same sections: Bill Meta, Line Items table, Context, Payment Summary, Due Date)
- Accept a `bill` prop with existing bill data
- On open, parse the existing `description` field to pre-populate line items (best-effort: parse `"1. Item — qty × rate = total"` format, fallback to single line item with full amount)
- Pre-fill: bill date, reference, discount, due date, customer (if parseable from description)
- `onSave` callback receives `BillFormData` for the update

#### 2. Update `VendorDetail.tsx`
- Import `EditBillDialog`
- Remove the old inline edit bill `Dialog` (lines 694-801)
- Wire `openEditBillDialog` to open the new `EditBillDialog` with the selected bill
- Update `handleAddBill` (the edit path at lines 261-275) to accept `BillFormData` and build description the same way as `handleSaveNewBill`

### Technical Detail
- The description parsing will use regex to extract line items from the format `"N. description — qty × rate = total"`. If parsing fails, a single line item with the bill's full amount is created.
- Customer ID extraction: If description starts with `"Client: Name"`, attempt to match against the customers list to pre-select.
- No DB changes needed — same `vendor_bills` table, same columns.

