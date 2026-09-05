import React from "react";
import { useNavigate } from "react-router-dom";

import ProfileView from "@components/ProfileView";
import type { AuthenticationState } from "@customTypes/Auth";
import type { Game } from "@customTypes/Game";

interface ProfileProps {
  authentication: AuthenticationState;
  gameData: Game[];
  onProfileRefresh: () => void | Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ authentication, gameData, onProfileRefresh }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (authentication.status === "guest") {
      navigate("/", { replace: true });
    }
  }, [authentication.status, navigate]);

  if (authentication.status !== "authenticated") {
    return null;
  }

  return (
    <ProfileView
      profile={authentication.profile}
      games={gameData}
      viewerToken={authentication.token}
      editable
      onProfileRefresh={onProfileRefresh}
    />
  );
};

export default Profile;
