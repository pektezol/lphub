import React from 'react';
import ReactMarkdown from 'react-markdown';

import { MapSummary } from '../types/Map';
import "../css/Maps.css"

interface SummaryProps {
  selectedRun: number
  setSelectedRun: (x: number) => void;
  data: MapSummary;
}

const Summary: React.FC<SummaryProps> = ({ selectedRun, setSelectedRun, data }) => {

  const [selectedCategory, setSelectedCategory] = React.useState<number>(1);
  const [historySelected, setHistorySelected] = React.useState<boolean>(false);

  function _select_run(idx: number, category_id: number) {
    let r = document.querySelectorAll("button.record");
    r.forEach(e => (e as HTMLElement).style.backgroundColor = "#2b2e46");
    (r[idx] as HTMLElement).style.backgroundColor = "#161723"


    if (data && data.summary.routes.length !== 0 && data.summary.routes.length !== 0) {
      if (category_id === 2) { idx += data.summary.routes.filter(e => e.category.id < 2).length }
      if (category_id === 3) { idx += data.summary.routes.filter(e => e.category.id < 3).length }
      if (category_id === 4) { idx += data.summary.routes.filter(e => e.category.id < 4).length }
      setSelectedRun(idx);
    }
  }

  function _get_youtube_id(url: string): string {
    const urlArray = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (urlArray[2] !== undefined) ? urlArray[2].split(/[^0-9a-z_]/i)[0] : urlArray[0];
  };

  function _category_change() {
    const btn = document.querySelectorAll("#section3 #category span button");
    btn.forEach((e) => { (e as HTMLElement).style.backgroundColor = "#2b2e46" });
    (btn[selectedCategory - 1] as HTMLElement).style.backgroundColor = "#202232";
  };

  function _history_change() {
    const btn = document.querySelectorAll("#section3 #history span button");
    btn.forEach((e) => { (e as HTMLElement).style.backgroundColor = "#2b2e46" });
    (historySelected ? btn[1] as HTMLElement : btn[0] as HTMLElement).style.backgroundColor = "#202232";
  };

  React.useEffect(() => {
   _history_change();
  }, [historySelected]);

  React.useEffect(() => {
    _category_change();
    _select_run(0, selectedCategory);
  }, [selectedCategory]);

  React.useEffect(() => {
    _select_run(0, selectedCategory);
  }, []);

  return (
    <>
      <section id='section3' className='summary1'>
        <div id='category'
          style={data.map.image === "" ? { backgroundColor: "#202232" } : {}}>
          <img src={data.map.image} alt="" id='category-image'></img>
          <p><span className='portal-count'>{data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].history.score_count}</span>
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].history.score_count === 1 ? ` portal` : ` portals`}</p>
          <span>
            <button onClick={() => setSelectedCategory(1)}>CM</button>
            <button onClick={() => setSelectedCategory(2)}>NoSLA</button>
            {data.map.is_coop ? <button onClick={() => setSelectedCategory(3)}>SLA</button>
              : <button onClick={() => setSelectedCategory(3)}>Inbounds SLA</button>}
            <button onClick={() => setSelectedCategory(4)}>Any%</button>
          </span>

        </div>

        <div id='history'>

          <div style={{ display: historySelected ? "none" : "block" }}>
            {data.summary.routes.filter(e => e.category.id === selectedCategory).length === 0 ? <h5>There are no records for this map.</h5> :
              <>
                <div className='record-top'>
                  <span>Date</span>
                  <span>Record</span>
                  <span>First Completion</span>
                </div>
                <hr />
                <div id='records'>

                  {data.summary.routes
                    .sort((a, b) => a.history.score_count - b.history.score_count)
                    .filter(e => e.category.id === selectedCategory)
                    .map((r, index) => (
                      <button className='record' key={index} onClick={() => {
                        _select_run(index, r.category.id);
                      }}>
                        <span>{new Date(r.history.date).toLocaleDateString(
                          "en-US", { month: 'long', day: 'numeric', year: 'numeric' }
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
            {data.summary.routes.filter(e => e.category.id === selectedCategory).length === 0 ? <h5>There are no records for this map.</h5> :
              <div id='graph'>
                {/* <div>{graph(1)}</div>
                <div>{graph(2)}</div>
                <div>{graph(3)}</div> */}
              </div>
            }
          </div>
          <span>
            <button onClick={() => setHistorySelected(false)}>List</button>
            <button onClick={() => setHistorySelected(true)}>Graph</button>
          </span>
        </div>


      </section>
      <section id='section4' className='summary1'>
        <div id='difficulty'>
          <span>Difficulty</span>
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 0 ? (<span>N/A</span>) : null}
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 1 ? (<span style={{ color: "lime" }}>Very easy</span>) : null}
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 2 ? (<span style={{ color: "green" }}>Easy</span>) : null}
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 3 ? (<span style={{ color: "yellow" }}>Medium</span>) : null}
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 4 ? (<span style={{ color: "orange" }}>Hard</span>) : null}
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 5 ? (<span style={{ color: "red" }}>Very hard</span>) : null}
          <div>
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 1 ? (<div className='difficulty-rating' style={{ backgroundColor: "lime" }}></div>) : (<div className='difficulty-rating'></div>)}
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 2 ? (<div className='difficulty-rating' style={{ backgroundColor: "green" }}></div>) : (<div className='difficulty-rating'></div>)}
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 3 ? (<div className='difficulty-rating' style={{ backgroundColor: "yellow" }}></div>) : (<div className='difficulty-rating'></div>)}
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 4 ? (<div className='difficulty-rating' style={{ backgroundColor: "orange" }}></div>) : (<div className='difficulty-rating'></div>)}
            {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].rating === 5 ? (<div className='difficulty-rating' style={{ backgroundColor: "red" }}></div>) : (<div className='difficulty-rating'></div>)}
          </div>
        </div>
        <div id='count'>
          <span>Completion Count</span>
          <div>{data.summary.routes[selectedRun].completion_count}</div>
        </div>
      </section>

      <section id='section5' className='summary1'>
        <div id='description'>
          {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].showcase !== "" ?
            <iframe title='Showcase video' src={"https://www.youtube.com/embed/" + _get_youtube_id(data.summary.routes[selectedRun].showcase)}> </iframe>
            : ""}
          <h3>Route Description</h3>
          <span id='description-text'>
            <ReactMarkdown>
              {data.summary.routes.sort((a, b) => a.category.id - b.category.id)[selectedRun].description}
            </ReactMarkdown>
          </span>
        </div>
      </section>

    </>
  );
};

export default Summary;
