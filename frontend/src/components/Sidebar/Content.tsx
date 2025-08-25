import React, { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserProfile } from "@customTypes/Profile";

import styles from "./Sidebar.module.css";

import {
    SearchIcon,
} from "../../images/Images";

import links from "./Links";

interface ContentProps {
    profile?: UserProfile;
    isSearching: boolean;
    selectedButtonIndex: number
    isSidebarOpen: boolean;
    handle_sidebar_click: (clicked_sidebar_idx: number) => void;
};

const _Content: React.FC<ContentProps> = ({ profile, isSearching, selectedButtonIndex, isSidebarOpen, handle_sidebar_click }) => {

    return (
        <div className="h-full">

            <div className="px-2 my-2.5">
                <button onClick={() => handle_sidebar_click(0)} className={`${styles.button} ${selectedButtonIndex == 0 ? styles["button-selected"] : ""} ${isSearching ? styles["button-hidden"] : ""}`}>
                    <img src={SearchIcon} alt="Search" />
                    <span>Search</span>
                </button>
            </div>

            <div className="flex-1 min-w-0 mt-12">
                <nav className="px-2 flex flex-col gap-2">
                    {links.content.map(({ to, icon, label }, i) => (
                        <Link to={to} tabIndex={-1} key={i + 1}>
                            <button
                                className={`${styles.button} ${selectedButtonIndex == i + 1 ? styles["button-selected"] : ""} ${isSearching ? styles["button-hidden"] : ""}`}
                                onClick={() => handle_sidebar_click(i + 1)}
                            >
                                <img src={icon} />
                                <span>
                                    {label}
                                </span>
                            </button>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}

export default _Content;
