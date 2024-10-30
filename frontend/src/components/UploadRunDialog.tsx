import React from 'react';
import { UploadRunContent } from '../types/Content';
import { ScoreboardTempUpdate, SourceDemoParser, NetMessages } from '@nekz/sdp';

import '../css/UploadRunDialog.css';
import { Game } from '../types/Game';
import { Map } from '../types/Map';
import { API } from '../api/Api';
import { useNavigate } from 'react-router-dom';
import useMessage from '../hooks/UseMessage';
import useConfirm from '../hooks/UseConfirm';
import useMessageLoad from "../hooks/UseMessageLoad";

interface UploadRunDialogProps {
  token?: string;
  open: boolean;
  onClose: (updateProfile: boolean) => void;
  games: Game[];
}

const UploadRunDialog: React.FC<UploadRunDialogProps> = ({ token, open, onClose, games }) => {

  const { message, MessageDialogComponent } = useMessage();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { messageLoad, messageLoadClose, MessageDialogLoadComponent } = useMessageLoad();

  const navigate = useNavigate();

  const [uploadRunContent, setUploadRunContent] = React.useState<UploadRunContent>({
    map_id: 0,
    host_demo: null,
    partner_demo: null,
  });

  const [currentMap, setCurrentMap] = React.useState<string>("");

  const _set_current_map = (game_name: string) => {
    setCurrentMap(game_name);
  }

  const [selectedGameID, setSelectedGameID] = React.useState<number>(0);
  const [selectedGameMaps, setSelectedGameMaps] = React.useState<Map[]>([]);
  const [selectedGameName, setSelectedGameName] = React.useState<string>("");

  // dropdowns
  const [dropdown1Vis, setDropdown1Vis] = React.useState<boolean>(false);
  const [dropdown2Vis, setDropdown2Vis] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState<boolean>(false);

  const [dragHightlight, setDragHighlight] = React.useState<boolean>(false);
  const [dragHightlightPartner, setDragHighlightPartner] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRefPartner = React.useRef<HTMLInputElement>(null);

  const _handle_file_click = (host: boolean) => {
    if (host) {
      fileInputRef.current?.click();
    } else {
      fileInputRefPartner.current?.click();
    }
  }

  const _handle_drag_over = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (host) {
      setDragHighlight(true);
    } else {
      setDragHighlightPartner(true);
    }
  }

  const _handle_drag_leave = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (host) {
      setDragHighlight(false);
    } else {
      setDragHighlightPartner(false);
    }
  }

  const _handle_drop = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragHighlight(true);

    _handle_file_change(e.dataTransfer.files, host);
  }

  const _handle_dropdowns = (dropdown: number) => {
    setDropdown1Vis(false);
    setDropdown2Vis(false);
    if (dropdown == 1) {
      setDropdown1Vis(!dropdown1Vis);
    } else if (dropdown == 2) {
      setDropdown2Vis(!dropdown2Vis);
      document.querySelector("#dropdown2")?.scrollTo(0, 0);
    }
  }

  const _handle_game_select = async (game_id: string, game_name: string) => {
    setLoading(true);
    const gameMaps = await API.get_game_maps(game_id);
    setSelectedGameMaps(gameMaps);
    setUploadRunContent({
      map_id: gameMaps.find((map) => !map.is_disabled)!.id, //gameMaps[0].id,
      host_demo: null,
      partner_demo: null,
    });
    _set_current_map(gameMaps.find((map) => !map.is_disabled)!.name);
    setSelectedGameID(parseInt(game_id) - 1);
    setSelectedGameName(game_name);
    setLoading(false);
  };

  const _handle_file_change = async (files: FileList | null, host: boolean) => {
    if (files) {
      if (host) {
        setUploadRunContent({
          ...uploadRunContent,
          host_demo: files[0],
        });
      } else {
        setUploadRunContent({
          ...uploadRunContent,
          partner_demo: files[0],
        });
      }
    }
  };

  const _upload_run = async () => {
    if (token) {
      if (games[selectedGameID].is_coop) {
        if (uploadRunContent.host_demo === null) {
          await message("Error", "You must select a host demo to upload.")
          return
        } else if (uploadRunContent.partner_demo === null) {
          await message("Error", "You must select a partner demo to upload.")
          return
        }
      } else {
        if (uploadRunContent.host_demo === null) {
          await message("Error", "You must select a demo to upload.")
          return
        }
      }
      const demo = SourceDemoParser.default()
        .setOptions({ packets: true, header: true })
        .parse(await uploadRunContent.host_demo.arrayBuffer());
      const scoreboard = demo.findPacket<NetMessages.SvcUserMessage>((msg) => {
        return msg instanceof NetMessages.SvcUserMessage && msg.userMessage instanceof ScoreboardTempUpdate;
      })

      if (!scoreboard) {
        await message("Error", "Error while processing demo: Unable to get scoreboard result. Either there is a demo that is corrupt or haven't been recorded in challenge mode.")
        return
      }
      const { portalScore, timeScore } = scoreboard.userMessage?.as<ScoreboardTempUpdate>() ?? {};

      const userConfirmed = await confirm("Upload Record", `Map Name: ${demo.mapName}\nPortal Count: ${portalScore}\nTicks: ${timeScore}\n\nAre you sure you want to upload this demo?`);

      if (!userConfirmed) {
        return;
      }

      messageLoad("Uploading...");
      const [success, response] = await API.post_record(token, uploadRunContent);
      messageLoadClose();
      await message("Upload Record", response);
      if (success) {
        onClose(success);
        navigate("/profile");
      }
    }
  };

  React.useEffect(() => {
    if (open) {

      setDragHighlightPartner(false);
      setDragHighlight(false);
      _handle_game_select("1", "Portal 2 - Singleplayer"); // a different approach?.
    }
  }, [open]);

  if (open) {
    return (
      <>
        <div id="upload-run-block" />
        {MessageDialogComponent}
        {MessageDialogLoadComponent}
        {ConfirmDialogComponent}

        <div id='upload-run-menu'>
          <div id='upload-run-menu-add'>
            <div id='upload-run-route-category'>
              <div style={{ padding: "15px 0px" }} className='upload-run-dropdown-container'>
                <h2 style={{ margin: "10px 0px" }}>Select Game</h2>
                <div onClick={() => _handle_dropdowns(1)} style={{ display: "flex", alignItems: "center", cursor: "pointer", justifyContent: "space-between" }}>
                  <div className='dropdown-cur'>{selectedGameName}</div>
                  <i style={{ rotate: "-90deg", transform: "translate(-5px, 10px)" }} className="triangle"></i>
                </div>
                <div className={dropdown1Vis ? "upload-run-dropdown" : "upload-run-dropdown hidden"}>
                  {games.map((game) => (
                    <div onClick={() => { _handle_game_select(game.id.toString(), game.name); _handle_dropdowns(1) }} key={game.id}>{game.name}</div>
                  ))}
                </div>
              </div>
              {
                !loading &&
                (
                  <>
                    <div className='upload-run-map-container' style={{ paddingBottom: "10px" }}>
                      <div style={{ padding: "15px 0px" }}>
                        <h2 style={{ margin: "10px 0px" }}>Select Map</h2>
                        <div onClick={() => _handle_dropdowns(2)} style={{ display: "flex", alignItems: "center", cursor: "pointer", justifyContent: "space-between" }}>
                          <span style={{ userSelect: "none" }}>{currentMap}</span>
                          <i style={{ rotate: "-90deg", transform: "translate(-5px, 10px)" }} className="triangle"></i>
                        </div>
                      </div>
                      <div>
                        <div id='dropdown2' className={dropdown2Vis ? "upload-run-dropdown" : "upload-run-dropdown hidden"}>
                          {selectedGameMaps && selectedGameMaps.filter(gameMap => !gameMap.is_disabled).map((gameMap) => (
                            <div onClick={() => { setUploadRunContent({ ...uploadRunContent, map_id: gameMap.id }); _set_current_map(gameMap.name); _handle_dropdowns(2); }} key={gameMap.id}>{gameMap.name}</div>
                          ))}
                        </div>
                      </div>
                      <h2 style={{ margin: "10px 0px" }}>Host Demo</h2>
                      <div onClick={() => { _handle_file_click(true) }} onDragOver={(e) => { _handle_drag_over(e, true) }} onDrop={(e) => { _handle_drop(e, true) }} onDragLeave={(e) => { _handle_drag_leave(e, true) }} className={`upload-run-drag-area ${dragHightlight ? "upload-run-drag-area-highlight" : ""} ${uploadRunContent.host_demo ? "upload-run-drag-area-hidden" : ""}`}>
                        <input ref={fileInputRef} type="file" name="host_demo" id="host_demo" accept=".dem" onChange={(e) => _handle_file_change(e.target.files, true)} />
                        {!uploadRunContent.host_demo ?
                          <div>
                            <span>Drag and drop</span>
                            <div>
                              <span style={{ fontFamily: "BarlowSemiCondensed-Regular" }}>Or click here</span><br />
                              <button style={{ borderRadius: "24px", padding: "5px 8px", margin: "5px 0px" }}>Upload</button>
                            </div>
                          </div>
                          : null}

                        <span className="upload-run-demo-name">{uploadRunContent.host_demo?.name}</span>
                      </div>
                      {
                        games[selectedGameID].is_coop &&
                        (
                          <>
                            <h2 style={{ margin: "10px 0px" }}>Partner Demo</h2>
                            <div onClick={() => { _handle_file_click(false) }} onDragOver={(e) => { _handle_drag_over(e, false) }} onDrop={(e) => { _handle_drop(e, false) }} onDragLeave={(e) => { _handle_drag_leave(e, false) }} className={`upload-run-drag-area ${dragHightlightPartner ? "upload-run-drag-area-highlight-partner" : ""} ${uploadRunContent.partner_demo ? "upload-run-drag-area-hidden" : ""}`}>
                              <input ref={fileInputRefPartner} type="file" name="partner_demo" id="partner_demo" accept=".dem" onChange={(e) => _handle_file_change(e.target.files, false)} />						  {!uploadRunContent.partner_demo ?
                                <div>
                                  <span>Drag and drop</span>
                                  <div>
                                    <span style={{ fontFamily: "BarlowSemiCondensed-Regular" }}>Or click here</span><br />
                                    <button style={{ borderRadius: "24px", padding: "5px 8px", margin: "5px 0px" }}>Upload</button>
                                  </div>
                                </div>
                                : null}

                              <span className="upload-run-demo-name">{uploadRunContent.partner_demo?.name}</span>
                            </div>
                          </>
                        )
                      }
                      <div className='search-container'>

                      </div>
                      <div className='upload-run-buttons-container'>
                        <button onClick={_upload_run}>Submit</button>
                        <button onClick={() => onClose(false)}>Cancel</button>
                      </div>
                    </div>
                  </>
                )
              }
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <></>
  );

};

export default UploadRunDialog;
