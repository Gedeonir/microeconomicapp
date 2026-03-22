import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Root from "./Root.jsx";
import "./Report.css"
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);