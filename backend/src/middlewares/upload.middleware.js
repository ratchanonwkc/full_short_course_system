import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/slips');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const unique = `slip_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
    },
});

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'application/pdf',
]);

const fileFilter = (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|webp|pdf/i;
    const ext = (path.extname(file.originalname || '') || '').replace('.', '').toLowerCase();
    const isExtAllowed = allowedExt.test(ext);
    const isMimeAllowed = !file.mimetype || ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase());

    if (isExtAllowed && isMimeAllowed) {
        cb(null, true);
    } else {
        cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ PDF เท่านั้น'));
    }
};

export const uploadSlip = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// helper: แปลง path บนดิสก์ -> URL สาธารณะที่ frontend เรียกได้ (ผ่าน express.static('/uploads'))
export const toPublicSlipUrl = (filename) => `/uploads/slips/${filename}`;
