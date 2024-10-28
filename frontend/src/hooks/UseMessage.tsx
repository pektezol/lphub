import React, { useState } from 'react';
import MessageDialog from "../components/MessageDialog";

const useMessage = () => {
    const [isOpen, setIsOpen] = useState(false);
	const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

    const [title, setTitle] = useState<string>("");
    const [subtitle, setSubtitle] = useState<string>("");

    const message = (title: string, subtitle: string) => {
        setIsOpen(true);
        setTitle(title);
        setSubtitle(subtitle);
		return new Promise((resolve) => {
			setResolvePromise(() => resolve);
		});
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const MessageDialogComponent = isOpen && (
        <MessageDialog title={title} subtitle={subtitle} onClose={handleClose}></MessageDialog>
    );

    return { message, MessageDialogComponent };
}

export default useMessage;
