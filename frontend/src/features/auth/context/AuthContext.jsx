import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

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

    const mapUserFromSession = (currentSession) => {
        if (!currentSession || !currentSession.user) {
            return null;
        }
        const { user: supabaseUser } = currentSession;
        // ดึงชื่อจาก metadata หรือใช้ส่วนแรกของอีเมลเป็นค่าเริ่มต้น
        const name = supabaseUser.user_metadata?.full_name || 
                     supabaseUser.user_metadata?.name || 
                     supabaseUser.email.split('@')[0];
        // ดึงบทบาทจาก metadata หรือใช้ค่าเริ่มต้น "เจ้าหน้าที่ทะเบียน"
        const role = supabaseUser.user_metadata?.role || "เจ้าหน้าที่ทะเบียน";

        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name,
            role,
            token: currentSession.access_token
        };
    };

    useEffect(() => {
        // ดึงข้อมูล session ปัจจุบันเมื่อโหลดแอปครั้งแรก
        const initializeAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                setUser(mapUserFromSession(currentSession));
            } catch (err) {
                console.error('Error getting initial session:', err);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // สมัครรับข้อมูลการเปลี่ยนแปลงของเซสชัน (Sign in, Sign out, Token refreshed)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
            setUser(mapUserFromSession(currentSession));
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // ฟังก์ชันเข้าสู่ระบบด้วย Email + Password
    const loginWithEmail = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    };

    // ฟังก์ชันออกจากระบบ
    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
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
