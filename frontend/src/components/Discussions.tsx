import React from "react";
import DiscussionThread from "@components/DiscussionThread";
import DiscussionComposer from "@components/DiscussionComposer";
import DiscussionCard from "@components/DiscussionCard";
import feedStyles from "@css/DiscussionFeed.module.css";

import { MapDiscussion, MapDiscussions, MapDiscussionsDetail } from "@customTypes/Map";
import { API } from "@api/Api";

import { useSearchParams } from "react-router-dom";
import useConfirm from "@hooks/UseConfirm";
import mapsStyles from "@css/Maps.module.css";

interface DiscussionsProps {
  token?: string;
  data?: MapDiscussions;
  isModerator: boolean;
  mapID: string;
  onRefresh: () => void;
}

const Discussions: React.FC<DiscussionsProps> = ({ token, data, isModerator, mapID, onRefresh }) => {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [params, setParams] = useSearchParams();
  const [threadError, setThreadError] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    const id = Number(params.get("discussion"));
    setThreadError(false);
    if (id > 0)
      void API.get_map_discussion(mapID, id)
        .then((thread) => {
          if (active) {
            setDiscussionThread(thread);
            setThreadError(!thread);
          }
        })
        .catch(() => {
          if (active) setThreadError(true);
        });
    else setDiscussionThread(undefined);
    setCreateDiscussion(params.get("create") === "1");
    return () => {
      active = false;
    };
  }, [mapID, params]);

  const [discussionThread, setDiscussionThread] = React.useState<MapDiscussion | undefined>(undefined);
  const [discussionSearch, setDiscussionSearch] = React.useState<string>("");

  const [createDiscussion, setCreateDiscussion] = React.useState<boolean>(false);
  const closeComposer = () => {
    setCreateDiscussion(false);
    const next = new URLSearchParams(params);
    next.delete("create");
    setParams(next);
  };

  const _delete_map_discussion = async (discussion: MapDiscussionsDetail) => {
    if (await confirm("Delete Map Discussion", `Are you sure you want to remove post: ${discussion.title}?`)) {
      if (token) {
        setDeleteError(false);
        try {
          const success = await API.delete_map_discussion(token, mapID, discussion.id);
          if (!success) throw new Error("Delete failed");
          onRefresh();
        } catch {
          setDeleteError(true);
        }
      }
    }
  };

  return (
    <section id="section7" className={mapsStyles.idSection7}>
      {ConfirmDialogComponent}
      {threadError && <p>Discussion unavailable or could not be loaded.</p>}
      {deleteError && <p role="alert">Could not delete the post. Please try again.</p>}
      {!discussionThread && (
        <div
          id="discussion-search"
          className={
            token
              ? mapsStyles.idDiscussionSearch
              : `${mapsStyles.idDiscussionSearch} ${mapsStyles.discussionSearchGuest}`
          }
        >
          <input
            type="text"
            value={discussionSearch}
            placeholder={"Search for posts..."}
            onChange={(e) => setDiscussionSearch(e.target.value)}
          />
          {token && (
            <div>
              <button onClick={() => setCreateDiscussion(true)}>New Post</button>
            </div>
          )}
        </div>
      )}

      {
        // janky ternary operators here, could divide them to more components?
        createDiscussion ? (
          <DiscussionComposer
            mapID={mapID}
            token={token}
            onClose={closeComposer}
            onCreated={() => {
              closeComposer();
              onRefresh();
            }}
          />
        ) : discussionThread ? (
          <DiscussionThread
            key={discussionThread.discussion.id}
            thread={discussionThread}
            mapID={mapID}
            token={token}
            onUpdate={setDiscussionThread}
            onRefresh={onRefresh}
            onClose={() => {
              setDiscussionThread(undefined);
              const next = new URLSearchParams(params);
              next.delete("discussion");
              setParams(next);
            }}
          />
        ) : data && data.discussions.length ? (
          <div className={feedStyles.list}>
            {data.discussions
              .filter((d) => d.title.toLowerCase().includes(discussionSearch.toLowerCase()))
              .map((d) => (
                <DiscussionCard
                  key={d.id}
                  to={`/maps/${mapID}?tab=discussions&discussion=${d.id}`}
                  title={d.title}
                  author={d.creator.user_name}
                  content={d.content}
                  replies={d.reply_count}
                  activity={d.activity_at}
                  onDelete={isModerator ? () => void _delete_map_discussion(d) : undefined}
                />
              ))}
          </div>
        ) : (
          <span className={mapsStyles.emptyDiscussions}>No Discussions...</span>
        )
      }
    </section>
  );
};

export default Discussions;
