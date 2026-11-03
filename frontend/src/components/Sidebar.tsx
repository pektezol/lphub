import React from "react";
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
} from "@images/Images";
import Login from "@components/Login";
import { UserProfile } from "@customTypes/Profile";
import { Search } from "@customTypes/Search";
import { API } from "@api/Api";

import sidebarStyles from "@css/Sidebar.module.css";
import uploadRunDialogStyles from "@css/UploadRunDialog.module.css";
import { classNames, cssVariables } from "@css/utils";

interface SidebarProps {
  profile?: UserProfile;
  onLogout: () => void;
  onUploadRun: () => void;
}

const SEARCH_DEBOUNCE_MS = 250;

const Sidebar: React.FC<SidebarProps> = ({
  profile,
  onLogout,
  onUploadRun,
}) => {
  const [searchData, setSearchData] = React.useState<Search | undefined>(
    undefined,
  );
  const [isSidebarLocked, setIsSidebarLocked] = React.useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    React.useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] =
    React.useState<boolean>(false);
  const searchDebounceRef = React.useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const searchAbortControllerRef = React.useRef<AbortController | null>(null);
  const searchRequestIdRef = React.useRef(0);

  const location = useLocation();
  const path = location.pathname;

  const [selectedSidebarIndex, setSelectedSidebarIndex] = React.useState<number>();
  const [loginSelection, setLoginSelection] = React.useState<"selected" | "deselected">();
  const [searchWasToggled, setSearchWasToggled] = React.useState(false);
  const [labelsVisible, setLabelsVisible] = React.useState(true);
  const [searchBehind, setSearchBehind] = React.useState(false);
  const [wideSearchButtons, setWideSearchButtons] = React.useState(false);
  const visualTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const loginBranch = profile ? profile.profile ? "ready" : "loading" : "guest";

  React.useEffect(() => {
    // The previous login branch mounted a fresh button before the next navigation.
    setLoginSelection(undefined);
  }, [loginBranch]);

  const sidebarButtonClass = (index: number) =>
    classNames(sidebarStyles.sidebarButton, (selectedSidebarIndex === undefined ? "" : (selectedSidebarIndex === index ? sidebarStyles.sidebarButtonSelected : sidebarStyles.sidebarButtonDeselected)));

  const handle_sidebar_click = (index: number) => {
    if (isSidebarOpen) {
      _handle_sidebar_hide();
    }
    setSelectedSidebarIndex(index);
    setLoginSelection(index === 4 ? "selected" : "deselected");
  };

  const _handle_sidebar_hide = () => {
    setSearchWasToggled(true);
    setLabelsVisible(false);
    if (isSidebarOpen) {
      setSidebarOpen(false);
      setSearchBehind(false);
      setWideSearchButtons(window.innerWidth > 1024);
      visualTimers.current.push(setTimeout(() => setLabelsVisible(true), 100));
    } else {
      setSidebarOpen(true);
      document.getElementById("searchbar")?.focus();
      visualTimers.current.push(setTimeout(() => setSearchBehind(true), 300));
    }
  };

  const _handle_sidebar_lock = () => {
    if (window.innerWidth <= 768) {
      setIsMobileSearchOpen(!isMobileSearchOpen);
    } else {
      if (!isSidebarLocked) {
        _handle_sidebar_hide();
        setIsSidebarLocked(true);
        setTimeout(() => setIsSidebarLocked(false), 300);
      }
    }
  };

  const _close_mobile_search = () => {
    setIsMobileSearchOpen(false);
  };

  const _close_mobile_search_and_menu = () => {
    setIsMobileSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const _handle_search_change = (q: string) => {
    const query = q.trim();
    const requestId = ++searchRequestIdRef.current;

    if (searchDebounceRef.current !== undefined) {
      clearTimeout(searchDebounceRef.current);
    }
    searchAbortControllerRef.current?.abort();
    setSearchData(undefined);

    if (!query) {
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortControllerRef.current = controller;

      try {
        const searchResponse = await API.get_search(query, controller.signal);
        if (
          !controller.signal.aborted &&
          requestId === searchRequestIdRef.current
        ) {
          setSearchData(searchResponse);
        }
      } catch {
        if (
          !controller.signal.aborted &&
          requestId === searchRequestIdRef.current
        ) {
          setSearchData(undefined);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const _toggle_mobile_menu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const _close_mobile_menu = () => {
    setIsMobileMenuOpen(false);
  };

  React.useEffect(() => {
    if (path === "/") {
      handle_sidebar_click(1);
    } else if (path === "/games" || path.startsWith("/games/") || path.startsWith("/maps/")) {
      handle_sidebar_click(2);
    } else if (path.includes("rankings")) {
      handle_sidebar_click(3);
    }
    // else if (path.includes("news")) { handle_sidebar_click(4) }
    // else if (path.includes("scorelog")) { handle_sidebar_click(5) }
    else if (path === "/discussions") {
      handle_sidebar_click(7);
    } else if (path.includes("profile")) {
      handle_sidebar_click(4);
    } else if (path.includes("rules")) {
      handle_sidebar_click(5);
    } else if (path.includes("about")) {
      handle_sidebar_click(6);
    }
  }, [path]);

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current !== undefined) {
        clearTimeout(searchDebounceRef.current);
      }
      searchAbortControllerRef.current?.abort();
      visualTimers.current.forEach(clearTimeout);
      ++searchRequestIdRef.current;
    };
  }, []);

  return (
    <>
      <div id="mobile-topbar" className={sidebarStyles.idMobileTopbar}>
        <Link to="/" tabIndex={-1}>
          <div id="mobile-logo" className={sidebarStyles.idMobileLogo}>
            <img src={LogoIcon} alt="" height={"50px"} />
            <div id="mobile-logo-text" className={sidebarStyles.idMobileLogoText}>
              <span>
                <b>LPHUB</b>
              </span>
            </div>
          </div>
        </Link>
        <button
          id="hamburger-menu"
          onClick={_toggle_mobile_menu}
          className={classNames((isMobileMenuOpen ? sidebarStyles.open : ""), sidebarStyles.idHamburgerMenu)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div id="sidebar" className={classNames((isMobileMenuOpen ? sidebarStyles.mobileOpen : ""), (searchWasToggled ? (isSidebarOpen ? sidebarStyles.searchCollapsed : sidebarStyles.searchExpanded) : ""), (labelsVisible ? sidebarStyles.labelsVisible : ""), (searchBehind ? sidebarStyles.searchBehind : ""), (wideSearchButtons ? sidebarStyles.wideSearchButtons : ""), sidebarStyles.idSidebar)}>
        <Link to="/" tabIndex={-1}>
          <div id="logo" className={sidebarStyles.idLogo}>
            {" "}
            {/* logo */}
            <img src={LogoIcon} alt="" height={"80px"} />
            <div id="logo-text" className={sidebarStyles.idLogoText}>
              <span>
                <b>PORTAL 2</b>
              </span>
              <br />
              <span>Least Portals Hub</span>
            </div>
          </div>
        </Link>
        <div id="sidebar-list" className={sidebarStyles.idSidebarList}>
          {/* List */}
          <div id="sidebar-toplist" className={sidebarStyles.idSidebarToplist}>
            {/* Top */}
            <button
              className={sidebarButtonClass(0)}
              onClick={() => _handle_sidebar_lock()}
            >
              <img src={SearchIcon} alt="" />
              <span>Search</span>
            </button>
            <span></span>
            <Link to="/" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(1)}>
                <img src={HomeIcon} alt="homepage" />
                <span>Home&nbsp;Page</span>
              </button>
            </Link>
            <Link to="/games" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(2)}>
                <img src={PortalIcon} alt="games" />
                <span>Games</span>
              </button>
            </Link>
            <Link to="/rankings" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(3)}>
                <img src={FlagIcon} alt="rankings" />
                <span>Rankings</span>
              </button>
            </Link>
            <Link to="/discussions" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(7)}><img src={BookIcon} alt="" /><span>Discussions</span></button>
            </Link>
            {/* <Link to="/news" tabIndex={-1}>
            <button className={sidebarStyles.sidebarButton}><img src={NewsIcon} alt="news" /><span>News</span></button>
          </Link> */}
            {/* <Link to="/scorelog" tabIndex={-1}>
            <button className={sidebarStyles.sidebarButton}><img src={TableIcon} alt="scorelogs" /><span>Score&nbsp;Logs</span></button>
          </Link> */}
          </div>
          <div id="sidebar-bottomlist" className={sidebarStyles.idSidebarBottomlist}>
            <span></span>

            {profile && profile.profile ? (
              <button
                id="upload-run"
                className={classNames(sidebarStyles.submitRunButton, sidebarStyles.idUploadRun, uploadRunDialogStyles.idUploadRun)}
                onClick={() => onUploadRun()}
              >
                <img src={UploadIcon} alt="upload" />
                <span>Upload&nbsp;Record</span>
              </button>
            ) : (
              <span></span>
            )}

            <Login profile={profile} onLogout={onLogout} selection={loginSelection} />

            <Link to="/rules" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(5)}>
                <img src={BookIcon} alt="rules" />
                <span>Leaderboard&nbsp;Rules</span>
              </button>
            </Link>

            <Link to="/about" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className={sidebarButtonClass(6)}>
                <img src={HelpIcon} alt="about" />
                <span>About&nbsp;LPHUB</span>
              </button>
            </Link>
          </div>
        </div>
        <div
          id="search-panel"
          className={classNames((isMobileSearchOpen ? sidebarStyles.mobileSearchOpen : ""), sidebarStyles.idSearchPanel)}
        >
          <input
            type="text"
            id="searchbar"
            placeholder="Search for map or a player..."
            onChange={(e) => _handle_search_change(e.target.value)} className={sidebarStyles.idSearchbar}
          />
          <div className={sidebarStyles.mobileSearchHeader}>
            <button
              className={sidebarStyles.mobileSearchClose}
              onClick={_close_mobile_search}
            >
              ✕
            </button>
          </div>

          <div id="search-data" className={sidebarStyles.idSearchData}>
            {searchData?.maps.map((q, index) => (
              <Link
                to={`/maps/${q.id}`}
                className={sidebarStyles.searchMap}
                key={index}
                onClick={_close_mobile_search_and_menu}
              >
                <span>{q.game}</span>
                <span>{q.section_name}</span>
                <span>{q.map}</span>
              </Link>
            ))}
            {searchData?.players.map((q, index) => (
              <Link
                to={
                  profile && q.steam_id === profile.steam_id
                    ? "/profile"
                    : `/users/${q.steam_id}`
                }
                className={sidebarStyles.searchPlayer}
                key={index}
                onClick={_close_mobile_search_and_menu}
              >
                <img src={q.avatar_link} alt="pfp"></img>
                <span
                  style={cssVariables({ "--font-size": `${36 - q.user_name.length * 0.8}px` })} className={sidebarStyles.searchResultName}
                >
                  {q.user_name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
