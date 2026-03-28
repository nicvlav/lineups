import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
            <div className="text-center space-y-2">
                <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
                <p className="text-xl text-muted-foreground">Page not found</p>
            </div>
            <Button asChild variant="outline">
                <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </div>
    );
};

export default NotFound;
