import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { UserProfile } from "@customTypes/Profile";
import { Search } from "@customTypes/Search";
import { API } from "@api/Api";

import styles from "./Sidebar.module.css";

import {
    FlagIcon,
    HomeIcon,
    PortalIcon,
    SearchIcon,
} from "../../images/Images";

interface ContentProps {
    profile?: UserProfile;
    isSidebarOpen: boolean;
    sidebarButtonRefs: React.RefObject<(HTMLButtonElement | null)[]>;
    getButtonClasses: (buttonIndex: number) => string;
    handle_sidebar_click: (clicked_sidebar_idx: number) => void;
};

const Content: React.FC<ContentProps> = ({ profile, isSidebarOpen, sidebarButtonRefs, getButtonClasses, handle_sidebar_click }) => {
    const [searchData, setSearchData] = React.useState<Search | undefined>(
        undefined
    );

    const searchbarRef = useRef<HTMLInputElement>(null);

    const _handle_search_change = async (q: string) => {
        const searchResponse = await API.get_search(q);
        setSearchData(searchResponse);
    };

    const iconClasses = "";

    return (
        <div className="h-full">

            <div className="px-2">
                <div className={`${styles.button}`}>
                    <img src={SearchIcon} alt="Search" className={iconClasses} />
                    <span className="text-white font-[--font-barlow-semicondensed-regular] truncate">Search</span>
                </div>

                <div className="min-w-0">
                    <input
                        ref={searchbarRef}
                        type="text"
                        id="searchbar"
                        placeholder="Search for map or a player..."
                        onChange={e => _handle_search_change(e.target.value)}
                        className="w-full p-2 bg-input text-foreground border border-border rounded-lg text-sm min-w-0"
                    />

                    {searchData && (
                        <div className="mt-2 max-h-40 overflow-y-auto min-w-0">
                            {searchData?.maps.map((q, index) => (
                                <Link to={`/maps/${q.id}`} className="block p-2 mb-1 bg-surface1 rounded hover:bg-surface2 transition-colors min-w-0" key={index}>
                                    <span className="block text-xs text-subtext1 truncate">{q.game}</span>
                                    <span className="block text-xs text-subtext1 truncate">{q.chapter}</span>
                                    <span className="block text-sm text-foreground truncate">{q.map}</span>
                                </Link>
                            ))}
                            {searchData?.players.map((q, index) => (
                                <Link
                                    to={
                                        profile && q.steam_id === profile.steam_id
                                            ? `/profile`
                                            : `/users/${q.steam_id}`
                                    }
                                    className="flex items-center p-2 mb-1 bg-surface1 rounded hover:bg-surface2 transition-colors min-w-0"
                                    key={index}
                                >
                                    <img src={q.avatar_link} alt="pfp" className="w-6 h-6 rounded-full mr-2 flex-shrink-0" />
                                    <span className="text-sm text-foreground truncate">
                                        {q.user_name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <nav className="px-2 flex flex-col gap-2">
                    {[
                        {
                            to: "/",
                            refIndex: 1,
                            icon: HomeIcon,
                            alt: "Home",
                            label: "Home Page",
                        },
                        {
                            to: "/games",
                            refIndex: 2,
                            icon: PortalIcon,
                            alt: "Games",
                            label: "Games",
                        },
                        {
                            to: "/rankings",
                            refIndex: 3,
                            icon: FlagIcon,
                            alt: "Rankings",
                            label: "Rankings",
                        },
                    ].map(({ to, refIndex, icon, alt, label }) => (
                        <Link to={to} tabIndex={-1} key={refIndex}>
                            <button
                                ref={el => {
                                    sidebarButtonRefs.current[refIndex] = el
                                }}
                                className={`${styles.button}`}
                                onClick={() => handle_sidebar_click(refIndex)}
                            >
                                <img src={icon} alt={alt} className={iconClasses} />
                                <span className="">
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

export default Content;
