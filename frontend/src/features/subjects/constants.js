// ตัวเลือก "ช่วงระยะเวลาเรียน" (รหัสตัวที่ 6 ของ subject_code) - ค่าคงที่ตามระเบียบ
export const DURATION_GROUPS = [
    { value: "1", label: "1 – 30 ชั่วโมง" },
    { value: "2", label: "31 – 60 ชั่วโมง" },
    { value: "3", label: "61 – 90 ชั่วโมง" },
    { value: "4", label: "91 – 120 ชั่วโมง" },
    { value: "5", label: "121 – 150 ชั่วโมง" },
    { value: "6", label: "151 – 180 ชั่วโมง" },
    { value: "7", label: "181 – 210 ชั่วโมง" },
    { value: "8", label: "211 – 240 ชั่วโมง" },
    { value: "9", label: "ตั้งแต่ 240 ชั่วโมงขึ้นไป" },
];

// อนุมานช่วงระยะเวลาเรียนอัตโนมัติจากจำนวนชั่วโมงรวม (ใช้เป็นค่าเริ่มต้นให้ผู้ใช้ แก้ไขเองได้)
export function suggestDurationGroup(totalHours) {
    const hours = Number(totalHours) || 0;
    if (hours <= 0) return "";
    if (hours <= 30) return "1";
    if (hours <= 60) return "2";
    if (hours <= 90) return "3";
    if (hours <= 120) return "4";
    if (hours <= 150) return "5";
    if (hours <= 180) return "6";
    if (hours <= 210) return "7";
    if (hours <= 240) return "8";
    return "9";
}
