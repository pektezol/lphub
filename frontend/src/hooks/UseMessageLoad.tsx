import React, { useState } from "react";
import MessageDialogLoad from "@components/MessageDialogLoad";

const useMessageLoad = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState<string>("");
  const [resolvePromise, setResolvePromise] = useState<(() => void) | null>(
    null
  );

  const messageLoad = (title: string) => {
    setIsOpen(true);
    setTitle(title);
    return new Promise(resolve => {
      setResolvePromise(() => resolve);
    });
  };

  const messageLoadClose = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise();
      setResolvePromise(null);
    }
  };

  const MessageDialogLoadComponent = isOpen && (
    <div className="dialog-container">
      <MessageDialogLoad
        title={title}
        onClose={messageLoadClose}
      ></MessageDialogLoad>
    </div>
  );

  return { messageLoad, messageLoadClose, MessageDialogLoadComponent };
};

export default useMessageLoad;
