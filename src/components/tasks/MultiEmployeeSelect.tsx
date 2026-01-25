import * as React from "react";
import { X, Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Employee } from "@/hooks/useTasks";

interface MultiEmployeeSelectProps {
  employees: Employee[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MultiEmployeeSelect({
  employees,
  value,
  onChange,
  disabled = false,
  placeholder = "Select assignees...",
  className,
}: MultiEmployeeSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedEmployees = employees.filter((emp) => value.includes(emp.id));

  const toggleEmployee = (employeeId: string) => {
    if (value.includes(employeeId)) {
      onChange(value.filter((id) => id !== employeeId));
    } else {
      onChange([...value, employeeId]);
    }
  };

  const removeEmployee = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== employeeId));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal min-h-10",
              !value.length && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 shrink-0" />
              {value.length > 0
                ? `${value.length} assignee${value.length > 1 ? "s" : ""} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Search employees..." />
            <CommandList>
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup>
                {employees.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={employee.full_name}
                    onSelect={() => toggleEmployee(employee.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(employee.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span>{employee.full_name}</span>
                      {employee.department && (
                        <span className="text-xs text-muted-foreground">
                          {employee.department}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected employees as badges */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedEmployees.map((emp) => (
            <Badge
              key={emp.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="truncate max-w-[120px]">{emp.full_name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeEmployee(emp.id, e)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
