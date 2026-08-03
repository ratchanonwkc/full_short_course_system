import { loginService, logoutService } from './auth.service.js';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const result = await loginService(email, password);
        return res.status(200).json(result);
    } catch (error) {
        // Handle invalid credentials specifically if possible
        if (error.status === 400 || error.message?.includes('Invalid login credentials')) {
            return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
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
