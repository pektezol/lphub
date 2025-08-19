import React from "react";
import ReactMarkdown from "react-markdown";
import { Helmet } from "react-helmet";

const About: React.FC = () => {
  const [aboutText, setAboutText] = React.useState<string>("");

  React.useEffect(() => {
    const fetchReadme = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/pektezol/lphub/main/README.md"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch README");
        }
        const readmeText = await response.text();
        setAboutText(readmeText);
      } catch (error) {
        console.error("Error fetching README:", error);
      }
    };
    fetchReadme();
  }, []);

  return (
    <div>
      <Helmet>
        <title>LPHUB | About</title>
      </Helmet>
      <ReactMarkdown className={"overflow-auto"}>{aboutText}</ReactMarkdown>
    </div>
  );
};

export default About;
