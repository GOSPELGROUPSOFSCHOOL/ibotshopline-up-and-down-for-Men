import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch/scrape the ImgBB album dynamically
  app.get("/api/album", async (req, res) => {
    return res.json({
      success: true,
      images: [
        "https://i.ibb.co/sd3zkcDV/IMG-20260628-WA0083.jpg",
        "https://i.ibb.co/3yH80rLV/IMG-20260704-WA0046.jpg",
        "https://i.ibb.co/qFshF3RX/IMG-20260704-WA0045.jpg"
      ],
      source: "local-assets"
    });
  });

  // API Route to submit form directly or any secondary needs
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
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
    // Serve the src/assets folder directly in production so our local high-definition images resolve
    app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
