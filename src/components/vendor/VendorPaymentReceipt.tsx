import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  notes: string | null;
}

interface Bill {
  id: string;
  bill_date: string;
  reference_no: string | null;
  net_amount: number;
  paid_amount: number;
}

interface Vendor {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface VendorPaymentReceiptProps {
  payment: Payment;
  bill: Bill;
  vendor: Vendor;
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-BD", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getPaymentMethodLabel = (method: string | null) => {
  const methods: Record<string, string> = {
    cash: "Cash",
    bank: "Bank Transfer",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
    cheque: "Cheque",
  };
  return methods[method || ""] || method || "Unknown";
};

const numberToWords = (num: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + numberToWords(num % 100000) : "");
  return numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + numberToWords(num % 10000000) : "");
};

export const VendorPaymentReceipt = ({
  payment,
  bill,
  vendor,
  onClose,
}: VendorPaymentReceiptProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["company-settings-receipt"],
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
    queryKey: ["organization-branding-receipt"],
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

  useEffect(() => {
    // Trigger print after a short delay to allow content to render
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    
    // Listen for after print to close
    const handleAfterPrint = () => {
      onClose();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [onClose]);

  const companyName = settings?.company_name || "Company Name";
  const companyAddress = settings?.address || "";
  const companyPhone = settings?.phone || "";
  const companyEmail = settings?.email || "";
  const logoUrl = branding?.logo_url || settings?.logo_url || null;
  const primaryColor = branding?.primary_color || "#0f766e";

  const receiptNumber = `VPR-${payment.id.slice(0, 8).toUpperCase()}`;
  const amountInWords = numberToWords(Math.round(payment.amount)) + " Taka Only";

  return (
    <>
      {/* Print-only receipt */}
      <div
        ref={printRef}
        className="hidden print:block bg-white text-black"
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "10pt",
          lineHeight: "1.5",
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: "16px",
            marginBottom: "20px",
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
                  width: "50px",
                  height: "50px",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  background: primaryColor,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1
                style={{
                  fontSize: "16pt",
                  fontWeight: "700",
                  color: "#111827",
                  margin: 0,
                }}
              >
                {companyName}
              </h1>
              {companyAddress && (
                <p style={{ fontSize: "8pt", color: "#6b7280", margin: "4px 0 0" }}>
                  {companyAddress}
                </p>
              )}
              <p style={{ fontSize: "8pt", color: "#6b7280", margin: "2px 0 0" }}>
                {[companyPhone, companyEmail].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>

          {/* Receipt Title */}
          <div style={{ textAlign: "right" }}>
            <h2
              style={{
                fontSize: "24pt",
                fontWeight: "800",
                color: primaryColor,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              PAYMENT VOUCHER
            </h2>
            <p
              style={{
                fontSize: "10pt",
                fontWeight: "600",
                color: "#374151",
                margin: "6px 0 0",
                fontFamily: "monospace",
              }}
            >
              #{receiptNumber}
            </p>
          </div>
        </div>

        {/* Receipt Details Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Vendor Info */}
          <div
            style={{
              backgroundColor: "#fafafa",
              padding: "16px",
              borderRadius: "8px",
              borderLeft: `3px solid ${primaryColor}`,
            }}
          >
            <p
              style={{
                fontSize: "7pt",
                fontWeight: "700",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              Paid To (Vendor)
            </p>
            <p style={{ fontSize: "12pt", fontWeight: "600", color: "#111827", margin: 0 }}>
              {vendor.name}
            </p>
            {vendor.phone && (
              <p style={{ fontSize: "9pt", color: "#6b7280", margin: "4px 0 0" }}>
                {vendor.phone}
              </p>
            )}
            {vendor.address && (
              <p style={{ fontSize: "9pt", color: "#6b7280", margin: "2px 0 0" }}>
                {vendor.address}
              </p>
            )}
          </div>

          {/* Payment Details */}
          <div
            style={{
              backgroundColor: "#fafafa",
              padding: "16px",
              borderRadius: "8px",
              borderLeft: "3px solid #10b981",
            }}
          >
            <p
              style={{
                fontSize: "7pt",
                fontWeight: "700",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              Payment Details
            </p>
            <table style={{ fontSize: "9pt", width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#6b7280", padding: "3px 0" }}>Date</td>
                  <td style={{ fontWeight: "500", textAlign: "right", color: "#111827" }}>
                    {format(new Date(payment.payment_date), "dd MMM yyyy")}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#6b7280", padding: "3px 0" }}>Method</td>
                  <td style={{ fontWeight: "500", textAlign: "right", color: "#111827" }}>
                    {getPaymentMethodLabel(payment.payment_method)}
                  </td>
                </tr>
                {payment.reference_no && (
                  <tr>
                    <td style={{ color: "#6b7280", padding: "3px 0" }}>Reference</td>
                    <td style={{ fontWeight: "500", textAlign: "right", color: "#111827" }}>
                      {payment.reference_no}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill Reference */}
        <div
          style={{
            backgroundColor: "#f3f4f6",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "8pt", color: "#6b7280", margin: "0 0 4px" }}>
            Against Bill
          </p>
          <p style={{ fontSize: "10pt", fontWeight: "500", color: "#111827", margin: 0 }}>
            {bill.reference_no || `BILL-${bill.id.slice(0, 8)}`} dated{" "}
            {format(new Date(bill.bill_date), "dd MMM yyyy")}
          </p>
        </div>

        {/* Amount Section */}
        <div
          style={{
            border: `2px solid ${primaryColor}`,
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "8pt",
              fontWeight: "700",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            Amount Paid
          </p>
          <p
            style={{
              fontSize: "28pt",
              fontWeight: "800",
              color: primaryColor,
              margin: "0 0 8px",
            }}
          >
            ৳ {formatCurrency(payment.amount)}
          </p>
          <p
            style={{
              fontSize: "10pt",
              color: "#374151",
              fontStyle: "italic",
              margin: 0,
              borderTop: "1px dashed #d1d5db",
              paddingTop: "8px",
            }}
          >
            {amountInWords}
          </p>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div style={{ marginBottom: "24px" }}>
            <p
              style={{
                fontSize: "8pt",
                fontWeight: "700",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Notes
            </p>
            <p
              style={{
                fontSize: "9pt",
                color: "#374151",
                backgroundColor: "#fafafa",
                padding: "10px 12px",
                borderRadius: "6px",
                margin: 0,
              }}
            >
              {payment.notes}
            </p>
          </div>
        )}

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
              <p style={{ fontSize: "9pt", color: "#6b7280", margin: 0 }}>
                Received By (Vendor)
              </p>
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
              <p style={{ fontSize: "9pt", color: "#6b7280", margin: 0 }}>
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "30px",
            paddingTop: "16px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "8pt", color: "#9ca3af", margin: 0 }}>
            This is a computer-generated voucher. • Printed on{" "}
            {format(new Date(), "dd MMM yyyy 'at' hh:mm a")}
          </p>
        </div>
      </div>

      {/* Screen display - Loading indicator */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center print:hidden">
        <div className="bg-card p-6 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing payment voucher...</p>
          <p className="text-sm text-muted-foreground mt-2">Print dialog will open shortly</p>
        </div>
      </div>
    </>
  );
};

export default VendorPaymentReceipt;
