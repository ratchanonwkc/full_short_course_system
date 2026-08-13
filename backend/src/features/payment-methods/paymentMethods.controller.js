import { supabase } from '../../config/supabase.js';

export const getPaymentMethods = async (req, res, next) => {
    try {
        const { data, error } = await supabase.from('payment_methods').select('*').order('id', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const createPaymentMethod = async (req, res, next) => {
    try {
        const { id, updated_at, ...insertData } = req.body;
        const { data, error } = await supabase.from('payment_methods').insert([insertData]).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

export const updatePaymentMethod = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: _, updated_at, ...updateData } = req.body;
        const { data, error } = await supabase
            .from('payment_methods')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const deletePaymentMethod = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (error) {
            if (error.code === '23503') {
                return res.status(409).json({ message: 'ไม่สามารถลบได้เนื่องจากมีการใช้งานบัญชีนี้อยู่' });
            }
            throw error;
        }
        res.json({ message: 'ลบบัญชีธนาคารเรียบร้อยแล้ว' });
    } catch (error) {
        next(error);
    }
};
