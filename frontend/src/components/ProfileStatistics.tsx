import React from "react";

import type {
  ProfileStatistics as ProfileStatisticsData,
  ProfileStatisticsSummary,
} from "@customTypes/Profile";

type StatisticsScope = "overall" | number;

interface ProfileStatisticsProps {
  statistics: ProfileStatisticsData;
}

const formatWRDelta = (delta: number | null): string => {
  if (delta === null) {
    return "—";
  }
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
};

const ProfileStatistics: React.FC<ProfileStatisticsProps> = ({ statistics }) => {
  const [scope, setScope] = React.useState<StatisticsScope>("overall");
  const games = React.useMemo(
    () =>
      [...statistics.games].sort((first, second) =>
        first.game_name.localeCompare(second.game_name),
      ),
    [statistics.games],
  );
  const selectedGame =
    typeof scope === "number"
      ? games.find((game) => game.game_id === scope)
      : undefined;
  const activeScope = selectedGame ? scope : "overall";
  const summary: ProfileStatisticsSummary = selectedGame ?? statistics.overall;
  const topThreePlacements = summary.first + summary.second_to_third;
  const visibleGames = selectedGame ? [selectedGame] : games;
  const scopeOptions: Array<{ value: StatisticsScope; label: string }> = [
    { value: "overall", label: "All" },
    ...games.map((game) => ({ value: game.game_id, label: game.game_name })),
  ];
  const placementBuckets = [
    { label: "1st", value: summary.first, className: "first" },
    {
      label: "2nd–3rd",
      value: summary.second_to_third,
      className: "second-to-third",
    },
    {
      label: "4th–10th",
      value: summary.fourth_to_tenth,
      className: "fourth-to-tenth",
    },
    {
      label: "11th+",
      value: summary.eleventh_plus,
      className: "eleventh-plus",
    },
  ];
  const placementMaximum = Math.max(
    1,
    ...placementBuckets.map((bucket) => bucket.value),
  );
  const includesCooperativeFigures = selectedGame
    ? selectedGame.is_coop
    : games.some((game) => game.is_coop && game.active_submissions > 0);

  return (
    <div className="profile-statistics">
      <div
        className="profile-statistics-scope"
        role="group"
        aria-label="Statistics game"
      >
        {scopeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={activeScope === option.value ? "is-active" : ""}
            aria-pressed={activeScope === option.value}
            onClick={() => setScope(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {includesCooperativeFigures && (
        <p
          className="profile-statistics-note"
          title="Co-op figures count each active team run once for each participating player."
        >
          Co-op figures are team-run based.
        </p>
      )}

      <div className="profile-statistics-overview">
        <article className="profile-statistics-card">
          <span>Maps Played</span>
          <strong>
            {summary.maps_played}
            <small>/{summary.maps_available}</small>
          </strong>
        </article>
        <article className="profile-statistics-card">
          <span
            title="A minimum-count match is a player's best active score equal to the current least-portals historical minimum for that map. It is not a world-record claim."
          >
            Current Minimum-Count Matches
          </span>
          <strong>{summary.minimum_count_matches}</strong>
        </article>
        <article className="profile-statistics-card">
          <span>Top-3 Placements</span>
          <strong>{topThreePlacements}</strong>
        </article>
        <article className="profile-statistics-card">
          <span>Active Submissions</span>
          <strong>{summary.active_submissions}</strong>
        </article>
      </div>

      {summary.active_submissions === 0 ? (
        <div className="profile-statistics-empty" role="status">
          No active submissions are available for this scope yet.
        </div>
      ) : (
        <section
          className="profile-statistics-distribution"
          aria-labelledby="profile-placement-distribution"
        >
          <h2 id="profile-placement-distribution">Placement distribution</h2>
          <div
            className="profile-statistics-bars"
            role="img"
            aria-label={`Placement distribution: ${placementBuckets
              .map((bucket) => `${bucket.label} ${bucket.value}`)
              .join(", ")}`}
          >
            {placementBuckets.map((bucket) => (
              <div className="profile-statistics-bar" key={bucket.className}>
                <span>{bucket.label}</span>
                <span className="profile-statistics-bar-track" aria-hidden="true">
                  <span
                    className={`profile-statistics-bar-fill ${bucket.className}`}
                    style={{
                      width: `${(bucket.value / placementMaximum) * 100}%`,
                    }}
                  />
                </span>
                <output>{bucket.value}</output>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="profile-statistics-games" aria-labelledby="profile-game-statistics">
        <h2 id="profile-game-statistics">
          {selectedGame ? "Game details" : "Game comparison"}
        </h2>
        <div className="profile-statistics-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Played / Available</th>
                <th
                  scope="col"
                  title="A minimum-count match is a player's best active score equal to the current least-portals historical minimum for that map."
                >
                  Min-count matches
                </th>
                <th
                  scope="col"
                  title="WRΔ is the median difference between a player's best portal count and the current least-portals historical minimum. Maps without a historical minimum are excluded."
                >
                  Median WRΔ
                </th>
                <th
                  scope="col"
                  title="The sum of the player's best portal counts on played maps. This is informational only, not an overall leaderboard rank."
                >
                  Best portal total
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleGames.map((game) => (
                <tr key={game.game_id}>
                  <th
                    scope="row"
                    title={
                      game.is_coop
                        ? "Co-op figures count each active team run once for each participating player."
                        : undefined
                    }
                  >
                    {game.game_name}
                  </th>
                  <td>
                    {game.maps_played}/{game.maps_available}
                  </td>
                  <td>{game.minimum_count_matches}</td>
                  <td>{formatWRDelta(game.median_wr_delta)}</td>
                  <td>{game.best_portal_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ProfileStatistics;
