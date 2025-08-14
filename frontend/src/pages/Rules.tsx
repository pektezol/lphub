import React from "react";
import ReactMarkdown from "react-markdown";
import { Helmet } from "react-helmet";

const Rules: React.FC = () => {
  const [rulesText, setRulesText] = React.useState<string>("");

  React.useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/pektezol/lphub/main/RULES.md"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch README");
        }
        const rulesText = await response.text();
        setRulesText(rulesText);
      } catch (error) {
        console.error("Error fetching Rules:", error);
      }
      // setRulesText(rulesText)
    };
    fetchRules();
  }, []);

  return (
    <main className="p-8 text-foreground font-[--font-barlow-semicondensed-regular] prose prose-invert max-w-none">
      <Helmet>
        <title>LPHUB | Rules</title>
      </Helmet>
      <ReactMarkdown>{rulesText}</ReactMarkdown>
    </main>
  );
};

export default Rules;
