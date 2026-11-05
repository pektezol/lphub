import { classNames } from "@css/utils";
import React from "react";

import dialogStyles from "@css/Dialog.module.css";
import appStyles from "../App.module.css";

interface MessageDialogLoadProps {
  title: string;
}

const MessageDialogLoad: React.FC<MessageDialogLoadProps> = ({ title }) => {
  return (
    <div className={dialogStyles.dimmer}>
      <div className={dialogStyles.dialog}>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogHeader)}>
          <span>{title}</span>
        </div>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogDescription)}>
          <div className={dialogStyles.centeredContent}>
            <span className={appStyles.loader}></span>
          </div>
        </div>
        <div className={classNames(dialogStyles.dialogElement, dialogStyles.dialogBtnsContainer)}></div>
      </div>
    </div>
  );
};

export default MessageDialogLoad;
