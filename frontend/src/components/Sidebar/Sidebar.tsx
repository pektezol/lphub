import React, { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { UserProfile } from "@customTypes/Profile";

import _Header from "./Header";
import _Footer from "./Footer";
import _Content from "./Content";
import _Search from "./Search";
import links from "./Links";

interface SidebarProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  profile?: UserProfile;
  onUploadRun: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  setToken,
  setProfile,
  profile,
  onUploadRun,
}) => {
  const [isSearching, setIsSearching] = React.useState<boolean>(false);
  const [selectedButtonIndex, setSelectedButtonIndex] = React.useState<number>(1);

  const location = useLocation();
  const path = location.pathname;

  const handle_sidebar_click = useCallback(
    (clicked_sidebar_idx: number) => {
      setSelectedButtonIndex(clicked_sidebar_idx);

      if (clicked_sidebar_idx == 0 && !isSearching) {
        if (!isSearching) {
          setIsSearching(true);
        }
      } else {
        setIsSearching(false);
      }
    },
    [isSearching]
  );

  React.useEffect(() => {
    links.content.forEach((link, i) => {
      if (path.includes(link.to)) {
        handle_sidebar_click(i + 1);
      }
    })

    links.footer.forEach((link, i) => {
      if (path.includes(link.to)) {
        handle_sidebar_click(links.content.length + i + 1);
      }
    })
  }, [path]);

  return (
    <div className={`h-screen w-80 not-md:w-full text-white bg-block flex flex-col not-md:flex-row not-md:bg-gradient-to-t not-md:from-block not-md:to-bright
      }`}>

      {/* Header */}
      <_Header />

      <div className="flex flex-1 overflow-hidden w-full not-md:hidden ">
        <div className={`flex flex-col transition-all duration-300 ${isSearching ? "w-[64px]" : "w-full"}`}>
          {/* Sidebar Content */}
          <_Content isSearching={isSearching} selectedButtonIndex={selectedButtonIndex} handle_sidebar_click={handle_sidebar_click} />

          {/* Bottom Section */}
          <_Footer profile={profile} isSearching={isSearching} selectedButtonIndex={selectedButtonIndex} onUploadRun={onUploadRun} handle_sidebar_click={handle_sidebar_click} />
        </div>

        <div className={`flex bg-panel ${isSearching ? 'w-full' : "w-0"}`}>
          <_Search profile={profile} />
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
