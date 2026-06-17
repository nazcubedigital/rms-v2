import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const CONFIG_PATH = path.join(process.cwd(), "gas_url_config.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to read the currently synchronized GAS URL
  app.get("/api/gas-url", (req, res) => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        if (config && config.url) {
          return res.json({ url: config.url });
        }
      }
      
      // Fallback: check environment variable
      const envUrl = process.env.VITE_GOOGLE_SCRIPT_URL;
      if (envUrl && envUrl.startsWith("https://") && !envUrl.includes("xxxxxxxxxxxxxxxx")) {
        return res.json({ url: envUrl });
      }

      res.json({ url: "" });
    } catch (error) {
      console.error("Error reading GAS URL config:", error);
      res.json({ url: "" });
    }
  });

  // API Route to save/update the synchronized GAS URL across all devices
  app.post("/api/gas-url", (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string" || !url.startsWith("https://")) {
        return res.status(400).json({ status: "error", message: "Invalid Web App URL" });
      }
      
      fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify({ url: url.trim(), updatedAt: new Date().toISOString() }, null, 2),
        "utf-8"
      );
      console.log(`Saved new GAS Web App URL to config file: ${url}`);
      res.json({ status: "success", url: url.trim() });
    } catch (error: any) {
      console.error("Error saving GAS URL config:", error);
      res.status(500).json({ status: "error", message: error.toString() });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
