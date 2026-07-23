// src/routes/AppRoutes.jsx
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from '../components/layout/PublicLayout'; // Topnav สำหรับนักเรียน
import MainLayout from '../components/layout/MainLayout';     // Sidebar สำหรับเจ้าหน้าที่

// Guards
import ProtectedRoute from './ProtectedRoute';

// Public Pages
import IndexPage from '../features/landing/pages/IndexPage';   // หน้าดูวิชาเปิดสอน + สมัครเรียน
import LoginPage from '../features/auth/pages/LoginPage';

// Admin/Staff Pages
import TeachersPage from '../features/teachers/pages/TeachersPage';
import BatchesPage from '../features/batches/pages/BatchesPage';

export default function AppRoutes() {
    return (
        <Routes>
            {/* 🌐 1. Public Zone ( Topnav Layout ) */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<IndexPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 🔐 2. Admin/Staff Zone ( Sidebar Layout + Auth Guard ) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<div>Dashboard ภาพรวม</div>} />
                    <Route path="/teachers" element={<TeachersPage />} />
                    <Route path="/batches" element={<BatchesPage />} />
                </Route>
            </Route>
        </Routes>
    );
}