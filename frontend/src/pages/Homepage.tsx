import React from "react";
import { Helmet } from "react-helmet";

const Homepage: React.FC = () => {

  return (
    <main>
      <Helmet>
        <title>LPHUB | Homepage</title>
      </Helmet>
      <section>
        <p />
        <h1>Welcome to Least Portals Hub!</h1>
        <p>At the moment, LPHUB is in beta state. This means that the site has only the core functionalities enabled for providing both collaborative information and competitive leaderboards.</p>
        <p>The website should feel intuitive to navigate around. For any type of feedback, reach us at LPHUB Discord server.</p>
        <p>By using LPHUB, you agree that you have read the 'Leaderboard Rules' and the 'About LPHUB' pages.</p>
      </section>
    </main>
  );
};

export default Homepage;
