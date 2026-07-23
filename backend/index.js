import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import teacherRoutes from './src/features/teachers/teachers.routes.js';
import masterDataRoutes from './src/features/master-data/masterData.routes.js';
import batchRoutes from './src/features/batches/batches.routes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes Integration
app.use('/api/teachers', teacherRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api', masterDataRoutes); // รองรับ /api/prefixes, /api/positions, /api/sub-positions

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