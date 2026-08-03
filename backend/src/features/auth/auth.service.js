import { supabase } from '../../config/supabase.js';

export const loginService = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
};
