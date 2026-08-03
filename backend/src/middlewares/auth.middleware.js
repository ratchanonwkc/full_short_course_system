import { getUserFromToken } from '../features/auth/auth.service.js';

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
        }

        const token = authHeader.split(' ')[1];
        const user = await getUserFromToken(token);
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ message: 'Unauthorized: Invalid session' });
    }
};
