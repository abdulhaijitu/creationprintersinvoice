import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
  CommandSeparator,
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
  /** Show "Add new item" option that allows creating custom entries */
  allowCreate?: boolean;
  /** Callback when user wants to add a new custom item - receives the search query */
  onCreateNew?: (searchQuery: string) => void;
  /** Label for the "Add new" action */
  createNewLabel?: string;
}

/**
 * SearchableSelect - A searchable dropdown select component
 *
 * Features:
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Type to search/filter
 * - "No results found" state
 * - Accessible with proper ARIA attributes
 * - Optional "Add new item" action
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
      allowCreate = false,
      onCreateNew,
      createNewLabel = "Add new item",
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

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
      setSearchQuery("");
    };

    const handleCreateNew = () => {
      if (onCreateNew) {
        onCreateNew(searchQuery);
      }
      setOpen(false);
      setSearchQuery("");
    };

    const selectElement = (
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery("");
      }}>
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
            <CommandInput 
              placeholder={searchPlaceholder} 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
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
              {allowCreate && onCreateNew && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateNew}
                      className="cursor-pointer text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {searchQuery ? `Add "${searchQuery}"` : createNewLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
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
