import React from 'react';
import ReactMarkdown from 'react-markdown';

import '../css/About.css';

const About: React.FC = () => {

    const [aboutText, setAboutText] = React.useState<string>("");

    React.useEffect(() => {
        const fetchReadme = async () => {
            try {
                const response = await fetch(
                    'https://raw.githubusercontent.com/pektezol/leastportalshub/main/README.md'
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch README');
                }
                const readmeText = await response.text();
                setAboutText(readmeText);
            } catch (error) {
                console.error('Error fetching README:', error);
            }
        };
        fetchReadme();
    }, []);


    return (
        <div id="about">
            <ReactMarkdown>{aboutText}</ReactMarkdown>
        </div>
    );
};

export default About;