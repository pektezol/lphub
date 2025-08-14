import React from "react";
import { Helmet } from "react-helmet";

const Homepage: React.FC = () => {
  return (
    <main className="text-foreground font-[--font-barlow-semicondensed-regular]">
      <Helmet>
        <title>LPHUB | Homepage</title>
      </Helmet>
      <section className="p-8">
        <p />
        <h1 className="text-5xl font-[--font-barlow-condensed-bold] mb-6 text-primary">Welcome to Least Portals Hub!</h1>
        <p className="text-lg mb-4 leading-relaxed">
          At the moment, LPHUB is in beta state. This means that the site has
          only the core functionalities enabled for providing both collaborative
          information and competitive leaderboards.
        </p>
        <p className="text-lg mb-4 leading-relaxed">
          The website should feel intuitive to navigate around. For any type of
          feedback, reach us at LPHUB Discord server.
        </p>
        <p className="text-lg mb-4 leading-relaxed">
          By using LPHUB, you agree that you have read the 'Leaderboard Rules'
          and the 'About LPHUB' pages.
        </p>
      </section>
    </main>
  );
};

export default Homepage;
