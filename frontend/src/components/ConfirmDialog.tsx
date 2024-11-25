import React from 'react';

import btn from "@css/Button.module.css"
import "@css/Dialog.css"

interface ConfirmDialogProps {
    title: string;
    subtitle: string;
    onConfirm: () => void;
    onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, subtitle, onConfirm, onCancel }) => {
    return (
        <div className='dimmer'>
            <div className='dialog'>
                <div className='dialog-element dialog-header'>
                    <span>{title}</span>
                </div>
                <div className='dialog-element dialog-description'>
                    <span>{subtitle}</span>
                </div>
                <div className='dialog-element dialog-btns-container'>
                    <button className={btn.default} onClick={onCancel}>Cancel</button>
                    <button className={`${btn.default} ${btn.error}`} onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    )
};

export default ConfirmDialog;
