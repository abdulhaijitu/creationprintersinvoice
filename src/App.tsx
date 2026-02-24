import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { CompanySettingsProvider } from "@/contexts/CompanySettingsContext";
import { createQueryClient } from "@/hooks/useQueryConfig";
import { PWAUpdateNotifier } from "@/components/pwa/PWAUpdateNotifier";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceDetail from "./pages/InvoiceDetail";
import Quotations from "./pages/Quotations";
import QuotationForm from "./pages/QuotationForm";
import QuotationDetail from "./pages/QuotationDetail";
import PriceCalculations from "./pages/PriceCalculations";
import PriceCalculationForm from "./pages/PriceCalculationForm";
import Expenses from "./pages/Expenses";
import Vendors from "./pages/Vendors";
import VendorDetail from "./pages/VendorDetail";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Salary from "./pages/Salary";
import Leave from "./pages/Leave";
import Performance from "./pages/Performance";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import TeamMembers from "./pages/TeamMembers";
import NotFound from "./pages/NotFound";
import DeliveryChallans from "./pages/DeliveryChallans";
import ChallanPrintTemplate from "./components/delivery-challan/ChallanPrintTemplate";
import ResetPassword from "./pages/ResetPassword";
import CostingItemTemplates from "./pages/CostingItemTemplates";
import Admin from "./pages/Admin";

// Create a single QueryClient instance with optimized settings
const queryClient = createQueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <Toaster />
        <Sonner position="bottom-right" closeButton richColors />
        <PWAUpdateNotifier />
        <BrowserRouter>
          <ImpersonationProvider>
            <OrganizationProvider>
              <PermissionProvider>
                <CompanySettingsProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  <Route
                    path="/delivery-challans/:id/print"
                    element={<ChallanPrintTemplate />}
                  />

                  {/* App routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/customers/:id" element={<CustomerDetail />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/invoices/new" element={<InvoiceForm />} />
                    <Route path="/invoices/:id" element={<InvoiceDetail />} />
                    <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/quotations" element={<Quotations />} />
                    <Route path="/quotations/new" element={<QuotationForm />} />
                    <Route path="/quotations/:id" element={<QuotationDetail />} />
                    <Route path="/quotations/:id/edit" element={<QuotationForm />} />
                    <Route path="/price-calculation" element={<PriceCalculations />} />
                    <Route
                      path="/price-calculation/new"
                      element={<PriceCalculationForm />}
                    />
                    <Route
                      path="/price-calculation/:id"
                      element={<PriceCalculationForm />}
                    />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/vendors" element={<Vendors />} />
                    <Route path="/vendors/:id" element={<VendorDetail />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/salary" element={<Salary />} />
                    <Route path="/leave" element={<Leave />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/team-members" element={<TeamMembers />} />
                    <Route path="/delivery-challans" element={<DeliveryChallans />} />
                    <Route path="/costing-templates" element={<CostingItemTemplates />} />
                  </Route>

                  {/* Admin panel (self-contained layout) */}
                  <Route path="/admin" element={<Admin />} />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </CompanySettingsProvider>
              </PermissionProvider>
            </OrganizationProvider>
          </ImpersonationProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
