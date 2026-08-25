import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as adminController from './admin.controller.js';

const router = Router();

// Middleware: Verify caller has Admin role
const requireAdmin = (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'ผู้ดูแลระบบ') {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
};

// User Management Endpoints
router.get('/users', requireAuth, requireAdmin, adminController.listUsers);
router.post('/users', requireAuth, requireAdmin, adminController.createUser);
router.put('/users/:id', requireAuth, requireAdmin, adminController.updateUser);
router.post('/users/:id/reset-password', requireAuth, requireAdmin, adminController.resetPassword);
router.delete('/users/:id', requireAuth, requireAdmin, adminController.deleteUser);
router.patch('/users/:id/status', requireAuth, requireAdmin, adminController.toggleStatus);

// Audit Logs Endpoints
router.get('/audit-logs', requireAuth, requireAdmin, adminController.getAuditLogs);

export default router;
