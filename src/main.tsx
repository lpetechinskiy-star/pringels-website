import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

// the reference demo lives behind a hash; switching to or from it needs a fresh page
window.addEventListener("hashchange", (e) => {
  if (e.newURL.endsWith("#disc-demo") || e.oldURL.endsWith("#disc-demo")) location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
