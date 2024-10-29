import React from 'react';

import "../css/Dialog.css"

interface MessageDialogLoadProps {
    title: string;    
	onClose: () => void;
};

const MessageDialogLoad: React.FC<MessageDialogLoadProps> = ({ title, onClose }) => {
    return (
        <div className='dimmer'>
            <div className='dialog'>
                <div className='dialog-element dialog-header'>
                    <span>{title}</span>
                </div>
                <div className='dialog-element dialog-description'>
					<div style={{display: "flex", justifyContent: "center"}}>
                    	<span className="loader"></span>
					</div>
                </div>
                <div className='dialog-element dialog-btns-container'>
                </div>
            </div>
        </div>
    )
}

export default MessageDialogLoad;
