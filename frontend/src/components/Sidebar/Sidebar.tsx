import React, { useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserProfile } from "@customTypes/Profile";

import Header from "./Header";
import Footer from "./Footer";
import Content from "./Content";

interface SidebarProps {
  setToken: React.Dispatch<React.SetStateAction<string | undefined>>;
  profile?: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | undefined>>;
  onUploadRun: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  setToken,
  profile,
  setProfile,
  onUploadRun,
}) => {
  // const [isSidebarLocked, setIsSidebarLocked] = React.useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
  const [selectedButtonIndex, setSelectedButtonIndex] = React.useState<number>(1);

  const location = useLocation();
  const path = location.pathname;

  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // const _handle_sidebar_toggle = useCallback(() => {
  //   if (!sidebarRef.current) return;

  //   if (isSidebarOpen) {
  //     setSidebarOpen(false);
  //   } else {
  //     setSidebarOpen(true);
  //     searchbarRef.current?.focus();
  //   }
  // }, [isSidebarOpen]);

  const handle_sidebar_click = useCallback(
    (clicked_sidebar_idx: number) => {
      setSelectedButtonIndex(clicked_sidebar_idx);
      if (isSidebarOpen) {
        setSidebarOpen(false);
      }
    },
    [isSidebarOpen]
  );

  React.useEffect(() => {
    if (path === "/") {
      setSelectedButtonIndex(1);
    } else if (path.includes("games")) {
      setSelectedButtonIndex(2);
    } else if (path.includes("rankings")) {
      setSelectedButtonIndex(3);
    } else if (path.includes("profile")) {
      setSelectedButtonIndex(4);
    } else if (path.includes("rules")) {
      setSelectedButtonIndex(5);
    } else if (path.includes("about")) {
      setSelectedButtonIndex(6);
    }
  }, [path]);

  const getButtonClasses = (buttonIndex: number) => {
    const baseClasses = "flex items-center gap-3 w-full text-left bg-inherit cursor-pointer border-none rounded-[2000px] py-3 px-3 transition-all duration-300 hover:bg-panel";
    const selectedClasses = selectedButtonIndex === buttonIndex ? "bg-primary text-background" : "bg-transparent text-foreground";

    return `${baseClasses} ${selectedClasses}`;
  };

  return (
    <div className={`w-80 not-md:w-full text-white bg-block flex flex-col not-md:flex-row
      }`}>

      {/* Header */}
      <Header />

      <div className="flex h-full w-full">
        <div className="flex flex-col">
          {/* Sidebar Content */}
          <Content profile={profile} isSidebarOpen={isSidebarOpen} sidebarButtonRefs={sidebarButtonRefs} getButtonClasses={getButtonClasses} handle_sidebar_click={handle_sidebar_click} />

          {/* Bottom Section */}
          <Footer profile={profile} onUploadRun={onUploadRun} setToken={setToken} setProfile={setProfile} sidebarButtonRefs={sidebarButtonRefs} getButtonClasses={getButtonClasses} handle_sidebar_click={handle_sidebar_click} />
        </div>

        <div className="w-20">

        </div>

      </div>
    </div>
  );
};

export default Sidebar;
