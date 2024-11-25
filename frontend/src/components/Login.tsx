import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ExitIcon, UserIcon, LoginIcon } from '@images/Images';
import { UserProfile } from '@customTypes/Profile';
import { API } from '@api/Api';
import "@css/Login.css";
import { Button, Buttons } from "@customTypes/Sidebar";
import btn from "@css/Button.module.css";

interface LoginProps {
  isSearching: boolean;
  currentBtn: number;
  buttonsList: Buttons;
  setCurrentBtn: React.Dispatch<React.SetStateAction<number>>;
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
};

const Login: React.FC<LoginProps> = ({ isSearching, currentBtn, buttonsList, setCurrentBtn, setToken, profile, setProfile }) => {

  const navigate = useNavigate();

  const _login = () => {
    window.location.href = "/api/v1/login";
  };

  const _logout = () => {
    setProfile(undefined);
    setToken(undefined);
    API.delete_token();
    navigate("/");
  };

  return (
    <>
      {profile
        ?
        (
          <>
            {profile.profile ?
              (
                <>
                  <Link to="/profile" tabIndex={-1}>
					  <button onClick={() => {setCurrentBtn(buttonsList.top.length)}} id="sidebarBtn" className={`${btn.sidebar} ${btn.profile} ${currentBtn == buttonsList.top.length ? btn.selected : ""} ${isSearching ? btn.min : ""}`}>
					  <img className="avatar-img" src={profile.avatar_link} alt="" />
					  <span style={{justifyContent: "space-between", display: "flex", alignItems: "center", width: "100%"}}>
                      <span>{profile.user_name}</span>
                      <button className={btn.logout} onClick={_logout}>
                      	<img src={ExitIcon} alt="" /><span />
					  </button>
					</span>
                    </button>
                  </Link>
                </>
              )
              :
              (
                <>
                  <Link to="/" tabIndex={-1}>
                    <button id="sidebarBtn" className={`${btn.sidebar} ${btn.profile} ${isSearching ? btn.min : ""}`}>
                      <img className="avatar-img" src={profile.avatar_link} alt="" />
                      <span>Loading Profile...</span>
                    </button>
                    <button disabled className='logout-button' onClick={_logout}>
                      <img src={ExitIcon} alt="" /><span />
                    </button>
                  </Link>
                </>
              )
            }
          </>
        )
        :
        (
          <Link to="/api/v1/login" tabIndex={-1}>
            <button id="sidebarBtn" className={`${btn.sidebar} ${isSearching ? btn.min : ""}`} onClick={_login}>
				<img className="avatar-img" src={UserIcon} alt="" />
				<span>
					<img src={LoginIcon} alt="Sign in through Steam" />
				</span>
            </button>
          </Link>
        )}
    </>
  );
};

export default Login;
