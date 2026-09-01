import type { UserProfile } from "@customTypes/Profile";

export type AuthenticationState =
  | { status: "loading" }
  | { status: "guest" }
  | {
    status: "authenticated";
    token: string;
    profile: UserProfile;
    isModerator: boolean;
  };
