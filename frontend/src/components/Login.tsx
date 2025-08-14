import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { ExitIcon, UserIcon, LoginIcon } from "../images/Images";
import { UserProfile } from "@customTypes/Profile";
import { API } from "@api/Api";

interface LoginProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  isOpen: boolean; 
}

const Login: React.FC<LoginProps> = ({ setToken, profile, setProfile, isOpen }) => {
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
      {profile ? (
        <>
          {profile.profile ? (
            <>
              <Link to="/profile" tabIndex={-1} className="grid grid-cols-[50px_auto_200px]">
                <button className="grid grid-cols-[50px_auto] place-items-start text-left bg-inherit cursor-pointer border-none w-[310px] h-10 rounded-[20px] py-[0.3em] px-0 pl-[11px] transition-all duration-300">
                  <img
                    className="rounded-[50px]"
                    src={profile.avatar_link}
                    alt=""
                  />
                  <span className="font-[--font-barlow-semicondensed-regular] text-lg text-foreground h-8 leading-7 transition-opacity duration-100 max-w-[22ch] overflow-hidden">{profile.user_name}</span>
                </button>
                <button className="relative left-[210px] w-[50px] !pl-[10px] !bg-transparent" onClick={_logout}>
                  <img src={ExitIcon} alt="" />
                  <span />
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/" tabIndex={-1} className="grid grid-cols-[50px_auto_200px]">
                <button className="grid grid-cols-[50px_auto] place-items-start text-left bg-inherit cursor-pointer border-none w-[310px] h-10 rounded-[20px] py-[0.3em] px-0 pl-[11px] transition-all duration-300">
                  <img
                    className="rounded-[50px]"
                    src={profile.avatar_link}
                    alt=""
                  />
                  <span className="font-[--font-barlow-semicondensed-regular] text-lg text-foreground h-8 leading-7 transition-opacity duration-100 max-w-[22ch] overflow-hidden">Loading Profile...</span>
                </button>
                <button disabled className="relative left-[210px] w-[50px] !pl-[10px] !bg-transparent hidden" onClick={_logout}>
                  <img src={ExitIcon} alt="" />
                  <span />
                </button>
              </Link>
            </>
          )}
        </>
      ) : (
        <Link to="/api/v1/login" tabIndex={-1}>
          <button
            className={`${
              isOpen
                ? "grid grid-cols-[50px_auto] place-items-start pl-[11px]"
                : "flex items-center justify-center"
            } text-left bg-inherit cursor-pointer border-none w-[310px] h-16 rounded-[20px] py-[0.3em] px-0 transition-all duration-300 ${isOpen ? "text-white" : "text-gray-400"}`}
            onClick={_login}
          >
            <span className={`font-[--font-barlow-semicondensed-regular] text-lg h-12 leading-7 transition-opacity duration-100 ${isOpen ? " overflow-hidden" : ""}`}>
              {isOpen ? (
                <div className="bg-neutral-800 p-2 rounded-lg w-64 flex flex-row items-center justifyt-start gap-2 font-semibold">
                  <LoginIcon />
                  <span>
                    Login with Steam
                  </span>
                </div>
              ) : (
                <div className="bg-neutral-800 p-2 rounded-lg w-">
                  <LoginIcon />
                </div>
              )}
            </span>
          </button>
        </Link>
      )}
    </>
  );
};

export default Login;
