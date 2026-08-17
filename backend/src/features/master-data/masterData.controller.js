import { supabase } from '../../config/supabase.js';

// Map ประเภท Master Data เข้ากับชื่อตารางใน Supabase
// เพิ่ม curriculums / academic-levels / subject-types เข้ามาใช้ endpoint generic ชุดเดียวกับ
// prefixes / positions / sub-positions เดิม เพราะเป็น Lookup Table รูปแบบเดียวกัน (id + ชื่อ)
const TABLE_MAP = {
    prefixes: { name: 'prefixes', primaryKey: 'short_name' },
    positions: { name: 'positions', primaryKey: 'position_name' },
    'sub-positions': { name: 'sub_positions', primaryKey: 'sub_position_name' },
    curriculums: { name: 'curriculums', primaryKey: 'curriculum_name' },
    'academic-levels': { name: 'academic_levels', primaryKey: 'level_name' },
    'subject-types': { name: 'subject_types', primaryKey: 'name_th' },
    // ── FIX: previously missing, caused 400 on GET /api/locations & /api/time-slots ──
    locations: { name: 'locations', primaryKey: 'name' },
    'time-slots': { name: 'time_slots', primaryKey: 'time_code' },
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
        // ดักจับกรณีชื่อซ้ำ (Unique Violation) เช่น curriculum_name / level_name ซ้ำกัน
        if (error.code === '23505') {
            return res.status(400).json({ message: 'ชื่อรายการนี้มีอยู่แล้วในระบบ' });
        }
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
        if (error.code === '23505') {
            return res.status(400).json({ message: 'ชื่อรายการนี้มีอยู่แล้วในระบบ' });
        }
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
            // เช่น curriculum/level นี้ถูกใช้งานอยู่ในตาราง subjects แล้ว
            if (error.code === '23503') {
                return res.status(409).json({
                    message: 'ไม่สามารถลบได้เนื่องจากมีข้อมูลอ้างอิงรายการนี้อยู่'
                });
            }
            throw error;
        }

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
};
