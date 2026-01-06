import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  notes?: string | null;
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
  notes,
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

  // Fetch organization branding for white-label support
  const { data: branding } = useQuery({
    queryKey: ['organization-branding-print'],
    queryFn: async () => {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!member) return null;
      
      // Check if white-label PDF branding is enabled
      const { data: wlSettings } = await supabase
        .from('organization_whitelabel_settings')
        .select('pdf_branding_enabled')
        .eq('organization_id', member.organization_id)
        .maybeSingle();
      
      if (!wlSettings?.pdf_branding_enabled) return null;
      
      // Fetch branding
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

  const getStatusText = (status: string) => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid': return 'PAID';
        case 'partial': return 'PARTIALLY PAID';
        case 'unpaid': return 'UNPAID';
        default: return status.toUpperCase();
      }
    } else {
      switch (status) {
        case 'accepted': return 'ACCEPTED';
        case 'pending': return 'PENDING';
        case 'rejected': return 'REJECTED';
        default: return status.toUpperCase();
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid': return '#059669';
        case 'partial': return '#d97706';
        case 'unpaid': return '#dc2626';
        default: return '#6b7280';
      }
    } else {
      switch (status) {
        case 'accepted': return '#059669';
        case 'pending': return '#d97706';
        case 'rejected': return '#dc2626';
        default: return '#6b7280';
      }
    }
  };

  const remaining = paidAmount !== undefined ? total - paidAmount : 0;

  const companyName = settings?.company_name || 'Company Name';
  const companyNameBn = settings?.company_name_bn || '';
  const companyAddress = settings?.address || '';
  const companyPhone = settings?.phone || '';
  const companyEmail = settings?.email || '';
  const companyWebsite = settings?.website || '';
  // Use branding logo if available, otherwise fall back to company settings
  const logoUrl = branding?.logo_url || settings?.logo_url || null;
  const bankName = settings?.bank_name || '';
  const bankAccountNumber = settings?.bank_account_number || '';
  const bankAccountName = settings?.bank_account_name || '';
  const bankBranch = settings?.bank_branch || '';
  const mobileBanking = settings?.mobile_banking || '';
  const invoiceFooter = branding?.footer_text || settings?.invoice_footer || 'Thank you for your business!';
  const invoiceTerms = settings?.invoice_terms || '';

  const documentTitle = type === 'invoice' ? 'INVOICE' : 'QUOTATION';
  // Use branding primary color if available
  const primaryColor = branding?.primary_color || '#0284c7';

  return (
    <div className="hidden print:block bg-white text-black" style={{ 
      fontFamily: "'Inter', 'Hind Siliguri', sans-serif",
      fontSize: '10pt',
      lineHeight: '1.4',
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Watermark for unpaid invoices */}
      {type === 'invoice' && status === 'unpaid' && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: '100px',
          fontWeight: 'bold',
          color: 'rgba(220, 38, 38, 0.08)',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
        }}>
          UNPAID
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          paddingBottom: '20px',
          borderBottom: `3px solid ${primaryColor}`,
          marginBottom: '25px',
        }}>
          {/* Company Info Left */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                style={{ 
                  width: '70px', 
                  height: '70px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                }} 
              />
            ) : (
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: primaryColor,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold',
              }}>
                {companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ 
                fontSize: '22pt', 
                fontWeight: 'bold', 
                color: '#111827',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {companyName}
              </h1>
              {companyNameBn && (
                <p style={{ fontSize: '10pt', color: '#4b5563', margin: '2px 0' }}>
                  {companyNameBn}
                </p>
              )}
              {companyAddress && (
                <p style={{ fontSize: '9pt', color: '#6b7280', margin: '4px 0 0', maxWidth: '280px' }}>
                  {companyAddress}
                </p>
              )}
            </div>
          </div>

          {/* Document Title Right */}
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ 
              fontSize: '28pt', 
              fontWeight: 'bold', 
              color: primaryColor,
              margin: 0,
              letterSpacing: '2px',
            }}>
              {documentTitle}
            </h2>
            <p style={{ 
              fontSize: '12pt', 
              fontWeight: '600',
              color: '#374151',
              margin: '5px 0 0',
            }}>
              #{documentNumber}
            </p>
          </div>
        </div>

        {/* Contact & Document Details Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '20px',
          marginBottom: '25px',
        }}>
          {/* Company Contact */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '15px',
            borderRadius: '8px',
            borderLeft: `4px solid ${primaryColor}`,
          }}>
            <p style={{ 
              fontSize: '8pt', 
              fontWeight: '600', 
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              Contact Us
            </p>
            {companyPhone && (
              <p style={{ fontSize: '9pt', color: '#374151', margin: '3px 0' }}>
                📞 {companyPhone}
              </p>
            )}
            {companyEmail && (
              <p style={{ fontSize: '9pt', color: '#374151', margin: '3px 0' }}>
                ✉️ {companyEmail}
              </p>
            )}
            {companyWebsite && (
              <p style={{ fontSize: '9pt', color: '#374151', margin: '3px 0' }}>
                🌐 {companyWebsite}
              </p>
            )}
          </div>

          {/* Bill To / Customer */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #10b981',
          }}>
            <p style={{ 
              fontSize: '8pt', 
              fontWeight: '600', 
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              {type === 'invoice' ? 'Bill To' : 'Quotation For'}
            </p>
            {customer ? (
              <>
                <p style={{ fontSize: '11pt', fontWeight: '600', color: '#111827', margin: '0 0 3px' }}>
                  {customer.name}
                </p>
                {customer.company_name && (
                  <p style={{ fontSize: '9pt', color: '#374151', margin: '2px 0' }}>
                    {customer.company_name}
                  </p>
                )}
                {customer.phone && (
                  <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0' }}>
                    📞 {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0' }}>
                    ✉️ {customer.email}
                  </p>
                )}
                {customer.address && (
                  <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0' }}>
                    📍 {customer.address}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '9pt', color: '#9ca3af' }}>No customer info</p>
            )}
          </div>

          {/* Document Details */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #8b5cf6',
          }}>
            <p style={{ 
              fontSize: '8pt', 
              fontWeight: '600', 
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              Document Details
            </p>
            <table style={{ fontSize: '9pt', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#6b7280', padding: '2px 0' }}>Date:</td>
                  <td style={{ fontWeight: '500', textAlign: 'right', padding: '2px 0' }}>
                    {format(new Date(date), 'dd MMM yyyy')}
                  </td>
                </tr>
                {type === 'invoice' && dueDate && (
                  <tr>
                    <td style={{ color: '#6b7280', padding: '2px 0' }}>Due Date:</td>
                    <td style={{ fontWeight: '500', textAlign: 'right', padding: '2px 0' }}>
                      {format(new Date(dueDate), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )}
                {type === 'quotation' && validUntil && (
                  <tr>
                    <td style={{ color: '#6b7280', padding: '2px 0' }}>Valid Until:</td>
                    <td style={{ fontWeight: '500', textAlign: 'right', padding: '2px 0' }}>
                      {format(new Date(validUntil), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#6b7280', padding: '4px 0 2px' }}>Status:</td>
                  <td style={{ textAlign: 'right', padding: '4px 0 2px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(status),
                      color: 'white',
                      fontSize: '8pt',
                      fontWeight: '600',
                    }}>
                      {getStatusText(status)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '25px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '9pt',
          }}>
            <thead>
              <tr style={{ backgroundColor: primaryColor }}>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'left', 
                  color: 'white',
                  fontWeight: '600',
                  width: '5%',
                }}>
                  #
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'left', 
                  color: 'white',
                  fontWeight: '600',
                  width: '40%',
                }}>
                  Description
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'center', 
                  color: 'white',
                  fontWeight: '600',
                  width: '10%',
                }}>
                  Qty
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'center', 
                  color: 'white',
                  fontWeight: '600',
                  width: '10%',
                }}>
                  Unit
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'right', 
                  color: 'white',
                  fontWeight: '600',
                  width: '15%',
                }}>
                  Unit Price
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'right', 
                  color: 'white',
                  fontWeight: '600',
                  width: '10%',
                }}>
                  Discount
                </th>
                <th style={{ 
                  padding: '12px 10px', 
                  textAlign: 'right', 
                  color: 'white',
                  fontWeight: '600',
                  width: '15%',
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr 
                  key={index}
                  style={{ 
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <td style={{ padding: '10px', color: '#6b7280' }}>{index + 1}</td>
                  <td style={{ padding: '10px', fontWeight: '500', color: '#111827' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#6b7280' }}>
                    {item.unit || 'pcs'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ৳{formatCurrency(Number(item.unit_price))}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>
                    {Number(item.discount) > 0 ? `৳${formatCurrency(Number(item.discount))}` : '-'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                    ৳{formatCurrency(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '25px' }}>
          <div style={{ width: '300px' }}>
            <table style={{ width: '100%', fontSize: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#6b7280' }}>Subtotal:</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>৳{formatCurrency(subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#6b7280' }}>Discount:</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#dc2626' }}>
                      -৳{formatCurrency(discount)}
                    </td>
                  </tr>
                )}
                {tax > 0 && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#6b7280' }}>Tax/VAT:</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>৳{formatCurrency(tax)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #111827' }}>
                  <td style={{ 
                    padding: '12px 0 6px', 
                    fontSize: '13pt', 
                    fontWeight: 'bold',
                    color: '#111827',
                  }}>
                    Total:
                  </td>
                  <td style={{ 
                    padding: '12px 0 6px', 
                    textAlign: 'right', 
                    fontSize: '13pt', 
                    fontWeight: 'bold',
                    color: primaryColor,
                  }}>
                    ৳{formatCurrency(total)}
                  </td>
                </tr>
                {type === 'invoice' && paidAmount !== undefined && paidAmount > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#059669' }}>Paid Amount:</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', color: '#059669' }}>
                        ৳{formatCurrency(paidAmount)}
                      </td>
                    </tr>
                    {remaining > 0 && (
                      <tr style={{ backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                        <td style={{ 
                          padding: '8px 6px', 
                          fontWeight: 'bold', 
                          color: '#dc2626',
                        }}>
                          Amount Due:
                        </td>
                        <td style={{ 
                          padding: '8px 6px', 
                          textAlign: 'right', 
                          fontWeight: 'bold', 
                          color: '#dc2626',
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

        {/* Notes & Terms */}
        {(notes || invoiceTerms) && (
          <div style={{ 
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
          }}>
            <p style={{ 
              fontSize: '9pt', 
              fontWeight: '600', 
              color: '#1e40af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}>
              {type === 'invoice' ? 'Notes & Terms' : 'Terms & Conditions'}
            </p>
            {notes && (
              <p style={{ fontSize: '9pt', color: '#374151', whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>
                {notes}
              </p>
            )}
            {invoiceTerms && (
              <p style={{ fontSize: '9pt', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>
                {invoiceTerms}
              </p>
            )}
          </div>
        )}

        {/* Payment Information */}
        {(bankName || mobileBanking) && (
          <div style={{ 
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
          }}>
            <p style={{ 
              fontSize: '9pt', 
              fontWeight: '600', 
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Payment Information
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {bankName && (
                <div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '2px' }}>Bank Name</p>
                  <p style={{ fontSize: '10pt', fontWeight: '500', color: '#111827' }}>{bankName}</p>
                </div>
              )}
              {bankAccountName && (
                <div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '2px' }}>Account Name</p>
                  <p style={{ fontSize: '10pt', fontWeight: '500', color: '#111827' }}>{bankAccountName}</p>
                </div>
              )}
              {bankAccountNumber && (
                <div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '2px' }}>Account Number</p>
                  <p style={{ fontSize: '10pt', fontWeight: '500', color: '#111827' }}>{bankAccountNumber}</p>
                </div>
              )}
              {bankBranch && (
                <div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '2px' }}>Branch</p>
                  <p style={{ fontSize: '10pt', fontWeight: '500', color: '#111827' }}>{bankBranch}</p>
                </div>
              )}
              {mobileBanking && (
                <div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '2px' }}>Mobile Banking</p>
                  <p style={{ fontSize: '10pt', fontWeight: '500', color: '#111827' }}>{mobileBanking}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          borderTop: '2px solid #e5e7eb',
          paddingTop: '20px',
          marginTop: '30px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Signature */}
            <div>
              <div style={{ 
                width: '180px',
                borderTop: '2px solid #374151',
                paddingTop: '8px',
              }}>
                <p style={{ fontSize: '9pt', color: '#6b7280', margin: 0 }}>Authorized Signature</p>
              </div>
            </div>

            {/* Thank you message */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                fontSize: '11pt', 
                color: '#374151', 
                fontWeight: '500',
                margin: '0 0 5px',
              }}>
                {invoiceFooter}
              </p>
              {companyPhone && (
                <p style={{ fontSize: '8pt', color: '#9ca3af', margin: 0 }}>
                  For inquiries: {companyPhone}
                </p>
              )}
            </div>

            {/* Generation info */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8pt', color: '#9ca3af', margin: '0 0 2px' }}>
                Generated: {format(new Date(), 'dd MMM yyyy')}
              </p>
              <p style={{ fontSize: '8pt', color: '#9ca3af', margin: 0 }}>
                {companyName} © {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintTemplate;
