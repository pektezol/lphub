import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./global.css";
import "./css/styleOrder";
import foundations from "./css/Foundations.module.css";
import App from "./App";

const container = document.getElementById("root") as HTMLElement;
container.classList.add(foundations.application);
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
