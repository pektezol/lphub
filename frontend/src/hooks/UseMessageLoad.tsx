import React from "react";
import MessageDialogLoad from "@components/MessageDialogLoad";
import dialogStyles from "@css/Dialog.module.css";

const useMessageLoad = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState<string>("");
  const [resolvePromise, setResolvePromise] = React.useState<(() => void) | null>(null);

  const messageLoad = (title: string) => {
    setIsOpen(true);
    setTitle(title);
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const messageLoadUpdate = (title: string) => {
    setTitle(title);
  };

  const messageLoadClose = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise();
      setResolvePromise(null);
    }
  };

  const MessageDialogLoadComponent = isOpen && (
    <div className={dialogStyles.dialogContainer}>
      <MessageDialogLoad title={title}></MessageDialogLoad>
    </div>
  );

  return { messageLoad, messageLoadUpdate, messageLoadClose, MessageDialogLoadComponent };
};

export default useMessageLoad;
