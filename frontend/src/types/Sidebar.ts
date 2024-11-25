import { BookIcon, FlagIcon, HelpIcon, HomeIcon, LogoIcon, PortalIcon, SearchIcon, UploadIcon } from '@images/Images';

export interface Button {
	img: string;
	text: string;
	url: string;
}

export interface Buttons {
	top: Button[];
	bottom: Button[];
}
