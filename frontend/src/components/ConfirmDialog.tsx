import { classNames } from "@css/utils";
import React from "react";

import dialogStyles from "@css/Dialog.module.css";

interface ConfirmDialogProps {
    title: string;
    subtitle: string;
    onConfirm: () => void;
    onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, subtitle, onConfirm, onCancel }) => {
  return (
    <div className={dialogStyles.dimmer}>
      <div className={dialogStyles.dialog}>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogHeader)}>
          <span>{title}</span>
        </div>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogDescription)}>
          <span>{subtitle}</span>
        </div>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogBtnsContainer)}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
