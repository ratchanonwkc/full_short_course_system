import { loginService, logoutService } from './auth.service.js';

export const login = async (req, res, next) => {
    try {
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        const password = req.body.password;
        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }
        const result = await loginService(email, password);
        return res.status(200).json(result);
    } catch (error) {
        // Handle inactive user account
        if (error.status === 403 || error.message?.includes('ระงับการใช้งาน')) {
            return res.status(403).json({ message: error.message || 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' });
        }
        // Handle invalid credentials specifically (401 Unauthorized)
        if (
            error.status === 400 || 
            error.status === 401 || 
            error.code === 'invalid_credentials' || 
            error.message?.includes('Invalid login credentials')
        ) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        await logoutService();
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

export const me = async (req, res, next) => {
    try {
        // req.user will be populated by the auth middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.status(200).json({ user: req.user });
    } catch (error) {
        next(error);
    }
};
