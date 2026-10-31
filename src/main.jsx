import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { ToastProvider, SettingsProvider } from "./utils";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter><ToastProvider><SettingsProvider><AuthProvider><App /></AuthProvider></SettingsProvider></ToastProvider></BrowserRouter>
);
