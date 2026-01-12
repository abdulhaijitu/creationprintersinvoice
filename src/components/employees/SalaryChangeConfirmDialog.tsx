import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SalaryChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSalary: number;
  newSalary: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SalaryChangeConfirmDialog = ({
  open,
  onOpenChange,
  currentSalary,
  newSalary,
  onConfirm,
  onCancel,
  isLoading,
}: SalaryChangeConfirmDialogProps) => {
  const difference = newSalary - currentSalary;
  const percentChange = currentSalary > 0 
    ? ((difference / currentSalary) * 100).toFixed(1) 
    : "N/A";
  const isIncrease = difference > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Salary Change</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>You are about to change the employee's salary. This change will be recorded in the salary history.</p>
              
              <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <p className="text-lg font-semibold">{formatCurrency(currentSalary)}</p>
                </div>
                <div className="flex items-center">
                  {isIncrease ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">New</p>
                  <p className="text-lg font-semibold">{formatCurrency(newSalary)}</p>
                </div>
              </div>

              <div className="text-center">
                <span className={`text-sm font-medium ${isIncrease ? "text-green-600" : "text-red-500"}`}>
                  {isIncrease ? "+" : ""}{formatCurrency(difference)} ({isIncrease ? "+" : ""}{percentChange}%)
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Saving..." : "Confirm Change"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
