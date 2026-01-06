import { forwardRef } from 'react';
import { format } from 'date-fns';
import type { BillingInvoice } from '@/hooks/useBillingInvoices';

interface BillingInvoicePDFProps {
  invoice: BillingInvoice;
}

const BillingInvoicePDF = forwardRef<HTMLDivElement, BillingInvoicePDFProps>(
  ({ invoice }, ref) => {
    const planDetails: Record<string, string> = {
      free: 'Free Plan',
      basic: 'Basic Plan - Full access to core features',
      pro: 'Pro Plan - Advanced features + priority support',
      enterprise: 'Enterprise Plan - Unlimited access + dedicated support',
    };

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-8 max-w-[800px] mx-auto"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">PrintoSaaS</h1>
            <p className="text-gray-600 mt-1">Business Management Platform</p>
            <div className="mt-4 text-sm text-gray-600">
              <p>support@printosaas.com</p>
              <p>www.printosaas.com</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
            <p className="text-lg font-semibold text-primary mt-2">
              {invoice.invoice_number}
            </p>
            <div className="mt-4 text-sm text-gray-600">
              <p>Generated: {format(new Date(invoice.generated_date), 'MMMM d, yyyy')}</p>
              <p>Due Date: {format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="font-bold text-lg">{invoice.business_name}</p>
            {invoice.owner_email && (
              <p className="text-gray-600">{invoice.owner_email}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Status</h3>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              invoice.status === 'paid' 
                ? 'bg-green-100 text-green-800'
                : invoice.status === 'overdue'
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Billing Period */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Billing Period</h3>
          <p className="font-medium">
            {format(new Date(invoice.billing_period_start), 'MMMM d, yyyy')} - {format(new Date(invoice.billing_period_end), 'MMMM d, yyyy')}
          </p>
        </div>

        {/* Invoice Items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-gray-600">Description</th>
              <th className="text-right py-3 text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-4">
                <p className="font-semibold">{invoice.plan_name.charAt(0).toUpperCase() + invoice.plan_name.slice(1)} Plan Subscription</p>
                <p className="text-sm text-gray-500">{planDetails[invoice.plan_name]}</p>
              </td>
              <td className="text-right py-4 font-medium">৳{invoice.amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">৳{invoice.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Tax (5%)</span>
              <span className="font-medium">৳{invoice.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-200">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-lg text-primary">৳{invoice.total_payable.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {invoice.status === 'paid' ? (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="text-sm font-semibold text-green-800 uppercase mb-2">Payment Received</h3>
            <p className="text-green-700">
              Paid on {invoice.paid_date ? format(new Date(invoice.paid_date), 'MMMM d, yyyy') : 'N/A'}
              {invoice.payment_method && ` via ${invoice.payment_method.replace('_', ' ')}`}
              {invoice.payment_reference && ` (Ref: ${invoice.payment_reference})`}
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-sm font-semibold text-blue-800 uppercase mb-2">Payment Instructions</h3>
            <div className="text-blue-700 text-sm space-y-1">
              <p><strong>Bank:</strong> Sonali Bank Limited</p>
              <p><strong>Account Name:</strong> PrintoSaaS Technologies Ltd</p>
              <p><strong>Account Number:</strong> 1234567890123</p>
              <p><strong>Branch:</strong> Motijheel, Dhaka</p>
              <p className="mt-2"><strong>bKash:</strong> 01712345678</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-sm text-gray-500">
          <p>Thank you for choosing PrintoSaaS!</p>
          <p className="mt-1">If you have any questions, please contact support@printosaas.com</p>
          <p className="mt-4 text-xs">
            This is a computer-generated invoice. No signature is required.
          </p>
        </div>
      </div>
    );
  }
);

BillingInvoicePDF.displayName = 'BillingInvoicePDF';

export default BillingInvoicePDF;
