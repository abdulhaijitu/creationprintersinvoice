
-- invoice_payments performance indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_org_id ON invoice_payments(organization_id);

-- vendor_bills performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor_id ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_org_id ON vendor_bills(organization_id);

-- vendor_payments performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_org_id ON vendor_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_bill_id ON vendor_payments(bill_id);

-- salary records org index
CREATE INDEX IF NOT EXISTS idx_salary_records_org_id ON employee_salary_records(organization_id);

-- expenses date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(organization_id, date);

-- invoices date + customer composite indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

-- tasks org + status for dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);
