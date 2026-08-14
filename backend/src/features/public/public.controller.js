import {
    getOpenStudyGroupsService,
    getStudyGroupDetailService,
    lookupPostalCodeService,
    getActivePaymentMethodsService,
    createOnlineApplicationService,
    getStatusByCitizenIdService,
} from './public.service.js';
import { toPublicSlipUrl } from '../../middlewares/upload.middleware.js';

export const getOpenStudyGroups = async (req, res, next) => {
    try {
        const { search, major_id } = req.query;
        const groups = await getOpenStudyGroupsService({ search, majorId: major_id });
        res.json(groups);
    } catch (error) {
        next(error);
    }
};

export const getStudyGroupDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const group = await getStudyGroupDetailService(id);
        res.json(group);
    } catch (error) {
        next(error);
    }
};

export const lookupPostalCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        const results = lookupPostalCodeService(code);
        res.json(results);
    } catch (error) {
        next(error);
    }
};

export const getActivePaymentMethods = async (req, res, next) => {
    try {
        const methods = await getActivePaymentMethodsService();
        res.json(methods);
    } catch (error) {
        next(error);
    }
};

export const uploadSlipFile = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์สลิป' });
        res.status(201).json({ slip_url: toPublicSlipUrl(req.file.filename) });
    } catch (error) {
        next(error);
    }
};

export const createOnlineApplication = async (req, res, next) => {
    try {
        const { applicant, study_group_id, slip_url } = req.body;
        if (!applicant?.citizen_id || applicant.citizen_id.length !== 13) {
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)' });
        }
        if (!study_group_id) {
            return res.status(400).json({ message: 'กรุณาเลือกวิชาที่ต้องการสมัคร' });
        }
        const result = await createOnlineApplicationService({ applicant, study_group_id, slip_url });
        res.status(201).json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === '23505') {
            return res.status(400).json({ message: 'เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ' });
        }
        next(error);
    }
};

export const getStatusByCitizenId = async (req, res, next) => {
    try {
        const { citizen_id } = req.params;
        if (!citizen_id || citizen_id.length !== 13) {
            return res.status(400).json({ message: 'กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก' });
        }
        const result = await getStatusByCitizenIdService(citizen_id);
        if (!result) return res.status(404).json({ message: 'ไม่พบข้อมูลการสมัครของเลขประจำตัวประชาชนนี้' });
        res.json(result);
    } catch (error) {
        next(error);
    }
};
