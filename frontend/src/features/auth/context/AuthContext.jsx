import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../../../config/axiosInstance';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    loginWithEmail: async () => {},
    logout: async () => {}
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                // Fetch user info using the token (attached by axios interceptor)
                const { data } = await axiosInstance.get('/auth/me');
                setUser(data.user);
                setSession({ access_token: token });
            } catch (err) {
                console.error('Error verifying token:', err);
                localStorage.removeItem('token');
                setUser(null);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // ฟังก์ชันเข้าสู่ระบบด้วย Email + Password
    const loginWithEmail = async (email, password) => {
        try {
            const { data } = await axiosInstance.post('/auth/login', {
                email: email ? String(email).trim().toLowerCase() : '',
                password
            });

            const { user: userData, token } = data;
            
            localStorage.setItem('token', token);
            setUser(userData);
            setSession({ access_token: token });

            return data;
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            throw new Error(msg);
        }
    };

    // ฟังก์ชันออกจากระบบ
    const logout = async () => {
        try {
            await axiosInstance.post('/auth/logout');
        } catch (err) {
            console.error('Error calling logout API:', err);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            setSession(null);
        }
    };

    const value = {
        user,
        session,
        loading,
        loginWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
