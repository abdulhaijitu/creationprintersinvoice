import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    if (type === 'invoice') {
      switch (status) {
        case 'paid':
          return 'পরিশোধিত';
        case 'partial':
          return 'আংশিক পরিশোধিত';
        case 'unpaid':
          return 'বাকি';
        default:
          return status;
      }
    } else {
      switch (status) {
        case 'accepted':
          return 'গৃহীত';
        case 'pending':
          return 'পেন্ডিং';
        case 'rejected':
          return 'বাতিল';
        default:
          return status;
      }
    }
  };

  const remaining = paidAmount !== undefined ? total - paidAmount : 0;

  return (
    <div className="hidden print:block bg-white text-black min-h-screen">
      {/* Header */}
      <div className="border-b-4 border-primary pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">C</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Creation Printers</h1>
              <p className="text-gray-600 text-sm">প্রিন্টিং ও প্যাকেজিং সলিউশন</p>
              <p className="text-gray-500 text-xs mt-1">উচ্চ মানের প্রিন্টিং সার্ভিস</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-4 py-2 rounded-lg bg-gray-100 border">
              <p className="text-2xl font-bold text-primary">
                {type === 'invoice' ? 'ইনভয়েস' : 'কোটেশন'}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">প্রেরক</p>
          <p className="font-bold text-gray-900">Creation Printers</p>
          <p className="text-sm text-gray-600">ঢাকা, বাংলাদেশ</p>
          <p className="text-sm text-gray-600">📞 01XXXXXXXXX</p>
          <p className="text-sm text-gray-600">✉️ info@creationprinters.com</p>
        </div>

        {/* To */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {type === 'invoice' ? 'বিল করা হয়েছে' : 'প্রাপক'}
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
            <p className="text-sm text-gray-500">গ্রাহক তথ্য নেই</p>
          )}
        </div>

        {/* Document Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">বিবরণ</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {type === 'invoice' ? 'ইনভয়েস নং:' : 'কোটেশন নং:'}
              </span>
              <span className="font-semibold">{documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">তারিখ:</span>
              <span>{format(new Date(date), 'dd/MM/yyyy')}</span>
            </div>
            {type === 'invoice' && dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">ডিউ তারিখ:</span>
                <span>{format(new Date(dueDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {type === 'quotation' && validUntil && (
              <div className="flex justify-between">
                <span className="text-gray-600">মেয়াদ:</span>
                <span>{format(new Date(validUntil), 'dd/MM/yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">স্ট্যাটাস:</span>
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
              <th className="py-3 px-4 text-left font-semibold">বিবরণ</th>
              <th className="py-3 px-4 text-center font-semibold">পরিমাণ</th>
              <th className="py-3 px-4 text-right font-semibold">একক দাম</th>
              <th className="py-3 px-4 text-right font-semibold">ছাড়</th>
              <th className="py-3 px-4 text-right font-semibold">মোট</th>
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
              <span className="text-gray-600">সাবটোটাল:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ছাড়:</span>
                <span className="text-red-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ট্যাক্স/ভ্যাট:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t-2 border-gray-300">
              <span className="font-bold text-lg">মোট:</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(total)}</span>
            </div>
            {type === 'invoice' && paidAmount !== undefined && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>পরিশোধিত:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-red-600">বাকি:</span>
                    <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {notes && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
            {type === 'invoice' ? 'নোট' : 'শর্তাবলী'}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Bank Info */}
      <div className="mb-8 bg-gray-50 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          পেমেন্ট তথ্য
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">ব্যাংক:</p>
            <p className="font-medium">Dutch Bangla Bank Ltd.</p>
          </div>
          <div>
            <p className="text-gray-600">অ্যাকাউন্ট নম্বর:</p>
            <p className="font-medium">XXXXXXXXXX</p>
          </div>
          <div>
            <p className="text-gray-600">মোবাইল ব্যাংকিং:</p>
            <p className="font-medium">বিকাশ/নগদ: 01XXXXXXXXX</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 pt-6 mt-8">
        <div className="flex justify-between items-end">
          <div>
            <div className="border-t-2 border-gray-400 pt-2 w-48">
              <p className="text-sm text-gray-600">অনুমোদিত স্বাক্ষর</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">ধন্যবাদ আপনার ব্যবসার জন্য!</p>
            <p className="text-xs text-gray-500 mt-1">
              প্রশ্ন থাকলে যোগাযোগ করুন: 01XXXXXXXXX
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>তৈরির তারিখ: {format(new Date(), 'd MMMM yyyy', { locale: bn })}</p>
            <p>Creation Printers © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* Watermark for unpaid invoices */}
      {type === 'invoice' && status === 'unpaid' && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-30deg]">
          <span className="text-9xl font-bold text-red-500">বাকি</span>
        </div>
      )}
    </div>
  );
};

export default PrintTemplate;