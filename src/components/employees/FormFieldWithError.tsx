import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldWithErrorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const FormFieldWithError = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  type = "text",
  placeholder,
  required,
  disabled,
}: FormFieldWithErrorProps) => {
  const showError = touched && error;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          showError && "border-destructive/50 focus-visible:ring-destructive/30"
        )}
      />
      {showError && (
        <p className="text-xs text-destructive/80 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
};
