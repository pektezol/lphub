import React, { useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet";

import { UserProfile } from "@customTypes/Profile";
import Sidebar from "./components/Sidebar/Sidebar";
import "./App.css";

import Profile from "@pages/Profile/Profile.tsx";
import Games from "@pages/Games/Games.tsx";
import Maps from "@pages/Maps/Maps.tsx";
import User from "@pages/User/User.tsx";
import Homepage from "@pages/Home/Homepage.tsx";
import UploadRunDialog from "./components/UploadRunDialog";
import Rules from "@pages/Rules/Rules.tsx";
import About from "@pages/About/About.tsx";
import { Game } from "@customTypes/Game";
import { API } from "./api/Api";
import Maplist from "@pages/Maplist/Maplist.tsx";
import Rankings from "@pages/Rankings/Rankings.tsx";
import { get_user_id_from_token, get_user_mod_from_token } from "./utils/Jwt";

const App: React.FC = () => {
  const [token, setToken] = React.useState<string | undefined>(undefined);
  const [profile, setProfile] = React.useState<UserProfile | undefined>(
    undefined
  );
  const [isModerator, setIsModerator] = React.useState<boolean>(false);
  const [games, setGames] = React.useState<Game[]>([]);
  const [uploadRunDialog, setUploadRunDialog] = React.useState<boolean>(false);

  const _fetch_token = async () => {
    const token = await API.get_token();
    setToken(token);
  };

  const _fetch_games = async () => {
    const games = await API.get_games();
    setGames(games);
  };

  const _set_profile = useCallback(
    async (user_id?: string) => {
      if (user_id && token) {
        const user = await API.get_profile(token);
        setProfile(user);
      }
    },
    [token]
  );

  React.useEffect(() => {
    if (token === undefined) {
      setProfile(undefined);
      setIsModerator(false);
    } else {
      setProfile({} as UserProfile); // placeholder before we call actual user profile
      _set_profile(get_user_id_from_token(token));
      const modStatus = get_user_mod_from_token(token);
      if (modStatus) {
        setIsModerator(true);
      } else {
        setIsModerator(false);
      }
    }
  }, [token, _set_profile]);

  React.useEffect(() => {
    _fetch_token();
    _fetch_games();
  }, []);

  return (
    <>
      <Helmet>
        <title>LPHUB</title>
        <meta name="description" content="Least Portals Hub" />
      </Helmet>

      <UploadRunDialog
        token={token}
        open={uploadRunDialog}
        onClose={updateProfile => {
          setUploadRunDialog(false);
          if (updateProfile) {
            _set_profile(get_user_id_from_token(token));
          }
        }}
        games={games}
      />

      <div className="flex flex-row not-md:flex-col h-screen">

        <Sidebar
          setToken={setToken}
          profile={profile}
          setProfile={setProfile}
          onUploadRun={() => setUploadRunDialog(true)}
        />

        <main className="w-full h-screen">

          <Routes>
            <Route path="/" element={<Homepage />} />

            <Route
              path="/profile"
              element={
                <Profile
                  profile={profile}
                  token={token}
                  gameData={games}
                  onDeleteRecord={() => _set_profile(get_user_id_from_token(token))}
                />
              }
            />

            <Route
              path="/users/*"
              element={<User profile={profile} token={token} gameData={games} />}
            />

            <Route path="/games" element={<Games games={games} />} />

            <Route path="/games/:id" element={<Maplist />}></Route>

            <Route
              path="/maps/*"
              element={<Maps token={token} isModerator={isModerator} />}
            />

            <Route path="/rules" element={<Rules />} />

            <Route path="/about" element={<About />} />

            <Route path="/rankings" element={<Rankings />}></Route>

            <Route path="*" element={"404"} />

          </Routes>

        </main>


      </div>
    </>
  );
};

export default App;
