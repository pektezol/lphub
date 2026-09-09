import axios from "axios";
import { url } from "@api/Api";
import { ProfileStatistics, UserProfile } from "@customTypes/Profile";

export const get_user = async (user_id: string): Promise<UserProfile> => {
  const response = await axios.get(url(`users/${user_id}`));
  return response.data.data;
};

export const get_profile = async (token: string): Promise<UserProfile> => {
  const response = await axios.get(url("profile"), {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.data;
};

export const get_user_statistics = async (
  user_id: string,
): Promise<ProfileStatistics> => {
  const response = await axios.get<{
    success: boolean;
    message: string;
    data: ProfileStatistics | null;
  }>(url(`users/${user_id}/statistics`));

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Could not retrieve user statistics.");
  }

  return response.data.data;
};

export const post_profile = async (token: string) => {
  await axios.post(url("profile"), {}, {
    headers: {
      "Authorization": token,
    }
  });
};
