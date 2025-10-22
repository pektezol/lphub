import axios from "axios";
import { url } from "@api/Api";
import { Ranking, SteamRanking } from "@customTypes/Ranking";

export const get_official_rankings = async (): Promise<Ranking> => {
  const response = await axios.get(url("rankings/lphub"));
  return response.data.data;
};

export const get_unofficial_rankings = async (): Promise<SteamRanking> => {
  const response = await axios.get(url("rankings/steam"));
  return response.data.data;
};
