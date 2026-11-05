import React from "react";
import axios from "axios";
import { UploadRunContent } from "@customTypes/Content";
import { SourceDemoParser } from "@nekz/sdp";

import { Game } from "@customTypes/Game";
import { API } from "@api/Api";
import { useNavigate } from "react-router-dom";
import useMessage from "@hooks/UseMessage";
import useConfirm from "@hooks/UseConfirm";
import useMessageLoad from "@hooks/UseMessageLoad";
import { MapNames } from "@customTypes/MapNames";
import uploadRunDialogStyles from "@css/UploadRunDialog.module.css";
import navigationStyles from "@css/Navigation.module.css";
import { classNames } from "@css/utils";

interface UploadRunDialogProps {
  token?: string;
  open: boolean;
  onClose: (updateProfile: boolean) => void;
  games: Game[];
}

const DEMO_HEADER_SIZE = 1072;

const UploadRunDialog: React.FC<UploadRunDialogProps> = ({ token, open, onClose, games }) => {
  const { message, MessageDialogComponent } = useMessage();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const { messageLoad, messageLoadUpdate, messageLoadClose, MessageDialogLoadComponent } = useMessageLoad();

  const navigate = useNavigate();

  const [uploadRunContent, setUploadRunContent] = React.useState<UploadRunContent>({
    host_demo: null,
    partner_demo: null,
  });
  const [isUploading, setIsUploading] = React.useState(false);

  const [selectedGameID, setSelectedGameID] = React.useState<number | null>(null);
  const selectedGame = games.find((game) => game.id === selectedGameID);

  // dropdowns
  const [dropdown1Vis, setDropdown1Vis] = React.useState<boolean>(false);
  const [dropdown2Vis, setDropdown2Vis] = React.useState<boolean>(false);

  const [dragHightlight, setDragHighlight] = React.useState<boolean>(false);
  const [dragHightlightPartner, setDragHighlightPartner] = React.useState<boolean>(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRefPartner = React.useRef<HTMLInputElement>(null);

  const _clear_partner_demo = React.useCallback(() => {
    setUploadRunContent((content) => (content.partner_demo === null ? content : { ...content, partner_demo: null }));
    setDragHighlightPartner(false);
    if (fileInputRefPartner.current) {
      fileInputRefPartner.current.value = "";
    }
  }, []);

  const _handle_file_click = (host: boolean) => {
    if (host) {
      fileInputRef.current?.click();
    } else {
      fileInputRefPartner.current?.click();
    }
  };

  const _handle_drag_over = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (host) {
      setDragHighlight(true);
    } else {
      setDragHighlightPartner(true);
    }
  };

  const _handle_drag_leave = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (host) {
      setDragHighlight(false);
    } else {
      setDragHighlightPartner(false);
    }
  };

  const _handle_drop = (e: React.DragEvent<HTMLDivElement>, host: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragHighlight(true);

    _handle_file_change(e.dataTransfer.files, host);
  };

  const _handle_dropdowns = (dropdown: number) => {
    setDropdown1Vis(false);
    setDropdown2Vis(false);
    if (dropdown == 1) {
      setDropdown1Vis(!dropdown1Vis);
    } else if (dropdown == 2) {
      setDropdown2Vis(!dropdown2Vis);
      document.querySelector("#dropdown2")?.scrollTo(0, 0);
    }
  };

  const _handle_game_select = (gameID: number) => {
    const game = games.find((candidate) => candidate.id === gameID);
    if (!game) {
      return;
    }

    setSelectedGameID(game.id);
    if (!game.is_coop) {
      _clear_partner_demo();
    }
  };

  const _handle_file_change = async (files: FileList | null, host: boolean) => {
    if (files) {
      if (host) {
        setUploadRunContent((content) => ({
          ...content,
          host_demo: files[0],
        }));
      } else {
        setUploadRunContent((content) => ({
          ...content,
          partner_demo: files[0],
        }));
      }
    }
  };

  const _upload_run = async () => {
    if (!token || isUploading) {
      return;
    }

    if (!selectedGame) {
      await message("Error", "Game data is still loading. Please wait before submitting.");
      return;
    }

    const { host_demo, partner_demo } = uploadRunContent;
    if (host_demo === null) {
      await message(
        "Error",
        selectedGame.is_coop ? "You must select a host demo to upload." : "You must select a demo to upload.",
      );
      return;
    }

    if (selectedGame.is_coop && partner_demo === null) {
      await message("Error", "You must select a partner demo to upload.");
      return;
    }

    if (host_demo.size < DEMO_HEADER_SIZE) {
      await message("Error", "Error while processing demo: The selected file is too small to be a valid demo.");
      return;
    }

    setIsUploading(true);
    messageLoad("Reading demo header...");

    let mapName: string | undefined;
    try {
      const demo = SourceDemoParser.default()
        .setOptions({ header: true, messages: false })
        .parse(await host_demo.slice(0, DEMO_HEADER_SIZE).arrayBuffer());
      mapName = demo.mapName;
    } catch {
      messageLoadClose();
      setIsUploading(false);
      await message(
        "Error",
        "Error while processing demo: Unable to read the demo header. Please select a valid .dem file.",
      );
      return;
    }
    messageLoadClose();

    if (!mapName || !MapNames[mapName]) {
      setIsUploading(false);
      await message("Error", "Error while processing demo: Invalid map name.");
      return;
    }
    const map = MapNames[mapName];

    if (map.game_id !== selectedGame.id) {
      setIsUploading(false);
      await message("Error", "Error while processing demo: Demo does not belong to the selected game.");
      return;
    }

    const userConfirmed = await confirm(
      "Upload Record",
      `Map Name: ${mapName}\n\nThe score will be verified after upload.\n\nAre you sure you want to upload this demo?`,
    );

    if (!userConfirmed) {
      setIsUploading(false);
      return;
    }

    const uploadTarget = selectedGame.is_coop ? "demos" : "demo";
    messageLoad(`Uploading ${uploadTarget}...`);

    let success = false;
    let response = "Could not upload the demo. Please try again.";
    try {
      const result = await API.post_record(token, uploadRunContent, map.id, selectedGame.is_coop, (percentage) => {
        messageLoadUpdate(
          percentage === 100 ? `Processing uploaded ${uploadTarget}...` : `Uploading ${uploadTarget}... ${percentage}%`,
        );
      });
      success = result.success;
      response = result.message;
      if (success && result.data) {
        response += `\n\nPortal Count: ${result.data.score_count}\nTicks: ${result.data.score_time}`;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        response = "The demo is too large for this upload server. Please contact an administrator.";
      } else if (axios.isAxiosError(error) && error.code === "ERR_NETWORK") {
        response = "Could not reach the upload server. Please check your connection and try again.";
      }
    } finally {
      messageLoadClose();
      setIsUploading(false);
    }

    await message("Upload Record", response);
    if (success) {
      setUploadRunContent({
        host_demo: null,
        partner_demo: null,
      });
      onClose(success);
      navigate("/profile");
    }
  };

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setDragHighlightPartner(false);
    setDragHighlight(false);
    setDropdown1Vis(false);
    setDropdown2Vis(false);
    setSelectedGameID((currentGameID) =>
      games.some((game) => game.id === currentGameID) ? currentGameID : (games[0]?.id ?? null),
    );
  }, [open, games]);

  React.useEffect(() => {
    if (selectedGame?.is_coop !== false) {
      return;
    }

    _clear_partner_demo();
  }, [selectedGame?.id, selectedGame?.is_coop, _clear_partner_demo]);

  if (open) {
    return (
      <>
        <div id="upload-run-block" className={uploadRunDialogStyles.idUploadRunBlock} />
        {MessageDialogComponent}
        {MessageDialogLoadComponent}
        {ConfirmDialogComponent}

        <div id="upload-run-menu" className={uploadRunDialogStyles.idUploadRunMenu}>
          <div id="upload-run-menu-add" className={uploadRunDialogStyles.idUploadRunMenuAdd}>
            <div id="upload-run-route-category">
              <div
                className={classNames(
                  uploadRunDialogStyles.uploadRunDropdownContainer,
                  uploadRunDialogStyles.uploadRunItem,
                  uploadRunDialogStyles.gameField,
                )}
              >
                <h3 className={uploadRunDialogStyles.gameHeading}>Select Game</h3>
                <div
                  onClick={games.length > 0 ? () => _handle_dropdowns(1) : undefined}
                  className={classNames(
                    uploadRunDialogStyles.gamePicker,
                    games.length > 0 ? uploadRunDialogStyles.gameSelectable : uploadRunDialogStyles.gameUnavailable,
                  )}
                >
                  <div className={uploadRunDialogStyles.dropdownCur}>{selectedGame?.name ?? "Loading games..."}</div>
                  <i className={classNames(navigationStyles.triangle, uploadRunDialogStyles.gamePickerArrow)}></i>
                </div>
                <div
                  className={classNames(
                    dropdown1Vis
                      ? uploadRunDialogStyles.uploadRunDropdown
                      : classNames(uploadRunDialogStyles.uploadRunDropdown, uploadRunDialogStyles.hidden),
                    uploadRunDialogStyles.gameOptions,
                  )}
                >
                  {games.map((game) => (
                    <div
                      onClick={() => {
                        _handle_game_select(game.id);
                        _handle_dropdowns(1);
                      }}
                      key={game.id}
                    >
                      {game.name}
                    </div>
                  ))}
                </div>
              </div>

              {selectedGame && (
                <>
                  <div>
                    <h3 className={uploadRunDialogStyles.demoHeading}>Host Demo</h3>
                    <div
                      onClick={() => {
                        _handle_file_click(true);
                      }}
                      onDragOver={(e) => {
                        _handle_drag_over(e, true);
                      }}
                      onDrop={(e) => {
                        _handle_drop(e, true);
                      }}
                      onDragLeave={(e) => {
                        _handle_drag_leave(e, true);
                      }}
                      className={classNames(
                        uploadRunDialogStyles.uploadRunDragArea,
                        dragHightlight ? uploadRunDialogStyles.uploadRunDragAreaHighlight : "",
                        uploadRunContent.host_demo ? uploadRunDialogStyles.uploadRunDragAreaHidden : "",
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="host_demo"
                        id="host_demo"
                        accept=".dem"
                        onChange={(e) => _handle_file_change(e.target.files, true)}
                        className={uploadRunDialogStyles.idHostDemo}
                      />
                      {!uploadRunContent.host_demo ? (
                        <div>
                          <span>Drag and drop</span>
                          <div>
                            <span className={uploadRunDialogStyles.uploadHint}>Or click here</span>
                            <br />
                            <button className={uploadRunDialogStyles.fileUploadButton}>Upload</button>
                          </div>
                        </div>
                      ) : null}

                      <span className={uploadRunDialogStyles.uploadRunDemoName}>
                        {uploadRunContent.host_demo?.name}
                      </span>
                    </div>
                    {selectedGame.is_coop && (
                      <>
                        <div>
                          <h3 className={uploadRunDialogStyles.demoHeading}>Partner Demo</h3>
                          <div
                            onClick={() => {
                              _handle_file_click(false);
                            }}
                            onDragOver={(e) => {
                              _handle_drag_over(e, false);
                            }}
                            onDrop={(e) => {
                              _handle_drop(e, false);
                            }}
                            onDragLeave={(e) => {
                              _handle_drag_leave(e, false);
                            }}
                            className={classNames(
                              uploadRunDialogStyles.uploadRunDragArea,
                              dragHightlightPartner ? uploadRunDialogStyles.uploadRunDragAreaHighlightPartner : "",
                              uploadRunContent.partner_demo ? uploadRunDialogStyles.uploadRunDragAreaHidden : "",
                            )}
                          >
                            <input
                              ref={fileInputRefPartner}
                              type="file"
                              name="partner_demo"
                              id="partner_demo"
                              accept=".dem"
                              onChange={(e) => _handle_file_change(e.target.files, false)}
                              className={uploadRunDialogStyles.idPartnerDemo}
                            />{" "}
                            {!uploadRunContent.partner_demo ? (
                              <div>
                                <span>Drag and drop</span>
                                <div>
                                  <span className={uploadRunDialogStyles.uploadHint}>Or click here</span>
                                  <br />
                                  <button className={uploadRunDialogStyles.fileUploadButton}>Upload</button>
                                </div>
                              </div>
                            ) : null}
                            <span className={uploadRunDialogStyles.uploadRunDemoName}>
                              {uploadRunContent.partner_demo?.name}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div></div>
                </>
              )}
            </div>
            <div className={uploadRunDialogStyles.uploadRunButtonsContainer}>
              <button onClick={_upload_run} disabled={!selectedGame || isUploading}>
                Submit
              </button>
              <button
                disabled={isUploading}
                onClick={() => {
                  onClose(false);
                  setUploadRunContent({
                    host_demo: null,
                    partner_demo: null,
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <></>;
};

export default UploadRunDialog;
