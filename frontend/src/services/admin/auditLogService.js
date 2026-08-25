import axiosInstance from '../../config/axiosInstance';

const STORAGE_KEY = 'sys_audit_logs_v1';

// Seed realistic institutional audit log entries across all departments
const INITIAL_LOGS = [
    {
        id: 'log-1001',
        timestamp: '2026-08-24T13:20:45.000Z',
        actor: {
            id: 'usr-004',
            name: 'นภาพร บริหารการเงิน',
            email: 'finance@institution.ac.th',
            role: 'finance'
        },
        action_type: 'PAYMENT_APPROVED',
        category: 'finance',
        target_entity: 'Enrollment #APP-2026-0891',
        description: 'อนุมัติการชำระเงินค่าลงทะเบียนเรียน หลักสูตรการพัฒนา AI Application ยอดเงิน 4,500.00 บาท',
        ip_address: '192.168.1.104',
        user_agent: 'Chrome 128.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            applicant_id: 'APP-2026-0891',
            applicant_name: 'นายกิตติศักดิ์ มั่นคง',
            course_name: 'การพัฒนา AI Application ระดับมืออาชีพ',
            amount: 4500.00,
            payment_method: 'QR PromptPay',
            slip_ref: 'SLIP-20260824-9812'
        },
        changes: {
            before: {
                payment_status: 'PENDING_VERIFICATION',
                verified_by: null,
                verified_at: null
            },
            after: {
                payment_status: 'PAID',
                verified_by: 'นภาพร บริหารการเงิน',
                verified_at: '2026-08-24T13:20:45.000Z'
            }
        }
    },
    {
        id: 'log-1002',
        timestamp: '2026-08-24T11:45:12.000Z',
        actor: {
            id: 'usr-002',
            name: 'สมศรี พัฒนาหลักสูตร',
            email: 'planning@institution.ac.th',
            role: 'planning'
        },
        action_type: 'STUDY_GROUP_REASSIGNED',
        category: 'academic',
        target_entity: 'StudyGroup #GRP-6701',
        description: 'ปรับเปลี่ยนห้องเรียนและอาจารย์ผู้สอนประจำกลุ่มเรียน GRP-6701',
        ip_address: '192.168.1.88',
        user_agent: 'Firefox 130.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            group_code: 'GRP-6701',
            course_code: 'CS-101',
            batch: 'รุ่นที่ 1/2569'
        },
        changes: {
            before: {
                room: 'Lab 301',
                teacher_id: 'TCH-005 (อ.สมศักดิ์)',
                max_seats: 30
            },
            after: {
                room: 'Lab 405 (ห้องคอมพิวเตอร์ใหญ่)',
                teacher_id: 'TCH-008 (ผศ.ดร.วิภาดา)',
                max_seats: 45
            }
        }
    },
    {
        id: 'log-1003',
        timestamp: '2026-08-24T10:15:00.000Z',
        actor: {
            id: 'usr-001',
            name: 'ผู้ดูแลระบบสูงสุด',
            email: 'admin@institution.ac.th',
            role: 'admin'
        },
        action_type: 'USER_CREATED',
        category: 'security',
        target_entity: 'User #usr-005',
        description: 'สร้างบัญชีผู้ใช้งานใหม่ในระบบ กำหนดสิทธิ์เป็นฝ่ายการเงิน (Finance)',
        ip_address: '10.0.0.15',
        user_agent: 'Chrome 128.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            created_user_email: 'anucha.fin@institution.ac.th',
            created_user_name: 'อนุชา ธุรการการเงิน',
            assigned_role: 'finance'
        },
        changes: {
            before: null,
            after: {
                id: 'usr-005',
                name: 'อนุชา ธุรการการเงิน',
                email: 'anucha.fin@institution.ac.th',
                role: 'finance',
                is_active: true
            }
        }
    },
    {
        id: 'log-1004',
        timestamp: '2026-08-24T09:30:20.000Z',
        actor: {
            id: 'usr-003',
            name: 'วิชัย ทะเบียนการศึกษา',
            email: 'registrar@institution.ac.th',
            role: 'registrar'
        },
        action_type: 'APPLICANT_UPDATED',
        category: 'registrar',
        target_entity: 'Applicant #APP-2026-0740',
        description: 'แก้ไขข้อมูลผู้สมัครเรียน และปรับสถานะการตรวจสอบเอกสารเป็น ผ่านการตรวจสอบ',
        ip_address: '192.168.1.55',
        user_agent: 'Edge 127.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            applicant_id: 'APP-2026-0740',
            applicant_name: 'นางสาวพิมลดา รัตนกุล',
            document_type: 'สำเนาบัตรประชาชน'
        },
        changes: {
            before: {
                doc_status: 'PENDING_DOC',
                phone: '081-111-xxxx'
            },
            after: {
                doc_status: 'DOC_VERIFIED',
                phone: '089-999-8877'
            }
        }
    },
    {
        id: 'log-1005',
        timestamp: '2026-08-23T16:10:00.000Z',
        actor: {
            id: 'usr-001',
            name: 'ผู้ดูแลระบบสูงสุด',
            email: 'admin@institution.ac.th',
            role: 'admin'
        },
        action_type: 'PASSWORD_RESET',
        category: 'security',
        target_entity: 'User #usr-002',
        description: 'รีเซ็ตรหัสผ่านให้กับผู้ใช้งาน สมศรี พัฒนาหลักสูตร (ฝ่ายแผน)',
        ip_address: '10.0.0.15',
        user_agent: 'Chrome 128.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            target_user_id: 'usr-002',
            requested_by: 'admin'
        },
        changes: {
            before: { password_hash: '[REDACTED_HASH_OLD]' },
            after: { password_hash: '[REDACTED_HASH_NEW]' }
        }
    },
    {
        id: 'log-1006',
        timestamp: '2026-08-23T14:05:30.000Z',
        actor: {
            id: 'usr-004',
            name: 'นภาพร บริหารการเงิน',
            email: 'finance@institution.ac.th',
            role: 'finance'
        },
        action_type: 'PAYMENT_REJECTED',
        category: 'finance',
        target_entity: 'Enrollment #APP-2026-0689',
        description: 'ปฏิเสธหลักฐานการโอนเงิน เนื่องจากยอดเงินไม่ตรงกับค่าธรรมเนียมหลักสูตร',
        ip_address: '192.168.1.104',
        user_agent: 'Chrome 128.0 (Windows NT 10.0)',
        status: 'WARNING',
        metadata: {
            applicant_id: 'APP-2026-0689',
            reason: 'ยอดโอนในสลิป 3,000 บาท ขาดอีก 1,500 บาท',
            required_amount: 4500.00,
            actual_amount: 3000.00
        },
        changes: {
            before: { payment_status: 'PENDING_VERIFICATION' },
            after: { payment_status: 'PAYMENT_REJECTED', reject_reason: 'ยอดเงินไม่ครบถ้วน' }
        }
    },
    {
        id: 'log-1007',
        timestamp: '2026-08-22T08:40:15.000Z',
        actor: {
            id: 'usr-002',
            name: 'สมศรี พัฒนาหลักสูตร',
            email: 'planning@institution.ac.th',
            role: 'planning'
        },
        action_type: 'BATCH_CREATED',
        category: 'academic',
        target_entity: 'Batch #BATCH-2569-02',
        description: 'เปิดรุ่นการเรียนใหม่: ภาคเรียนฤดูร้อน ประจำปีการศึกษา 2569',
        ip_address: '192.168.1.88',
        user_agent: 'Firefox 130.0 (Windows NT 10.0)',
        status: 'SUCCESS',
        metadata: {
            batch_code: 'BATCH-2569-02',
            title: 'รุ่นการเรียนพิเศษ ภาคเรียนฤดูร้อน 2569',
            registration_start: '2026-09-01',
            registration_end: '2026-09-30'
        },
        changes: {
            before: null,
            after: {
                batch_id: 'BATCH-2569-02',
                status: 'OPEN_FOR_REGISTRATION',
                capacity: 250
            }
        }
    }
];

const getStoredLogs = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOGS));
            return INITIAL_LOGS;
        }
        return JSON.parse(raw);
    } catch {
        return INITIAL_LOGS;
    }
};

export const auditLogService = {
    // 1. Get all logs
    getLogs: async () => {
        let rawLogs = [];
        try {
            const { data } = await axiosInstance.get('/audit-logs');
            rawLogs = Array.isArray(data) ? data : data?.logs || [];
        } catch {
            rawLogs = getStoredLogs();
        }

        return rawLogs.map((log) => {
            const time = log.created_at || log.timestamp || new Date().toISOString();
            const actorObj = log.actor || null;

            return {
                ...log,
                created_at: time,
                timestamp: time,
                actor: actorObj
                    ? {
                          id: actorObj.id,
                          name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                          full_name: actorObj.full_name || actorObj.name || 'ผู้ใช้งานระบบ',
                          email: actorObj.email || '',
                          role: actorObj.role || 'staff',
                      }
                    : null,
            };
        });
    },

    // 2. Add log entry (for local event triggering)
    recordLog: async (entry) => {
        try {
            await axiosInstance.post('/audit-logs', entry);
        } catch {
            const current = getStoredLogs();
            const newLog = {
                id: `log-${Date.now()}`,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                ...entry
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify([newLog, ...current]));
        }
    }
};

export default auditLogService;
