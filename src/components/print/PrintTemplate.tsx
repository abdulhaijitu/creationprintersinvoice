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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid':
          return 'Paid';
        case 'partial':
          return 'Partially Paid';
        case 'unpaid':
          return 'Unpaid';
        default:
          return status;
      }
    } else {
      switch (status) {
        case 'accepted':
          return 'Accepted';
        case 'pending':
          return 'Pending';
        case 'rejected':
          return 'Rejected';
        default:
          return status;
      }
    }
  };

  const remaining = paidAmount !== undefined ? total - paidAmount : 0;

  const companyName = settings?.company_name || 'My Company';
  const companyNameBn = settings?.company_name_bn || '';
  const companyAddress = settings?.address || '';
  const companyPhone = settings?.phone || '';
  const companyEmail = settings?.email || '';
  const logoUrl = settings?.logo_url || null;
  const bankName = settings?.bank_name || '';
  const bankAccountNumber = settings?.bank_account_number || '';
  const mobileBanking = settings?.mobile_banking || '';
  const invoiceFooter = settings?.invoice_footer || '';
  const invoiceTerms = settings?.invoice_terms || '';

  return (
    <div className="hidden print:block bg-white text-black min-h-screen">
      {/* Header */}
      <div className="border-b-4 border-primary pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-3xl">{companyName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
              {companyNameBn && <p className="text-gray-600 text-sm">{companyNameBn}</p>}
              <p className="text-gray-500 text-xs mt-1">Quality Printing Services</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-4 py-2 rounded-lg bg-gray-100 border">
              <p className="text-2xl font-bold text-primary">
                {type === 'invoice' ? 'INVOICE' : 'QUOTATION'}
              </p>
              <p className="text-lg font-semibold text-gray-700">#{documentNumber}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info & Document Info */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* From */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">From</p>
          <p className="font-bold text-gray-900">{companyName}</p>
          {companyAddress && <p className="text-sm text-gray-600">{companyAddress}</p>}
          {companyPhone && <p className="text-sm text-gray-600">📞 {companyPhone}</p>}
          {companyEmail && <p className="text-sm text-gray-600">✉️ {companyEmail}</p>}
        </div>

        {/* To */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {type === 'invoice' ? 'Bill To' : 'To'}
          </p>
          {customer ? (
            <>
              <p className="font-bold text-gray-900">{customer.name}</p>
              {customer.company_name && (
                <p className="text-sm text-gray-700">{customer.company_name}</p>
              )}
              {customer.phone && <p className="text-sm text-gray-600">📞 {customer.phone}</p>}
              {customer.email && <p className="text-sm text-gray-600">✉️ {customer.email}</p>}
              {customer.address && (
                <p className="text-sm text-gray-600">📍 {customer.address}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No customer info</p>
          )}
        </div>

        {/* Document Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Details</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {type === 'invoice' ? 'Invoice No:' : 'Quotation No:'}
              </span>
              <span className="font-semibold">{documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{format(new Date(date), 'dd/MM/yyyy')}</span>
            </div>
            {type === 'invoice' && dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span>{format(new Date(dueDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {type === 'quotation' && validUntil && (
              <div className="flex justify-between">
                <span className="text-gray-600">Valid Until:</span>
                <span>{format(new Date(validUntil), 'dd/MM/yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Status:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-xs ${
                  status === 'paid' || status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : status === 'partial' || status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {getStatusText(status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary text-white">
              <th className="py-3 px-4 text-left font-semibold">#</th>
              <th className="py-3 px-4 text-left font-semibold">Description</th>
              <th className="py-3 px-4 text-center font-semibold">Qty</th>
              <th className="py-3 px-4 text-right font-semibold">Unit Price</th>
              <th className="py-3 px-4 text-right font-semibold">Discount</th>
              <th className="py-3 px-4 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                <td className="py-3 px-4 font-medium">{item.description}</td>
                <td className="py-3 px-4 text-center">{item.quantity}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(Number(item.unit_price))}</td>
                <td className="py-3 px-4 text-right text-red-600">
                  {Number(item.discount) > 0 ? `-${formatCurrency(Number(item.discount))}` : '-'}
                </td>
                <td className="py-3 px-4 text-right font-semibold">
                  {formatCurrency(Number(item.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="text-red-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax/VAT:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t-2 border-gray-300">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(total)}</span>
            </div>
            {type === 'invoice' && paidAmount !== undefined && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-red-600">Due:</span>
                    <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(notes || invoiceTerms) && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
            {type === 'invoice' ? 'Notes & Terms' : 'Terms & Conditions'}
          </p>
          {notes && <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{notes}</p>}
          {invoiceTerms && <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoiceTerms}</p>}
        </div>
      )}

      {/* Bank Info */}
      {(bankName || mobileBanking) && (
        <div className="mb-8 bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Payment Information
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {bankName && (
              <div>
                <p className="text-gray-600">Bank:</p>
                <p className="font-medium">{bankName}</p>
              </div>
            )}
            {bankAccountNumber && (
              <div>
                <p className="text-gray-600">Account Number:</p>
                <p className="font-medium">{bankAccountNumber}</p>
              </div>
            )}
            {mobileBanking && (
              <div>
                <p className="text-gray-600">Mobile Banking:</p>
                <p className="font-medium">{mobileBanking}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-200 pt-6 mt-8">
        <div className="flex justify-between items-end">
          <div>
            <div className="border-t-2 border-gray-400 pt-2 w-48">
              <p className="text-sm text-gray-600">Authorized Signature</p>
            </div>
          </div>
          <div className="text-center">
            {invoiceFooter ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoiceFooter}</p>
            ) : (
              <p className="text-sm text-gray-600">Thank you for your business!</p>
            )}
            {companyPhone && (
              <p className="text-xs text-gray-500 mt-1">
                For inquiries contact: {companyPhone}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Generated: {format(new Date(), 'd MMM yyyy')}</p>
            <p>{companyName} © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* Watermark for unpaid invoices */}
      {type === 'invoice' && status === 'unpaid' && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-30deg]">
          <span className="text-9xl font-bold text-red-500">UNPAID</span>
        </div>
      )}
    </div>
  );
};

export default PrintTemplate;
