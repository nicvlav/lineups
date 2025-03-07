import { Dialog, DialogPanel, DialogTitle, TransitionChild, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Background Overlay */}
                <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm" />

                {/* Modal Container */}
                <div className="fixed inset-0 flex items-center justify-center">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        {/* Modal Panel */}
                        <DialogPanel className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl bg-gray-900 rounded-2xl text-white shadow-xl 
                            max-h-[90vh] overflow-hidden flex flex-col">
                            
                            {/* Header */}
                            <div className="flex justify-between items-center p-2">
                                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                                <button onClick={onClose} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content Area (Scrollable) */}
                            <div className="flex-1 overflow-y-auto ">
                                {children}
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default Modal;
