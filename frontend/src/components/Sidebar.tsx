import React from "react";
import { Link, useLocation } from "react-router-dom";

import { BookIcon, FlagIcon, HelpIcon, HomeIcon, LogoIcon, PortalIcon, SearchIcon, UploadIcon } from "@images/Images";
import Login from "@components/Login";
import { UserProfile } from "@customTypes/Profile";
import { Search } from "@customTypes/Search";
import { API } from "@api/Api";
import "@css/Sidebar.css";

interface SidebarProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  onUploadRun: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ setToken, profile, setProfile, onUploadRun }) => {

  const [searchData, setSearchData] = React.useState<Search | undefined>(undefined);
  const [isSidebarLocked, setIsSidebarLocked] = React.useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState<boolean>(false);

  const location = useLocation();
  const path = location.pathname;

  const handle_sidebar_click = (clicked_sidebar_idx: number) => {
    const btn = document.querySelectorAll("button.sidebar-button");
    if (isSidebarOpen) { setSidebarOpen(false); _handle_sidebar_hide() }
    // clusterfuck
    btn.forEach((e, i) => {
      btn[i].classList.remove("sidebar-button-selected")
      btn[i].classList.add("sidebar-button-deselected")
    })
    btn[clicked_sidebar_idx].classList.add("sidebar-button-selected")
    btn[clicked_sidebar_idx].classList.remove("sidebar-button-deselected")
  };

  const _handle_sidebar_hide = () => {
    const btn = document.querySelectorAll("button.sidebar-button") as NodeListOf<HTMLElement>
    const span = document.querySelectorAll("button.sidebar-button>span") as NodeListOf<HTMLElement>
    const side = document.querySelector("#sidebar-list") as HTMLElement;
    const searchbar = document.querySelector("#searchbar") as HTMLInputElement;
    const uploadRunBtn = document.querySelector("#upload-run") as HTMLInputElement;
    const uploadRunSpan = document.querySelector("#upload-run>span") as HTMLInputElement;

    if (isSidebarOpen) {
      if (profile) {
        const login = document.querySelectorAll(".login>button")[1] as HTMLElement;
        login.style.opacity = "1"
        uploadRunBtn.style.width = "310px"
        uploadRunBtn.style.padding = "0.4em 0 0 11px"
        uploadRunSpan.style.opacity = "0"
        setTimeout(() => {
          uploadRunSpan.style.opacity = "1"
        }, 100)
      }
      setSidebarOpen(false);
      side.style.width = "320px"
      btn.forEach((e, i) => {
        e.style.width = (window.innerWidth > 1024) ? "310px" : "265px"
        e.style.padding = "0.4em 0 0 11px"
        setTimeout(() => {
          span[i].style.opacity = "1"
        }, 100)
      });
      side.style.zIndex = "2"
    } else {
      if (profile) {
        const login = document.querySelectorAll(".login>button")[1] as HTMLElement;
        login.style.opacity = "0"
        uploadRunBtn.style.width = "40px"
        uploadRunBtn.style.padding = "0.4em 0 0 5px"
        uploadRunSpan.style.opacity = "0"
      }
      setSidebarOpen(true);
      side.style.width = "40px";
      searchbar.focus();
      btn.forEach((e, i) => {
        e.style.width = "40px"
        e.style.padding = "0.4em 0 0 5px"
        span[i].style.opacity = "0"
      })
      setTimeout(() => {
        side.style.zIndex = "0"
      }, 300);
    }
  };

  const _handle_sidebar_lock = () => {
    if (window.innerWidth <= 768) {
      setIsMobileSearchOpen(!isMobileSearchOpen);
    } else {
      if (!isSidebarLocked) {
        _handle_sidebar_hide()
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

  const _handle_search_change = async (q: string) => {
    const searchResponse = await API.get_search(q);
    setSearchData(searchResponse);
  };

  const _toggle_mobile_menu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const _close_mobile_menu = () => {
    setIsMobileMenuOpen(false);
  };

  React.useEffect(() => {
    if (path === "/") { handle_sidebar_click(1) }
    else if (path.includes("games")) { handle_sidebar_click(2) }
    else if (path.includes("rankings")) { handle_sidebar_click(3) }
    // else if (path.includes("news")) { handle_sidebar_click(4) }
    // else if (path.includes("scorelog")) { handle_sidebar_click(5) }
    else if (path.includes("profile")) { handle_sidebar_click(4) }
    else if (path.includes("rules")) { handle_sidebar_click(5) }
    else if (path.includes("about")) { handle_sidebar_click(6) }
  }, [path]);

  return (
    <>
      <div id='mobile-topbar'>
        <Link to="/" tabIndex={-1}>
          <div id='mobile-logo'>
            <img src={LogoIcon} alt="" height={"50px"} />
            <div id='mobile-logo-text'>
              <span><b>LPHUB</b></span>
            </div>
          </div>
        </Link>
        <button id='hamburger-menu' onClick={_toggle_mobile_menu} className={isMobileMenuOpen ? "open" : ""}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div id='sidebar' className={isMobileMenuOpen ? "mobile-open" : ""}>
        <Link to="/" tabIndex={-1}>
          <div id='logo'> {/* logo */}
            <img src={LogoIcon} alt="" height={"80px"} />
            <div id='logo-text'>
              <span><b>PORTAL 2</b></span><br />
              <span>Least Portals Hub</span>
            </div>
          </div>
        </Link>
        <div id='sidebar-list'> {/* List */}
          <div id='sidebar-toplist'> {/* Top */}

            <button className='sidebar-button' onClick={() => _handle_sidebar_lock()}><img src={SearchIcon} alt="" /><span>Search</span></button>

            <span></span>

            <Link to="/" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className='sidebar-button'><img src={HomeIcon} alt="homepage" /><span>Home&nbsp;Page</span></button>
            </Link>

            <Link to="/games" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className='sidebar-button'><img src={PortalIcon} alt="games" /><span>Games</span></button>
            </Link>

            <Link to="/rankings" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className='sidebar-button'><img src={FlagIcon} alt="rankings" /><span>Rankings</span></button>
            </Link>

            {/* <Link to="/news" tabIndex={-1}>
            <button className='sidebar-button'><img src={NewsIcon} alt="news" /><span>News</span></button>
          </Link> */}

            {/* <Link to="/scorelog" tabIndex={-1}>
            <button className='sidebar-button'><img src={TableIcon} alt="scorelogs" /><span>Score&nbsp;Logs</span></button>
          </Link> */}
          </div>
          <div id='sidebar-bottomlist'>
            <span></span>

            {
              profile && profile.profile ?
                <button id='upload-run' className='submit-run-button' onClick={() => onUploadRun()}><img src={UploadIcon} alt="upload" /><span>Upload&nbsp;Record</span></button>
                :
                <span></span>
            }

            <Login setToken={setToken} profile={profile} setProfile={setProfile} />

            <Link to="/rules" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className='sidebar-button'><img src={BookIcon} alt="rules" /><span>Leaderboard&nbsp;Rules</span></button>
            </Link>

            <Link to="/about" tabIndex={-1} onClick={_close_mobile_menu}>
              <button className='sidebar-button'><img src={HelpIcon} alt="about" /><span>About&nbsp;LPHUB</span></button>
            </Link>
          </div>
        </div>
        <div id='search-panel' className={isMobileSearchOpen ? "mobile-search-open" : ""}>
          <input type="text" id='searchbar' placeholder='Search for map or a player...' onChange={(e) => _handle_search_change(e.target.value)} />
          <div className='mobile-search-header'>
            <button className='mobile-search-close' onClick={_close_mobile_search}>✕</button>
          </div>

          <div id='search-data'>

            {searchData?.maps.map((q, index) => (
              <Link to={`/maps/${q.id}`} className='search-map' key={index} onClick={_close_mobile_search_and_menu}>
                <span>{q.game}</span>
                <span>{q.chapter}</span>
                <span>{q.map}</span>
              </Link>
            ))}
            {searchData?.players.map((q, index) =>
            (
              <Link to={
                profile && q.steam_id === profile.steam_id ? "/profile" :
                  `/users/${q.steam_id}`
              } className='search-player' key={index} onClick={_close_mobile_search_and_menu}>
                <img src={q.avatar_link} alt='pfp'></img>
                <span style={{ fontSize: `${36 - q.user_name.length * 0.8}px` }}>{q.user_name}</span>
              </Link>
            ))}

          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
