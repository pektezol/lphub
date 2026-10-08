import React from "react";
import ReactMarkdown from "react-markdown";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MapSummary } from "@customTypes/Map";
import { portalLabel } from "@utils/Portal";
import "@css/Maps.css";

interface SummaryProps {
  selectedRun?: number;
  setSelectedRun: (x: number | undefined) => void;
  data: MapSummary;
}

const placeholderRunnerName = "Placeholder";

function isTheoreticalRoute(runnerName: string): boolean {
  return runnerName === placeholderRunnerName;
}

function findPreferredRouteIndex(
  routes: MapSummary["summary"]["routes"],
  categoryID: number | undefined,
): number {
  const firstCompletedRouteIndex = routes.findIndex(
    (route) =>
      route.category.id === categoryID &&
      !isTheoreticalRoute(route.history.runner_name),
  );
  if (firstCompletedRouteIndex !== -1) {
    return firstCompletedRouteIndex;
  }

  return routes.findIndex((route) => route.category.id === categoryID);
}

interface MapHistoryPoint {
  timestamp: number;
  date: string;
  scoreCount: number;
  runnerName: string;
  routeIndex: number;
}

interface MapHistoryTooltipProps {
  active?: boolean;
  payload?: { payload?: MapHistoryPoint }[];
}

const Summary: React.FC<SummaryProps> = ({
  selectedRun,
  setSelectedRun,
  data,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<
    number | undefined
  >(undefined);
  const [historySelected, setHistorySelected] = React.useState<boolean>(false);
  const categories = React.useMemo(() => {
    const declaredCategories = data.map.categories ?? [];
    if (declaredCategories.length > 0) {
      return declaredCategories;
    }

    return Array.from(
      new Map(
        data.summary.routes.map((route) => [route.category.id, route.category]),
      ).values(),
    );
  }, [data.map.categories, data.summary.routes]);
  const categoryRoutes = data.summary.routes.filter(
    (route) => route.category.id === selectedCategory,
  );
  const mapHistoryPoints = React.useMemo<MapHistoryPoint[]>(
    () =>
      data.summary.routes
        .map((route, routeIndex) => ({ route, routeIndex }))
        .filter(
          ({ route }) =>
            route.category.id === selectedCategory &&
            !isTheoreticalRoute(route.history.runner_name),
        )
        .map(({ route, routeIndex }) => ({
          timestamp: new Date(route.history.date).getTime(),
          date: route.history.date,
          scoreCount: route.history.score_count,
          runnerName: route.history.runner_name,
          routeIndex,
        }))
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp ||
            b.scoreCount - a.scoreCount ||
            a.routeIndex - b.routeIndex,
        ),
    [data.summary.routes, selectedCategory],
  );
  const selectedRoute =
    selectedRun === undefined
      ? undefined
      : data.summary.routes[selectedRun]?.category.id === selectedCategory
        ? data.summary.routes[selectedRun]
        : undefined;
  const selectedRouteIsTheoretical =
    selectedRoute !== undefined &&
    isTheoreticalRoute(selectedRoute.history.runner_name);

  function _select_run(idx: number) {
    const route = categoryRoutes[idx];
    setSelectedRun(route ? data.summary.routes.indexOf(route) : undefined);
  }

  function _select_history_point(point: MapHistoryPoint) {
    setSelectedRun(point.routeIndex);
  }

  const HistoryTooltip = ({ active, payload }: MapHistoryTooltipProps) => {
    const point = payload?.[0]?.payload;
    if (!active || !point) {
      return null;
    }

    return (
      <div className="map-history-tooltip">
        <p>
          {new Date(point.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <strong>
          {point.scoreCount} {portalLabel(point.scoreCount)}
        </strong>
        <span>{point.runnerName}</span>
      </div>
    );
  };

  const renderHistoryPoint = (props: {
    cx: number;
    cy: number;
    payload: MapHistoryPoint;
  }) => {
    const point = props.payload;
    const selectPoint = () => _select_history_point(point);
    const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPoint();
      }
    };

    return (
      <g
        className="map-history-point"
        role="button"
        tabIndex={0}
        aria-label={`${point.scoreCount} ${portalLabel(point.scoreCount)} by ${point.runnerName} on ${new Date(point.date).toLocaleDateString()}`}
        onClick={selectPoint}
        onKeyDown={handleKeyDown}
      >
        <circle
          cx={props.cx}
          cy={props.cy}
          r={18}
          fill="transparent"
          pointerEvents="all"
        />
        <circle
          cx={props.cx}
          cy={props.cy}
          r={5}
          fill="#CDCFDF"
          stroke="#202232"
          strokeWidth={2}
          pointerEvents="none"
        />
      </g>
    );
  };

  function _select_category(categoryID: number) {
    const routeIndex = findPreferredRouteIndex(data.summary.routes, categoryID);
    setSelectedCategory(categoryID);
    setSelectedRun(routeIndex === -1 ? undefined : routeIndex);
  }

  function _get_youtube_id(url: string): string {
    const urlArray = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return urlArray[2] !== undefined
      ? urlArray[2].split(/[^0-9a-z_-]/i)[0]
      : urlArray[0];
  }

  React.useEffect(() => {
    const categoryID = categories.some(
      (category) => category.id === selectedCategory,
    )
      ? selectedCategory
      : categories[0]?.id;
    setSelectedCategory(categoryID);
    const routeIndex = findPreferredRouteIndex(data.summary.routes, categoryID);
    setSelectedRun(routeIndex === -1 ? undefined : routeIndex);
  }, [categories, data, selectedCategory, setSelectedRun]);

  return (
    <>
      <section id="section3" className="summary1">
        <div
          id="category"
          style={data.map.image === "" ? { backgroundColor: "#202232" } : {}}
        >
          <img src={data.map.image} alt="" id="category-image"></img>
          <p>
            <span className="portal-count">
              {selectedRoute?.history.score_count ?? 0}
            </span>{" "}
            {portalLabel(selectedRoute?.history.score_count ?? 0)}
          </p>
          <span
            style={{
              gridTemplateColumns:
                "repeat(" + Math.max(categories.length, 1) + ", 1fr)",
            }}
          >
            {categories.map((category) => (
              <button
                key={category.id}
                style={{
                  backgroundColor:
                    selectedCategory === category.id ? "#202232" : "#2b2e46",
                }}
                onClick={() => _select_category(category.id)}
              >
                {category.name}
              </button>
            ))}
          </span>
        </div>

        <div id="history">
          <div style={{ display: historySelected ? "none" : "block" }}>
            {categoryRoutes.length === 0 ? (
              <h5>There are no records for this category.</h5>
            ) : (
              <>
                <div className="record-top">
                  <span>Record</span>
                  <span>First Completion</span>
                  <span>Date</span>
                </div>
                <hr />
                <div id="records">
                  {categoryRoutes.map((r, index) => {
                    const routeIsTheoretical = isTheoreticalRoute(
                      r.history.runner_name,
                    );

                    return (
                      <button
                        className="record"
                        key={r.route_id}
                        style={{
                          backgroundColor:
                            selectedRoute === r ? "#161723" : "#2b2e46",
                        }}
                        onClick={() => {
                          _select_run(index);
                        }}
                      >
                        <span>
                          {routeIsTheoretical
                            ? `${r.history.score_count}*`
                            : r.history.score_count}
                        </span>
                        <span>
                          {routeIsTheoretical ? "TBD" : r.history.runner_name}
                        </span>
                        <span>
                          {routeIsTheoretical
                            ? "TBD"
                            : new Date(r.history.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div style={{ display: historySelected ? "block" : "none" }}>
            {categoryRoutes.length === 0 ? (
              <h5>There are no records for this category.</h5>
            ) : mapHistoryPoints.length === 0 ? (
              <p className="map-history-empty">
                There is no completed record history to graph.
              </p>
            ) : (
              <div className="map-history-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mapHistoryPoints}
                    margin={{ top: 12, right: 18, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#2b2e46"
                      opacity={0.8}
                    />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={
                        mapHistoryPoints.length === 1
                          ? [
                              mapHistoryPoints[0].timestamp - 86_400_000,
                              mapHistoryPoints[0].timestamp + 86_400_000,
                            ]
                          : ["dataMin", "dataMax"]
                      }
                      stroke="#CDCFDF"
                      tick={{
                        fill: "#CDCFDF",
                        fontFamily: "BarlowSemiCondensed-Regular",
                        fontSize: 12,
                      }}
                      tickFormatter={(timestamp: number) =>
                        new Date(timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      }
                      minTickGap={24}
                    />
                    <YAxis
                      dataKey="scoreCount"
                      type="number"
                      domain={[0, "dataMax + 1"]}
                      allowDecimals={false}
                      stroke="#CDCFDF"
                      tick={{
                        fill: "#CDCFDF",
                        fontFamily: "BarlowSemiCondensed-Regular",
                        fontSize: 12,
                      }}
                      width={34}
                    />
                    <Tooltip content={<HistoryTooltip />} />
                    <Line
                      type="stepAfter"
                      dataKey="scoreCount"
                      stroke="#FFF"
                      strokeWidth={2}
                      dot={renderHistoryPoint}
                      activeDot={renderHistoryPoint}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <span>
            <button
              style={{
                backgroundColor: historySelected ? "#2b2e46" : "#202232",
              }}
              onClick={() => setHistorySelected(false)}
            >
              List
            </button>
            <button
              style={{
                backgroundColor: historySelected ? "#202232" : "#2b2e46",
              }}
              onClick={() => setHistorySelected(true)}
            >
              Graph
            </button>
          </span>
        </div>
      </section>
      {selectedRoute && (
        <>
          <section id="section4" className="summary1">
            <div id="difficulty">
              <span>Difficulty</span>
              {data.map.difficulty <= 2 && (
                <span style={{ color: "lime" }}>Very Easy</span>
              )}
              {data.map.difficulty > 2 && data.map.difficulty <= 4 && (
                <span style={{ color: "green" }}>Easy</span>
              )}
              {data.map.difficulty > 4 && data.map.difficulty <= 6 && (
                <span style={{ color: "yellow" }}>Medium</span>
              )}
              {data.map.difficulty > 6 && data.map.difficulty <= 8 && (
                <span style={{ color: "orange" }}>Hard</span>
              )}
              {data.map.difficulty > 8 && data.map.difficulty <= 10 && (
                <span style={{ color: "red" }}>Very Hard</span>
              )}
              <div>
                {data.map.difficulty <= 2 ? (
                  <div
                    className="difficulty-rating"
                    style={{ backgroundColor: "lime" }}
                  ></div>
                ) : (
                  <div className="difficulty-rating"></div>
                )}
                {data.map.difficulty > 2 && data.map.difficulty <= 4 ? (
                  <div
                    className="difficulty-rating"
                    style={{ backgroundColor: "green" }}
                  ></div>
                ) : (
                  <div className="difficulty-rating"></div>
                )}
                {data.map.difficulty > 4 && data.map.difficulty <= 6 ? (
                  <div
                    className="difficulty-rating"
                    style={{ backgroundColor: "yellow" }}
                  ></div>
                ) : (
                  <div className="difficulty-rating"></div>
                )}
                {data.map.difficulty > 6 && data.map.difficulty <= 8 ? (
                  <div
                    className="difficulty-rating"
                    style={{ backgroundColor: "orange" }}
                  ></div>
                ) : (
                  <div className="difficulty-rating"></div>
                )}
                {data.map.difficulty > 8 && data.map.difficulty <= 10 ? (
                  <div
                    className="difficulty-rating"
                    style={{ backgroundColor: "red" }}
                  ></div>
                ) : (
                  <div className="difficulty-rating"></div>
                )}
              </div>
            </div>
            <div id="count">
              <span>Completion Count</span>
              <div>{selectedRoute.completion_count}</div>
            </div>
          </section>

          <section id="section5" className="summary1">
            <div id="description">
              {selectedRoute.showcase !== "" ? (
                <iframe
                  title="Showcase video"
                  src={
                    "https://www.youtube.com/embed/" +
                    _get_youtube_id(selectedRoute.showcase)
                  }
                >
                  {" "}
                </iframe>
              ) : (
                ""
              )}
              <h3>
                Route Description
                {selectedRouteIsTheoretical && (
                  <span className="theoretical-route-note">
                    {
                      " *: This is a theoretical route that hasn't been completed yet."
                    }
                  </span>
                )}
              </h3>
              <span id="description-text">
                <ReactMarkdown>{selectedRoute.description}</ReactMarkdown>
              </span>
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default Summary;
