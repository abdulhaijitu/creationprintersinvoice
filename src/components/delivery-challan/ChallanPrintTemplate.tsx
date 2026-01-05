import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryChallan, DeliveryChallanItem } from '@/hooks/useDeliveryChallans';
import '@/components/print/printStyles.css';

interface CompanySettings {
  company_name: string;
  company_name_bn: string | null;
  address: string | null;
  address_bn: string | null;
  phone: string | null;
  email: string | null;
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
      // Fetch challan
      const { data: challanData } = await supabase
        .from('delivery_challans')
        .select(`
          *,
          invoice:invoices(invoice_number, customer_id, customers(name, address, phone)),
          customers(name, address, phone)
        `)
        .eq('id', id)
        .single();

      if (challanData) {
        setChallan(challanData as unknown as DeliveryChallan);
      }

      // Fetch items
      const { data: itemsData } = await supabase
        .from('delivery_challan_items')
        .select('*')
        .eq('challan_id', id);

      if (itemsData) {
        setItems(itemsData as DeliveryChallanItem[]);
      }

      // Fetch company settings
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
      // Auto print after load
      setTimeout(() => window.print(), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Challan not found</p>
      </div>
    );
  }

  const customerName = (challan as any).customers?.name || (challan as any).invoice?.customers?.name || 'N/A';
  const customerAddress = challan.delivery_address || (challan as any).customers?.address || (challan as any).invoice?.customers?.address || 'N/A';
  const customerPhone = (challan as any).customers?.phone || (challan as any).invoice?.customers?.phone || '';

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <div className="print-container p-8 max-w-4xl mx-auto bg-white text-black">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
        <div>
          {company?.logo_url && (
            <img src={company.logo_url} alt="Logo" className="h-16 mb-2" />
          )}
          <h1 className="text-2xl font-bold">{company?.company_name || 'Company Name'}</h1>
          {company?.company_name_bn && (
            <p className="text-lg">{company.company_name_bn}</p>
          )}
          <p className="text-sm text-gray-600">{company?.address || ''}</p>
          {company?.phone && <p className="text-sm text-gray-600">Phone: {company.phone}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-wide">Delivery Challan</h2>
          <p className="text-lg font-semibold mt-2">{challan.challan_number}</p>
          <p className="text-sm text-gray-600">
            Date: {format(new Date(challan.challan_date), 'dd MMM yyyy')}
          </p>
          <p className="text-sm text-gray-600">
            Invoice: {(challan as any).invoice?.invoice_number || 'N/A'}
          </p>
        </div>
      </div>

      {/* Customer & Delivery Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="border rounded p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Deliver To:</h3>
          <p className="font-medium text-lg">{customerName}</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{customerAddress}</p>
          {customerPhone && <p className="text-sm text-gray-600">Phone: {customerPhone}</p>}
        </div>
        <div className="border rounded p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Transport Details:</h3>
          {challan.vehicle_info && (
            <p className="text-sm"><span className="text-gray-600">Vehicle:</span> {challan.vehicle_info}</p>
          )}
          {challan.driver_name && (
            <p className="text-sm"><span className="text-gray-600">Driver:</span> {challan.driver_name}</p>
          )}
          {challan.driver_phone && (
            <p className="text-sm"><span className="text-gray-600">Driver Phone:</span> {challan.driver_phone}</p>
          )}
          {!challan.vehicle_info && !challan.driver_name && (
            <p className="text-sm text-gray-400">Not specified</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left w-12">#</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
            <th className="border border-gray-300 px-4 py-2 text-center w-24">Unit</th>
            <th className="border border-gray-300 px-4 py-2 text-right w-24">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-300 px-4 py-2">{item.description}</td>
              <td className="border border-gray-300 px-4 py-2 text-center">{item.unit || 'pcs'}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-semibold">
            <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right">Total Quantity:</td>
            <td className="border border-gray-300 px-4 py-2 text-right">{totalQuantity}</td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      {challan.notes && (
        <div className="mb-8 border rounded p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-1">Notes:</h3>
          <p className="text-sm whitespace-pre-line">{challan.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-16 pt-8">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mx-4">
            <p className="text-sm text-gray-600">Prepared By</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mx-4">
            <p className="text-sm text-gray-600">Checked By</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mx-4">
            <p className="text-sm text-gray-600">Received By</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>This is a computer-generated document. No signature is required.</p>
      </div>
    </div>
  );
}
