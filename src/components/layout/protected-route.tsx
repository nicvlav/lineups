import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";

/**
 * Gates routes behind auth + vote permission.
 *
 * On direct URL navigation (e.g. /vote), the auth provider resolves
 * loading → false and sets `user` with a profile, but the `canVote`
 * useEffect hasn't fired yet on that first render. Without a guard,
 * ProtectedRoute would see canVote=false and redirect to "/" before
 * permissions settle. Returning null for one frame avoids the flash.
 */
const ProtectedRoute = () => {
    const { user, canVote, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (!user) {
        return <Navigate to="/auth/sign-in" replace />;
    }

    // Profile loaded but canVote effect hasn't fired yet — wait one frame
    if (!canVote && user.profile?.is_verified) {
        return null;
    }

    if (!canVote) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
