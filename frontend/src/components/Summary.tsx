import React from "react";
import ReactMarkdown from "react-markdown";

import { MapSummary } from "@customTypes/Map";
import "@css/Maps.css";

interface SummaryProps {
  selectedRun?: number;
  setSelectedRun: (x: number | undefined) => void;
  data: MapSummary;
}

const Summary: React.FC<SummaryProps> = ({ selectedRun, setSelectedRun, data }) => {

  const [selectedCategory, setSelectedCategory] = React.useState<number>(1);
  const [historySelected, setHistorySelected] = React.useState<boolean>(false);
  const categoryRoutes = data.summary.routes.filter(route => route.category.id === selectedCategory);
  const selectedRoute = selectedRun === undefined
    ? undefined
    : data.summary.routes[selectedRun]?.category.id === selectedCategory
      ? data.summary.routes[selectedRun]
      : undefined;

  function _select_run(idx: number) {
    const route = categoryRoutes[idx];
    setSelectedRun(route ? data.summary.routes.indexOf(route) : undefined);
  };

  function _select_category(categoryID: number) {
    const routeIndex = data.summary.routes.findIndex(route => route.category.id === categoryID);
    setSelectedCategory(categoryID);
    setSelectedRun(routeIndex === -1 ? undefined : routeIndex);
  };

  function _get_youtube_id(url: string): string {
    const urlArray = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (urlArray[2] !== undefined) ? urlArray[2].split(/[^0-9a-z_-]/i)[0] : urlArray[0];
  };

  React.useEffect(() => {
    const routeIndex = data.summary.routes.findIndex(route => route.category.id === selectedCategory);
    setSelectedRun(routeIndex === -1 ? undefined : routeIndex);
  }, [data, selectedCategory, setSelectedRun]);

  return (
    <>
      <section id='section3' className='summary1'>
        <div id='category'
          style={data.map.image === "" ? { backgroundColor: "#202232" } : {}}>
          <img src={data.map.image} alt="" id='category-image'></img>
          <p><span className='portal-count'>{selectedRoute?.history.score_count ?? 0}</span>
            {(selectedRoute?.history.score_count ?? 0) === 1 ? " portal" : " portals"}</p>
          {data.map.is_coop ? // TODO: make this part dynamic
            (
              <span style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <button style={{ backgroundColor: selectedCategory === 1 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(1)}>CM</button>
                <button style={{ backgroundColor: selectedCategory === 4 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(4)}>Any%</button>
                <button style={{ backgroundColor: selectedCategory === 5 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(5)}>All Courses</button>
              </span>
            )
            :
            (
              <span style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>

                <button style={{ backgroundColor: selectedCategory === 1 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(1)}>CM</button>
                <button style={{ backgroundColor: selectedCategory === 2 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(2)}>NoSLA</button>
                <button style={{ backgroundColor: selectedCategory === 3 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(3)}>Inbounds SLA</button>
                <button style={{ backgroundColor: selectedCategory === 4 ? "#202232" : "#2b2e46" }} onClick={() => _select_category(4)}>Any%</button>
              </span>
            )
          }

        </div>

        <div id='history'>

          <div style={{ display: historySelected ? "none" : "block" }}>
            {categoryRoutes.length === 0 ? <h5>There are no records for this category.</h5> :
              <>
                <div className='record-top'>
                  <span>Date</span>
                  <span>Record</span>
                  <span>First Completion</span>
                </div>
                <hr />
                <div id='records'>

                  {categoryRoutes
                    .map((r, index) => (
                      <button className='record' key={r.route_id} style={{ backgroundColor: selectedRoute === r ? "#161723" : "#2b2e46" }} onClick={() => {
                        _select_run(index);
                      }}>
                        <span>{new Date(r.history.date).toLocaleDateString(
                          "en-US", { month: "long", day: "numeric", year: "numeric" }
                        )}</span>
                        <span>{r.history.score_count}</span>
                        <span>{r.history.runner_name}</span>
                      </button>
                    ))}
                </div>
              </>
            }
          </div>

          <div style={{ display: historySelected ? "block" : "none" }}>
            {categoryRoutes.length === 0 ? <h5>There are no records for this category.</h5> :
              <div id='graph'>
                {/* <div>{graph(1)}</div>
                <div>{graph(2)}</div>
                <div>{graph(3)}</div> */}
              </div>
            }
          </div>
          <span>
            <button style={{ backgroundColor: historySelected ? "#2b2e46" : "#202232" }} onClick={() => setHistorySelected(false)}>List</button>
            <button style={{ backgroundColor: historySelected ? "#202232" : "#2b2e46" }} onClick={() => setHistorySelected(true)}>Graph</button>
          </span>
        </div>


      </section >
      {selectedRoute && (
        <>
          <section id='section4' className='summary1'>
            <div id='difficulty'>
              <span>Difficulty</span>
              {data.map.difficulty <= 2 && (<span style={{ color: "lime" }}>Very Easy</span>)}
              {data.map.difficulty > 2 && data.map.difficulty <= 4 && (<span style={{ color: "green" }}>Easy</span>)}
              {data.map.difficulty > 4 && data.map.difficulty <= 6 && (<span style={{ color: "yellow" }}>Medium</span>)}
              {data.map.difficulty > 6 && data.map.difficulty <= 8 && (<span style={{ color: "orange" }}>Hard</span>)}
              {data.map.difficulty > 8 && data.map.difficulty <= 10 && (<span style={{ color: "red" }}>Very Hard</span>)}
              <div>
                {data.map.difficulty <= 2 ? (<div className='difficulty-rating' style={{ backgroundColor: "lime" }}></div>) : (<div className='difficulty-rating'></div>)}
                {data.map.difficulty > 2 && data.map.difficulty <= 4 ? (<div className='difficulty-rating' style={{ backgroundColor: "green" }}></div>) : (<div className='difficulty-rating'></div>)}
                {data.map.difficulty > 4 && data.map.difficulty <= 6 ? (<div className='difficulty-rating' style={{ backgroundColor: "yellow" }}></div>) : (<div className='difficulty-rating'></div>)}
                {data.map.difficulty > 6 && data.map.difficulty <= 8 ? (<div className='difficulty-rating' style={{ backgroundColor: "orange" }}></div>) : (<div className='difficulty-rating'></div>)}
                {data.map.difficulty > 8 && data.map.difficulty <= 10 ? (<div className='difficulty-rating' style={{ backgroundColor: "red" }}></div>) : (<div className='difficulty-rating'></div>)}
              </div>
            </div>
            <div id='count'>
              <span>Completion Count</span>
              <div>{selectedRoute.completion_count}</div>
            </div>
          </section>

          <section id='section5' className='summary1'>
            <div id='description'>
              {selectedRoute.showcase !== "" ?
                <iframe title='Showcase video' src={"https://www.youtube.com/embed/" + _get_youtube_id(selectedRoute.showcase)}> </iframe>
                : ""}
              <h3>Route Description</h3>
              <span id='description-text'>
                <ReactMarkdown>
                  {selectedRoute.description}
                </ReactMarkdown>
              </span>
            </div>
          </section>
        </>
      )}

    </>
  );
};

export default Summary;
