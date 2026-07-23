import { useNavigate } from "react-router-dom";
import LoginFormModal from "../components/LoginFormModal";

export default function LoginPage() {
    const navigate = useNavigate();

    const handleClose = () => {
        // เมื่อปิดหน้าต่าง Login ให้พากลับไปหน้าแรก
        navigate("/");
    };

    const handleLoginSuccess = () => {
        // เมื่อเข้าสู่ระบบสำเร็จ ให้พาไปหน้าจัดการรุ่นการเรียน
        navigate("/batches");
    };

    return (
        <LoginFormModal
            isOpen={true}
            onClose={handleClose}
            onLoginSuccess={handleLoginSuccess}
        />
    );
}
