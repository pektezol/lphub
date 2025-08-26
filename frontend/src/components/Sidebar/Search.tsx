import React from "react";
import { Link } from "react-router-dom";

import { Search } from "@customTypes/Search";
import { API } from "@api/Api";
import { UserProfile } from "@customTypes/Profile";

interface SearchProps {
    profile?: UserProfile;
    searchbarRef: React.RefObject<HTMLInputElement | null>;
};

const _Search: React.FC<SearchProps> = ({ profile, searchbarRef }) => {
    const [searchData, setSearchData] = React.useState<Search | undefined>(
        undefined
    );

    const _handle_search_change = async (q: string) => {
        const searchResponse = await API.get_search(q);
        setSearchData(searchResponse);
    };
    return (
        <div className="flex w-full flex-col p-3 not-md:absolute">
            <input
                ref={searchbarRef}
                type="text"
                id="searchbar"
                placeholder="Search for map or a player..."
                onChange={e => _handle_search_change(e.target.value)}
                className="w-full py-2 px-[19px] bg-input rounded-[2000px] outline-none placeholder-bright placeholder:text-[18px] placeholder:font-barlow-semicondensed-regular"
            />

            {searchData && (
                <div className="overflow-y-auto">
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
    )
}

export default _Search;
