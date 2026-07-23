import { supabase } from '../../config/supabase.js';

// Map ประเภท Master Data เข้ากับชื่อตารางใน Supabase
const TABLE_MAP = {
    prefixes: { name: 'prefixes', primaryKey: 'short_name' },
    positions: { name: 'positions', primaryKey: 'position_name' },
    'sub-positions': { name: 'sub_positions', primaryKey: 'sub_position_name' }
};

export const getMasterData = async (req, res, next) => {
    try {
        const { type } = req.params;
        const config = TABLE_MAP[type];
        if (!config) return res.status(400).json({ message: 'Invalid master data type' });

        const { data, error } = await supabase
            .from(config.name)
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const createMasterData = async (req, res, next) => {
    try {
        const { type } = req.params;
        const config = TABLE_MAP[type];
        if (!config) return res.status(400).json({ message: 'Invalid master data type' });

        const { data, error } = await supabase
            .from(config.name)
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

export const updateMasterData = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const config = TABLE_MAP[type];
        if (!config) return res.status(400).json({ message: 'Invalid master data type' });

        const { data, error } = await supabase
            .from(config.name)
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const deleteMasterData = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        const config = TABLE_MAP[type];
        if (!config) return res.status(400).json({ message: 'Invalid master data type' });

        const { error } = await supabase
            .from(config.name)
            .delete()
            .eq('id', id);

        if (error) {
            // ดัก Foreign Key Constraint Error (409 Conflict)
            if (error.code === '23503') {
                return res.status(409).json({
                    message: 'ไม่สามารถลบได้เนื่องจากมีข้อมูลอาจารย์ใช้งานรายการนี้อยู่'
                });
            }
            throw error;
        }

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
};