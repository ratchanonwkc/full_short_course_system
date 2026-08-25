import { useState, useEffect, useMemo, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    Activity,
    Search,
    Filter,
    Calendar,
    ShieldCheck,
    CalendarCheck,
    ClipboardCheck,
    WalletCards,
    RotateCcw,
    X,
    Eye,
    Copy,
    Check,
    Laptop,
    Clock,
    FileText,
    Layers,
    AlertCircle,
    CheckCircle2,
    Server,
    UserCheck,
    Lock
} from 'lucide-react';
import Swal from 'sweetalert2';
import SummaryCard from '../../components/common/SummaryCard';
import auditLogService from '../../services/admin/auditLogService';

// Role configurations with colors, labels and icons
const ROLE_CONFIG = {
    admin: {
        shortLabel: 'Admin',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
        icon: ShieldCheck
    },
    planning: {
        shortLabel: 'Planning',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: CalendarCheck
    },
    registrar: {
        shortLabel: 'Registrar',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: ClipboardCheck
    },
    finance: {
        shortLabel: 'Finance',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: WalletCards
    },
    system: {
        shortLabel: 'System',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20',
        icon: Server
    }
};

// Action Type Badges & Descriptions
const ACTION_TYPE_MAP = {
    PAYMENT_APPROVED: {
        label: 'อนุมัติการชำระเงิน',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        category: 'finance'
    },
    PAYMENT_REJECTED: {
        label: 'ปฏิเสธการชำระเงิน',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        category: 'finance'
    },
    STUDY_GROUP_REASSIGNED: {
        label: 'ปรับกลุ่มเรียน/ห้องเรียน',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        category: 'planning'
    },
    STUDY_GROUP_CREATED: {
        label: 'สร้างกลุ่มเรียนใหม่',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        category: 'planning'
    },
    STUDY_GROUP_UPDATED: {
        label: 'แก้ไขข้อมูลกลุ่มเรียน',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        category: 'planning'
    },
    STUDY_GROUP_DELETED: {
        label: 'ลบกลุ่มเรียน',
        badge: 'bg-red-100 text-red-800 border-red-200',
        category: 'planning'
    },
    BATCH_CREATED: {
        label: 'เปิดรุ่นการเรียนใหม่',
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        category: 'planning'
    },
    BATCH_UPDATED: {
        label: 'แก้ไขรุ่นการเรียน',
        badge: 'bg-sky-100 text-sky-800 border-sky-200',
        category: 'planning'
    },
    BATCH_DELETED: {
        label: 'ลบรุ่นการเรียน',
        badge: 'bg-red-100 text-red-800 border-red-200',
        category: 'planning'
    },
    USER_CREATED: {
        label: 'สร้างผู้ใช้งานใหม่',
        badge: 'bg-purple-100 text-purple-800 border-purple-200',
        category: 'admin'
    },
    USER_UPDATED: {
        label: 'แก้ไขข้อมูลผู้ใช้',
        badge: 'bg-slate-100 text-slate-800 border-slate-200',
        category: 'admin'
    },
    USER_DELETED: {
        label: 'ลบบัญชีผู้ใช้งาน',
        badge: 'bg-red-100 text-red-800 border-red-200',
        category: 'admin'
    },
    USER_STATUS_TOGGLED: {
        label: 'เปลี่ยนสถานะผู้ใช้',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        category: 'admin'
    },
    PASSWORD_RESET: {
        label: 'รีเซ็ตรหัสผ่าน',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        category: 'admin'
    },
    APPLICANT_UPDATED: {
        label: 'อัปเดตข้อมูลผู้สมัคร',
        badge: 'bg-teal-100 text-teal-800 border-teal-200',
        category: 'registrar'
    },
    ENROLLMENT_CREATED: {
        label: 'ลงทะเบียนผู้สมัครใหม่',
        badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        category: 'registrar'
    },
    ENROLLMENT_CANCELLED: {
        label: 'ยกเลิกการลงทะเบียน',
        badge: 'bg-red-100 text-red-800 border-red-200',
        category: 'registrar'
    }
};

/**
 * Format Thai Buddhist Date and Time (e.g. 24 ส.ค. 2569 14:30 น.)
 */
const formatThaiDateTime = (isoString) => {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '-';

        const formatter = new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const formatted = formatter.format(d);
        return formatted.endsWith('น.') ? formatted : `${formatted} น.`;
    } catch {
        return '-';
    }
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedDateRange, setSelectedDateRange] = useState('all');

    // Detail Modal
    const [selectedLog, setSelectedLog] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    // Load logs
    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await auditLogService.getLogs();
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถโหลดประวัติการปฏิบัติงานได้',
                confirmButtonColor: '#0270c7'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Computed Stats for Summary Cards
    const stats = useMemo(() => {
        const total = logs.length;
        const financeCount = logs.filter((l) => l.category === 'finance' || l.actor?.role === 'finance').length;
        const planningCount = logs.filter((l) => l.category === 'academic' || l.actor?.role === 'planning').length;
        const securityCount = logs.filter((l) => l.category === 'security' || l.actor?.role === 'admin').length;
        return { total, financeCount, planningCount, securityCount };
    }, [logs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const now = new Date();

        return logs.filter((log) => {
            const actorName = (log.actor?.full_name || log.actor?.name || 'ระบบ (System)').toLowerCase();
            const actorEmail = (log.actor?.email || '').toLowerCase();
            const target = (log.target_entity || '').toLowerCase();
            const desc = (log.description || '').toLowerCase();
            const ip = (log.ip_address || '').toLowerCase();
            const action = (log.action_type || '').toLowerCase();

            // Search Query match
            const matchesQuery =
                !query ||
                actorName.includes(query) ||
                actorEmail.includes(query) ||
                target.includes(query) ||
                desc.includes(query) ||
                ip.includes(query) ||
                action.includes(query);

            // Role match
            const logRole = log.actor?.role || (log.actor ? 'staff' : 'system');
            const matchesRole = selectedRole === 'all' || logRole === selectedRole;

            // Action Type match
            const matchesAction = selectedAction === 'all' || log.action_type === selectedAction;

            // Date Range match
            let matchesDate = true;
            if (selectedDateRange !== 'all') {
                const rawDate = log.created_at || log.timestamp;
                if (rawDate) {
                    const logDate = new Date(rawDate);
                    const diffTime = Math.abs(now - logDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (selectedDateRange === 'today') {
                        matchesDate = logDate.toDateString() === now.toDateString();
                    } else if (selectedDateRange === '7days') {
                        matchesDate = diffDays <= 7;
                    } else if (selectedDateRange === '30days') {
                        matchesDate = diffDays <= 30;
                    }
                }
            }

            return matchesQuery && matchesRole && matchesAction && matchesDate;
        });
    }, [logs, searchTerm, selectedRole, selectedAction, selectedDateRange]);

    // Open detail modal
    const handleViewDetail = (log) => {
        setSelectedLog(log);
        setIsDetailModalOpen(true);
        setCopiedKey(false);
    };

    // Copy JSON metadata
    const handleCopyJSON = () => {
        if (!selectedLog) return;
        const text = JSON.stringify(selectedLog, null, 2);
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    return (
        <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
            {/* 🏷️ Header Section */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                        <Activity size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            บันทึกการปฏิบัติงานระบบ (Audit Logs)
                        </h1>
                        <p className="text-xs text-slate-500 sm:text-sm">
                            ตรวจสอบประวัติการทำรายการ การอนุมัติ และกิจกรรมสำคัญของเจ้าหน้าที่ทุกแผนก
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadLogs}
                        title="รีเฟรชบันทึก"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                    >
                        <RotateCcw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
                        รีเฟรชข้อมูล
                    </button>
                </div>
            </div>

            {/* 📊 Summary Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <SummaryCard
                    title="บันทึกทั้งหมด"
                    value={loading ? '-' : stats.total.toLocaleString()}
                    subtitle="รายการกิจกรรมในระบบ"
                    icon={Layers}
                    variant="navy"
                    loading={loading}
                />
                <SummaryCard
                    title="รายการฝ่ายการเงิน"
                    value={loading ? '-' : stats.financeCount.toLocaleString()}
                    subtitle="การอนุมัติ/ปฏิเสธสลิป"
                    icon={WalletCards}
                    variant="blue"
                    loading={loading}
                    onClick={() => setSelectedRole('finance')}
                />
                <SummaryCard
                    title="ฝ่ายแผน &amp; วิชาการ"
                    value={loading ? '-' : stats.planningCount.toLocaleString()}
                    subtitle="เปิดรุ่น/ปรับกลุ่มเรียน"
                    icon={CalendarCheck}
                    variant="amber"
                    loading={loading}
                    onClick={() => setSelectedRole('planning')}
                />
                <SummaryCard
                    title="ความปลอดภัย &amp; Admin"
                    value={loading ? '-' : stats.securityCount.toLocaleString()}
                    subtitle="สร้างผู้ใช้/รีเซ็ตรหัสผ่าน"
                    icon={ShieldCheck}
                    variant="purple"
                    loading={loading}
                    onClick={() => setSelectedRole('admin')}
                />
            </div>

            {/* 🔍 Filter & Search Bar */}
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาด้วยชื่อผู้ปฏิบัติงาน, รายละเอียด, เป้าหมาย หรือ IP Address..."
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-8 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Date Range */}
                    <div className="relative">
                        <Calendar size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedDateRange}
                            onChange={(e) => setSelectedDateRange(e.target.value)}
                            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">ทุกช่วงเวลา</option>
                            <option value="today">วันนี้</option>
                            <option value="7days">7 วันล่าสุด</option>
                            <option value="30days">30 วันล่าสุด</option>
                        </select>
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">ทุกบทบาท (Roles)</option>
                            <option value="admin">Admin</option>
                            <option value="planning">Planning</option>
                            <option value="registrar">Registrar</option>
                            <option value="finance">Finance</option>
                        </select>
                    </div>

                    {/* Action Type Filter */}
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">ทุกประเภทการกระทำ (Actions)</option>
                        <option value="PAYMENT_APPROVED">อนุมัติการชำระเงิน</option>
                        <option value="PAYMENT_REJECTED">ปฏิเสธการชำระเงิน</option>
                        <option value="STUDY_GROUP_REASSIGNED">ปรับกลุ่มเรียน/ห้องเรียน</option>
                        <option value="BATCH_CREATED">เปิดรุ่นการเรียนใหม่</option>
                        <option value="USER_CREATED">สร้างผู้ใช้งานใหม่</option>
                        <option value="USER_UPDATED">แก้ไขข้อมูลผู้ใช้</option>
                        <option value="PASSWORD_RESET">รีเซ็ตรหัสผ่าน</option>
                        <option value="APPLICANT_UPDATED">อัปเดตข้อมูลผู้สมัคร</option>
                    </select>
                </div>
            </div>

            {/* 📋 Audit Logs Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-700">
                            <tr>
                                <th scope="col" className="px-5 py-3.5">วันและเวลา</th>
                                <th scope="col" className="px-4 py-3.5">ผู้ปฏิบัติงาน (Actor)</th>
                                <th scope="col" className="px-4 py-3.5">ประเภทการกระทำ</th>
                                <th scope="col" className="px-4 py-3.5">เป้าหมาย / รายละเอียด</th>
                                <th scope="col" className="px-4 py-3.5">IP Address &amp; อุปกรณ์</th>
                                <th scope="col" className="px-5 py-3.5 text-right">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400">
                                        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                        กำลังโหลดบันทึกการปฏิบัติงาน...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400">
                                        <FileText size={36} className="mx-auto mb-2 opacity-40" />
                                        ไม่พบประวัติการทำรายการที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const actor = log.actor;
                                    const isSystem = !actor || (!actor.full_name && !actor.name);
                                    const actorName = isSystem ? 'ระบบ (System)' : (actor.full_name || actor.name);
                                    const roleKey = isSystem ? 'system' : (actor.role || 'staff');

                                    const roleConf = ROLE_CONFIG[roleKey] || {
                                        shortLabel: roleKey,
                                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                                        icon: UserCheck
                                    };
                                    const RoleIcon = roleConf.icon;

                                    const actionConf = ACTION_TYPE_MAP[log.action_type] || {
                                        label: log.action_type || 'กิจกรรมทั่วไป',
                                        badge: 'bg-slate-100 text-slate-700 border-slate-200'
                                    };

                                    const logTime = log.created_at || log.timestamp;

                                    return (
                                        <tr
                                            key={log.id}
                                            onClick={() => handleViewDetail(log)}
                                            className="cursor-pointer transition hover:bg-blue-50/40"
                                        >
                                            {/* Timestamp (Thai Buddhist locale) */}
                                            <td className="whitespace-nowrap px-5 py-4 text-xs font-mono text-slate-600">
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                                    <Clock size={13} className="text-slate-400" />
                                                    {formatThaiDateTime(logTime)}
                                                </div>
                                            </td>

                                            {/* Actor with Fallback to ระบบ (System) */}
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                                        {actorName}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleConf.badgeClass}`}
                                                        >
                                                            <RoleIcon size={11} />
                                                            {roleConf.shortLabel}
                                                        </span>
                                                        {actor?.email && (
                                                            <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                                                {actor.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Action Type */}
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${actionConf.badge}`}
                                                >
                                                    {actionConf.label}
                                                </span>
                                                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                                                    {log.action_type}
                                                </p>
                                            </td>

                                            {/* Target & Description */}
                                            <td className="px-4 py-4 max-w-xs">
                                                <p className="font-semibold text-xs text-slate-800 truncate" title={log.target_entity}>
                                                    {log.target_entity || '-'}
                                                </p>
                                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={log.description}>
                                                    {log.description || '-'}
                                                </p>
                                            </td>

                                            {/* IP Address & Device */}
                                            <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    {log.ip_address || '127.0.0.1'}
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Laptop size={11} />
                                                    <span className="truncate max-w-[140px]">{log.user_agent || 'Web Client'}</span>
                                                </div>
                                            </td>

                                            {/* Action */}
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetail(log);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-blue-600"
                                                >
                                                    <Eye size={13} />
                                                    ดูบันทึก
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
                    <span>แสดง {filteredLogs.length} จาก {logs.length} บันทึก</span>
                    <span className="font-semibold text-slate-600">Audit Logging &amp; Compliance System</span>
                </div>
            </div>

            {/* 🔍 Detail & Diff Modal */}
            <Transition appear show={isDetailModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsDetailModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                                    {/* Header */}
                                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                    รายละเอียดบันทึกการปฏิบัติงาน
                                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                                                        {selectedLog?.id}
                                                    </span>
                                                </Dialog.Title>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {formatThaiDateTime(selectedLog?.created_at || selectedLog?.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Content Body */}
                                    {selectedLog && (
                                        <div className="mt-5 space-y-4 text-xs">
                                            {/* Overview Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                                                <div>
                                                    <span className="text-slate-400 text-[11px]">ผู้ปฏิบัติงาน (Actor):</span>
                                                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                                                        {selectedLog.actor?.full_name || selectedLog.actor?.name || 'ระบบ (System)'}
                                                    </p>
                                                    <p className="text-slate-500 font-mono text-[11px]">
                                                        {selectedLog.actor?.email || 'ระบบอัตโนมัติ / System Service'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 text-[11px]">การกระทำ &amp; เป้าหมาย:</span>
                                                    <div className="mt-0.5">
                                                        <span className="inline-block font-mono font-bold text-blue-600">
                                                            {selectedLog.action_type}
                                                        </span>
                                                    </div>
                                                    <p className="font-semibold text-slate-800 mt-0.5">
                                                        {selectedLog.target_entity || '-'}
                                                    </p>
                                                </div>
                                                <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                                                    <span className="text-slate-400 text-[11px]">รายละเอียดคำอธิบาย:</span>
                                                    <p className="font-medium text-slate-800 mt-0.5 text-xs sm:text-sm">
                                                        {selectedLog.description}
                                                    </p>
                                                </div>
                                                <div className="sm:col-span-2 flex flex-wrap gap-4 text-[11px] text-slate-500 font-mono pt-1">
                                                    <span>IP: <strong className="text-slate-700">{selectedLog.ip_address || '127.0.0.1'}</strong></span>
                                                    <span>Device: <strong className="text-slate-700">{selectedLog.user_agent || 'Web Client'}</strong></span>
                                                </div>
                                            </div>

                                            {/* 🔄 Before vs After Diff Viewer */}
                                            {selectedLog.changes && (selectedLog.changes.before || selectedLog.changes.after) && (
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                                                        <Layers size={14} className="text-blue-600" />
                                                        ข้อมูลการเปลี่ยนแปลง (Changes Diff)
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Before */}
                                                        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                                                            <div className="flex items-center gap-1 text-rose-700 font-bold text-[11px] mb-1.5">
                                                                <AlertCircle size={13} />
                                                                ก่อนเปลี่ยนแปลง (Before)
                                                            </div>
                                                            <pre className="overflow-x-auto rounded bg-white p-2.5 font-mono text-[11px] text-slate-700 border border-rose-100 max-h-40">
                                                                {selectedLog.changes.before
                                                                    ? JSON.stringify(selectedLog.changes.before, null, 2)
                                                                    : '(ไม่มีข้อมูลเดิม / สร้างใหม่)'}
                                                            </pre>
                                                        </div>

                                                        {/* After */}
                                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                                                            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] mb-1.5">
                                                                <CheckCircle2 size={13} />
                                                                หลังเปลี่ยนแปลง (After)
                                                            </div>
                                                            <pre className="overflow-x-auto rounded bg-white p-2.5 font-mono text-[11px] text-slate-700 border border-emerald-100 max-h-40">
                                                                {selectedLog.changes.after
                                                                    ? JSON.stringify(selectedLog.changes.after, null, 2)
                                                                    : '(ลบข้อมูล)'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 📦 Raw Metadata Inspector */}
                                            {selectedLog.metadata && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                            <FileText size={14} className="text-slate-500" />
                                                            ข้อมูลพารามิเตอร์เพิ่มเติม (Metadata Payload)
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={handleCopyJSON}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                                                        >
                                                            {copiedKey ? (
                                                                <>
                                                                    <Check size={12} /> คัดลอกแล้ว!
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={12} /> คัดลอก JSON
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-400 max-h-44 leading-relaxed">
                                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsDetailModalOpen(false)}
                                            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                                        >
                                            ปิดหน้าต่าง
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
