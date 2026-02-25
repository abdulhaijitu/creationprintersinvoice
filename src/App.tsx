import { lazy, Suspense } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

// Eagerly loaded (critical path)
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Lazy loaded pages
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Payments = lazy(() => import("./pages/Payments"));
const InvoiceForm = lazy(() => import("./pages/InvoiceForm"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Quotations = lazy(() => import("./pages/Quotations"));
const QuotationForm = lazy(() => import("./pages/QuotationForm"));
const QuotationDetail = lazy(() => import("./pages/QuotationDetail"));
const PriceCalculations = lazy(() => import("./pages/PriceCalculations"));
const PriceCalculationForm = lazy(() => import("./pages/PriceCalculationForm"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorDetail = lazy(() => import("./pages/VendorDetail"));
const Employees = lazy(() => import("./pages/Employees"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Salary = lazy(() => import("./pages/Salary"));
const Leave = lazy(() => import("./pages/Leave"));
const Performance = lazy(() => import("./pages/Performance"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const DeliveryChallans = lazy(() => import("./pages/DeliveryChallans"));
const ChallanPrintTemplate = lazy(() => import("./components/delivery-challan/ChallanPrintTemplate"));
const CostingItemTemplates = lazy(() => import("./pages/CostingItemTemplates"));
const Admin = lazy(() => import("./pages/Admin"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));

// Page loading fallback
const PageLoader = () => (
  <div className="flex-1 p-4 md:p-6 space-y-4 animate-fade-in">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

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
                  <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
                  <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                  <Route path="/accept-invite" element={<Suspense fallback={<PageLoader />}><AcceptInvite /></Suspense>} />
                  
                  <Route
                    path="/delivery-challans/:id/print"
                    element={<Suspense fallback={<PageLoader />}><ChallanPrintTemplate /></Suspense>}
                  />

                  {/* App routes - all lazy loaded with Suspense */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/customers" element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
                    <Route path="/customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetail /></Suspense>} />
                    <Route path="/invoices" element={<Suspense fallback={<PageLoader />}><Invoices /></Suspense>} />
                    <Route path="/invoices/new" element={<Suspense fallback={<PageLoader />}><InvoiceForm /></Suspense>} />
                    <Route path="/invoices/:id" element={<Suspense fallback={<PageLoader />}><InvoiceDetail /></Suspense>} />
                    <Route path="/invoices/:id/edit" element={<Suspense fallback={<PageLoader />}><InvoiceForm /></Suspense>} />
                    <Route path="/payments" element={<Suspense fallback={<PageLoader />}><Payments /></Suspense>} />
                    <Route path="/quotations" element={<Suspense fallback={<PageLoader />}><Quotations /></Suspense>} />
                    <Route path="/quotations/new" element={<Suspense fallback={<PageLoader />}><QuotationForm /></Suspense>} />
                    <Route path="/quotations/:id" element={<Suspense fallback={<PageLoader />}><QuotationDetail /></Suspense>} />
                    <Route path="/quotations/:id/edit" element={<Suspense fallback={<PageLoader />}><QuotationForm /></Suspense>} />
                    <Route path="/price-calculation" element={<Suspense fallback={<PageLoader />}><PriceCalculations /></Suspense>} />
                    <Route path="/price-calculation/new" element={<Suspense fallback={<PageLoader />}><PriceCalculationForm /></Suspense>} />
                    <Route path="/price-calculation/:id" element={<Suspense fallback={<PageLoader />}><PriceCalculationForm /></Suspense>} />
                    <Route path="/expenses" element={<Suspense fallback={<PageLoader />}><Expenses /></Suspense>} />
                    <Route path="/vendors" element={<Suspense fallback={<PageLoader />}><Vendors /></Suspense>} />
                    <Route path="/vendors/:id" element={<Suspense fallback={<PageLoader />}><VendorDetail /></Suspense>} />
                    <Route path="/employees" element={<Suspense fallback={<PageLoader />}><Employees /></Suspense>} />
                    <Route path="/attendance" element={<Suspense fallback={<PageLoader />}><Attendance /></Suspense>} />
                    <Route path="/salary" element={<Suspense fallback={<PageLoader />}><Salary /></Suspense>} />
                    <Route path="/leave" element={<Suspense fallback={<PageLoader />}><Leave /></Suspense>} />
                    <Route path="/performance" element={<Suspense fallback={<PageLoader />}><Performance /></Suspense>} />
                    <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><Tasks /></Suspense>} />
                    <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
                    <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                    <Route path="/team-members" element={<Suspense fallback={<PageLoader />}><TeamMembers /></Suspense>} />
                    <Route path="/delivery-challans" element={<Suspense fallback={<PageLoader />}><DeliveryChallans /></Suspense>} />
                    <Route path="/costing-templates" element={<Suspense fallback={<PageLoader />}><CostingItemTemplates /></Suspense>} />
                    <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><CalendarView /></Suspense>} />
                  </Route>

                  {/* Admin panel */}
                  <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />

                  {/* Catch-all */}
                  <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
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
