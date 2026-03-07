import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installApiFetchPatch } from "./lib/api-config";

installApiFetchPatch();

createRoot(document.getElementById("root")!).render(<App />);
