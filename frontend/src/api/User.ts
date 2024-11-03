import axios from "axios";
import { url } from "@api/Api";
import { UserProfile } from "@customTypes/Profile";

export const get_user = async (user_id: string): Promise<UserProfile> => {
  const response = await axios.get(url(`users/${user_id}`));
  return response.data.data;
};

export const get_profile = async (token: string): Promise<UserProfile> => {
  const response = await axios.get(url(`profile`), {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.data;
};

export const post_profile = async (token: string) => {
  const _ = await axios.post(url(`profile`), {}, {
    headers: {
      "Authorization": token,
    }
  });
};
