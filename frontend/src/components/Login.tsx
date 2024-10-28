import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ExitIcon, UserIcon, LoginIcon } from '../images/Images';
import { UserProfile } from '../types/Profile';
import { API } from '../api/Api';
import "../css/Login.css";

interface LoginProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
};

const Login: React.FC<LoginProps> = ({ setToken, profile, setProfile }) => {

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
                  <Link to="/profile" tabIndex={-1} className='login'>
                    <button className='sidebar-button'>
                      <img src={profile.avatar_link} alt="" />
                      <span>{profile.user_name}</span>
                    </button>
                    <button className='logout-button' onClick={_logout}>
                      <img src={ExitIcon} alt="" /><span />
                    </button>
                  </Link>
                </>
              )
              :
              (
                <>
                  <Link to="/" tabIndex={-1} className='login'>
                    <button className='sidebar-button'>
                      <img src={profile.avatar_link} alt="" />
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
          <Link to="/api/v1/login" tabIndex={-1} className='login' >
            <button className='sidebar-button' onClick={_login}>
              <img src={UserIcon} alt="" />
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
