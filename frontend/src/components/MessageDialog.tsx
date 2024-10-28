import React from 'react';

import "../css/Dialog.css"

interface MessageDialogProps {
    title: string;
    subtitle: string;
    onClose: () => void;
};

const MessageDialog: React.FC<MessageDialogProps> = ({ title, subtitle, onClose }) => {
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
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}

export default MessageDialog;
