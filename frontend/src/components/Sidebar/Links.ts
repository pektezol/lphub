import {
    FlagIcon,
    HomeIcon,
    PortalIcon,
    BookIcon,
    HelpIcon,
} from "../../images/Images";

export interface SidebarLink {
    to: string;
    icon: any;
    label: string;
};

export interface SidebarLinks {
    content: SidebarLink[];
    footer: SidebarLink[];
}

const links: SidebarLinks = {
    content: [
        {
            to: "/",
            icon: HomeIcon,
            label: "Home Page"
        },
        {
            to: "/games",
            icon: PortalIcon,
            label: "Games"
        },
        {
            to: "/rankings",
            icon: FlagIcon,
            label: "Rankings"
        },
    ],

    footer: [
        {
            to: "/rules",
            icon: BookIcon,
            label: "Leaderboard Rules"
        },
        {
            to: "/about",
            icon: HelpIcon,
            label: "About"
        },
    ]
}

export default links;
