import {
	useRef,
	useEffect,
	useState,
	forwardRef,
	useImperativeHandle,
} from "react";

export type DialogHandle = {
	open: () => void;
	close: () => void;
	element: HTMLDialogElement | null;
};

type DialogProps = {
	isOpen?: boolean;
	onClose?: () => void;
	children: React.ReactNode;
};

const Dialog = forwardRef<DialogHandle, DialogProps>(
	({ isOpen = false, onClose, children }, forwardedRef) => {
		const dialogRef = useRef<HTMLDialogElement>(null);
		const [isActive, setIsActive] = useState(false);

		useImperativeHandle(
			forwardedRef,
			() => ({
				open: () => {
					setIsActive(true);
					dialogRef.current?.showModal();
				},
				close: () => {
					dialogRef.current?.close();
					setIsActive(false);
				},
				element: dialogRef.current,
			}),
			[]
		);

		useEffect(() => {
			if (isOpen) {
				setIsActive(true);
				dialogRef.current?.showModal();
			} else {
				dialogRef.current?.close();
			}
		}, [isOpen]);

		const handleClose = () => {
			onClose?.();
			setIsActive(false);
		};

		return (
			<dialog
				ref={dialogRef}
				className="p-10 bg-transparent w-full h-full top-0 left-0 rounded-lg shadow-lg backdrop:bg-black/50"
				onClose={handleClose}
			>
				{isActive && children}
			</dialog>
		);
	}
);

export default Dialog;

Dialog.displayName = "Dialog";
