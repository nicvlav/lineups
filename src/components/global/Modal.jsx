import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        // Prevent scrolling on body when modal is open
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Simple modal structure with overlaying backdrop
    return ReactDOM.createPortal(
        <div className="modal-container">
            <div className="modal-backdrop" onClick={onClose}></div>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>

            <style jsx="true">{`
                .modal-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }
                
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 10000;
                }
                
                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid #eee;
                }
                
                .modal-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    border-radius: 50%;
                }
                
                .modal-close:hover {
                    background-color: #f5f5f5;
                }
                
                .modal-body {
                    padding: 20px;
                    overflow-y: auto;
                    max-height: calc(90vh - 70px);
                }
                
                @media (prefers-color-scheme: dark) {
                    .modal-content {
                        background: #1f2937;
                        color: white;
                    }
                    
                    .modal-header {
                        border-bottom-color: #374151;
                    }
                    
                    .modal-close:hover {
                        background-color: #374151;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default Modal;