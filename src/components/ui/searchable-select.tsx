import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  /** Selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Options array */
  options: SearchableSelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Empty state text */
  emptyText?: string;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names for trigger */
  className?: string;
  /** Optional icon to show before the label */
  icon?: React.ReactNode;
  /** Allow clearing the selection */
  clearable?: boolean;
}

/**
 * SearchableSelect - A searchable dropdown select component
 *
 * Features:
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Type to search/filter
 * - "No results found" state
 * - Accessible with proper ARIA attributes
 */
const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select an option",
      searchPlaceholder = "Search...",
      emptyText = "No results found.",
      error,
      errorMessage,
      disabled,
      className,
      icon,
      clearable = false,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selectedOption = React.useMemo(
      () => options.find((option) => option.value === value),
      [options, value],
    );

    const handleSelect = (selectedValue: string) => {
      // If clicking the same value and clearable, clear it
      if (selectedValue === value && clearable) {
        onValueChange("");
      } else {
        onValueChange(selectedValue);
      }
      setOpen(false);
    };

    const selectElement = (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-10",
              !selectedOption && "text-muted-foreground",
              error && "border-destructive focus:ring-destructive",
              className,
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {icon}
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );

    if (error && errorMessage) {
      return (
        <div className="space-y-1">
          {selectElement}
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      );
    }

    return selectElement;
  },
);

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
