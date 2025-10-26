import React from "react";

import { MapDiscussion, MapDiscussions, MapDiscussionsDetail } from "@customTypes/Map";
import { MapDiscussionContent } from "@customTypes/Content";
import { time_ago } from "@utils/Time";
import { API } from "@api/Api";
import "@css/Maps.css";
import { Link } from "react-router-dom";
import useConfirm from "@hooks/UseConfirm";

interface DiscussionsProps {
  token?: string
  data?: MapDiscussions;
  isModerator: boolean;
  mapID: string;
  onRefresh: () => void;
}

const Discussions: React.FC<DiscussionsProps> = ({ token, data, isModerator, mapID, onRefresh }) => {

  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [discussionThread, setDiscussionThread] = React.useState<MapDiscussion | undefined>(undefined);
  const [discussionSearch, setDiscussionSearch] = React.useState<string>("");

  const [createDiscussion, setCreateDiscussion] = React.useState<boolean>(false);
  const [createDiscussionContent, setCreateDiscussionContent] = React.useState<MapDiscussionContent>({
    title: "",
    content: "",
  });
  const [createDiscussionCommentContent, setCreateDiscussionCommentContent] = React.useState<string>("");

  const _open_map_discussion = async (discussion_id: number) => {
    const mapDiscussion = await API.get_map_discussion(mapID, discussion_id);
    setDiscussionThread(mapDiscussion);
  };

  const _create_map_discussion = async () => {
    if (token) {
      await API.post_map_discussion(token, mapID, createDiscussionContent);
      setCreateDiscussion(false);
      onRefresh();
    }
  };

  const _create_map_discussion_comment = async (discussion_id: number) => {
    if (token) {
      await API.post_map_discussion_comment(token, mapID, discussion_id, createDiscussionCommentContent);
      await _open_map_discussion(discussion_id);
    }
  };

  const _delete_map_discussion = async (discussion: MapDiscussionsDetail) => {
    if (await confirm("Delete Map Discussion", `Are you sure you want to remove post: ${discussion.title}?`)) {
      if (token) {
        await API.delete_map_discussion(token, mapID, discussion.id);
        onRefresh();
      }
    }
  };

  return (
    <section id='section7' className='summary3'>
      {ConfirmDialogComponent}
      <div id='discussion-search'>
        <input type="text" value={discussionSearch} placeholder={"Search for posts..."} onChange={(e) => setDiscussionSearch(e.target.value)} />
        <div><button onClick={() => setCreateDiscussion(true)}>New Post</button></div>
      </div>

      { // janky ternary operators here, could divide them to more components?
        createDiscussion ?
          (
            <div id='discussion-create'>
              <span>Create Post</span>
              <button onClick={() => setCreateDiscussion(false)}>X</button>
              <div style={{ gridColumn: "1 / span 2" }}>
                <input id='discussion-create-title' placeholder='Title...' onChange={(e) => setCreateDiscussionContent({
                  ...createDiscussionContent,
                  title: e.target.value,
                })} />
                <input id='discussion-create-content' placeholder='Enter the content...' onChange={(e) => setCreateDiscussionContent({
                  ...createDiscussionContent,
                  content: e.target.value,
                })} />
              </div>
              <div style={{ placeItems: "end", gridColumn: "1 / span 2" }}>
                <button id='discussion-create-button' onClick={() => _create_map_discussion()}>Post</button>
              </div>
            </div>
          )
          :
          discussionThread ?
            (
              <div id='discussion-thread'>
                <div>
                  <span>{discussionThread.discussion.title}</span>
                  <button onClick={() => setDiscussionThread(undefined)}>X</button>
                </div>

                <div>
                  <Link to={`/users/${discussionThread.discussion.creator.steam_id}`}>
                    <img src={discussionThread.discussion.creator.avatar_link} alt="" />
                  </Link>
                  <div>
                    <span>{discussionThread.discussion.creator.user_name}</span>
                    <span>{time_ago(new Date(discussionThread.discussion.created_at.replace("T", " ").replace("Z", "")))}</span>
                    <span>{discussionThread.discussion.content}</span>
                  </div>
                  {discussionThread.discussion.comments ?
                    discussionThread.discussion.comments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(e => (
                        <>
                          <Link to={`/users/${e.user.steam_id}`}>
                            <img src={e.user.avatar_link} alt="" />
                          </Link>
                          <div>
                            <span>{e.user.user_name}</span>
                            <span>{time_ago(new Date(e.date.replace("T", " ").replace("Z", "")))}</span>
                            <span>{e.comment}</span>
                          </div>
                        </>
                      )) : ""
                  }
                </div>
                <div id='discussion-send'>
                  <input type="text" value={createDiscussionCommentContent} placeholder={"Message"}
                    onKeyDown={(e) => e.key === "Enter" && _create_map_discussion_comment(discussionThread.discussion.id)}
                    onChange={(e) => setCreateDiscussionCommentContent(e.target.value)} />
                  <div><button onClick={() => {
                    if (createDiscussionCommentContent !== "") {
                      _create_map_discussion_comment(discussionThread.discussion.id);
                      setCreateDiscussionCommentContent("");
                    }
                  }}>Send</button></div>
                </div>

              </div>
            )
            :
            (
              data ?
                (<>
                  {data.discussions.filter(f => f.title.includes(discussionSearch)).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .map((e) => (
                      <div id='discussion-post'>
                        <button key={e.id} onClick={() => _open_map_discussion(e.id)}>
                          <span>{e.title}</span>
                          {isModerator ?
                            <button onClick={(m) => {
                              m.stopPropagation();
                              _delete_map_discussion(e);
                            }}>Delete Post</button>
                            : <span></span>
                          }
                          <span><b>{e.creator.user_name}:</b> {e.content}</span>
                          <span>Last Updated: {time_ago(new Date(e.updated_at.replace("T", " ").replace("Z", "")))}</span>
                        </button>
                      </div>
                    ))}
                </>)
                :
                (<span style={{ textAlign: "center", display: "block" }}>No Discussions...</span>)
            )
      }
    </section>
  );
};

export default Discussions;
