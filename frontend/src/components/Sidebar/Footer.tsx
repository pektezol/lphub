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

interface FooterProps {
    profile?: UserProfile;
    onUploadRun: () => void;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
    setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
    sidebarButtonRefs: React.RefObject<(HTMLButtonElement | null)[]>;
    getButtonClasses: (buttonIndex: number) => string;
    handle_sidebar_click: (clicked_sidebar_idx: number) => void;
};

const Footer: React.FC<FooterProps> = ({ profile, onUploadRun, setToken, setProfile, sidebarButtonRefs, getButtonClasses, handle_sidebar_click }) => {
    const uploadRunRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="">
            {profile && profile.profile && (
                <button
                    ref={uploadRunRef}
                    id="upload-run"
                    className={getButtonClasses(-1)}
                    onClick={() => onUploadRun()}
                >
                    <img src={UploadIcon} alt="Upload" className={``} />
                    {true && <span className="font-[--font-barlow-semicondensed-regular] truncate">Upload Record</span>}
                </button>
            )}

            <div className={true ? 'min-w-0' : 'flex justify-center'}>
                <Login
                    setToken={setToken}
                    profile={profile}
                    setProfile={setProfile}
                    isOpen={true}
                />
            </div>

            <Link to="/rules" tabIndex={-1}>
                <button
                    ref={el => {
                        sidebarButtonRefs.current[5] = el
                    }}
                    className={`${styles.button}`}
                    onClick={() => handle_sidebar_click(5)}
                >
                    <img src={BookIcon} alt="Rules" />
                    {true && <span className="font-[--font-barlow-semicondensed-regular] truncate">Leaderboard Rules</span>}
                </button>
            </Link>

            <Link to="/about" tabIndex={-1}>
                <button
                    ref={el => {
                        sidebarButtonRefs.current[6] = el
                    }}
                    className={`${styles.button}`}
                    onClick={() => handle_sidebar_click(6)}
                >
                    <img src={HelpIcon} alt="About" />
                    {true && <span className="font-[--font-barlow-semicondensed-regular] truncate">About LPHUB</span>}
                </button>
            </Link>
        </div>
    );
}

export default Footer;
