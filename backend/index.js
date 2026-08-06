import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import teacherRoutes from './src/features/teachers/teachers.routes.js';
import masterDataRoutes from './src/features/master-data/masterData.routes.js';
import batchRoutes from './src/features/batches/batches.routes.js';
import academicMajorsRoutes from './src/features/academic-majors/academicMajors.routes.js';
import academicMinorsRoutes from './src/features/academic-minors/academicMinors.routes.js';
import subjectsRoutes from './src/features/subjects/subjects.routes.js';
import authRoutes from './src/features/auth/auth.routes.js';
import studyGroupsRoutes from './src/features/study-groups/studyGroups.routes.js';
import studyGroupSubjectsRoutes from './src/features/study-group-subjects/studyGroupSubjects.routes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes Integration
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/academic-majors', academicMajorsRoutes);
app.use('/api/academic-minors', academicMinorsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/study-groups', studyGroupsRoutes);
app.use('/api/study-group-subjects', studyGroupSubjectsRoutes);
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