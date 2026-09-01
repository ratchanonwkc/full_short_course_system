import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import teacherRoutes from './src/features/teachers/teachers.routes.js';
import masterDataRoutes from './src/features/master-data/masterData.routes.js';
import batchRoutes from './src/features/batches/batches.routes.js';
import academicMajorsRoutes from './src/features/academic-majors/academicMajors.routes.js';
import academicMinorsRoutes from './src/features/academic-minors/academicMinors.routes.js';
import subjectsRoutes from './src/features/subjects/subjects.routes.js';
import authRoutes from './src/features/auth/auth.routes.js';
import studyGroupsRoutes from './src/features/study-groups/studyGroups.routes.js';
import studyGroupSubjectsRoutes from './src/features/study-group-subjects/studyGroupSubjects.routes.js';
import applicantRoutes from './src/features/applicants/applicants.routes.js';
import printRoutes from './src/features/print/print.routes.js';
import publicRoutes from './src/features/public/public.routes.js';
import enrollmentsRoutes from './src/features/enrollments/enrollments.routes.js';
import paymentMethodsRoutes from './src/features/payment-methods/paymentMethods.routes.js';
import adminRoutes from './src/features/admin/admin.routes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: true,
    credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'UPTECH Short Course System API is running 🚀',
        timestamp: new Date().toISOString()
    });
});

// Static: ไฟล์สลิปโอนเงิน / QR Code ที่อัปโหลด
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes Integration - API v1
app.use('/api/v1/applicants', applicantRoutes);
app.use('/api/v1/print', printRoutes);
app.use('/api/v1/enrollments', enrollmentsRoutes);
app.use('/api/v1/study-groups', studyGroupsRoutes);
app.use('/api/v1/study-group-subjects', studyGroupSubjectsRoutes);
app.use('/api/v1/subjects', subjectsRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/academic-majors', academicMajorsRoutes);
app.use('/api/v1/academic-minors', academicMinorsRoutes);
app.use('/api/v1/payment-methods', paymentMethodsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/admin', adminRoutes);

// Routes Integration - Standard /api prefixes (backward compatibility)
app.use('/api/applicants', applicantRoutes);
app.use('/api/print', printRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/academic-majors', academicMajorsRoutes);
app.use('/api/academic-minors', academicMinorsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/study-groups', studyGroupsRoutes);
app.use('/api/study-group-subjects', studyGroupSubjectsRoutes);
app.use('/api/public', publicRoutes); // Public Portal: open groups, postal lookup, upload slip, applications, status check
app.use('/api/enrollments', enrollmentsRoutes); // Registrar/Finance: enrollment list, walk-in, confirm payment, cancel
app.use('/api/payment-methods', paymentMethodsRoutes); // Finance: bank account CRUD + QR upload
app.use('/api/admin', adminRoutes); // Admin: user management, credentials, audit logs
app.use('/api', adminRoutes); // Alias for direct /api/users & /api/audit-logs
app.use('/api', masterDataRoutes); // รองรับ /api/prefixes, /api/positions, /api/sub-positions,
// /api/curriculums, /api/academic-levels, /api/subject-types,
// /api/locations, /api/time-slots

// Centralized Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Server is running on http://localhost:${PORT}`);
});
