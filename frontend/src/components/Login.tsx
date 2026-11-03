import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { ExitIcon, UserIcon, LoginIcon } from "@images/Images";
import { UserProfile } from "@customTypes/Profile";
import { API } from "@api/Api";

import loginStyles from "@css/Login.module.css";
import sidebarStyles from "@css/Sidebar.module.css";
import { classNames } from "@css/utils";

interface LoginProps {
  profile?: UserProfile;
  onLogout: () => void;
  selection?: "selected" | "deselected";
};

const Login: React.FC<LoginProps> = ({ profile, onLogout, selection }) => {

  const navigate = useNavigate();

  const _login = () => {
    window.location.href = "/api/v1/login";
  };

  const _logout = () => {
    onLogout();
    void API.delete_token();
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
                  <Link to="/profile" tabIndex={-1} className={classNames(loginStyles.login, sidebarStyles.login)}>
                    <button className={classNames(sidebarStyles.sidebarButton, (selection === undefined ? "" : (selection === "selected" ? sidebarStyles.sidebarButtonSelected : sidebarStyles.sidebarButtonDeselected)))}>
                      <img className={sidebarStyles.avatarImg} src={profile.avatar_link} alt="" />
                      <span>{profile.user_name}</span>
                    </button>
                    <button className={sidebarStyles.logoutButton} onClick={_logout}>
                      <img src={ExitIcon} alt="" /><span />
                    </button>
                  </Link>
                </>
              )
              :
              (
                <>
                  <Link to="/" tabIndex={-1} className={classNames(loginStyles.login, sidebarStyles.login)}>
                    <button className={classNames(sidebarStyles.sidebarButton, (selection === undefined ? "" : (selection === "selected" ? sidebarStyles.sidebarButtonSelected : sidebarStyles.sidebarButtonDeselected)))}>
                      <img className={sidebarStyles.avatarImg} src={profile.avatar_link} alt="" />
                      <span>Loading Profile...</span>
                    </button>
                    <button disabled className={sidebarStyles.logoutButton} onClick={_logout}>
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
          <Link to="/api/v1/login" tabIndex={-1} className={classNames(loginStyles.login, sidebarStyles.login)} >
            <button className={classNames(sidebarStyles.sidebarButton, (selection === undefined ? "" : (selection === "selected" ? sidebarStyles.sidebarButtonSelected : sidebarStyles.sidebarButtonDeselected)))} onClick={_login}>
              <img className={sidebarStyles.avatarImg} src={UserIcon} alt="" />
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
