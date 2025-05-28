// Panel.tsx
import { motion } from "framer-motion";

interface PanelProps {
  children: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ children }) => {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex-1 min-h-0 flex flex-col shadow-lg overflow-hidden"
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Panel;
