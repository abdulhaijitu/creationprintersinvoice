import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateInvoiceStatus } from '@/lib/invoiceUtils';

interface PrintTemplateProps {
  type: 'invoice' | 'quotation';
  documentNumber: string;
  date: string;
  dueDate?: string | null;
  validUntil?: string | null;
  customer: {
    name: string;
    company_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total: number;
    unit?: string | null;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount?: number;
  subject?: string | null;
  notes?: string | null;
  terms?: string | null;
  status: string;
}

export const PrintTemplate = ({
  type,
  documentNumber,
  date,
  dueDate,
  validUntil,
  customer,
  items,
  subtotal,
  discount,
  tax,
  total,
  paidAmount,
  subject,
  notes,
  terms,
  status,
}: PrintTemplateProps) => {
  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  const { data: branding } = useQuery({
    queryKey: ['organization-branding-print'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!member) return null;
      
      const { data: wlSettings } = await supabase
        .from('organization_whitelabel_settings')
        .select('pdf_branding_enabled')
        .eq('organization_id', member.organization_id)
        .maybeSingle();
      
      if (!wlSettings?.pdf_branding_enabled) return null;
      
      const { data: brandingData } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', member.organization_id)
        .maybeSingle();
      
      return brandingData;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const remaining = paidAmount !== undefined ? total - paidAmount : total;

  // Calculate actual status based on payment amounts for invoices
  const computedStatus = type === 'invoice' 
    ? calculateInvoiceStatus(total, paidAmount || 0, dueDate || null).displayStatus
    : status;
  
  // Map computed status to component status format
  const effectiveStatus = computedStatus === 'due' ? 'unpaid' : computedStatus;

  const companyName = settings?.company_name || 'Company Name';
  const companyNameBn = settings?.company_name_bn || '';
  const companyAddress = settings?.address || '';
  const companyPhone = settings?.phone || '';
  const companyEmail = settings?.email || '';
  const companyWebsite = settings?.website || '';
  const logoUrl = branding?.logo_url || settings?.logo_url || null;
  const bankName = settings?.bank_name || '';
  const bankAccountNumber = settings?.bank_account_number || '';
  const bankAccountName = settings?.bank_account_name || '';
  const bankBranch = settings?.bank_branch || '';
  const bankRoutingNumber = settings?.bank_routing_number || '';
  const mobileBanking = settings?.mobile_banking || '';
  const invoiceFooter = branding?.footer_text || settings?.invoice_footer || 'Thank you for your business!';
  const invoiceTerms = settings?.invoice_terms || '';

  const documentTitle = type === 'invoice' ? 'INVOICE' : 'QUOTATION';
  const primaryColor = branding?.primary_color || '#0f766e';
  const accentColor = '#10b981';

  // Status configurations
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; bg: string; color: string; border: string }> = {
      paid: { label: 'PAID', bg: '#dcfce7', color: '#166534', border: '#22c55e' },
      partial: { label: 'PARTIAL', bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
      unpaid: { label: 'UNPAID', bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
      overdue: { label: 'OVERDUE', bg: '#fee2e2', color: '#7f1d1d', border: '#dc2626' },
      accepted: { label: 'ACCEPTED', bg: '#dcfce7', color: '#166534', border: '#22c55e' },
      pending: { label: 'PENDING', bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
      rejected: { label: 'REJECTED', bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
    };
    return configs[status] || { label: status.toUpperCase(), bg: '#f3f4f6', color: '#374151', border: '#9ca3af' };
  };

  const statusConfig = getStatusConfig(effectiveStatus);
  const hasDiscount = items.some(item => Number(item.discount) > 0);
  const showPaymentInfo = bankName || mobileBanking;

  return (
    <div className="hidden print:block bg-white text-black print-invoice" style={{ 
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      fontSize: '9pt',
      lineHeight: '1.5',
      height: 'auto',
      minHeight: 'auto',
      maxHeight: 'none',
      overflow: 'visible',
      position: 'relative',
      padding: '0',
      color: '#1f2937',
    }}>
      {/* Watermark - Only for PAID invoices */}
      {type === 'invoice' && effectiveStatus === 'paid' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-35deg)',
          fontSize: '120px',
          fontWeight: '800',
          color: 'rgba(22, 163, 74, 0.06)',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
          letterSpacing: '8px',
        }}>
          PAID
        </div>
      )}

      {/* Watermark - Only for OVERDUE invoices */}
      {type === 'invoice' && effectiveStatus === 'overdue' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-35deg)',
          fontSize: '100px',
          fontWeight: '800',
          color: 'rgba(220, 38, 38, 0.06)',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
          letterSpacing: '6px',
        }}>
          OVERDUE
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Premium Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          paddingBottom: '24px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          {/* Company Branding */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                }} 
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ 
                fontSize: '20pt', 
                fontWeight: '700', 
                color: '#111827',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.5px',
              }}>
                {companyName}
              </h1>
              {companyNameBn && (
                <p style={{ fontSize: '9pt', color: '#6b7280', margin: '4px 0 0' }}>
                  {companyNameBn}
                </p>
              )}
              {companyAddress && (
                <p style={{ 
                  fontSize: '8pt', 
                  color: '#9ca3af', 
                  margin: '6px 0 0', 
                  maxWidth: '260px',
                  lineHeight: 1.4,
                }}>
                  {companyAddress}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Title & Number */}
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ 
              fontSize: '32pt', 
              fontWeight: '800', 
              color: primaryColor,
              margin: 0,
              letterSpacing: '-1px',
              lineHeight: 1,
            }}>
              {documentTitle}
            </h2>
            <p style={{ 
              fontSize: '11pt', 
              fontWeight: '600',
              color: '#374151',
              margin: '8px 0 0',
              fontFamily: 'monospace',
            }}>
              #{documentNumber}
            </p>
          </div>
        </div>

        {/* Info Cards Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr 140px', 
          gap: '16px',
          marginBottom: '28px',
        }}>
          {/* Contact Us Card */}
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '16px',
            borderRadius: '10px',
            borderLeft: `3px solid ${primaryColor}`,
          }}>
            <p style={{ 
              fontSize: '7pt', 
              fontWeight: '700', 
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              Contact Us
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {companyPhone && (
                <p style={{ fontSize: '8pt', color: '#4b5563', margin: 0 }}>
                  <span style={{ color: '#9ca3af', marginRight: '6px' }}>📞</span>
                  {companyPhone}
                </p>
              )}
              {companyEmail && (
                <p style={{ fontSize: '8pt', color: '#4b5563', margin: 0 }}>
                  <span style={{ color: '#9ca3af', marginRight: '6px' }}>✉</span>
                  {companyEmail}
                </p>
              )}
              {companyWebsite && (
                <p style={{ fontSize: '8pt', color: '#4b5563', margin: 0 }}>
                  <span style={{ color: '#9ca3af', marginRight: '6px' }}>🌐</span>
                  {companyWebsite}
                </p>
              )}
            </div>
          </div>

          {/* Bill To Card */}
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '16px',
            borderRadius: '10px',
            borderLeft: `3px solid ${accentColor}`,
          }}>
            <p style={{ 
              fontSize: '7pt', 
              fontWeight: '700', 
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              {type === 'invoice' ? 'Bill To' : 'Quote For'}
            </p>
            {customer ? (
              <div>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>
                  {customer.name}
                </p>
                {customer.company_name && (
                  <p style={{ fontSize: '8pt', color: '#4b5563', margin: '0 0 4px' }}>
                    {customer.company_name}
                  </p>
                )}
                {customer.phone && (
                  <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0' }}>
                    {customer.phone}
                  </p>
                )}
                {customer.address && (
                  <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0', lineHeight: 1.3 }}>
                    {customer.address}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '8pt', color: '#9ca3af', fontStyle: 'italic' }}>
                No customer info
              </p>
            )}
          </div>

          {/* Invoice Details Card */}
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '16px',
            borderRadius: '10px',
            borderLeft: '3px solid #8b5cf6',
          }}>
            <p style={{ 
              fontSize: '7pt', 
              fontWeight: '700', 
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}>
              {type === 'invoice' ? 'Invoice Details' : 'Quote Details'}
            </p>
            <table style={{ fontSize: '8pt', width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#6b7280', padding: '3px 0', verticalAlign: 'top' }}>Date</td>
                  <td style={{ fontWeight: '500', textAlign: 'right', padding: '3px 0', color: '#111827' }}>
                    {format(new Date(date), 'dd MMM yyyy')}
                  </td>
                </tr>
                {type === 'invoice' && dueDate && (
                  <tr>
                    <td style={{ color: '#6b7280', padding: '3px 0', verticalAlign: 'top' }}>Due Date</td>
                    <td style={{ fontWeight: '500', textAlign: 'right', padding: '3px 0', color: effectiveStatus === 'overdue' ? '#dc2626' : '#111827' }}>
                      {format(new Date(dueDate), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )}
                {type === 'quotation' && validUntil && (
                  <tr>
                    <td style={{ color: '#6b7280', padding: '3px 0', verticalAlign: 'top' }}>Valid Until</td>
                    <td style={{ fontWeight: '500', textAlign: 'right', padding: '3px 0', color: '#111827' }}>
                      {format(new Date(validUntil), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Status Badge Card */}
          <div style={{ 
            backgroundColor: statusConfig.bg, 
            padding: '16px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${statusConfig.border}`,
          }}>
            <p style={{ 
              fontSize: '7pt', 
              fontWeight: '700', 
              color: statusConfig.color,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '6px',
              opacity: 0.8,
            }}>
              Status
            </p>
            <p style={{ 
              fontSize: '12pt', 
              fontWeight: '800', 
              color: statusConfig.color,
              margin: 0,
              letterSpacing: '0.5px',
            }}>
              {statusConfig.label}
            </p>
          </div>
        </div>

        {/* Subject Section */}
        {subject && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderLeft: `3px solid ${primaryColor}`,
            borderRadius: '6px',
          }}>
            <p style={{
              fontSize: '7pt',
              fontWeight: '700',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '4px',
            }}>Subject</p>
            <p style={{
              fontSize: '10pt',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
              lineHeight: '1.4',
            }}>{subject}</p>
          </div>
        )}

        {/* Items Table */}
        <div style={{ marginBottom: '24px' }} className="pdf-section-breakable">
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '8pt',
            pageBreakInside: 'auto',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '4%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  #
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  color: '#374151',
                  fontWeight: '700',
                  width: hasDiscount ? '38%' : '46%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Description
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'center', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '8%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Qty
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'center', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '10%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Unit
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'right', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '14%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Unit Price
                </th>
                {hasDiscount && (
                  <th style={{ 
                    padding: '12px 8px', 
                    textAlign: 'right', 
                    color: '#374151',
                    fontWeight: '700',
                    width: '12%',
                    fontSize: '7pt',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '2px solid #e5e7eb',
                  }}>
                    Discount
                  </th>
                )}
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'right', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '14%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody style={{ pageBreakInside: 'auto' }}>
              {items.map((item, index) => (
                <tr 
                  key={index}
                  className="avoid-break"
                  style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: '8pt' }}>
                    {index + 1}
                  </td>
                  <td 
                    style={{ 
                      padding: '10px 8px', 
                      fontWeight: '500', 
                      color: '#111827',
                      wordBreak: 'break-word',
                      lineHeight: '1.5',
                    }}
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#374151' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280' }}>
                    {item.unit || 'pcs'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>
                    ৳{formatCurrency(Number(item.unit_price))}
                  </td>
                  {hasDiscount && (
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>
                      {Number(item.discount) > 0 ? `−৳${formatCurrency(Number(item.discount))}` : '—'}
                    </td>
                  )}
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>
                    ৳{formatCurrency(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="pdf-summary" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <div style={{ 
            width: '280px',
            backgroundColor: '#fafafa',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <table style={{ width: '100%', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#6b7280' }}>Subtotal</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#374151' }}>
                    ৳{formatCurrency(subtotal)}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#6b7280' }}>Discount</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#dc2626' }}>
                      −৳{formatCurrency(discount)}
                    </td>
                  </tr>
                )}
                {tax > 0 && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#6b7280' }}>Tax/VAT</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#374151' }}>
                      ৳{formatCurrency(tax)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2} style={{ padding: '8px 0 0' }}>
                    <div style={{ borderTop: '2px solid #e5e7eb' }} />
                  </td>
                </tr>
                <tr>
                  <td style={{ 
                    padding: '8px 0', 
                    fontSize: '11pt', 
                    fontWeight: '700',
                    color: '#111827',
                  }}>
                    Grand Total
                  </td>
                  <td style={{ 
                    padding: '8px 0', 
                    textAlign: 'right', 
                    fontSize: '13pt', 
                    fontWeight: '800',
                    color: primaryColor,
                  }}>
                    ৳{formatCurrency(total)}
                  </td>
                </tr>
                {type === 'invoice' && paidAmount !== undefined && paidAmount > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#059669', fontWeight: '500' }}>Paid</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', color: '#059669', fontWeight: '500' }}>
                        ৳{formatCurrency(paidAmount)}
                      </td>
                    </tr>
                    {remaining > 0 && (
                      <tr style={{ backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                        <td style={{ 
                          padding: '10px 8px', 
                          fontWeight: '700', 
                          color: '#dc2626',
                          borderRadius: '6px 0 0 6px',
                        }}>
                          Amount Due
                        </td>
                        <td style={{ 
                          padding: '10px 8px', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: '#dc2626',
                          fontSize: '11pt',
                          borderRadius: '0 6px 6px 0',
                        }}>
                          ৳{formatCurrency(remaining)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Information Block */}
        {showPaymentInfo && (
          <div className="pdf-section" style={{ 
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '10px',
            border: '1px solid #bbf7d0',
            pageBreakInside: 'avoid',
          }}>
            <p style={{
              fontSize: '8pt', 
              fontWeight: '700', 
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '12pt' }}>💳</span>
              Payment Information
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px',
            }}>
              {bankName && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Bank Name
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {bankName}
                  </p>
                </div>
              )}
              {bankBranch && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Branch
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {bankBranch}
                  </p>
                </div>
              )}
              {bankAccountName && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Account Name
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {bankAccountName}
                  </p>
                </div>
              )}
              {bankAccountNumber && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Account Number
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0, fontFamily: 'monospace' }}>
                    {bankAccountNumber}
                  </p>
                </div>
              )}
              {bankRoutingNumber && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Routing Number
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0, fontFamily: 'monospace' }}>
                    {bankRoutingNumber}
                  </p>
                </div>
              )}
              {mobileBanking && (
                <div>
                  <p style={{ fontSize: '7pt', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mobile Banking
                  </p>
                  <p style={{ fontSize: '9pt', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {mobileBanking}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        {(notes || terms || invoiceTerms) && (
          <div className="pdf-notes-terms-section" style={{ 
            marginBottom: '24px',
            pageBreakInside: 'avoid',
          }}>
            {/* Notes Section */}
            {notes && (
              <div className="pdf-section" style={{
                padding: '14px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                borderLeft: '3px solid #3b82f6',
                marginBottom: terms || invoiceTerms ? '16px' : 0,
              }}>
                <p style={{ 
                  fontSize: '8pt', 
                  fontWeight: '700', 
                  color: '#3b82f6',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}>
                  Notes
                </p>
                <div 
                  style={{ fontSize: '8pt', color: '#4b5563', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: notes }}
                />
              </div>
            )}
            
            {/* Terms & Conditions Section */}
            {(terms || invoiceTerms) && (
              <div className="pdf-section" style={{
                padding: '14px',
                backgroundColor: '#fefce8',
                borderRadius: '10px',
                borderLeft: '3px solid #ca8a04',
              }}>
                <p style={{ 
                  fontSize: '8pt', 
                  fontWeight: '700', 
                  color: '#ca8a04',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}>
                  Terms & Conditions
                </p>
                <div 
                  style={{ fontSize: '8pt', color: '#4b5563', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: terms || invoiceTerms }}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pdf-footer" style={{ 
          borderTop: '1px solid #e5e7eb',
          paddingTop: '20px',
          marginTop: '20px',
          pageBreakInside: 'avoid',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Signature */}
            <div>
              <div style={{ 
                width: '160px',
                borderTop: '1px solid #9ca3af',
                paddingTop: '8px',
              }}>
                <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Authorized Signature
                </p>
              </div>
            </div>

            {/* Thank you message */}
            <div style={{ textAlign: 'center', maxWidth: '200px' }}>
              <p style={{ 
                fontSize: '10pt', 
                color: '#374151', 
                fontWeight: '600',
                margin: '0 0 4px',
              }}>
                {invoiceFooter}
              </p>
              {companyPhone && (
                <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0 }}>
                  Questions? Contact: {companyPhone}
                </p>
              )}
            </div>

            {/* Generation info */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: '0 0 2px' }}>
                Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
              </p>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0 }}>
                © {new Date().getFullYear()} {companyName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintTemplate;
