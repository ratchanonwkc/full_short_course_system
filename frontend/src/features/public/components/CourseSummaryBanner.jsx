import { BookOpen, Clock, Users, Wallet, MapPin } from "lucide-react";

/**
 * CourseSummaryBanner
 * -------------------------------------------------------------------------
 * Read-only summary of the course/study group the applicant already picked
 * on the Home page. Registration no longer has a "choose course" step —
 * this banner is shown at the top of Step 1 instead.
 *
 * Props:
 * - group: mapped study group object (from getStudyGroupDetail), shape per
 *   public.service.js#mapGroup -> { group_code, group_name, batch_id,
 *   total_hours, schedule_description, location_name, fee, is_free,
 *   remaining_seats, max_seats }
 */
export default function CourseSummaryBanner({ group }) {
    if (!group) return null;

    return (
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm sm:p-6">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-500">
                <BookOpen size={13} /> วิชาที่ท่านเลือกสมัครเรียน
            </p>
            <h2 className="text-lg font-black text-[#00204E] sm:text-xl">{group.group_name}</h2>
            <p className="mt-0.5 font-mono text-xs font-semibold text-blue-500">รหัสกลุ่มเรียน: {group.group_code}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <InfoItem icon={Clock} label="กำหนดการเรียน">
                    {group.schedule_description || `${group.total_hours} ชั่วโมง`}
                </InfoItem>
                <InfoItem icon={MapPin} label="สถานที่เรียน">
                    {group.location_name || "-"}
                </InfoItem>
                <InfoItem icon={Users} label="ที่นั่งคงเหลือ">
                    {group.remaining_seats <= 0 ? (
                        <span className="font-bold text-red-500">เต็ม</span>
                    ) : (
                        `${group.remaining_seats} / ${group.max_seats} ที่นั่ง`
                    )}
                </InfoItem>
                <InfoItem icon={Wallet} label="ค่าใช้จ่าย">
                    {group.is_free ? (
                        <span className="font-bold text-emerald-600">ไม่มีค่าใช้จ่าย</span>
                    ) : (
                        <span className="font-bold text-blue-700">{group.fee.toLocaleString()} บาท</span>
                    )}
                </InfoItem>
            </div>
        </section>
    );
}

function InfoItem({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                <Icon size={13} />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400">{label}</p>
                <p className="truncate font-medium text-slate-700">{children}</p>
            </div>
        </div>
    );
}