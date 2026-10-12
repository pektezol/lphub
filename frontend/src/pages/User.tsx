import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { API } from "@api/Api";
import ProfileView from "@components/ProfileView";
import "@css/ResourceState.css";
import type { Game } from "@customTypes/Game";
import type { UserProfile } from "@customTypes/Profile";

interface UserProps {
  profile?: UserProfile;
  token?: string;
  gameData: Game[];
}

const User: React.FC<UserProps> = ({ token, profile, gameData }) => {
  const [user, setUser] = React.useState<UserProfile | undefined>();
  const [status, setStatus] = React.useState<
    "loading" | "found" | "not-found" | "error"
  >("loading");
  const location = useLocation();
  const navigate = useNavigate();
  const userID = location.pathname.split("/")[2];
  const viewingOwnProfile = Boolean(
    token && profile?.profile && profile.steam_id === userID,
  );

  React.useEffect(() => {
    if (viewingOwnProfile) {
      navigate("/profile", { replace: true });
    }
  }, [navigate, viewingOwnProfile]);

  React.useEffect(() => {
    let active = true;

    if (!userID || viewingOwnProfile) {
      setUser(undefined);
      setStatus("loading");
      return () => {
        active = false;
      };
    }

    setUser(undefined);
    setStatus("loading");
    void (async () => {
      try {
        const userData = await API.get_user(userID);
        if (active) {
          setUser(userData);
          setStatus(userData ? "found" : "not-found");
        }
      } catch {
        if (active) {
          setUser(undefined);
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [location.pathname, userID, viewingOwnProfile]);

  if (viewingOwnProfile || status === "loading") {
    return null;
  }

  if (status === "not-found" || status === "error") {
    const failed = status === "error";
    return (
      <main className="resource-not-found">
        <h1>{failed ? "Profile Unavailable" : "Profile Not Found"}</h1>
        <p>{failed ? "We couldn’t load this profile. Please try again later." : "We couldn’t find a user with that profile."}</p>
        <Link to="/">Return to Home</Link>
      </main>
    );
  }

  return user ? (
    <ProfileView profile={user} games={gameData} viewerToken={token} />
  ) : null;
};

export default User;
