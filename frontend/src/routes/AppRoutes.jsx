// src/routes/AppRoutes.jsx
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from '../components/layout/PublicLayout'; // Topnav สำหรับนักเรียน
import MainLayout from '../components/layout/MainLayout';     // Sidebar สำหรับเจ้าหน้าที่

// Guards
import ProtectedRoute from './ProtectedRoute';

// Public Pages
import IndexPage from '../features/landing/pages/IndexPage';   // หน้าดูวิชาเปิดสอน + สมัครเรียน
import RegistrationPage from '../features/public/pages/RegistrationPage'; // ฟอร์มสมัครเรียนออนไลน์ 6 ส่วน + ชำระเงิน
import LoginPage from '../features/auth/pages/LoginPage';

// Admin/Staff Pages
import TeachersPage from '../features/teachers/pages/TeachersPage';
import BatchesPage from '../features/batches/pages/BatchesPage';
import AcademicStructurePage from '../features/curriculums/pages/AcademicStructurePage';
import SubjectsPage from '../features/subjects/pages/SubjectsPage';
import StudyGroupsPage from '../features/study-groups/pages/StudyGroupsPage';
import RegistrarEnrollmentsPage from '../features/registrar/pages/RegistrarEnrollmentsPage';
import FinanceVerificationPage from '../features/finance/pages/FinanceVerificationPage';
import PaymentMethodSettingsPage from '../features/finance/pages/PaymentMethodSettingsPage';

export default function AppRoutes() {
    return (
        <Routes>
            {/* 🌐 1. Public Zone ( Topnav Layout ) */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<IndexPage />} />
                <Route path="/register/:studyGroupId" element={<RegistrationPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 🔐 2. Admin/Staff Zone ( Sidebar Layout + Auth Guard ) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<div>Dashboard ภาพรวม</div>} />
                    <Route path="/teachers" element={<TeachersPage />} />
                    <Route path="/batches" element={<BatchesPage />} />
                    <Route path="/batches/:batchId/groups" element={<StudyGroupsPage />} />
                    <Route path="/academic-structure" element={<AcademicStructurePage />} />
                    <Route path="/subjects" element={<SubjectsPage />} />

                    {/* 📋 Registrar Portal */}
                    <Route path="/registrar/enrollments" element={<RegistrarEnrollmentsPage />} />

                    {/* 💰 Finance Portal */}
                    <Route path="/finance/verification" element={<FinanceVerificationPage />} />
                    <Route path="/finance/payment-methods" element={<PaymentMethodSettingsPage />} />
                </Route>
            </Route>
        </Routes>
    );
}
