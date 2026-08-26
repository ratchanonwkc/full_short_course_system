// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../components/layout/PublicLayout'; // Topnav layout for students & public
import MainLayout from '../components/layout/MainLayout';     // Sidebar layout for staff & admin

// Guards
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Public Pages
import IndexPage from '../features/landing/pages/IndexPage';             // Course catalog & enrollment entrance
import RegistrationPage from '../features/public/pages/RegistrationPage'; // Multi-step registration & payment
import ApplicantTrackingPage from '../features/public/pages/ApplicantTrackingPage'; // Public tracking & edit portal
import LoginPage from '../features/auth/pages/LoginPage';

// Admin Pages
import UserManagementPage from '../pages/admin/UserManagementPage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';

// Admin / Planning Pages
import TeachersPage from '../features/teachers/pages/TeachersPage';
import BatchesPage from '../features/batches/pages/BatchesPage';
import AcademicStructurePage from '../features/curriculums/pages/AcademicStructurePage';
import SubjectsPage from '../features/subjects/pages/SubjectsPage';
import StudyGroupsPage from '../features/study-groups/pages/StudyGroupsPage';

// Registrar Pages
import RegistrarEnrollmentsPage from '../features/registrar/pages/RegistrarEnrollmentsPage';

// Finance Pages
import FinanceVerificationPage from '../features/finance/pages/FinanceVerificationPage';
import PaymentMethodSettingsPage from '../features/finance/pages/PaymentMethodSettingsPage';

export default function AppRoutes() {
    return (
        <Routes>
            {/* 🌐 1. Public Zone ( Public Topnav Layout ) */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<IndexPage />} />
                {/* studyGroupId is optional — allows direct or catalog selection */}
                <Route path="/register/:studyGroupId?" element={<RegistrationPage />} />
                <Route path="/track" element={<ApplicantTrackingPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 🔐 2. Admin & Staff Zone ( Sidebar Layout + Role Guards ) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    {/* Common Staff / General Overview */}
                    <Route path="/dashboard" element={<BatchesPage />} />

                    {/* 🛡️ Admin Only Module */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin/users" element={<UserManagementPage />} />
                        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                    </Route>

                    {/* 📚 Academic & Planning Module (Admin + Planning) */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'planning']} />}>
                        <Route path="/batches" element={<BatchesPage />} />
                        <Route path="/batches/:batchId/groups" element={<StudyGroupsPage />} />
                        <Route path="/planning/study-groups" element={<StudyGroupsPage />} />
                        <Route path="/planning/study-groups/:batchId" element={<StudyGroupsPage />} />
                        <Route path="/teachers" element={<TeachersPage />} />
                        <Route path="/academic-structure" element={<AcademicStructurePage />} />
                        <Route path="/subjects" element={<SubjectsPage />} />
                    </Route>

                    {/* 📋 Registrar Module (Admin + Registrar) */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'registrar']} />}>
                        <Route path="/registrar/enrollments" element={<RegistrarEnrollmentsPage />} />
                    </Route>

                    {/* 💰 Finance Module (Admin + Finance) */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'finance']} />}>
                        <Route path="/finance/verification" element={<FinanceVerificationPage />} />
                        <Route path="/finance/verifications" element={<FinanceVerificationPage />} />
                        <Route path="/finance/payment-methods" element={<PaymentMethodSettingsPage />} />
                    </Route>
                </Route>
            </Route>

            {/* 🔄 3. Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
