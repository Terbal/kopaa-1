import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: ["reach-jazz-frighten.ngrok-free.dev"],
  },

  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        lobby: "lobby.html",
        rules: "pages/rules.html",
        top100: "pages/top100.html",
      },
    },
  },
});
