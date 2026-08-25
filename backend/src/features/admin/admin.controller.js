import * as adminService from './admin.service.js';

export const listUsers = async (req, res, next) => {
    try {
        const users = await adminService.listUsersService();
        res.json(users);
    } catch (err) {
        next(err);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const user = await adminService.createUserService(req.body, req.user);
        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const user = await adminService.updateUserService(req.params.id, req.body, req.user);
        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const result = await adminService.resetUserPasswordService(req.params.id, req.body.password, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const result = await adminService.deleteUserService(req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const toggleStatus = async (req, res, next) => {
    try {
        const user = await adminService.toggleUserStatusService(req.params.id, req.body.is_active, req.user);
        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const getAuditLogs = async (req, res, next) => {
    try {
        const logs = await adminService.getAuditLogsService();
        res.json(logs);
    } catch (err) {
        next(err);
    }
};
