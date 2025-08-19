import React, { useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  BookIcon,
  FlagIcon,
  HelpIcon,
  HomeIcon,
  LogoIcon,
  PortalIcon,
  SearchIcon,
  UploadIcon,
} from "../images/Images";
import Login from "@components/Login";
import { UserProfile } from "@customTypes/Profile";
import { Search } from "@customTypes/Search";
import { API } from "@api/Api";

interface SidebarProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  onUploadRun: () => void;
}

function OpenSidebarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-right-close-icon lucide-panel-right-close"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m8 9 3 3-3 3" /></svg>
  )
}

function ClosedSidebarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-right-open-icon lucide-panel-right-open"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m10 15-3-3 3-3" /></svg>)
}

const Sidebar: React.FC<SidebarProps> = ({
  setToken,
  profile,
  setProfile,
  onUploadRun,
}) => {
  const [searchData, setSearchData] = React.useState<Search | undefined>(
    undefined
  );
  // const [isSidebarLocked, setIsSidebarLocked] = React.useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
  const [selectedButtonIndex, setSelectedButtonIndex] = React.useState<number>(1);

  const location = useLocation();
  const path = location.pathname;

  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchbarRef = useRef<HTMLInputElement>(null);
  const uploadRunRef = useRef<HTMLButtonElement>(null);
  const sidebarButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const _handle_sidebar_toggle = useCallback(() => {
    if (!sidebarRef.current) return;

    if (isSidebarOpen) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      searchbarRef.current?.focus();
    }
  }, [isSidebarOpen]);

  const handle_sidebar_click = useCallback(
    (clicked_sidebar_idx: number) => {
      setSelectedButtonIndex(clicked_sidebar_idx);
      if (isSidebarOpen) {
        setSidebarOpen(false);
      }
    },
    [isSidebarOpen]
  );

  const _handle_search_change = async (q: string) => {
    const searchResponse = await API.get_search(q);
    setSearchData(searchResponse);
  };

  React.useEffect(() => {
    if (path === "/") {
      setSelectedButtonIndex(1);
    } else if (path.includes("games")) {
      setSelectedButtonIndex(2);
    } else if (path.includes("rankings")) {
      setSelectedButtonIndex(3);
    } else if (path.includes("profile")) {
      setSelectedButtonIndex(4);
    } else if (path.includes("rules")) {
      setSelectedButtonIndex(5);
    } else if (path.includes("about")) {
      setSelectedButtonIndex(6);
    }
  }, [path]);

  const getButtonClasses = (buttonIndex: number) => {
    const baseClasses = "flex items-center gap-3 w-full text-left bg-inherit cursor-pointer border-none rounded-lg py-3 px-3 transition-all duration-300 hover:bg-surface1";
    const selectedClasses = selectedButtonIndex === buttonIndex ? "bg-primary text-background" : "bg-transparent text-foreground";

    return `${baseClasses} ${selectedClasses}`;
  };

  const iconClasses = "w-6 h-6 flex-shrink-0";

  return (
    <div className={`w-80 not-md:w-full text-white bg-block
      }`}>
      <div className="flex items-center px-4 border-b border-border">
        <Link to="/" tabIndex={-1} className="flex items-center flex-1 cursor-pointer select-none min-w-0">
          <img src={LogoIcon} alt="Logo" className="w-12 h-12 flex-shrink-0" />
          {isSidebarOpen && (
            <div className="ml-3 font-[--font-barlow-condensed-regular] text-white min-w-0 overflow-hidden">
              <div className="font-[--font-barlow-condensed-bold] text-2xl leading-6 truncate">
                PORTAL 2
              </div>
              <div className="text-sm leading-4 truncate">
                Least Portals Hub
              </div>
            </div>
          )}
        </Link>

        <button
          onClick={_handle_sidebar_toggle}
          className="ml-2 p-2 rounded-lg hover:bg-surface1 transition-colors text-foreground"
          title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <ClosedSidebarIcon /> : <OpenSidebarIcon />}
        </button>
      </div>

      {/* Sidebar Content */}
      <div
        ref={sidebarRef}
        className="flex flex-col overflow-y-auto overflow-x-hidden"
      >
        {isSidebarOpen && (
          <div className="p-4 border-b border-border min-w-0">
            <div className="flex items-center gap-3 mb-3">
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
        )}

        <div className="flex-1 p-4 min-w-0">
          <nav className="space-y-2">
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
                  className={getButtonClasses(refIndex)}
                  onClick={() => handle_sidebar_click(refIndex)}
                >
                  <img src={icon} alt={alt} className={iconClasses} />
                  {isSidebarOpen && (
                    <span className="text-white font-[--font-barlow-semicondensed-regular] truncate">
                      {label}
                    </span>
                  )}
                </button>
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border space-y-2 min-w-0">
          {profile && profile.profile && (
            <button
              ref={uploadRunRef}
              id="upload-run"
              className={getButtonClasses(-1)}
              onClick={() => onUploadRun()}
            >
              <img src={UploadIcon} alt="Upload" className={iconClasses} />
              {isSidebarOpen && <span className="font-[--font-barlow-semicondensed-regular] truncate">Upload Record</span>}
            </button>
          )}

          <div className={isSidebarOpen ? 'min-w-0' : 'flex justify-center'}>
            <Login
              setToken={setToken}
              profile={profile}
              setProfile={setProfile}
              isOpen={isSidebarOpen}
            />
          </div>

          <Link to="/rules" tabIndex={-1}>
            <button
              ref={el => {
                sidebarButtonRefs.current[5] = el
              }}
              className={getButtonClasses(5)}
              onClick={() => handle_sidebar_click(5)}
            >
              <img src={BookIcon} alt="Rules" className={iconClasses} />
              {isSidebarOpen && <span className="font-[--font-barlow-semicondensed-regular] truncate">Leaderboard Rules</span>}
            </button>
          </Link>

          <Link to="/about" tabIndex={-1}>
            <button
              ref={el => {
                sidebarButtonRefs.current[6] = el
              }}
              className={getButtonClasses(6)}
              onClick={() => handle_sidebar_click(6)}
            >
              <img src={HelpIcon} alt="About" className={iconClasses} />
              {isSidebarOpen && <span className="font-[--font-barlow-semicondensed-regular] truncate">About LPHUB</span>}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
