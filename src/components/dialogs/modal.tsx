"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="overflow-x-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative rounded-xl shadow-lg max-w-md w-full "
        >
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              {title}
            </DialogTitle>
          </DialogHeader >
          <div className="overflow-y-auto">{children}</div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
