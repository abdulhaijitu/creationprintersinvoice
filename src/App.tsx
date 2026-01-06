import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Invoices from "./pages/Invoices";
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
import OrganizationSettings from "./pages/OrganizationSettings";
import UserRoles from "./pages/UserRoles";
import TeamMembers from "./pages/TeamMembers";
import NotFound from "./pages/NotFound";
import DeliveryChallans from "./pages/DeliveryChallans";
import ChallanPrintTemplate from "./components/delivery-challan/ChallanPrintTemplate";
import PlatformAdmin from "./pages/admin/PlatformAdmin";
import SuperAdminLogin from "./pages/admin/SuperAdminLogin";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Usage from "./pages/Usage";
import NotificationSettings from "./pages/NotificationSettings";
import WhiteLabelSettings from "./pages/WhiteLabelSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <BrandingProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin" element={<PlatformAdmin />} />
              <Route path="/admin/login" element={<SuperAdminLogin />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/delivery-challans/:id/print" element={<ChallanPrintTemplate />} />
              
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/quotations/new" element={<QuotationForm />} />
                <Route path="/quotations/:id" element={<QuotationDetail />} />
                <Route path="/quotations/:id/edit" element={<QuotationForm />} />
                <Route path="/price-calculation" element={<PriceCalculations />} />
                <Route path="/price-calculation/new" element={<PriceCalculationForm />} />
                <Route path="/price-calculation/:id" element={<PriceCalculationForm />} />
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
                <Route path="/settings" element={<OrganizationSettings />} />
                <Route path="/user-roles" element={<UserRoles />} />
                <Route path="/team-members" element={<TeamMembers />} />
                <Route path="/delivery-challans" element={<DeliveryChallans />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/notification-settings" element={<NotificationSettings />} />
                <Route path="/white-label" element={<WhiteLabelSettings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </BrandingProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
