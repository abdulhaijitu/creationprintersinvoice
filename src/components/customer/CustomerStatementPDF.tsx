import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename } from "@/lib/pdfUtils";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  status: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company_name: string | null;
}

interface CustomerStatementPDFProps {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  onClose: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface LedgerEntry {
  date: Date;
  dateStr: string;
  refNo: string;
  description: string;
  invoiceAmount: number;
  paymentAmount: number;
  type: "invoice" | "payment";
  sourceId: string;
}

export const CustomerStatementPDF = ({
  customer,
  invoices,
  payments,
  onClose,
}: CustomerStatementPDFProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["company-settings-customer-statement"],
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
    queryKey: ["organization-branding-customer-statement"],
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

  // Build ledger entries
  const buildLedgerEntries = (): LedgerEntry[] => {
    const entries: LedgerEntry[] = [];

    invoices.forEach((inv) => {
      const invDate = parseISO(inv.invoice_date);
      entries.push({
        date: invDate,
        dateStr: format(invDate, "dd MMM yyyy"),
        refNo: inv.invoice_number,
        description: "Invoice",
        invoiceAmount: Number(inv.total),
        paymentAmount: 0,
        type: "invoice",
        sourceId: inv.id,
      });
    });

    payments.forEach((pmt) => {
      const pmtDate = parseISO(pmt.payment_date);
      entries.push({
        date: pmtDate,
        dateStr: format(pmtDate, "dd MMM yyyy"),
        refNo: pmt.invoice_number,
        description: `Payment${pmt.payment_method ? ` (${pmt.payment_method})` : ""}`,
        invoiceAmount: 0,
        paymentAmount: Number(pmt.amount),
        type: "payment",
        sourceId: pmt.id,
      });
    });

    entries.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      const typeOrder = { invoice: 0, payment: 1 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return entries;
  };

  const ledgerEntries = buildLedgerEntries();

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = payments.reduce((sum, pmt) => sum + Number(pmt.amount), 0);
  const closingBalance = totalInvoiced - totalPaid;

  // Running balance for each row
  const entriesWithBalance = ledgerEntries.map((entry, index) => {
    let runningBalance = 0;
    for (let i = 0; i <= index; i++) {
      runningBalance += ledgerEntries[i].invoiceAmount - ledgerEntries[i].paymentAmount;
    }
    return { ...entry, runningBalance };
  });

  useEffect(() => {
    const customerNameSafe = sanitizeFilename(customer.name);
    const periodStr = format(new Date(), "yyyy-MM");
    const filename = `Customer-Statement-${customerNameSafe}-${periodStr}`;

    const originalTitle = document.title;
    document.title = filename;

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
  }, [customer.name, onClose]);

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
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: "45px", height: "45px", objectFit: "contain", borderRadius: "4px" }}
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
                <p style={{ fontSize: "8pt", color: "#6b7280", margin: "3px 0 0" }}>{companyAddress}</p>
              )}
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                {[companyPhone, companyEmail].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>

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
              CUSTOMER STATEMENT
            </h2>
            <p style={{ fontSize: "9pt", color: "#6b7280", margin: "4px 0 0" }}>
              Generated: {format(new Date(), "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
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
              Customer
            </p>
            <p style={{ fontSize: "11pt", fontWeight: "600", color: "#111827", margin: 0 }}>
              {customer.name}
            </p>
            {customer.company_name && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "3px 0 0" }}>
                {customer.company_name}
              </p>
            )}
            {customer.address && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                {customer.address}
              </p>
            )}
            {customer.phone && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                Phone: {customer.phone}
              </p>
            )}
            {customer.email && (
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                Email: {customer.email}
              </p>
            )}
          </div>

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
              Account Summary
            </p>
            <div style={{ fontSize: "9pt", lineHeight: "1.8" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Total Invoiced:</span>
                <span style={{ fontWeight: "600" }}>৳ {formatCurrency(totalInvoiced)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Total Paid:</span>
                <span style={{ fontWeight: "600", color: "#059669" }}>৳ {formatCurrency(totalPaid)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "4px",
                  marginTop: "4px",
                }}
              >
                <span style={{ fontWeight: "700" }}>Balance Due:</span>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "10pt",
                    color: closingBalance > 0 ? "#dc2626" : "#059669",
                  }}
                >
                  ৳ {formatCurrency(closingBalance)}
                </span>
              </div>
            </div>
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
            <tr style={{ backgroundColor: primaryColor, color: "white" }}>
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600" }}>
                Date
              </th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600" }}>
                Invoice #
              </th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontSize: "8pt", fontWeight: "600" }}>
                Description
              </th>
              <th style={{ padding: "8px 6px", textAlign: "right", fontSize: "8pt", fontWeight: "600" }}>
                Invoice (Dr)
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
                <td style={{ padding: "6px", fontSize: "8pt" }}>{entry.description}</td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "right",
                    fontSize: "8pt",
                    color: entry.invoiceAmount > 0 ? "#dc2626" : "#9ca3af",
                  }}
                >
                  {entry.invoiceAmount > 0 ? formatCurrency(entry.invoiceAmount) : "-"}
                </td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "right",
                    fontSize: "8pt",
                    color: entry.paymentAmount > 0 ? "#059669" : "#9ca3af",
                  }}
                >
                  {entry.paymentAmount > 0 ? formatCurrency(entry.paymentAmount) : "-"}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontSize: "8pt", fontWeight: "500" }}>
                  {formatCurrency(entry.runningBalance)}
                </td>
              </tr>
            ))}

            {ledgerEntries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "9pt" }}
                >
                  No transactions found
                </td>
              </tr>
            )}

            {/* Closing Balance Row */}
            {ledgerEntries.length > 0 && (
              <tr style={{ backgroundColor: "#f3f4f6", borderTop: "2px solid #d1d5db" }}>
                <td
                  colSpan={3}
                  style={{ padding: "8px 6px", fontSize: "9pt", fontWeight: "700" }}
                >
                  Closing Balance
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontSize: "9pt",
                    fontWeight: "600",
                  }}
                >
                  {formatCurrency(totalInvoiced)}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontSize: "9pt",
                    fontWeight: "600",
                    color: "#059669",
                  }}
                >
                  {formatCurrency(totalPaid)}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontSize: "10pt",
                    fontWeight: "700",
                    color: closingBalance > 0 ? "#dc2626" : "#059669",
                  }}
                >
                  ৳ {formatCurrency(closingBalance)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signature Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            marginTop: "40px",
            paddingTop: "20px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderTop: "1px solid #d1d5db",
                paddingTop: "8px",
                marginTop: "40px",
              }}
            >
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: 0 }}>Customer Signature</p>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                borderTop: "1px solid #d1d5db",
                paddingTop: "8px",
                marginTop: "40px",
              }}
            >
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: 0 }}>Authorized Signature</p>
            </div>
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
            {format(new Date(), "dd/MM/yyyy 'at' HH:mm")}
          </p>
        </div>
      </div>

      {/* Screen overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center print:hidden">
        <div className="bg-card p-6 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing customer statement...</p>
          <p className="text-sm text-muted-foreground mt-2">Print dialog will open shortly</p>
        </div>
      </div>
    </>
  );
};

export default CustomerStatementPDF;
