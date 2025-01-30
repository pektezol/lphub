import axios from "axios";
import { url } from "@api/Api";

export const get_token = async (): Promise<string | undefined> => {
  const response = await axios.get(url(`token`));
  if (!response.data.success) {
    return undefined;
  }
  return response.data.data.token;
};

export const delete_token = async () => {
  await axios.delete(url("token"));
};
