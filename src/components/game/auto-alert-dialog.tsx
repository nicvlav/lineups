import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface AutoAlertDialogProps {
    triggerLabel?: string; // If empty or null, the button won't render
    messageText?: string; // If empty or null, the button won't render
    isOpen: boolean;
    setIsOpen: (shouldBeOpen: boolean) => void;
    onCancel: () => void;
    onSuccess: () => void;
}
const AutoAlertDialog: React.FC<AutoAlertDialogProps> = ({
    triggerLabel,
    messageText,
    isOpen,
    setIsOpen,
    onCancel,
    onSuccess,
}) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            {/* Conditionally render the trigger button */}
            {triggerLabel && (
                <AlertDialogTrigger asChild>
                    <Button variant="outline" onClick={() => setIsOpen(true)}>
                        {triggerLabel}
                    </Button>
                </AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    {messageText && (
                        <AlertDialogDescription asChild>
                            <span>{messageText}</span>
                        </AlertDialogDescription>
                    )}
                    <AlertDialogDescription></AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onSuccess}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AutoAlertDialog;
