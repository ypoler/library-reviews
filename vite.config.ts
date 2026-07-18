import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built assets resolve correctly on GitHub Pages
// project sites (https://<user>.github.io/<repo>/) as well as on a custom
// domain or root deploy. HashRouter handles client-side routing.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
