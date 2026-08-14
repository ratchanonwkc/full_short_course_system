import multer from 'multer';
import { supabase } from '../config/supabase.js';

/**
 * supabaseUpload.middleware.js
 * ─────────────────────────────────────────────────────────────────────────
 * Replaces disk-based multer storage. Files are held in memory only,
 * then streamed straight to the Supabase Storage bucket "slips".
 * Only the resulting public URL is ever persisted to the DB.
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ PDF เท่านั้น'));
};

export const uploadSlipMemory = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const BUCKET = 'slips';

/**
 * Uploads a buffer to the Supabase Storage "slips" bucket and returns its public URL.
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimetype
 * @param {string} prefix - e.g. 'slip' or 'qr'
 */
export const uploadToSupabaseStorage = async (buffer, originalName, mimetype, prefix = 'slip') => {
    const ext = originalName.split('.').pop().toLowerCase();
    const filename = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, { contentType: mimetype, upsert: false });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return publicUrlData.publicUrl;
};
