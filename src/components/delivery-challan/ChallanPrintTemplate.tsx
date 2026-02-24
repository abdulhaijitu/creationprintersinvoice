import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryChallan, DeliveryChallanItem } from '@/hooks/useDeliveryChallans';
import '@/components/print/printStyles.css';
import { generatePDFFilename } from '@/lib/pdfUtils';

interface CompanySettings {
  company_name: string;
  company_name_bn: string | null;
  address: string | null;
  address_bn: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

export default function ChallanPrintTemplate() {
  const { id } = useParams();
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const [items, setItems] = useState<DeliveryChallanItem[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: challanData } = await supabase
        .from('delivery_challans')
        .select(`
          *,
          invoice:invoices(invoice_number, customer_id, customers(name, address, phone, email)),
          customers(name, address, phone, email)
        `)
        .eq('id', id)
        .single();

      if (challanData) {
        setChallan(challanData as unknown as DeliveryChallan);
      }

      const { data: itemsData } = await supabase
        .from('delivery_challan_items')
        .select('*')
        .eq('challan_id', id);

      if (itemsData) {
        setItems(itemsData as DeliveryChallanItem[]);
      }

      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (companyData) {
        setCompany(companyData as CompanySettings);
      }
    } catch (error) {
      console.error('Error fetching print data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set document title for proper PDF filename and trigger print
  useEffect(() => {
    if (!loading && challan) {
      const pdfFilename = generatePDFFilename('challan', challan.challan_number);
      document.title = pdfFilename.replace('.pdf', '');
      
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, challan]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
      }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
      }}>
        <p style={{ color: '#dc2626' }}>Challan not found</p>
      </div>
    );
  }

  const customerName = (challan as any).customers?.name || (challan as any).invoice?.customers?.name || 'N/A';
  const customerAddress = challan.delivery_address || (challan as any).customers?.address || (challan as any).invoice?.customers?.address || '';
  const customerPhone = (challan as any).customers?.phone || (challan as any).invoice?.customers?.phone || '';
  const customerEmail = (challan as any).customers?.email || (challan as any).invoice?.customers?.email || '';
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const isDelivered = challan.status === 'delivered';
  const primaryColor = '#0f766e';
  const accentColor = '#10b981';

  return (
    <div style={{ 
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      fontSize: '9pt',
      lineHeight: '1.5',
      minHeight: '100vh',
      position: 'relative',
      padding: '0',
      color: '#1f2937',
      backgroundColor: 'white',
    }}>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .print-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* DELIVERED Watermark - Only when status is delivered */}
      {isDelivered && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-35deg)',
          fontSize: '100px',
          fontWeight: '800',
          color: 'rgba(22, 163, 74, 0.06)',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
          letterSpacing: '6px',
        }}>
          DELIVERED
        </div>
      )}

      <div className="print-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Premium Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          paddingBottom: '20px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          {/* Company Branding */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt="Logo" 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                }} 
              />
            ) : (
              <div style={{
                width: '60px',
                height: '60px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '26px',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {(company?.company_name || 'C').charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ 
                fontSize: '18pt', 
                fontWeight: '700', 
                color: '#111827',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.5px',
              }}>
                {company?.company_name || 'Company Name'}
              </h1>
              {company?.company_name_bn && (
                <p style={{ fontSize: '9pt', color: '#6b7280', margin: '3px 0 0' }}>
                  {company.company_name_bn}
                </p>
              )}
              {company?.address && (
                <p style={{ 
                  fontSize: '8pt', 
                  color: '#9ca3af', 
                  margin: '5px 0 0', 
                  maxWidth: '240px',
                  lineHeight: 1.4,
                }}>
                  {company.address}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                {company?.phone && (
                  <span style={{ fontSize: '8pt', color: '#6b7280' }}>📞 {company.phone}</span>
                )}
                {company?.email && (
                  <span style={{ fontSize: '8pt', color: '#6b7280' }}>✉ {company.email}</span>
                )}
              </div>
            </div>
          </div>

          {/* Challan Title & Number */}
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ 
              fontSize: '24pt', 
              fontWeight: '800', 
              color: primaryColor,
              margin: 0,
              letterSpacing: '-1px',
              lineHeight: 1,
            }}>
              DELIVERY CHALLAN
            </h2>
            <p style={{ 
              fontSize: '11pt', 
              fontWeight: '600',
              color: '#374151',
              margin: '8px 0 0',
              fontFamily: 'monospace',
            }}>
              #{challan.challan_number}
            </p>
            <div style={{ marginTop: '8px', fontSize: '8pt', color: '#6b7280' }}>
              <p style={{ margin: '2px 0' }}>
                Issue Date: {format(new Date(challan.challan_date), 'dd/MM/yyyy')}
              </p>
              {(challan as any).invoice?.invoice_number && (
                <p style={{ margin: '2px 0' }}>
                  Invoice: {(challan as any).invoice.invoice_number}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Delivery Info Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Customer Details Card */}
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
              Customer Details
            </p>
            <p style={{ fontSize: '11pt', fontWeight: '600', color: '#111827', margin: '0 0 6px' }}>
              {customerName}
            </p>
            {customerAddress && (
              <p style={{ fontSize: '8pt', color: '#4b5563', margin: '0 0 4px', lineHeight: 1.4 }}>
                📍 {customerAddress}
              </p>
            )}
            {customerPhone && (
              <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0' }}>
                📞 {customerPhone}
              </p>
            )}
            {customerEmail && (
              <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0' }}>
                ✉ {customerEmail}
              </p>
            )}
          </div>

          {/* Delivery Details Card */}
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
              Delivery Details
            </p>
            {challan.delivery_address && challan.delivery_address !== customerAddress && (
              <p style={{ fontSize: '8pt', color: '#4b5563', margin: '0 0 6px', lineHeight: 1.4 }}>
                <span style={{ color: '#9ca3af' }}>Location:</span> {challan.delivery_address}
              </p>
            )}
            {challan.vehicle_info && (
              <p style={{ fontSize: '8pt', color: '#4b5563', margin: '4px 0' }}>
                <span style={{ color: '#9ca3af' }}>Vehicle:</span> {challan.vehicle_info}
              </p>
            )}
            {challan.driver_name && (
              <p style={{ fontSize: '8pt', color: '#4b5563', margin: '4px 0' }}>
                <span style={{ color: '#9ca3af' }}>Driver:</span> {challan.driver_name}
              </p>
            )}
            {challan.driver_phone && (
              <p style={{ fontSize: '8pt', color: '#4b5563', margin: '4px 0' }}>
                <span style={{ color: '#9ca3af' }}>Driver Phone:</span> {challan.driver_phone}
              </p>
            )}
            {!challan.vehicle_info && !challan.driver_name && !challan.delivery_address && (
              <p style={{ fontSize: '8pt', color: '#9ca3af', fontStyle: 'italic' }}>
                No transport details specified
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '24px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '8pt',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '5%',
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
                  width: '55%',
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
                  width: '15%',
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
                  width: '15%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Quantity
                </th>
                <th style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  color: '#374151',
                  fontWeight: '700',
                  width: '10%',
                  fontSize: '7pt',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr 
                  key={item.id}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: '8pt' }}>
                    {index + 1}
                  </td>
                  <td style={{ 
                    padding: '10px 8px', 
                    fontWeight: '500', 
                    color: '#111827',
                    wordBreak: 'break-word',
                  }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280' }}>
                    {item.unit || 'pcs'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: '8pt' }}>
                    —
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td colSpan={3} style={{ 
                  padding: '12px 8px', 
                  textAlign: 'right', 
                  fontWeight: '700',
                  color: '#374151',
                  fontSize: '9pt',
                }}>
                  Total Quantity
                </td>
                <td style={{ 
                  padding: '12px 8px', 
                  textAlign: 'right', 
                  fontWeight: '800',
                  color: primaryColor,
                  fontSize: '11pt',
                }}>
                  {totalQuantity}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes Section */}
        {challan.notes && (
          <div style={{ 
            marginBottom: '24px',
            padding: '14px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            borderLeft: '3px solid #94a3b8',
          }}>
            <p style={{ 
              fontSize: '8pt', 
              fontWeight: '700', 
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}>
              Notes / Instructions
            </p>
            <p style={{ fontSize: '8pt', color: '#4b5563', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
              {challan.notes}
            </p>
          </div>
        )}

        {/* Signature Block */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '24px',
          marginTop: '50px',
          marginBottom: '30px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              height: '50px', 
              marginBottom: '8px',
            }} />
            <div style={{ 
              borderTop: '1px solid #9ca3af',
              paddingTop: '8px',
            }}>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Prepared By
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              height: '50px', 
              marginBottom: '8px',
            }} />
            <div style={{ 
              borderTop: '1px solid #9ca3af',
              paddingTop: '8px',
            }}>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Checked By
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              height: '50px', 
              marginBottom: '8px',
            }} />
            <div style={{ 
              borderTop: '1px solid #9ca3af',
              paddingTop: '8px',
            }}>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Received By
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px',
          marginTop: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Inquiries */}
            <div>
              {company?.phone && (
                <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0 }}>
                  For inquiries: {company.phone}
                </p>
              )}
            </div>

            {/* Thank you message */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                fontSize: '9pt', 
                color: '#374151', 
                fontWeight: '600',
                margin: 0,
              }}>
                Thank you for choosing us!
              </p>
            </div>

            {/* Generation info */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: '0 0 2px' }}>
                Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </p>
              <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0 }}>
                © {new Date().getFullYear()} {company?.company_name || 'Company'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
