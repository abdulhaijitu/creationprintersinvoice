/**
 * Global Input System - Central Export
 * 
 * This module provides a unified, standardized input system for the entire app.
 * All forms should use ONLY these components to ensure:
 * - Cursor stability
 * - Focus protection
 * - No browser interference
 * - Consistent UX
 * 
 * RULES (enforced by all components):
 * 1. Value comes from local state ONLY (no computed overwrites while focused)
 * 2. No formatting/parsing during typing - only on blur/submit
 * 3. Browser autocomplete/suggestions disabled
 * 4. Validation is silent (no value mutation)
 * 5. Cursor never jumps automatically
 */

// Text Input - For general text fields
export { TextInput } from "./text-input";
export type { TextInputProps } from "./text-input";

// Numeric Input - For numbers, amounts, quantities
export { NumericInput, parseNumericValue, formatNumericDisplay } from "./numeric-input";
export type { NumericInputProps } from "./numeric-input";

// Currency Input - For currency/money fields (wraps NumericInput with number API)
export { CurrencyInput } from "./currency-input";
export type { CurrencyInputProps } from "./currency-input";

// Date Input - For date fields
export { DateInput, formatDateForInput, parseDateFromInput } from "./date-input";
export type { DateInputProps } from "./date-input";

// TextArea Input - For multi-line text
export { TextAreaInput } from "./textarea-input";
export type { TextAreaInputProps } from "./textarea-input";

// Select Input - For dropdown selections
export { SelectInput } from "./select-input";
export type { SelectInputProps, SelectOption } from "./select-input";

/**
 * Usage Examples:
 * 
 * // Text Input
 * const [name, setName] = useState('');
 * <TextInput value={name} onChange={setName} placeholder="Enter name" />
 * 
 * // Numeric Input (raw string, parse on submit)
 * const [amount, setAmount] = useState('');
 * <NumericInput value={amount} onChange={setAmount} prefix="৳" />
 * const numericAmount = parseNumericValue(amount); // Use on submit
 * 
 * // Currency Input (number API, internal string handling)
 * const [price, setPrice] = useState(0);
 * <CurrencyInput value={price} onChange={setPrice} />
 * 
 * // Date Input
 * const [date, setDate] = useState('');
 * <DateInput value={date} onChange={setDate} />
 * 
 * // TextArea Input
 * const [notes, setNotes] = useState('');
 * <TextAreaInput value={notes} onChange={setNotes} maxLength={500} showCharCount />
 * 
 * // Select Input
 * const [status, setStatus] = useState('');
 * <SelectInput 
 *   value={status} 
 *   onChange={setStatus}
 *   options={[
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' }
 *   ]}
 * />
 */
