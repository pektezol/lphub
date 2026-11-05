import { classNames } from "@css/utils";
import React from "react";

import dialogStyles from "@css/Dialog.module.css";

interface MessageDialogProps {
  title: string;
  subtitle: string;
  onClose: () => void;
}

const MessageDialog: React.FC<MessageDialogProps> = ({ title, subtitle, onClose }) => {
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
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default MessageDialog;
