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
 * → ส่งผลให้ query data ทุกจุดโดน RLS block แล้ว return [] ว่าง
 *
 * วิธีแก้: สร้าง client แยกตัว (authClient) สำหรับ auth โดยเฉพาะ
 * เพื่อไม่ให้กระทบ client ตัวหลักที่ใช้ query data
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
    const name = supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 supabaseUser.email.split('@')[0];
    const role = supabaseUser.user_metadata?.role || "เจ้าหน้าที่ทะเบียน";

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
    // getUser ใช้ supabase ตัวหลักได้ เพราะแค่ verify token ไม่ได้เปลี่ยน auth state
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
        throw new Error('Invalid or expired token');
    }

    const name = supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 supabaseUser.email.split('@')[0];
    const role = supabaseUser.user_metadata?.role || "เจ้าหน้าที่ทะเบียน";

    return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name,
        role
    };
};

export const logoutService = async () => {
    // signOut ใช้ authClient แยก เพื่อไม่กระทบ supabase ตัวหลัก
    const { error } = await authClient.auth.signOut();
    if (error) throw error;
    return true;
};
