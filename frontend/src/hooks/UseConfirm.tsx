import React from "react";
import ConfirmDialog from "@components/ConfirmDialog";

const useConfirm = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState<string>("");
  const [subtitle, setSubtitle] = React.useState<string>("");
  const [resolvePromise, setResolvePromise] = React.useState<((value: boolean) => void) | null>(null);

  const confirm = ( titleN: string, subtitleN: string ) => {
    setIsOpen(true);
    setTitle(titleN);
    setSubtitle(subtitleN);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
    }
  };

  const ConfirmDialogComponent = isOpen && (
    <ConfirmDialog title={title} subtitle={subtitle} onConfirm={handleConfirm} onCancel={handleCancel}></ConfirmDialog>
  );

  return { confirm, ConfirmDialogComponent };
};

export default useConfirm;
