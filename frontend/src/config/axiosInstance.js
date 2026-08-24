import axios from "axios";
import Swal from "sweetalert2";

/**
 * axiosInstance
 * ─────────────────────────────────────────────────────────────────────────
 * Centralized Axios client for the whole frontend app.
 *
 * - baseURL มาจาก VITE_API_BASE_URL (.env) พร้อม fallback สำหรับ local dev
 * - ตั้ง Content-Type เป็น application/json ให้อัตโนมัติ
 * - มี Response Interceptor กลาง:
 *      - Error 500+ (Server Error)  -> แสดง Swal alert กลางให้ผู้ใช้ทราบทันที
 *      - Network Error / ไม่มีการตอบกลับ (server ล่ม/ไม่มีเน็ต) -> แสดง Swal เตือนเช่นกัน
 *      - Error อื่น ๆ (400/404/409 ฯลฯ) ปล่อยผ่านให้ตัว caller (component)
 *        เป็นผู้จัดการ เพราะแต่ละหน้าต้องการข้อความ/พฤติกรรมที่ต่างกัน
 *        (เช่น 400 ข้อมูลซ้ำ, 409 ลบไม่ได้เพราะมี FK ผูกอยู่)
 */

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        if (!error.response) {
            // Network error, timeout, CORS block, หรือ server ไม่ตอบสนองเลย
            Swal.fire({
                icon: "error",
                title: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
                text: "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือลองใหม่อีกครั้งในภายหลัง",
                confirmButtonColor: "#0270c7",
            });
        } else if (status >= 500) {
            // Internal Server Error / Bad Gateway ฯลฯ
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์",
                text: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง",
                confirmButtonColor: "#0270c7",
            });
        }

        // ส่ง error ต่อให้ .catch() ของ component เดิม เพื่อจัดการ UX เฉพาะจุด (เช่น 400, 409)
        return Promise.reject(error);
    }
);

export default axiosInstance;