import axios from "axios";
import { url } from "@api/Api";
import { ModMenuContent } from "@customTypes/Content";

export const put_map_image = async (
  token: string,
  map_id: string,
  image: string
): Promise<boolean> => {
  const response = await axios.put(
    url(`maps/${map_id}/image`),
    {
      image: image,
    },
    {
      headers: {
        Authorization: token,
      },
    }
  );
  return response.data.success;
};

export const post_map_summary = async (
  token: string,
  map_id: string,
  content: ModMenuContent
): Promise<boolean> => {
  const response = await axios.post(
    url(`maps/${map_id}/summary`),
    {
      category_id: content.category_id,
      user_name: content.name,
      score_count: content.score,
      record_date: content.date,
      showcase: content.showcase,
      description: content.description,
    },
    {
      headers: {
        Authorization: token,
      },
    }
  );
  return response.data.success;
};

export const put_map_summary = async (
  token: string,
  map_id: string,
  content: ModMenuContent
): Promise<boolean> => {
  const response = await axios.put(
    url(`maps/${map_id}/summary`),
    {
      route_id: content.id,
      user_name: content.name,
      score_count: content.score,
      record_date: content.date,
      showcase: content.showcase,
      description: content.description,
    },
    {
      headers: {
        Authorization: token,
      },
    }
  );
  return response.data.success;
};

export const delete_map_summary = async (
  token: string,
  map_id: string,
  route_id: number
): Promise<boolean> => {
  const response = await axios.delete(url(`maps/${map_id}/summary`), {
    data: {
      route_id: route_id,
    },
    headers: {
      Authorization: token,
    },
  });
  return response.data.success;
};
