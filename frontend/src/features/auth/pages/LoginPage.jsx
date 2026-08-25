import { useNavigate, useLocation } from "react-router-dom";
import LoginFormModal from "../components/LoginFormModal";
import { useAuth } from "../context/AuthContext";
import { getRoleHomePath } from "../../../components/auth/ProtectedRoute";

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const handleClose = () => {
        // เมื่อปิดหน้าต่าง Login ให้พากลับไปหน้าแรก
        navigate("/");
    };

    const handleLoginSuccess = (userData) => {
        const currentUser = userData || user;
        // หากมีหน้าที่ผู้ใช้พยายามเข้าก่อนหน้า ให้พาไปหน้านั้น หรือพาไปยังหน้าหลักตามบทบาท
        const from = location.state?.from?.pathname;
        const targetPath = from || getRoleHomePath(currentUser?.role);
        navigate(targetPath, { replace: true });
    };

    return (
        <LoginFormModal
            isOpen={true}
            onClose={handleClose}
            onLoginSuccess={handleLoginSuccess}
        />
    );
}
