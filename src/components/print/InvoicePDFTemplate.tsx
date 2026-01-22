/**
 * Invoice PDF Template
 * ====================
 * Professional, print-optimized invoice layout.
 * Swiss Design principles with strong typographic hierarchy.
 * 
 * Optimized for A4 print. No UI-only elements.
 */

import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface InvoicePDFData {
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
  
  // Invoice Details
  invoice: {
    number: string;
    date: string;
    dueDate?: string;
    status: 'paid' | 'partial' | 'unpaid' | 'overdue';
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
    paidAmount: number;
    dueAmount: number;
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
  
  invoiceTitle: {
    fontSize: '24pt',
    fontWeight: '700',
    letterSpacing: '0.05em',
    margin: 0,
  },
  
  invoiceNumber: {
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
  
  dueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    fontSize: '14pt',
    fontWeight: '700',
    borderRadius: '8px',
    marginTop: '8px',
  },
  
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
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
    marginBottom: '8px',
  },
  
  notesContent: {
    fontSize: '9pt',
    color: '#4b5563',
    lineHeight: '1.6',
  },
  
  termsSection: {
    marginBottom: '16px',
    paddingTop: '12px',
    borderTop: '1px dashed #e5e7eb',
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
    paid: { label: 'PAID', bg: '#dcfce7', color: '#166534' },
    partial: { label: 'PARTIAL', bg: '#fef3c7', color: '#92400e' },
    unpaid: { label: 'UNPAID', bg: '#fee2e2', color: '#991b1b' },
    overdue: { label: 'OVERDUE', bg: '#fee2e2', color: '#991b1b' },
  };
  return configs[status] || configs.unpaid;
};

// ============================================
// COMPONENT
// ============================================

export function InvoicePDFTemplate({ data }: { data: InvoicePDFData }) {
  const primaryColor = data.primaryColor || '#2563eb';
  const statusConfig = getStatusConfig(data.invoice.status);
  
  return (
    <div style={styles.page} className="print-invoice">
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
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ ...styles.invoiceTitle, color: primaryColor }}>INVOICE</h2>
          <p style={styles.invoiceNumber}>#{data.invoice.number}</p>
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
        
        {/* Invoice Details */}
        <div style={{ ...styles.infoSection, borderLeftColor: primaryColor }}>
          <p style={styles.sectionLabel}>Invoice Details</p>
          <table style={{ width: '100%', fontSize: '9pt' }}>
            <tbody>
              <tr>
                <td style={{ color: '#6b7280', padding: '2px 0' }}>Date:</td>
                <td style={{ fontWeight: '500', textAlign: 'right' }}>
                  {format(new Date(data.invoice.date), 'dd MMM yyyy')}
                </td>
              </tr>
              {data.invoice.dueDate && (
                <tr>
                  <td style={{ color: '#6b7280', padding: '2px 0' }}>Due Date:</td>
                  <td style={{ fontWeight: '500', textAlign: 'right' }}>
                    {format(new Date(data.invoice.dueDate), 'dd MMM yyyy')}
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
      <table style={styles.table} className="pdf-section">
        <thead style={styles.tableHeader}>
          <tr>
            <th style={{ ...styles.th, width: '5%' }}>#</th>
            <th style={{ ...styles.th, width: '45%' }}>Description</th>
            <th style={{ ...styles.th, ...styles.thCenter, width: '10%' }}>Qty</th>
            <th style={{ ...styles.th, ...styles.thRight, width: '15%' }}>Unit Price</th>
            <th style={{ ...styles.th, ...styles.thRight, width: '10%' }}>Disc.</th>
            <th style={{ ...styles.th, ...styles.thRight, width: '15%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} className="pdf-paragraph">
              <td style={styles.td}>{index + 1}</td>
              <td style={{...styles.td, lineHeight: '1.6'}} dangerouslySetInnerHTML={{ __html: item.description }} />
              <td style={{ ...styles.td, ...styles.tdCenter }}>
                {item.quantity}{item.unit ? ` ${item.unit}` : ''}
              </td>
              <td style={{ ...styles.td, ...styles.tdRight }}>
                ৳{formatCurrency(item.unitPrice)}
              </td>
              <td style={{ ...styles.td, ...styles.tdRight }}>
                {item.discount ? `${item.discount}%` : '-'}
              </td>
              <td style={{ ...styles.td, ...styles.tdRight, fontWeight: '600' }}>
                ৳{formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Summary */}
      <div style={styles.summaryContainer} className="pdf-summary pdf-section-breakable">
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
              <span style={styles.summaryLabel}>Tax</span>
              <span style={styles.summaryValue}>৳{formatCurrency(data.totals.tax)}</span>
            </div>
          )}
          
          <div style={styles.totalRow}>
            <span>Total</span>
            <span>৳{formatCurrency(data.totals.total)}</span>
          </div>
          
          {data.totals.paidAmount > 0 && (
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Paid Amount</span>
              <span style={{ ...styles.summaryValue, color: '#16a34a' }}>
                ৳{formatCurrency(data.totals.paidAmount)}
              </span>
            </div>
          )}
          
          {data.totals.dueAmount > 0 && (
            <div style={{
              ...styles.dueRow,
              backgroundColor: data.invoice.status === 'overdue' ? '#fef2f2' : '#fef3c7',
              color: data.invoice.status === 'overdue' ? '#991b1b' : '#92400e',
            }}>
              <span>Amount Due</span>
              <span>৳{formatCurrency(data.totals.dueAmount)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer style={styles.footer} className="pdf-footer pdf-section-breakable">
        {/* Notes */}
        {data.notes && (
          <div style={styles.notesSection} className="pdf-notes-section pdf-section">
            <p style={styles.notesLabel} className="pdf-section-header">Notes</p>
            <div 
              style={styles.notesContent}
              className="pdf-paragraph"
              dangerouslySetInnerHTML={{ __html: data.notes }}
            />
          </div>
        )}
        
        {/* Terms & Conditions */}
        {data.terms && (
          <div style={data.notes ? styles.termsSection : styles.notesSection} className="pdf-terms-section pdf-section pdf-section-breakable">
            <p style={styles.notesLabel} className="pdf-section-header">Terms & Conditions</p>
            <div 
              style={styles.notesContent}
              className="pdf-paragraph"
              dangerouslySetInnerHTML={{ __html: data.terms }}
            />
          </div>
        )}
        
        {data.footer && (
          <p style={styles.footerText} className="pdf-paragraph">{data.footer}</p>
        )}
      </footer>
    </div>
  );
}

// ============================================
// PRINT STYLES (Add to index.css or use here)
// ============================================

export const invoicePrintStyles = `
@media print {
  .print-invoice {
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    padding: 15mm;
    box-sizing: border-box;
  }
  
  .print-invoice .pdf-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .print-invoice .pdf-section-header {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  .print-invoice .pdf-paragraph {
    page-break-inside: avoid;
    break-inside: avoid;
    orphans: 3;
    widows: 3;
  }
  
  .print-invoice .pdf-section-breakable {
    page-break-before: auto;
    break-before: auto;
  }
  
  .print-invoice thead {
    display: table-header-group;
  }
  
  .print-invoice table {
    page-break-inside: auto;
  }
  
  .print-invoice tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  
  @page {
    size: A4;
    margin: 0;
  }
}
`;
