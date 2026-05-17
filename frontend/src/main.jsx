import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

function showStartupError(error) {
  rootElement.innerHTML = `
    <main style="min-height:100vh;background:#07100f;color:#e2e8f0;padding:32px;font-family:Inter,system-ui,sans-serif">
      <section style="max-width:780px;border:1px solid #1e3834;background:#0d1816;padding:24px;border-radius:8px">
        <p style="color:#4df7ff;margin:0 0 8px">CyberShield AI startup error</p>
        <h1 style="font-size:28px;margin:0 0 16px">The frontend loaded, but React could not start.</h1>
        <pre style="white-space:pre-wrap;color:#ffce65;background:#050b0a;border:1px solid #1e3834;padding:16px;border-radius:8px">${String(error?.stack || error?.message || error)}</pre>
      </section>
    </main>
  `;
}

import("./App.jsx")
  .then(({ default: App }) => {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((error) => {
    showStartupError(error);
  });
