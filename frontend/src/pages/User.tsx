import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { API } from "@api/Api";
import ProfileView from "@components/ProfileView";
import type { Game } from "@customTypes/Game";
import type { UserProfile } from "@customTypes/Profile";

interface UserProps {
  profile?: UserProfile;
  token?: string;
  gameData: Game[];
}

const User: React.FC<UserProps> = ({ token, profile, gameData }) => {
  const [user, setUser] = React.useState<UserProfile | undefined>();
  const location = useLocation();
  const navigate = useNavigate();
  const userID = location.pathname.split("/")[2];
  const viewingOwnProfile = Boolean(token && profile?.profile && profile.steam_id === userID);

  React.useEffect(() => {
    if (viewingOwnProfile) {
      navigate("/profile", { replace: true });
    }
  }, [navigate, viewingOwnProfile]);

  React.useEffect(() => {
    let active = true;

    if (!userID || viewingOwnProfile) {
      setUser(undefined);
      return () => {
        active = false;
      };
    }

    setUser(undefined);
    void (async () => {
      try {
        const userData = await API.get_user(userID);
        if (active) {
          setUser(userData);
        }
      } catch {
        if (active) {
          setUser(undefined);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [location.pathname, userID, viewingOwnProfile]);

  if (!user) {
    return null;
  }

  return <ProfileView profile={user} games={gameData} viewerToken={token} />;
};

export default User;
