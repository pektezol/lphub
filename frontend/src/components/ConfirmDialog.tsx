import React from "react";

import "@css/Dialog.css";

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
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
