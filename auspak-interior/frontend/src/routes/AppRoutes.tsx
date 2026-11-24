
import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import RequireRole from '../components/auth/RequireRole';
import HomePage from '../pages/HomePage';
import ServicesPage from '../pages/ServicesPage';
// import ProjectsPage from '../pages/ProjectsPage';
// import ProjectDetailPage from '../pages/ProjectDetailPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import TrackOrderPage from '../pages/TrackOrderPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import AccountPage from '../pages/AccountPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminOrderNew from '../pages/admin/AdminOrderNew';
import AdminOrderDetail from '../pages/admin/AdminOrderDetail';
import { AdminEnquiries, AdminEnquiryDetail } from '../pages/admin/AdminEnquiries';
import AdminNotifications from '../pages/admin/AdminNotifications';
import AdminDesigns from '../pages/admin/AdminDesigns';
import AdminDesignEdit from '../pages/admin/AdminDesignEdit';
import AdminUsers from '../pages/admin/AdminUsers';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<RequireRole roles={['admin', 'staff']}><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/new" element={<AdminOrderNew />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
        <Route path="enquiries/:id" element={<AdminEnquiryDetail />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="designs" element={<RequireRole roles={['admin']}><AdminDesigns /></RequireRole>} />
        <Route path="designs/:id" element={<RequireRole roles={['admin']}><AdminDesignEdit /></RequireRole>} />
        <Route path="users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />

        {/* Projects pages temporarily disabled
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        */}

        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/account" element={<RequireRole roles={['customer']}><AccountPage /></RequireRole>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
