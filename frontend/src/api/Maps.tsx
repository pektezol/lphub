import axios from "axios";
import { url } from "./Api";
import { MapDiscussionContent, UploadRunContent } from "../types/Content";
import { MapSummary, MapLeaderboard, MapDiscussions, MapDiscussion } from "../types/Map";

export const get_map_summary = async (map_id: string): Promise<MapSummary> => {
  const response = await axios.get(url(`maps/${map_id}/summary`))
  return response.data.data;
};

export const get_map_leaderboard = async (map_id: string): Promise<MapLeaderboard | undefined> => {
  const response = await axios.get(url(`maps/${map_id}/leaderboards`));
  console.log(response)
  if (!response.data.success) {
    return undefined;
  }
  const data = response.data.data;
  console.log(data.records)
  // map the kind of leaderboard
  data.records = data.records.map((record: any) => {
    if (record.host && record.partner) {
      return { ...record, kind: 'multiplayer' };
    } else {
      return { ...record, kind: 'singleplayer' };
    }
  });
  return data;
};

export const get_map_discussions = async (map_id: string): Promise<MapDiscussions | undefined> => {
  const response = await axios.get(url(`maps/${map_id}/discussions`));
  if (!response.data.data.discussions) {
    return undefined;
  }
  return response.data.data;
};

export const get_map_discussion = async (map_id: string, discussion_id: number): Promise<MapDiscussion | undefined> => {
  const response = await axios.get(url(`maps/${map_id}/discussions/${discussion_id}`));
  if (!response.data.data.discussion) {
    return undefined;
  }
  return response.data.data;
};

export const post_map_discussion = async (token: string, map_id: string, content: MapDiscussionContent): Promise<boolean> => {
  const response = await axios.post(url(`maps/${map_id}/discussions`), {
    "title": content.title,
    "content": content.content,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const post_map_discussion_comment = async (token: string, map_id: string, discussion_id: number, comment: string): Promise<boolean> => {
  const response = await axios.post(url(`maps/${map_id}/discussions/${discussion_id}`), {
    "comment": comment,
  }, {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const delete_map_discussion = async (token: string, map_id: string, discussion_id: number): Promise<boolean> => {
  const response = await axios.delete(url(`maps/${map_id}/discussions/${discussion_id}`), {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};

export const post_record = async (token: string, run: UploadRunContent): Promise<[boolean, string]> => {
  if (run.partner_demo) {
    const response = await axios.postForm(url(`maps/${run.map_id}/record`), {
      "host_demo": run.host_demo,
      "partner_demo": run.partner_demo,
    }, {
      headers: {
        "Authorization": token,
      }
    });
    return [ response.data.success, response.data.message ];
  } else {
    const response = await axios.postForm(url(`maps/${run.map_id}/record`), {
      "host_demo": run.host_demo,
    }, {
      headers: {
        "Authorization": token,
      }
    });
    return [ response.data.success, response.data.message ];
  }
}

export const delete_map_record = async (token: string, map_id: number, record_id: number): Promise<boolean> => {
  const response = await axios.delete(url(`maps/${map_id}/record/${record_id}`), {
    headers: {
      "Authorization": token,
    }
  });
  return response.data.success;
};
