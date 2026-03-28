import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";

const ProtectedRoute = () => {
    const { user, canVote } = useAuth();

    if (!user) {
        return <Navigate to="/auth/sign-in" replace />;
    }

    if (!canVote) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
