import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-center" reverseOrder={false} />
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
