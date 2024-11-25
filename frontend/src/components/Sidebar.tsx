import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { BookIcon, FlagIcon, HelpIcon, HomeIcon, LogoIcon, PortalIcon, SearchIcon, UploadIcon } from '@images/Images';
import { UserProfile } from '@customTypes/Profile';
import sidebar from "@css/Sidebar.module.css";
import { Button, Buttons } from "@customTypes/Sidebar";
import btn from "@css/Button.module.css";
import { abort } from "process";
import Login from "@components/Login";
import { API } from '@api/Api';
import inp from "@css/Input.module.css";
import { Search } from '@customTypes/Search';

interface SidebarProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  onUploadRun: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ setToken, profile, setProfile, onUploadRun }) => {
	const location = useLocation();
	const [load, setLoad] = React.useState<boolean>(false);
	const [searchData, setSearchData] = React.useState<Search | undefined>(undefined);
	const [hasClickedSearch, setHasClickedSearch] = React.useState<boolean>(false);
	const [isSearching, setIsSearching] = React.useState<boolean>(false);
	const [buttonsList, setButtonsList] = React.useState<Buttons>({
																	top: [
																		{img: HomeIcon, text: "Home", url: "/"},
																		{img: PortalIcon, text: "Games", url: "/games"},
																		{img: FlagIcon, text: "Rankings", url: "/rankings"}
																	],
																	bottom: [
																		{img: BookIcon, text: "Rules", url: "/rules"},
																		{img: HelpIcon, text: "About LPHUB", url: "/about"}
																	]
	});

	const _handle_search = () => {
		if (!hasClickedSearch) {
			_handle_search_change("");
		}
		setHasClickedSearch(true);
		setIsSearching(!isSearching);
		document.querySelector<HTMLInputElement>("#searchInput")!.focus();
	}

	const _handle_search_change = async (query: string) => {
		const response = await API.get_search(query);
		setSearchData(response);
	}

	const _get_index_load = () => {
		const pathname = window.location.pathname;
		const btnObj = buttonsList.top.find(obj => obj.url === pathname);
		let btnIndex = buttonsList.top.findIndex(obj => obj.url === pathname);
		if (btnIndex != -1) {
			return btnIndex;
		} else if (buttonsList.top.findIndex(obj => obj.url === pathname) == -1 && buttonsList.bottom.findIndex(obj => obj.url === pathname) != -1) {
			btnIndex = buttonsList.bottom.findIndex(obj => obj.url === pathname);
			return btnIndex + buttonsList.top.length + 1;
		} else if (load) {
			return currentBtn;
		} else {
			return 0;
		}
	}
	const [currentBtn, setCurrentBtn] = React.useState<number>(_get_index_load);

	React.useEffect(() => {
		setCurrentBtn(_get_index_load);
		setLoad(true);
	}, [location])

	return (
		<section className={sidebar.sidebar}>
			<div className={sidebar.logo}>
				<Link onClick={isSearching ? _handle_search : () => {}} to={"/"}>
					<img src={LogoIcon}/>
					<div>
						<span className={sidebar.logoTitle}><b>PORTAL 2</b></span>
						<span>Least Portals Hub</span>
					</div>
				</Link>
			</div>

			<div className={sidebar.btnsContainer} style={{height: "calc(100% - 104px)"}}>
			<div className={`${sidebar.btns} ${isSearching ? sidebar.min : ""}`}>
				<div className={sidebar.topBtns}>
					<button onClick={_handle_search} className={`${btn.sidebar} ${isSearching ? btn.min : ""}`}>
						<img src={SearchIcon}/>
						<span>Search</span>
					</button>

					<span></span>

					{buttonsList.top.map((e: any, i: any) => {
						return <Link to={e.url}><button onClick={isSearching ? _handle_search : () => {}} className={`${btn.sidebar} ${currentBtn == i ? btn.selected : ""} ${isSearching ? btn.min : ""}`} key={i}>
								<img src={e.img}/>
								<span>{e.text}</span>
							</button></Link>
					})

					}
				</div>
				<div className={sidebar.bottomBtns}>
					<Login isSearching={isSearching} setCurrentBtn={setCurrentBtn} currentBtn={currentBtn} buttonsList={buttonsList} setToken={setToken} profile={profile} setProfile={setProfile}/>

					{buttonsList.bottom.map((e: any, i: any) => {
						return <Link to={e.url}><button onClick={isSearching ? _handle_search : () => {}} key={i} className={`${btn.sidebar} ${currentBtn == i + buttonsList.top.length + 1 ? btn.selected : ""} ${isSearching ? btn.min : ""}`}>
								<img src={e.img}/>
								<span>{e.text}</span>
							</button></Link>
					})

					}
				</div>
			</div>

			<div className={`${sidebar.searchContainer} ${isSearching ? sidebar.min : ""}`}>
				<div className={sidebar.inpContainer}>
					<input onChange={(e) => {_handle_search_change(e.target.value)}} id="searchInput" className={inp.sidebar} type="text" placeholder='Search for map or a player...'/>
				</div>

				<div className={sidebar.searchResults}>
					{searchData?.maps.map((map, i) => {
						return <Link style={{animationDelay: `${i < 30 ? i * 0.05 : 0}s`}} className={sidebar.result} to={`/maps/${map.id}`} key={i}>
							<span>{map.game}</span>
							<span>{map.chapter}</span>
							<span>{map.map}</span>
						</Link>
					})}

					{searchData?.players.map((player, i) => {
						return <Link className={`${sidebar.result} ${sidebar.player}`} to={`/users/${player.steam_id}`}>
							<img src={player.avatar_link}/>
							<span>{player.user_name}</span>
						</Link>
					})}
				</div>
			</div>

			</div>
		</section>
	)
}

export default Sidebar;

