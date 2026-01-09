/**
 * Quotation PDF Template
 * ====================
 * Professional, print-optimized quotation layout matching Invoice PDF design.
 * Swiss Design principles with strong typographic hierarchy.
 * 
 * Optimized for A4 print. No UI-only elements.
 */

import { format } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface QuotationPDFData {
  // Company Info
  company: {
    name: string;
    nameBn?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  
  // Quotation Details
  quotation: {
    number: string;
    date: string;
    validUntil?: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  };
  
  // Customer Info
  customer: {
    name: string;
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // Line Items
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    discount?: number;
    total: number;
  }>;
  
  // Totals
  totals: {
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
  };
  
  // Additional
  notes?: string;
  terms?: string;
  footer?: string;
  
  // Branding
  primaryColor?: string;
}

// ============================================
// STYLES (Inline for print reliability)
// ============================================

const styles = {
  page: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontSize: '10pt',
    lineHeight: '1.5',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    padding: '40px',
    minHeight: '100%',
    position: 'relative' as const,
  },
  
  // Watermark
  watermark: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-35deg)',
    fontSize: '100px',
    fontWeight: '800',
    pointerEvents: 'none' as const,
    zIndex: 0,
    whiteSpace: 'nowrap' as const,
    letterSpacing: '6px',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
  },
  
  logo: {
    width: '64px',
    height: '64px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
  },
  
  companyName: {
    fontSize: '20pt',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    letterSpacing: '-0.025em',
  },
  
  quotationTitle: {
    fontSize: '24pt',
    fontWeight: '700',
    letterSpacing: '0.05em',
    margin: 0,
  },
  
  quotationNumber: {
    fontSize: '11pt',
    fontWeight: '600',
    color: '#4b5563',
    marginTop: '4px',
  },
  
  // Grid sections
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '32px',
  },
  
  infoSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '3px solid',
  },
  
  sectionLabel: {
    fontSize: '8pt',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  
  customerName: {
    fontSize: '12pt',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
  },
  
  infoText: {
    fontSize: '9pt',
    color: '#4b5563',
    margin: '2px 0',
  },
  
  // Status badge
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '9pt',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.025em',
  },
  
  // Table
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: '24px',
  },
  
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  
  th: {
    padding: '12px 16px',
    fontSize: '8pt',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#4b5563',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e5e7eb',
  },
  
  thRight: {
    textAlign: 'right' as const,
  },
  
  thCenter: {
    textAlign: 'center' as const,
  },
  
  td: {
    padding: '12px 16px',
    fontSize: '9pt',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top' as const,
  },
  
  tdRight: {
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  
  tdCenter: {
    textAlign: 'center' as const,
  },
  
  // Summary
  summaryContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '32px',
  },
  
  summaryTable: {
    width: '280px',
  },
  
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '10pt',
    borderBottom: '1px solid #f3f4f6',
  },
  
  summaryLabel: {
    color: '#6b7280',
  },
  
  summaryValue: {
    fontWeight: '600',
    fontVariantNumeric: 'tabular-nums',
  },
  
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '12pt',
    fontWeight: '700',
    borderTop: '2px solid #e5e7eb',
    marginTop: '8px',
  },
  
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '24px',
    marginBottom: '16px',
  },
  
  footerSection: {
    fontSize: '9pt',
  },
  
  notesSection: {
    marginBottom: '16px',
  },
  
  notesLabel: {
    fontSize: '8pt',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  
  notesText: {
    fontSize: '9pt',
    color: '#4b5563',
    whiteSpace: 'pre-wrap' as const,
  },
  
  footerText: {
    fontSize: '9pt',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; bg: string; color: string }> = {
    draft: { label: 'DRAFT', bg: '#f3f4f6', color: '#374151' },
    sent: { label: 'SENT', bg: '#dbeafe', color: '#1e40af' },
    accepted: { label: 'ACCEPTED', bg: '#dcfce7', color: '#166534' },
    rejected: { label: 'REJECTED', bg: '#fee2e2', color: '#991b1b' },
    converted: { label: 'CONVERTED', bg: '#f3e8ff', color: '#6b21a8' },
  };
  return configs[status] || configs.draft;
};

const getWatermarkConfig = (status: string) => {
  if (status === 'accepted') {
    return { text: 'ACCEPTED', color: 'rgba(22, 163, 74, 0.08)' };
  }
  if (status === 'converted') {
    return { text: 'CONVERTED', color: 'rgba(107, 33, 168, 0.08)' };
  }
  return null;
};

// ============================================
// COMPONENT
// ============================================

export function QuotationPDFTemplate({ data }: { data: QuotationPDFData }) {
  const primaryColor = data.primaryColor || '#2563eb';
  const statusConfig = getStatusConfig(data.quotation.status);
  const watermarkConfig = getWatermarkConfig(data.quotation.status);
  const hasDiscount = data.items.some(item => item.discount && item.discount > 0);
  
  return (
    <div style={styles.page} className="print-quotation">
      {/* Watermark for Accepted/Converted */}
      {watermarkConfig && (
        <div style={{
          ...styles.watermark,
          color: watermarkConfig.color,
        }}>
          {watermarkConfig.text}
        </div>
      )}
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {data.company.logoUrl ? (
              <img 
                src={data.company.logoUrl} 
                alt="Logo" 
                style={styles.logo}
              />
            ) : (
              <div style={{
                ...styles.logo,
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '24pt',
                fontWeight: '700',
              }}>
                {data.company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={styles.companyName}>{data.company.name}</h1>
              {data.company.nameBn && (
                <p style={{ ...styles.infoText, marginTop: 0 }}>{data.company.nameBn}</p>
              )}
              {data.company.address && (
                <p style={{ ...styles.infoText, maxWidth: '280px' }}>{data.company.address}</p>
              )}
              <div style={{ marginTop: '8px' }}>
                {data.company.phone && (
                  <p style={{ ...styles.infoText, margin: '2px 0' }}>Tel: {data.company.phone}</p>
                )}
                {data.company.email && (
                  <p style={{ ...styles.infoText, margin: '2px 0' }}>{data.company.email}</p>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ ...styles.quotationTitle, color: primaryColor }}>QUOTATION</h2>
            <p style={styles.quotationNumber}>#{data.quotation.number}</p>
            <div style={{ marginTop: '8px' }}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
              }}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </header>
        
        {/* Info Grid */}
        <div style={styles.infoGrid}>
          {/* Bill To */}
          <div style={{ ...styles.infoSection, borderLeftColor: '#10b981' }}>
            <p style={styles.sectionLabel}>Bill To</p>
            <h3 style={styles.customerName}>{data.customer.name}</h3>
            {data.customer.companyName && (
              <p style={styles.infoText}>{data.customer.companyName}</p>
            )}
            {data.customer.address && (
              <p style={styles.infoText}>{data.customer.address}</p>
            )}
            {data.customer.phone && (
              <p style={styles.infoText}>Tel: {data.customer.phone}</p>
            )}
            {data.customer.email && (
              <p style={styles.infoText}>{data.customer.email}</p>
            )}
          </div>
          
          {/* Quotation Details */}
          <div style={{ ...styles.infoSection, borderLeftColor: primaryColor }}>
            <p style={styles.sectionLabel}>Quotation Details</p>
            <table style={{ width: '100%', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#6b7280', padding: '2px 0' }}>Quotation No:</td>
                  <td style={{ fontWeight: '500', textAlign: 'right' }}>
                    {data.quotation.number}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#6b7280', padding: '2px 0' }}>Date:</td>
                  <td style={{ fontWeight: '500', textAlign: 'right' }}>
                    {format(new Date(data.quotation.date), 'dd MMM yyyy')}
                  </td>
                </tr>
                {data.quotation.validUntil && (
                  <tr>
                    <td style={{ color: '#6b7280', padding: '2px 0' }}>Valid Until:</td>
                    <td style={{ fontWeight: '500', textAlign: 'right' }}>
                      {format(new Date(data.quotation.validUntil), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#6b7280', padding: '6px 0 2px' }}>Status:</td>
                  <td style={{ textAlign: 'right', padding: '6px 0 2px' }}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                    }}>
                      {statusConfig.label}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Items Table */}
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={{ ...styles.th, width: '5%' }}>#</th>
              <th style={{ ...styles.th, width: hasDiscount ? '40%' : '50%' }}>Description</th>
              <th style={{ ...styles.th, ...styles.thCenter, width: '8%' }}>Qty</th>
              <th style={{ ...styles.th, ...styles.thCenter, width: '8%' }}>Unit</th>
              <th style={{ ...styles.th, ...styles.thRight, width: '14%' }}>Unit Price</th>
              {hasDiscount && (
                <th style={{ ...styles.th, ...styles.thRight, width: '10%' }}>Disc.</th>
              )}
              <th style={{ ...styles.th, ...styles.thRight, width: '15%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{item.description}</td>
                <td style={{ ...styles.td, ...styles.tdCenter }}>{item.quantity}</td>
                <td style={{ ...styles.td, ...styles.tdCenter }}>{item.unit || '-'}</td>
                <td style={{ ...styles.td, ...styles.tdRight }}>
                  ৳{formatCurrency(item.unitPrice)}
                </td>
                {hasDiscount && (
                  <td style={{ ...styles.td, ...styles.tdRight }}>
                    {item.discount ? `${item.discount}%` : '-'}
                  </td>
                )}
                <td style={{ ...styles.td, ...styles.tdRight, fontWeight: '600' }}>
                  ৳{formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Summary */}
        <div style={styles.summaryContainer}>
          <div style={styles.summaryTable}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Subtotal</span>
              <span style={styles.summaryValue}>৳{formatCurrency(data.totals.subtotal)}</span>
            </div>
            
            {data.totals.discount && data.totals.discount > 0 && (
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Discount</span>
                <span style={styles.summaryValue}>-৳{formatCurrency(data.totals.discount)}</span>
              </div>
            )}
            
            {data.totals.tax && data.totals.tax > 0 && (
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Tax/VAT</span>
                <span style={styles.summaryValue}>৳{formatCurrency(data.totals.tax)}</span>
              </div>
            )}
            
            <div style={{ ...styles.totalRow, color: primaryColor }}>
              <span>Total Quoted Price</span>
              <span>৳{formatCurrency(data.totals.total)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        {data.notes && (
          <div style={styles.notesSection}>
            <p style={styles.notesLabel}>Notes & Terms</p>
            <p style={styles.notesText}>{data.notes}</p>
          </div>
        )}
        
        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerGrid}>
            {/* Authorized Signature */}
            <div style={styles.footerSection}>
              <div style={{ 
                borderTop: '1px solid #d1d5db', 
                paddingTop: '8px', 
                marginTop: '40px' 
              }}>
                <p style={{ margin: 0, color: '#6b7280' }}>Authorized Signature</p>
              </div>
            </div>
            
            {/* Thank You Message */}
            <div style={{ ...styles.footerSection, textAlign: 'center' }}>
              <p style={{ 
                margin: 0, 
                fontWeight: '500', 
                color: '#374151',
                fontSize: '10pt',
              }}>
                {data.footer || 'Thank you for your interest!'}
              </p>
            </div>
            
            {/* Generated Info */}
            <div style={{ ...styles.footerSection, textAlign: 'right' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: '8pt' }}>
                Generated on {format(new Date(), 'dd MMM yyyy')}
              </p>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '8pt' }}>
                © {new Date().getFullYear()} {data.company.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRINT STYLES
// ============================================

export const quotationPrintStyles = `
@media print {
  .print-quotation {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm;
    margin: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  @page {
    size: A4;
    margin: 0;
  }
}
`;

export default QuotationPDFTemplate;
