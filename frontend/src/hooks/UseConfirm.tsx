import React, { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const useConfirm = () => {
    const [isOpen, setIsOpen] = useState(false);
	const [title, setTitle] = useState<string>("");
	const [subtitle, setSubtitle] = useState<string>("");
    const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

    const confirm = ( titleN: string, subtitleN: string ) => {
        setIsOpen(true);
		setTitle(titleN);
		setSubtitle(subtitleN);
        return new Promise((resolve) => {
            setResolvePromise(() => resolve);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolvePromise) {
            resolvePromise(true);
        }
    }

    const handleCancel = () => {
        setIsOpen(false);
        if (resolvePromise) {
            resolvePromise(false);
        }
    }

    const ConfirmDialogComponent = isOpen && (
        <ConfirmDialog title={title} subtitle={subtitle} onConfirm={handleConfirm} onCancel={handleCancel}></ConfirmDialog>
    );

    return { confirm, ConfirmDialogComponent };
}

export default useConfirm;
