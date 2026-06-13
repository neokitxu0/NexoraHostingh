import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

document.documentElement.classList.add("dark");

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(`${base}/api`);
setAuthTokenGetter(() => localStorage.getItem("nexora_token"));

createRoot(document.getElementById("root")!).render(<App />);
