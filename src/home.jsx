// Entry della Home: leggera di proposito, non carica Supabase né il resto dell'app
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "./components/Home.jsx";
import "./index.css";        // stesso ordine CSS delle app (template Vite, da togliere nel restyling)
import "./styles/app.css";

createRoot(document.getElementById("root")).render(<StrictMode><Home/></StrictMode>);
