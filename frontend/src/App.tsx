import React from "react";
import { Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet";

import Sidebar from "./components/Sidebar";
import "./App.css";

import Profile from "@pages/Profile";
import Games from "@pages/Games";
import Maps from "@pages/Maps";
import User from "@pages/User";
import Homepage from "@pages/Homepage";
import UploadRunDialog from "./components/UploadRunDialog";
import Rules from "@pages/Rules";
import About from "@pages/About";
import { Game } from "@customTypes/Game";
import { API } from "./api/Api";
import Maplist from "@pages/Maplist";
import Rankings from "@pages/Rankings";
import { get_user_mod_from_token } from "./utils/Jwt";
import { AuthenticationState } from "@customTypes/Auth";

const App: React.FC = () => {
  const [authentication, setAuthentication] = React.useState<AuthenticationState>({ status: "loading" });

  const [games, setGames] = React.useState<Game[]>([]);

  const [uploadRunDialog, setUploadRunDialog] = React.useState<boolean>(false);

  const _fetch_games = async () => {
    const games = await API.get_games();
    setGames(games);
  };

  React.useEffect(() => {
    let active = true;

    const _fetch_authentication = async () => {
      try {
        const token = await API.get_token();
        if (!token) {
          if (active) {
            setAuthentication({ status: "guest" });
          }
          return;
        }

        const profile = await API.get_profile(token);
        if (!profile) {
          if (active) {
            setAuthentication({ status: "guest" });
          }
          return;
        }

        if (active) {
          setAuthentication({
            status: "authenticated",
            token,
            profile,
            isModerator: Boolean(get_user_mod_from_token(token)),
          });
        }
      } catch {
        if (active) {
          setAuthentication({ status: "guest" });
        }
      }
    };

    void _fetch_authentication();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    void _fetch_games();
  }, []);

  const _set_profile = async () => {
    if (authentication.status !== "authenticated") {
      return;
    }

    try {
      const profile = await API.get_profile(authentication.token);
      if (!profile) {
        setAuthentication((current) => current.status === "authenticated" && current.token === authentication.token
          ? { status: "guest" }
          : current);
        return;
      }

      setAuthentication((current) => current.status === "authenticated" && current.token === authentication.token
        ? { ...current, profile }
        : current);
    } catch {
      // Keep the current session visible when refreshing its profile fails.
    }
  };

  const token = authentication.status === "authenticated" ? authentication.token : undefined;
  const profile = authentication.status === "authenticated" ? authentication.profile : undefined;
  const isModerator = authentication.status === "authenticated" && authentication.isModerator;

  return (
    <>
      <Helmet>
        <title>LPHUB</title>
        <meta name="description" content="Least Portals Hub" />
      </Helmet>
      <UploadRunDialog token={token} open={uploadRunDialog} onClose={(updateProfile) => {
        setUploadRunDialog(false);
        if (updateProfile) {
          void _set_profile();
        }
      }} games={games} />
      <Sidebar
        profile={profile}
        onLogout={() => setAuthentication({ status: "guest" })}
        onUploadRun={() => setUploadRunDialog(true)}
      />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/profile" element={<Profile authentication={authentication} gameData={games} onDeleteRecord={() => void _set_profile()} />} />
        <Route path="/users/*" element={<User profile={profile} token={token} gameData={games} />} />
        <Route path="/games" element={<Games games={games} />} />
        <Route path='/games/:id' element={<Maplist />}></Route>
        <Route path="/maps/*" element={<Maps token={token} isModerator={isModerator} games={games} />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/about" element={<About />} />
        <Route path='/rankings' element={<Rankings />}></Route>
        <Route path="*" element={"404"} />
      </Routes>
    </>
  );
};

export default App;
