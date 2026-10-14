import { url } from "@api/Api";
import { ModMenuContent } from "@customTypes/Content";
import axios from "axios";

export const put_map_image = async (token: string, map_id: string, image: string): Promise<boolean> => {
  const response = await axios.put(url(`maps/${map_id}/image`), {
    "image": image,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const put_map_difficulty = async (token: string, map_id: string, difficulty: number): Promise<boolean> => {
  const response = await axios.put(url(`maps/${map_id}/difficulty`), {
    "difficulty": difficulty,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const post_map_summary = async (token: string, map_id: string, content: ModMenuContent): Promise<boolean> => {
  const response = await axios.post(url(`maps/${map_id}/summary`), {
    "category_id": content.category_id,
    "user_name": content.name,
    "score_count": content.score,
    "record_date": content.date,
    "showcase": content.showcase,
    "description": content.description,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const put_map_summary = async (token: string, map_id: string, content: ModMenuContent): Promise<boolean> => {
  const response = await axios.put(url(`maps/${map_id}/summary`), {
    "route_id": content.id,
    "user_name": content.name,
    "score_count": content.score,
    "record_date": content.date,
    "showcase": content.showcase,
    "description": content.description,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const delete_map_summary = async (token: string, map_id: string, route_id: number): Promise<boolean> => {
  const response = await axios.delete(url(`maps/${map_id}/summary`), {
    data: {
      "route_id": route_id,
    },
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export interface RouteDescriptionSuggestion {
  id: number;
  map_id: number;
  route_id: number;
  map_name: string;
  game_name: string;
  section_name: string;
  category_name: string;
  submitter_id: string;
  submitter_name: string;
  submitted_description: string;
  current_description: string;
  proposed_description: string;
  created_at: string;
}

export const post_route_description_suggestion = async (
  token: string, map_id: number, route_id: number, description: string,
): Promise<boolean> => {
  const response = await axios.post(url(`maps/${map_id}/routes/${route_id}/description-suggestions`), { description }, {
    headers: { Authorization: token },
  });
  return response.data.success;
};

export const get_route_description_suggestions = async (token: string): Promise<RouteDescriptionSuggestion[]> => {
  const response = await axios.get(url("moderation/route-description-suggestions"), {
    headers: { Authorization: token },
  });
  return response.data.data?.suggestions ?? [];
};

export const review_route_description_suggestion = async (
  token: string, id: number, decision: "accepted" | "rejected",
): Promise<boolean> => {
  const response = await axios.post(url(`moderation/route-description-suggestions/${id}/review`), { decision }, {
    headers: { Authorization: token },
  });
  return response.data.success;
};
