import React from "react";

interface ConfirmDialogProps {
  title: string;
  subtitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  subtitle,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed w-[200%] h-full bg-black bg-opacity-50 z-[4]">
      <div className="fixed z-[4] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-surface rounded-3xl overflow-hidden min-w-[350px] border border-border animate-[dialog_in_0.2s_cubic-bezier(0.075,0.82,0.165,1.1)] text-foreground font-[--font-barlow-semicondensed-regular]">
        <div className="p-2 text-2xl bg-mantle">
          <span>{title}</span>
        </div>
        <div className="p-2">
          <span>{subtitle}</span>
        </div>
        <div className="p-2 flex justify-end border-t-2 border-border bg-mantle">
          <button className="mr-2 px-4 py-2 bg-muted text-foreground rounded hover:bg-overlay1 transition-colors" onClick={onCancel}>Cancel</button>
          <button className="px-4 py-2 bg-primary text-background rounded hover:bg-mauve transition-colors" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
