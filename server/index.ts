import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Exchange authorization code for user profile
  app.post("/api/auth/github", async (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Code parameter is required" });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId === "YOUR_GITHUB_CLIENT_ID") {
      return res.status(500).json({
        error: "GitHub OAuth credentials not configured on the server."
      });
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: { Accept: "application/json" }
        }
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        return res.status(400).json({
          error: "Failed to obtain access token from GitHub.",
          details: tokenResponse.data,
        });
      }

      // 2. Fetch user profile
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "bay4lly_dev_portal_app"
        }
      });

      const { login, avatar_url, name } = userResponse.data;
      res.json({ login, avatar_url, name, token: accessToken });
    } catch (error: any) {
      console.error("GitHub auth exchange error:", error?.response?.data || error.message);
      res.status(500).json({
        error: "Authentication failed during token exchange.",
        message: error.message
      });
    }
  });

  // Submit new plugin using user's token and automate the PR creation flow
  app.post("/api/submit-plugin", async (req, res) => {
    const { token, pluginId, metadata, files } = req.body;

    if (!token || !pluginId || !metadata || !files) {
      return res.status(400).json({ error: "Missing required parameters (token, pluginId, metadata, files)" });
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "User-Agent": "bay4lly_dev_portal_app",
        Accept: "application/vnd.github.v3+json",
      };

      // 1. Fetch user profile to get username
      const userResponse = await axios.get("https://api.github.com/user", { headers });
      const username = userResponse.data.login;
      
      const upstreamOwner = "bay4lly1221";
      const repoName = "bay4lly-shop-repo";
      let targetOwner = upstreamOwner;

      // 2. Fork if user is not the repo owner
      if (username !== upstreamOwner) {
        console.log(`Forking repository for user ${username}...`);
        await axios.post(
          `https://api.github.com/repos/${upstreamOwner}/${repoName}/forks`,
          {},
          { headers }
        );
        targetOwner = username;
        // Wait a brief period for the fork to be created/initialized
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // 3. Get base branch SHA from upstream
      console.log("Getting upstream base SHA...");
      const baseRefResponse = await axios.get(
        `https://api.github.com/repos/${upstreamOwner}/${repoName}/git/ref/heads/main`,
        { headers }
      );
      const baseSha = baseRefResponse.data.object.sha;

      // 4. Create new branch on the target repository
      const branchName = `submit-${pluginId}-${Date.now().toString().slice(-6)}`;
      console.log(`Creating branch ${branchName} on ${targetOwner}/${repoName}...`);
      await axios.post(
        `https://api.github.com/repos/${targetOwner}/${repoName}/git/refs`,
        {
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        },
        { headers }
      );

      // 5. Update plugins.json
      let existingPlugins: any[] = [];
      let pluginsJsonSha: string | undefined = undefined;

      try {
        console.log("Fetching existing plugins.json...");
        const pluginsJsonResp = await axios.get(
          `https://api.github.com/repos/${targetOwner}/${repoName}/contents/plugins.json?ref=${branchName}`,
          { headers }
        );
        pluginsJsonSha = pluginsJsonResp.data.sha;
        const rawContent = Buffer.from(pluginsJsonResp.data.content, "base64").toString("utf-8");
        existingPlugins = JSON.parse(rawContent);
      } catch (e: any) {
        if (e.response?.status !== 404) {
          throw e;
        }
        console.log("plugins.json not found, starting with empty array.");
      }

      // Prepare metadata for plugins.json
      const newPluginEntry = {
        id: pluginId,
        title: metadata.title,
        author: username,
        version: metadata.version,
        description: metadata.description,
        category: metadata.category,
        folder: pluginId,
        featured: false,
        verified: false,
        beta: metadata.beta,
        tags: Array.isArray(metadata.tags)
          ? metadata.tags
          : metadata.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean),
        min_version: metadata.minVersion,
      };

      // Remove duplicates if same ID exists
      existingPlugins = existingPlugins.filter((p: any) => p.id !== pluginId);
      existingPlugins.push(newPluginEntry);

      const updatedPluginsJsonB64 = Buffer.from(
        JSON.stringify(existingPlugins, null, 2),
        "utf-8"
      ).toString("base64");

      console.log("Committing updated plugins.json...");
      await axios.put(
        `https://api.github.com/repos/${targetOwner}/${repoName}/contents/plugins.json`,
        {
          message: `Update plugins.json for ${pluginId}`,
          content: updatedPluginsJsonB64,
          sha: pluginsJsonSha,
          branch: branchName,
        },
        { headers }
      );

      // 6. Commit new plugin files (plugin.js, icon.png, banner.png, README.md)
      for (const [filename, base64Content] of Object.entries(files)) {
        if (!base64Content) continue;
        const filePath = `plugins/${pluginId}/${filename}`;
        console.log(`Committing file ${filePath}...`);
        await axios.put(
          `https://api.github.com/repos/${targetOwner}/${repoName}/contents/${filePath}`,
          {
            message: `Add ${filename} for ${pluginId}`,
            content: base64Content,
            branch: branchName,
          },
          { headers }
        );
      }

      // 7. Create Pull Request back to upstream repo
      console.log("Creating Pull Request...");
      const prResponse = await axios.post(
        `https://api.github.com/repos/${upstreamOwner}/${repoName}/pulls`,
        {
          title: `Add plugin: ${metadata.title}`,
          head: `${targetOwner}:${branchName}`,
          base: "main",
          body: `This PR was automatically created by the Bay4lly Shop Developer Portal on behalf of @${username}.\n\n` +
                `**Plugin Info:**\n` +
                `- **Title:** ${metadata.title}\n` +
                `- **Author:** ${username}\n` +
                `- **Category:** ${metadata.category}\n` +
                `- **Version:** ${metadata.version}\n` +
                `- **Description:** ${metadata.description}`,
        },
        { headers }
      );

      console.log("Pull Request created successfully!");
      res.json({ success: true, prUrl: prResponse.data.html_url });

    } catch (error: any) {
      console.error("Plugin submission error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Failed to submit plugin and create Pull Request.",
        details: error.response?.data || error.message,
      });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
