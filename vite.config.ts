import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configurationPath = path.resolve(__dirname, "configuration.js");
const configurationExamplePath = path.resolve(__dirname, "configuration.example.js");

function resolveConfigurationSource() {
  if (fs.existsSync(configurationPath)) {
    return configurationPath;
  }

  if (fs.existsSync(configurationExamplePath)) {
    return configurationExamplePath;
  }

  return null;
}

function configurationPlugin(): Plugin {
  return {
    name: "eluvio-configuration",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/configuration.js") {
          next();
          return;
        }

        const sourcePath = resolveConfigurationSource();
        if (!sourcePath) {
          res.statusCode = 404;
          res.end("configuration.js not found");
          return;
        }

        res.setHeader("Content-Type", "application/javascript");
        res.end(fs.readFileSync(sourcePath, "utf-8"));
      });
    },
    closeBundle() {
      const sourcePath = resolveConfigurationSource();
      if (!sourcePath) {
        return;
      }

      fs.copyFileSync(
        sourcePath,
        path.resolve(__dirname, "dist/configuration.js"),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), configurationPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  server: {
    port: 8084,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST",
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
