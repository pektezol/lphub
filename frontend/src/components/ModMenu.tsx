import React from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

import { MapSummary } from "@customTypes/Map";
import { ModMenuContent } from "@customTypes/Content";
import { API } from "@api/Api";
import "@css/ModMenu.css"
import useConfirm from "@hooks/UseConfirm";

interface ModMenuProps {
  token?: string;
  data: MapSummary;
  selectedRun: number;
  mapID: string;
}

const ModMenu: React.FC<ModMenuProps> = ({ token, data, selectedRun, mapID }) => {

  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [menu, setMenu] = React.useState<number>(0);
  const [showButton, setShowButton] = React.useState<boolean>(true);

  const [routeContent, setRouteContent] = React.useState<ModMenuContent>({
    id: 0,
    name: "",
    score: 0,
    date: "",
    showcase: "",
    description: "No description available.",
    category_id: 1,
  });

  const [image, setImage] = React.useState<string>("");
  const [md, setMd] = React.useState<string>("");

  const navigate = useNavigate();

  function compressImage(file: File): Promise<string> {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    return new Promise(resolve => {
      reader.onload = () => {
        const img = new Image();
        if (typeof reader.result === "string") {
          img.src = reader.result;
          img.onload = () => {
            let { width, height } = img;
            if (width > 550) {
              height *= 550 / width;
              width = 550;
            }
            if (height > 320) {
              width *= 320 / height;
              height = 320;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(file.type, 0.6));
          };
        }
      };
    });
  };

  const _edit_map_summary_image = async () => {
    if (await confirm("Edit Map Summary Image", "Are you sure you want to submit this to the database?")) {
      if (token) {
        const success = await API.put_map_image(token, mapID, image);
        if (success) {
          navigate(0);
        } else {
          alert("Error. Check logs.")
        }
      }
    }
  };

  const _edit_map_summary_route = async () => {
    if (await confirm("Edit Map Summary Route", "Are you sure you want to submit this to the database?")) {
      if (token) {
        routeContent.date += "T00:00:00Z";
        const success = await API.put_map_summary(token, mapID, routeContent);
        if (success) {
          navigate(0);
        } else {
          alert("Error. Check logs.")
        }
      }
    }
  };

  const _create_map_summary_route = async () => {
    if (await confirm("Create Map Summary Route", "Are you sure you want to submit this to the database?")) {
      if (token) {
        routeContent.date += "T00:00:00Z";
        const success = await API.post_map_summary(token, mapID, routeContent);
        if (success) {
          navigate(0);
        } else {
          alert("Error. Check logs.")
        }
      }
    }
  };

  const _delete_map_summary_route = async () => {
    if (await confirm("Delete Map Summary Route", `Are you sure you want to submit this to the database?\n
      ${data.summary.routes[selectedRun].category.name}\n${data.summary.routes[selectedRun].history.score_count} portals\n${data.summary.routes[selectedRun].history.runner_name}`)) {
      if (token) {
        const success = await API.delete_map_summary(token, mapID, data.summary.routes[selectedRun].route_id);
        if (success) {
          navigate(0);
        } else {
          alert("Error. Check logs.")
        }
      }
    }
  };

  React.useEffect(() => {
    if (menu === 3) { // add route
      setRouteContent({
        id: 0,
        name: "",
        score: 0,
        date: "",
        showcase: "",
        description: "No description available.",
        category_id: 1,
      });
      setMd("No description available.");
    }
    if (menu === 2) { // edit route
      setRouteContent({
        id: data.summary.routes[selectedRun].route_id,
        name: data.summary.routes[selectedRun].history.runner_name,
        score: data.summary.routes[selectedRun].history.score_count,
        date: data.summary.routes[selectedRun].history.date.split("T")[0],
        showcase: data.summary.routes[selectedRun].showcase,
        description: data.summary.routes[selectedRun].description,
        category_id: data.summary.routes[selectedRun].category.id,
      });
      setMd(data.summary.routes[selectedRun].description);
    }
  }, [menu]);

  React.useEffect(() => {
    const modview = document.querySelector("div#modview") as HTMLElement
    if (modview) {
      showButton ? modview.style.transform = "translateY(-68%)"
        : modview.style.transform = "translateY(0%)"
    }

    const modview_block = document.querySelector("#modview_block") as HTMLElement
    if (modview_block) {
      showButton ? modview_block.style.display = "none" : modview_block.style.display = "block"
    }
  }, [showButton])

  return (
    <>
      {ConfirmDialogComponent}
      <div id="modview_block" />
      <div id='modview'>
        <div>
          <button onClick={() => setMenu(1)}>Edit Image</button>
          <button onClick={() => setMenu(2)}>Edit Selected Route</button>
          <button onClick={() => setMenu(3)}>Add New Route</button>
          <button onClick={() => _delete_map_summary_route()}>Delete Selected Route</button>
        </div>
        <div>
          {showButton ? (
            <button onClick={() => setShowButton(false)}>Show</button>
          ) : (
            <button onClick={() => { setShowButton(true); setMenu(0); }}>Hide</button>
          )}
        </div>
      </div><div id='modview-menu'>
        {// Edit Image
          menu === 1 && (
            <div id='modview-menu-image'>
              <div>
                <span>Current Image:</span>
                <img src={data.map.image} alt="missing" />
              </div>

              <div>
                <span>New Image:
                  <input type="file" accept='image/*' onChange={e => {
                    if (e.target.files) {
                      compressImage(e.target.files[0])
                        .then(d => setImage(d));
                    }
                  }} /></span>
                {image ? (<button onClick={() => _edit_map_summary_image()}>upload</button>) : <span></span>}
                <img src={image} alt="" id='modview-menu-image-file' />

              </div>
            </div>
          )}

        {// Edit Route
          menu === 2 && (
            <div id='modview-menu-edit'>
              <div id='modview-route-id'>
                <span>Route ID:</span>
                <input type="number" value={routeContent.id} disabled />
              </div>
              <div id='modview-route-name'>
                <span>Runner Name:</span>
                <input type="text" value={routeContent.name} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    name: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-score'>
                <span>Score:</span>
                <input type="number" value={routeContent.score} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    score: parseInt(e.target.value),
                  });
                }} />
              </div>
              <div id='modview-route-date'>
                <span>Date:</span>
                <input type="date" value={routeContent.date} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    date: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-showcase'>
                <span>Showcase Video:</span>
                <input type="text" value={routeContent.showcase} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    showcase: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-description' style={{ height: "180px", gridColumn: "1 / span 5" }}>
                <span>Description:</span>
                <textarea value={routeContent.description} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    description: e.target.value,
                  });
                  setMd(routeContent.description);
                }} />
              </div>
              <button style={{ gridColumn: "2 / span 3", height: "40px" }} onClick={_edit_map_summary_route}>Apply</button>

              <div id='modview-md'>
                <span>Markdown Preview</span>
                <span><a href="https://commonmark.org/help/" rel="noreferrer" target='_blank'>Documentation</a></span>
                <span><a href="https://remarkjs.github.io/react-markdown/" rel="noreferrer" target='_blank'>Demo</a></span>
                <p>
                  <ReactMarkdown>{md}
                  </ReactMarkdown>
                </p>
              </div>
            </div>
          )}

        {// Add Route
          menu === 3 && (
            <div id='modview-menu-add'>
              <div id='modview-route-category'>
                <span>Category:</span>
                <select onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    category_id: parseInt(e.target.value),
                  });
                }}>
                  <option value="1" key="1">CM</option>
                  <option value="2" key="2">No SLA</option>
                  {data.map.game_name === "Portal 2 - Cooperative" ? "" : (
                    <option value="3" key="3">Inbounds SLA</option>)}
                  <option value="4" key="4">Any%</option>
                </select>
              </div>
              <div id='modview-route-name'>
                <span>Runner Name:</span>
                <input type="text" value={routeContent.name} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    name: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-score'>
                <span>Score:</span>
                <input type="number" value={routeContent.score} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    score: parseInt(e.target.value),
                  });
                }} />
              </div>
              <div id='modview-route-date'>
                <span>Date:</span>
                <input type="date" value={routeContent.date} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    date: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-showcase'>
                <span>Showcase Video:</span>
                <input type="text" value={routeContent.showcase} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    showcase: e.target.value,
                  });
                }} />
              </div>
              <div id='modview-route-description' style={{ height: "180px", gridColumn: "1 / span 5" }}>
                <span>Description:</span>
                <textarea value={routeContent.description} onChange={(e) => {
                  setRouteContent({
                    ...routeContent,
                    description: e.target.value,
                  });
                  setMd(routeContent.description);
                }} />
              </div>
              <button style={{ gridColumn: "2 / span 3", height: "40px" }} onClick={_create_map_summary_route}>Apply</button>

              <div id='modview-md'>
                <span>Markdown preview</span>
                <span><a href="https://commonmark.org/help/" rel="noreferrer" target='_blank'>documentation</a></span>
                <span><a href="https://remarkjs.github.io/react-markdown/" rel="noreferrer" target='_blank'>demo</a></span>
                <p>
                  <ReactMarkdown>{md}
                  </ReactMarkdown>
                </p>
              </div>
            </div>
          )}
      </div>
    </>
  );
};

export default ModMenu;
