import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename } from "@/lib/pdfUtils";

interface Bill {
  id: string;
  bill_date: string;
  reference_no: string | null;
  description: string | null;
  amount: number;
  discount: number;
  net_amount: number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  reference_no: string | null;
  notes: string | null;
}

interface Vendor {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
}

interface VendorStatementPDFProps {
  vendor: Vendor;
  bills: Bill[];
  payments: Payment[];
  fromDate: Date;
  toDate: Date;
  onClose: () => void;
}

// Format currency with BDT and commas
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Ledger entry type for sorting and display
interface LedgerEntry {
  date: Date;
  dateStr: string;
  refNo: string;
  description: string;
  bill: number;
  discount: number;
  payment: number;
  type: "bill" | "discount" | "payment";
  sourceId: string;
}

export const VendorStatementPDF = ({
  vendor,
  bills,
  payments,
  fromDate,
  toDate,
  onClose,
}: VendorStatementPDFProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("");

  const { data: settings } = useQuery({
    queryKey: ["company-settings-statement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const { data: branding } = useQuery({
    queryKey: ["organization-branding-statement"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      
      if (!member) return null;
      
      const { data: brandingData } = await supabase
        .from("organization_branding")
        .select("*")
        .eq("organization_id", member.organization_id)
        .maybeSingle();
      
      return brandingData;
    },
  });

  // Build ledger entries from bills and payments
  const buildLedgerEntries = (): LedgerEntry[] => {
    const entries: LedgerEntry[] = [];

    // Add bill entries (with separate discount entries if discount > 0)
    bills.forEach((bill) => {
      const billDate = parseISO(bill.bill_date);
      if (billDate >= fromDate && billDate <= toDate) {
        // Bill entry (debit)
        entries.push({
          date: billDate,
          dateStr: format(billDate, "dd MMM yyyy"),
          refNo: bill.reference_no || `BILL-${bill.id.slice(0, 8)}`,
          description: bill.description ? bill.description.split("\n")[0].slice(0, 50) : "Vendor Bill",
          bill: bill.amount,
          discount: 0,
          payment: 0,
          type: "bill",
          sourceId: bill.id,
        });

        // Discount entry (credit) - same date as bill
        if (bill.discount > 0) {
          entries.push({
            date: billDate,
            dateStr: format(billDate, "dd MMM yyyy"),
            refNo: bill.reference_no || `BILL-${bill.id.slice(0, 8)}`,
            description: "Bill Discount",
            bill: 0,
            discount: bill.discount,
            payment: 0,
            type: "discount",
            sourceId: `${bill.id}-discount`,
          });
        }
      }
    });

    // Add payment entries
    payments.forEach((payment) => {
      const paymentDate = parseISO(payment.payment_date);
      if (paymentDate >= fromDate && paymentDate <= toDate) {
        entries.push({
          date: paymentDate,
          dateStr: format(paymentDate, "dd MMM yyyy"),
          refNo: payment.reference_no || `PMT-${payment.id.slice(0, 8)}`,
          description: payment.notes || "Payment",
          bill: 0,
          discount: 0,
          payment: payment.amount,
          type: "payment",
          sourceId: payment.id,
        });
      }
    });

    // Sort by date, then by type (bills first, then discounts, then payments)
    entries.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      const typeOrder = { bill: 0, discount: 1, payment: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return entries;
  };

  const ledgerEntries = buildLedgerEntries();

  // Calculate totals and running balances
  const calculateSummary = () => {
    let totalBill = 0;
    let totalDiscount = 0;
    let totalPayment = 0;

    ledgerEntries.forEach((entry) => {
      totalBill += entry.bill;
      totalDiscount += entry.discount;
      totalPayment += entry.payment;
    });

    const openingBalance = 0; // Could be enhanced to calculate from before fromDate
    const closingBalance = openingBalance + totalBill - totalDiscount - totalPayment;

    return {
      openingBalance,
      totalBill,
      totalDiscount,
      totalPayment,
      closingBalance,
    };
  };

  const summary = calculateSummary();

  // Calculate running balance for each row
  const entriesWithBalance = ledgerEntries.map((entry, index) => {
    let runningBalance = summary.openingBalance;
    for (let i = 0; i <= index; i++) {
      runningBalance += ledgerEntries[i].bill - ledgerEntries[i].discount - ledgerEntries[i].payment;
    }
    return { ...entry, runningBalance };
  });

  useEffect(() => {
    // Set document title for PDF filename
    const vendorNameSafe = sanitizeFilename(vendor.name);
    const periodStr = format(toDate, "yyyy-MM");
    const filename = `Vendor-Statement-${vendorNameSafe}-${periodStr}`;
    setPdfTitle(filename);
    
    const originalTitle = document.title;
    document.title = filename;

    // Trigger print after a short delay
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    const handleAfterPrint = () => {
      document.title = originalTitle;
      onClose();
    };
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      clearTimeout(timer);
      document.title = originalTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [vendor.name, toDate, onClose]);

  const companyName = settings?.company_name || "Company Name";
  const companyAddress = settings?.address || "";
  const companyPhone = settings?.phone || "";
  const companyEmail = settings?.email || "";
  const logoUrl = branding?.logo_url || settings?.logo_url || null;
  const primaryColor = branding?.primary_color || "#0f766e";

  return (
    <>
      {/* Print-only statement */}
      <div
        ref={printRef}
        className="hidden print:block bg-white text-black"
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "9pt",
          lineHeight: "1.4",
          padding: "15mm 15mm 20mm 15mm",
          maxWidth: "210mm",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: "12px",
            marginBottom: "16px",
            borderBottom: `2px solid ${primaryColor}`,
          }}
        >
          {/* Company Info */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{
                  width: "45px",
                  height: "45px",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "45px",
                  height: "45px",
                  background: primaryColor,
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "700",
                }}
              >
                {companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1
                style={{
                  fontSize: "14pt",
                  fontWeight: "700",
                  color: "#111827",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {companyName}
              </h1>
              {companyAddress && (
                <p style={{ fontSize: "8pt", color: "#6b7280", margin: "3px 0 0" }}>
                  {companyAddress}
                </p>
              )}
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                {[companyPhone, companyEmail].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>

          {/* Statement Title */}
          <div style={{ textAlign: "right" }}>
            <h2
              style={{
                fontSize: "20pt",
                fontWeight: "800",
                color: primaryColor,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              VENDOR STATEMENT
            </h2>
            <p style={{ fontSize: "9pt", color: "#6b7280", margin: "4px 0 0" }}>
              Generated: {format(new Date(), "dd MMM yyyy")}
            </p>
          </div>
        </div>

        {/* Vendor Info Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Vendor Details */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: `3px solid ${primaryColor}`,
            }}
          >
            <p
              style={{
                fontSize: "7pt",
                fontWeight: "700",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px",
              }}
            >
              Vendor
            </p>
            <p style={{ fontSize: "11pt", fontWeight: "600", color: "#111827", margin: 0 }}>
              {vendor.name}
            </p>
            {vendor.address && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "3px 0 0" }}>
                {vendor.address}
              </p>
            )}
            {vendor.phone && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                Phone: {vendor.phone}
              </p>
            )}
          </div>

          {/* Statement Period */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: "3px solid #6366f1",
            }}
          >
            <p
              style={{
                fontSize: "7pt",
                fontWeight: "700",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px",
              }}
            >
              Statement Period
            </p>
            <p style={{ fontSize: "10pt", fontWeight: "500", color: "#111827", margin: 0 }}>
              {format(fromDate, "dd MMM yyyy")} — {format(toDate, "dd MMM yyyy")}
            </p>
          </div>
        </div>

        {/* Statement Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: primaryColor,
                color: "white",
              }}
            >
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600" }}>
                Date
              </th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600" }}>
                Ref#
              </th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600", maxWidth: "150px" }}>
                Description
              </th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                Bill (Dr)
              </th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                Discount (Cr)
              </th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                Payment (Cr)
              </th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <td colSpan={6} style={{ padding: "6px", fontSize: "8pt", fontWeight: "600" }}>
                Opening Balance
              </td>
              <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                {formatCurrency(summary.openingBalance)}
              </td>
            </tr>

            {/* Ledger Entries */}
            {entriesWithBalance.map((entry, index) => (
              <tr
                key={entry.sourceId}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <td style={{ padding: "6px", fontSize: "8pt", whiteSpace: "nowrap" }}>
                  {entry.dateStr}
                </td>
                <td style={{ padding: "6px", fontSize: "8pt", fontFamily: "monospace" }}>
                  {entry.refNo}
                </td>
                <td style={{ padding: "6px", fontSize: "8pt", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.description}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", color: entry.bill > 0 ? "#dc2626" : "#9ca3af" }}>
                  {entry.bill > 0 ? formatCurrency(entry.bill) : "-"}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", color: entry.discount > 0 ? "#059669" : "#9ca3af" }}>
                  {entry.discount > 0 ? formatCurrency(entry.discount) : "-"}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", color: entry.payment > 0 ? "#059669" : "#9ca3af" }}>
                  {entry.payment > 0 ? formatCurrency(entry.payment) : "-"}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", fontWeight: "500" }}>
                  {formatCurrency(entry.runningBalance)}
                </td>
              </tr>
            ))}

            {ledgerEntries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "9pt" }}>
                  No transactions found for the selected period
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Summary Box */}
          <div
            style={{
              border: `1px solid ${primaryColor}`,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                backgroundColor: primaryColor,
                color: "white",
                padding: "8px 12px",
                fontSize: "9pt",
                fontWeight: "600",
              }}
            >
              Statement Summary
            </div>
            <div style={{ padding: "10px 12px" }}>
              <table style={{ width: "100%", fontSize: "9pt" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#6b7280" }}>Opening Balance</td>
                    <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "500" }}>
                      ৳ {formatCurrency(summary.openingBalance)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#6b7280" }}>Total Bills</td>
                    <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "500", color: "#dc2626" }}>
                      + ৳ {formatCurrency(summary.totalBill)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#6b7280" }}>Total Discounts</td>
                    <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "500", color: "#059669" }}>
                      - ৳ {formatCurrency(summary.totalDiscount)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#6b7280" }}>Total Payments</td>
                    <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "500", color: "#059669" }}>
                      - ৳ {formatCurrency(summary.totalPayment)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 0 4px", fontWeight: "700", fontSize: "10pt" }}>
                      Closing Balance (Due)
                    </td>
                    <td
                      style={{
                        padding: "8px 0 4px",
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "11pt",
                        color: summary.closingBalance > 0 ? "#dc2626" : "#059669",
                      }}
                    >
                      ৳ {formatCurrency(summary.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div
            style={{
              backgroundColor: "#fefce8",
              border: "1px solid #fde047",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "8pt",
              color: "#713f12",
            }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: "600" }}>Balance Calculation:</p>
            <p style={{ margin: 0, lineHeight: "1.5" }}>
              Running Balance = Previous Balance + Bill - Discount - Payment
              <br />
              Positive balance indicates amount payable to vendor.
              <br />
              Negative balance indicates advance/overpayment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "30px",
            paddingTop: "12px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "7pt", color: "#9ca3af", margin: 0 }}>
            This is a system-generated statement. • No signature required. • Printed on{" "}
            {format(new Date(), "dd MMM yyyy 'at' hh:mm a")}
          </p>
        </div>
      </div>

      {/* Screen display - Loading indicator */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center print:hidden">
        <div className="bg-card p-6 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing vendor statement...</p>
          <p className="text-sm text-muted-foreground mt-2">Print dialog will open shortly</p>
        </div>
      </div>
    </>
  );
};

export default VendorStatementPDF;
