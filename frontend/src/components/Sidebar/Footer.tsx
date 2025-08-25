import React, { useRef } from "react";
import { Link } from "react-router-dom";

import styles from "./Sidebar.module.css";

import { UserProfile } from "@customTypes/Profile";
import Login from "@components/Login";

import {
    UploadIcon,
    BookIcon,
    HelpIcon,
} from "../../images/Images";

import links from "./Links";

interface FooterProps {
    profile?: UserProfile;
    isSearching: boolean;
    selectedButtonIndex: number;
    onUploadRun: () => void;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
    setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
    handle_sidebar_click: (clicked_sidebar_idx: number) => void;
};

const _Footer: React.FC<FooterProps> = ({ profile, isSearching, selectedButtonIndex, onUploadRun, setToken, setProfile, handle_sidebar_click }) => {
    const uploadRunRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="px-2 gap-2 flex flex-col mb-2">
            {profile && profile.profile && (
                <button
                    ref={uploadRunRef}
                    id="upload-run"
                    className={``}
                    onClick={() => onUploadRun()}
                >
                    <img src={UploadIcon} alt="Upload" className={``} />
                    {true && <span className="font-[--font-barlow-semicondensed-regular] truncate">Upload Record</span>}
                </button>
            )}

            {/* <div className={true ? 'min-w-0' : 'flex justify-center'}>
                <Login
                    setToken={setToken}
                    profile={profile}
                    setProfile={setProfile}
                    isOpen={true}
                />
            </div> */}

            {links.footer.map(({ to, icon, label }, i) => (
                <Link to={to} tabIndex={-1} key={i}>
                    <button
                        className={`${styles.button} ${selectedButtonIndex == links.content.length + i + 1 ? styles["button-selected"] : ""} ${isSearching ? styles["button-hidden"] : ""}`}
                        onClick={() => handle_sidebar_click(links.content.length + i + 1)}
                    >
                        <img src={icon} />
                        <span className="">
                            {label}
                        </span>
                    </button>
                </Link>
            ))}
        </div>
    );
}

export default _Footer;
