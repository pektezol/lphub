import axios from "axios";
import { url } from "@api/Api";

const cache = new Map<string, unknown>();
const requests = new Map<string, Promise<unknown>>();

export function fetchStats<T>(game: number, kind: string, offset = 0): Promise<T> {
  const key = `${game}:${kind}`;
  if (offset === 0 && cache.has(key)) return Promise.resolve(cache.get(key) as T);
  if (offset === 0 && requests.has(key)) return requests.get(key) as Promise<T>;

  const request = axios
    .get(url("stats/statistics"), { params: { game_id: game, kind, offset } })
    .then((response) => {
      if (!response.data?.success || !response.data.data) throw new Error("Statistics unavailable");
      if (offset === 0) cache.set(key, response.data.data);
      return response.data.data as T;
    })
    .finally(() => {
      if (offset === 0) requests.delete(key);
    });
  if (offset === 0) requests.set(key, request);
  return request;
}
