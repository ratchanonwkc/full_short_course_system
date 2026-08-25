import { useState, useEffect, useMemo, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    Users,
    UserPlus,
    Search,
    Filter,
    Shield,
    ShieldCheck,
    CalendarCheck,
    ClipboardCheck,
    WalletCards,
    Edit3,
    Trash2,
    KeyRound,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    X,
    RotateCcw,
    Sparkles,
    UserCheck,
    UserX,
    Lock
} from 'lucide-react';
import Swal from 'sweetalert2';
import userService from '../../services/admin/userService';
import { useAuth } from '../../features/auth/context/AuthContext';

// Role configurations with colors, labels and icons
export const ROLE_CONFIG = {
    admin: {
        label: 'ผู้ดูแลระบบ (Admin)',
        shortLabel: 'Admin',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
        icon: ShieldCheck,
        description: 'สิทธิ์เข้าถึงและควบคุมทุกส่วนของระบบ รวมถึงจัดการผู้ใช้งาน'
    },
    planning: {
        label: 'ฝ่ายแผนงาน (Planning)',
        shortLabel: 'Planning',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        icon: CalendarCheck,
        description: 'จัดการโครงสร้างหลักสูตร รายวิชา รุ่นการเรียน และอาจารย์ผู้สอน'
    },
    registrar: {
        label: 'ฝ่ายทะเบียน (Registrar)',
        shortLabel: 'Registrar',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        icon: ClipboardCheck,
        description: 'ตรวจสอบรายชื่อผู้สมัคร อนุมัติการลงทะเบียน และออกเอกสาร'
    },
    finance: {
        label: 'ฝ่ายการเงิน (Finance)',
        shortLabel: 'Finance',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
        icon: WalletCards,
        description: 'ตรวจสอบสลิปการโอนเงิน อนุมัติยอดชำระ และตั้งค่าบัญชีรับเงิน'
    }
};

export default function UserManagementPage() {
    const { user: currentLoggedInUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Modals
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [targetResetUser, setTargetResetUser] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'registrar',
        is_active: true
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Password Reset field
    const [newPassword, setNewPassword] = useState('');
    const [resetPasswordError, setResetPasswordError] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);

    // Fetch users
    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้',
                confirmButtonColor: '#0270c7'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Computed summary stats
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => u.is_active).length;
        const byRole = {
            admin: users.filter((u) => u.role === 'admin').length,
            planning: users.filter((u) => u.role === 'planning').length,
            registrar: users.filter((u) => u.role === 'registrar').length,
            finance: users.filter((u) => u.role === 'finance').length
        };
        return { total, active, byRole };
    }, [users]);

    // Filtered users list
    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return users.filter((u) => {
            const nameMatch = u.name?.toLowerCase().includes(query);
            const emailMatch = u.email?.toLowerCase().includes(query);
            const matchesSearch = !query || nameMatch || emailMatch;

            const matchesRole = selectedRole === 'all' || u.role === selectedRole;
            const matchesStatus =
                selectedStatus === 'all' ||
                (selectedStatus === 'active' && u.is_active) ||
                (selectedStatus === 'inactive' && !u.is_active);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchTerm, selectedRole, selectedStatus]);

    // Open create modal
    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'registrar',
            is_active: true
        });
        setFormErrors({});
        setShowPassword(false);
        setIsFormModalOpen(true);
    };

    // Open edit modal
    const handleOpenEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'registrar',
            is_active: user.is_active ?? true
        });
        setFormErrors({});
        setShowPassword(false);
        setIsFormModalOpen(true);
    };

    // Open reset password modal
    const handleOpenResetPassword = (user) => {
        setTargetResetUser(user);
        setNewPassword('');
        setResetPasswordError('');
        setShowResetPassword(false);
        setIsResetPasswordModalOpen(true);
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'กรุณาระบุชื่อ-นามสกุล';
        if (!formData.email.trim()) errors.email = 'กรุณาระบุอีเมล';
        else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
            errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
        }

        if (!editingUser) {
            if (!formData.password) errors.password = 'กรุณากำหนดรหัสผ่านเริ่มต้น';
            else if (formData.password.length < 6) errors.password = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        } else if (formData.password && formData.password.length < 6) {
            errors.password = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit form (Create / Edit)
    const handleSubmitUser = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            if (editingUser) {
                const payload = {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    role: formData.role,
                    is_active: formData.is_active
                };
                if (formData.password) payload.password = formData.password;

                await userService.updateUser(editingUser.id, payload);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'แก้ไขข้อมูลผู้ใช้สำเร็จ',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true
                });
            } else {
                await userService.createUser({
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    role: formData.role,
                    is_active: formData.is_active
                });
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'สร้างผู้ใช้งานใหม่สำเร็จ',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true
                });
            }

            setIsFormModalOpen(false);
            loadUsers();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'บันทึกไม่สำเร็จ',
                text: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                confirmButtonColor: '#0270c7'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Reset Password submit
    const handleSubmitResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            setResetPasswordError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setIsSubmitting(true);
        try {
            await userService.resetPassword(targetResetUser.id, newPassword);
            setIsResetPasswordModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'เปลี่ยนรหัสผ่านเรียบร้อย',
                text: `รหัสผ่านสำหรับ ${targetResetUser.name} ได้รับการอัปเดตแล้ว`,
                confirmButtonColor: '#0270c7'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
                text: error.message || 'กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#0270c7'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle active status
    const handleToggleStatus = async (user) => {
        const nextStatus = !user.is_active;
        const actionText = nextStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';

        const result = await Swal.fire({
            title: `ยืนยัน${actionText}?`,
            text: `ต้องการ${actionText}บัญชีของ ${user.name} (${user.email}) ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `ยืนยัน${actionText}`,
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: nextStatus ? '#0270c7' : '#ef4444',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await userService.toggleStatus(user.id, nextStatus);
                setUsers((prev) =>
                    prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
                );
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `${actionText}เรียบร้อยแล้ว`,
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: error.message || 'ไม่สามารถเปลี่ยนสถานะได้',
                    confirmButtonColor: '#0270c7'
                });
            }
        }
    };

    // Delete user
    const handleDeleteUser = async (user) => {
        if (user.id === currentLoggedInUser?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่สามารถลบบัญชีตัวเองได้',
                text: 'คุณกำลังเข้าสู่ระบบด้วยบัญชีนี้อยู่ ไม่สามารถลบได้',
                confirmButtonColor: '#0270c7'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการลบผู้ใช้?',
            html: `ต้องการลบบัญชี <b>${user.name}</b> (${user.email}) ออกจากระบบหรือไม่?<br/><span class="text-xs text-red-500">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await userService.deleteUser(user.id);
                setUsers((prev) => prev.filter((u) => u.id !== user.id));
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'ลบข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'ลบไม่สำเร็จ',
                    text: error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน',
                    confirmButtonColor: '#0270c7'
                });
            }
        }
    };

    // Format display date
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '-';
        }
    };

    return (
        <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
            {/* 🏷️ Header Section */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                            <Users size={22} strokeWidth={2.2} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                จัดการผู้ใช้งานระบบ (User Management)
                            </h1>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                กำหนดสิทธิ์บทบาทหน้าที่ (Roles) การเข้าถึงส่วนงาน และสถานะบัญชีเจ้าหน้าที่
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadUsers}
                        title="รีเฟรชข้อมูล"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
                    >
                        <RotateCcw size={17} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]"
                    >
                        <UserPlus size={18} />
                        เพิ่มผู้ใช้งานใหม่
                    </button>
                </div>
            </div>

            {/* 📊 Summary Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">ผู้ใช้งานทั้งหมด</p>
                    <div className="mt-1 flex items-baseline justify-between">
                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        <span className="text-xs text-emerald-600 font-medium">{stats.active} ใช้งานอยู่</span>
                    </div>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                        <ShieldCheck size={14} /> Admin
                    </div>
                    <p className="mt-1 text-2xl font-bold text-purple-900">{stats.byRole.admin}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                        <CalendarCheck size={14} /> Planning
                    </div>
                    <p className="mt-1 text-2xl font-bold text-amber-900">{stats.byRole.planning}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <ClipboardCheck size={14} /> Registrar
                    </div>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.byRole.registrar}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        <WalletCards size={14} /> Finance
                    </div>
                    <p className="mt-1 text-2xl font-bold text-blue-900">{stats.byRole.finance}</p>
                </div>
            </div>

            {/* 🔍 Filter & Search Bar */}
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาด้วยชื่อ-นามสกุล หรืออีเมล..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                        <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">ทุกบทบาท (Roles)</option>
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                            <option value="planning">ฝ่ายแผนงาน (Planning)</option>
                            <option value="registrar">ฝ่ายทะเบียน (Registrar)</option>
                            <option value="finance">ฝ่ายการเงิน (Finance)</option>
                        </select>
                    </div>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="active">เปิดใช้งาน (Active)</option>
                        <option value="inactive">ระงับการใช้งาน (Inactive)</option>
                    </select>
                </div>
            </div>

            {/* 📋 Data Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-700">
                            <tr>
                                <th scope="col" className="px-5 py-3.5">ผู้ใช้งาน</th>
                                <th scope="col" className="px-4 py-3.5">อีเมล</th>
                                <th scope="col" className="px-4 py-3.5">บทบาท (Role)</th>
                                <th scope="col" className="px-4 py-3.5 text-center">สถานะ</th>
                                <th scope="col" className="px-4 py-3.5">วันที่สร้าง</th>
                                <th scope="col" className="px-5 py-3.5 text-right">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400">
                                        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                        กำลังโหลดข้อมูลผู้ใช้งาน...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-400">
                                        <Users size={36} className="mx-auto mb-2 opacity-40" />
                                        ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const roleConf = ROLE_CONFIG[user.role] || {
                                        label: user.role,
                                        shortLabel: user.role,
                                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20',
                                        icon: Shield
                                    };
                                    const RoleIcon = roleConf.icon;
                                    const isSelf = currentLoggedInUser?.email === user.email;

                                    return (
                                        <tr key={user.id} className="transition hover:bg-slate-50/70">
                                            {/* Name & Avatar */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200">
                                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                                            <span>{user.name}</span>
                                                            {isSelf && (
                                                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                                                    บัญชีคุณ
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">ID: {user.id}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-4 py-4 font-mono text-xs text-slate-600">
                                                {user.email}
                                            </td>

                                            {/* Role Badge */}
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 ${roleConf.badgeClass}`}
                                                >
                                                    <RoleIcon size={13} />
                                                    {roleConf.shortLabel}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                                                        user.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                    }`}
                                                    title="คลิกเพื่อเปลี่ยนสถานะ"
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                                        }`}
                                                    />
                                                    {user.is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                                                </button>
                                            </td>

                                            {/* Created Date */}
                                            <td className="px-4 py-4 text-xs text-slate-500">
                                                {formatDate(user.created_at)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenResetPassword(user)}
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                                                        title="เปลี่ยนรหัสผ่าน"
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(user)}
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                                        title="แก้ไขข้อมูล"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={isSelf}
                                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={isSelf ? 'ไม่สามารถลบบัญชีปัจจุบันได้' : 'ลบผู้ใช้'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
                    <span>แสดง {filteredUsers.length} จาก {users.length} รายการ</span>
                    <span className="font-medium text-slate-600">ระบบบริหารจัดการสิทธิ์ผู้ใช้งาน</span>
                </div>
            </div>

            {/* 📝 Create / Edit User Modal */}
            <Transition appear show={isFormModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsFormModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/70" />
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
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                                {editingUser ? <Edit3 size={18} /> : <UserPlus size={18} />}
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-base font-bold text-slate-900">
                                                    {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}
                                                </Dialog.Title>
                                                <p className="text-xs text-slate-500">
                                                    {editingUser ? `แก้ไขบัญชี ${editingUser.name}` : 'กำหนดข้อมูลบัญชีและบทบาทการเข้าถึง'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsFormModalOpen(false)}
                                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmitUser} className="mt-5 space-y-4" noValidate>
                                        {/* Name */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                ชื่อ - นามสกุล <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="เช่น ดร.สมชาย ใจดี"
                                                className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                                                    formErrors.name ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
                                                }`}
                                            />
                                            {formErrors.name && (
                                                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                อีเมลเข้าสู่ระบบ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="staff@institution.ac.th"
                                                className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                                                    formErrors.email ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
                                                }`}
                                            />
                                            {formErrors.email && (
                                                <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
                                            )}
                                        </div>

                                        {/* Password (Required for create, optional for edit) */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                {editingUser ? 'รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)' : 'รหัสผ่านเริ่มต้น *'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder={editingUser ? '••••••••' : 'กำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร'}
                                                    className={`w-full rounded-lg border py-2 pl-3 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                                                        formErrors.password ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {formErrors.password && (
                                                <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
                                            )}
                                        </div>

                                        {/* Role Selection */}
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                บทบาทหน้าที่ (Role Permission) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                                                    const Icon = config.icon;
                                                    const isSelected = formData.role === key;
                                                    return (
                                                        <div
                                                            key={key}
                                                            onClick={() => setFormData({ ...formData, role: key })}
                                                            className={`cursor-pointer rounded-xl border p-3 transition ${
                                                                isSelected
                                                                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                                                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                                                        }`}
                                                                    >
                                                                        <Icon size={15} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-900">
                                                                        {config.shortLabel}
                                                                    </span>
                                                                </div>
                                                                {isSelected && (
                                                                    <CheckCircle2 size={16} className="text-blue-600" />
                                                                )}
                                                            </div>
                                                            <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                                                                {config.description}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Active Status Switch */}
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">สถานะการใช้งานบัญชี</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {formData.is_active
                                                        ? 'ผู้ใช้สามารถเข้าสู่ระบบและปฏิบัติงานได้ปกติ'
                                                        : 'ระงับการเข้าสู่ระบบชั่วคราว'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    formData.is_active ? 'bg-blue-600' : 'bg-slate-300'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        formData.is_active ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Modal Footer */}
                                        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsFormModalOpen(false)}
                                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <RotateCcw size={14} className="animate-spin" /> กำลังบันทึก...
                                                    </>
                                                ) : editingUser ? (
                                                    'บันทึกการแก้ไข'
                                                ) : (
                                                    'สร้างผู้ใช้งาน'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* 🔑 Reset Password Modal */}
            <Transition appear show={isResetPasswordModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsResetPasswordModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950/70" />
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                                <KeyRound size={17} />
                                            </div>
                                            <Dialog.Title className="text-base font-bold text-slate-900">
                                                เปลี่ยนรหัสผ่านผู้ใช้งาน
                                            </Dialog.Title>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsResetPasswordModalOpen(false)}
                                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                        <p className="font-semibold text-slate-800">{targetResetUser?.name}</p>
                                        <p className="text-slate-500 font-mono">{targetResetUser?.email}</p>
                                    </div>

                                    <form onSubmit={handleSubmitResetPassword} className="mt-4 space-y-4">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                รหัสผ่านใหม่ <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showResetPassword ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e) => {
                                                        setNewPassword(e.target.value);
                                                        setResetPasswordError('');
                                                    }}
                                                    placeholder="กำหนดรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                                                    className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowResetPassword(!showResetPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    tabIndex={-1}
                                                >
                                                    {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            {resetPasswordError && (
                                                <p className="mt-1 text-xs text-red-500">{resetPasswordError}</p>
                                            )}
                                        </div>

                                        <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsResetPasswordModalOpen(false)}
                                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
