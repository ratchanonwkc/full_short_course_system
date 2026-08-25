import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * authClient — Supabase client สำหรับ auth operations โดยเฉพาะ
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  ห้ามใช้ `supabase` ตัวหลัก (service_role) สำหรับ signInWithPassword / signOut
 * เพราะ signIn จะเปลี่ยน auth state ภายใน client จาก service_role → user session
 * และ signOut จะ clear session ทำให้ client กลายเป็น anon role
 *
 * วิธีแก้: สร้าง client แยกตัว (authClient) สำหรับ auth โดยเฉพาะ
 */
const authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const loginService = async (email, password) => {
    const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    const { user: supabaseUser, session } = data;

    // 1. ดึงข้อมูล Profile & Role จากตาราง public.users (แหล่งข้อมูลหลักของระบบ)
    const { data: profile } = await supabase
        .from('users')
        .select('id, full_name, role, status')
        .eq('id', supabaseUser.id)
        .maybeSingle();

    // หากบัญชีถูกปิดการใช้งาน ให้ปฏิเสธการเข้าสู่ระบบ
    if (profile && profile.status === 'inactive') {
        throw new Error('บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ');
    }

    const name = profile?.full_name || 
                 supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 supabaseUser.email.split('@')[0];

    const role = profile?.role || 
                 supabaseUser.user_metadata?.role || 
                 "registrar";

    return {
        user: {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name,
            role
        },
        token: session.access_token
    };
};

export const getUserFromToken = async (token) => {
    // verify token
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
        throw new Error('Invalid or expired token');
    }

    // ดึงข้อมูล Profile & Role ล่าสุดจากตาราง public.users
    const { data: profile } = await supabase
        .from('users')
        .select('id, full_name, role, status')
        .eq('id', supabaseUser.id)
        .maybeSingle();

    if (profile && profile.status === 'inactive') {
        throw new Error('บัญชีนี้ถูกระงับการใช้งานชั่วคราว');
    }

    const name = profile?.full_name || 
                 supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 supabaseUser.email.split('@')[0];

    const role = profile?.role || 
                 supabaseUser.user_metadata?.role || 
                 "registrar";

    return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name,
        role
    };
};

export const logoutService = async () => {
    const { error } = await authClient.auth.signOut();
    if (error) throw error;
    return true;
};
