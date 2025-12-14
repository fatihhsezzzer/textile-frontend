import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Prevent mouse wheel from changing number input values globally
document.addEventListener(
  "wheel",
  (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "number"
    ) {
      if (document.activeElement === target) {
        e.preventDefault();
      }
    }
  },
  { passive: false }
);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
