import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password, pluginId, metadata, files } = req.body;

  if (username !== "bay4lly" || password !== "zZxX62544+3388") {
    return res.status(401).json({ error: "Unauthorized admin credentials" });
  }

  const adminToken = process.env.GITHUB_ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: "GITHUB_ADMIN_TOKEN is not configured on the server." });
  }

  try {
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      "User-Agent": "bay4lly_dev_portal_app",
      Accept: "application/vnd.github.v3+json",
    };

    const owner = "bay4lly1221";
    const repo = "bay4lly-shop-repo";
    const branch = "main";

    // 1. Fetch current plugins.json
    console.log("Fetching current plugins.json...");
    let existingPlugins: any[] = [];
    let pluginsJsonSha: string | undefined = undefined;

    try {
      const pluginsJsonResp = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/plugins.json?ref=${branch}`,
        { headers }
      );
      pluginsJsonSha = pluginsJsonResp.data.sha;
      const rawContent = Buffer.from(pluginsJsonResp.data.content, "base64").toString("utf-8");
      existingPlugins = JSON.parse(rawContent);
    } catch (e: any) {
      if (e.response?.status !== 404) {
        throw e;
      }
    }

    // 2. Find and update the plugin metadata
    const pluginIndex = existingPlugins.findIndex((p: any) => p.id === pluginId);
    
    // Maintain old properties like featured, verified, author if they are already in the database
    const oldPlugin = pluginIndex > -1 ? existingPlugins[pluginIndex] : {};
    
    const updatedPluginEntry = {
      id: pluginId,
      title: metadata.title,
      author: oldPlugin.author || "bay4lly1221",
      version: metadata.version,
      description: metadata.description,
      category: metadata.category,
      folder: pluginId,
      filename: metadata.filename || oldPlugin.filename || `${pluginId}.js`,
      featured: metadata.featured !== undefined ? metadata.featured : (oldPlugin.featured || false),
      verified: metadata.verified !== undefined ? metadata.verified : (oldPlugin.verified || false),
      beta: metadata.beta !== undefined ? metadata.beta : (oldPlugin.beta || false),
      tags: Array.isArray(metadata.tags)
        ? metadata.tags
        : (metadata.tags || "")
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
      min_version: metadata.minVersion || oldPlugin.min_version || "4.0.0",
    };

    if (pluginIndex > -1) {
      existingPlugins[pluginIndex] = updatedPluginEntry;
    } else {
      existingPlugins.push(updatedPluginEntry);
    }

    // 3. Commit updated plugins.json directly to main branch
    const updatedPluginsJsonB64 = Buffer.from(
      JSON.stringify(existingPlugins, null, 2),
      "utf-8"
    ).toString("base64");

    console.log("Committing updated plugins.json...");
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/plugins.json`,
      {
        message: `Admin: Update metadata for ${pluginId}`,
        content: updatedPluginsJsonB64,
        sha: pluginsJsonSha,
        branch,
      },
      { headers }
    );

    // 4. Overwrite uploaded files directly to main branch
    if (files) {
      for (const [filename, base64Content] of Object.entries(files)) {
        if (!base64Content) continue;
        const filePath = `plugins/${pluginId}/${filename}`;

        // Get file SHA if it already exists in the repo (to overwrite it)
        let fileSha: string | undefined = undefined;
        try {
          const fileResp = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
            { headers }
          );
          fileSha = fileResp.data.sha;
        } catch (e: any) {
          if (e.response?.status !== 404) {
            throw e;
          }
        }

        console.log(`Committing file ${filePath}...`);
        await axios.put(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
          {
            message: `Admin: Add/Update ${filename} for ${pluginId}`,
            content: base64Content,
            sha: fileSha,
            branch,
          },
          { headers }
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Admin edit plugin error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to edit plugin metadata on GitHub.",
      details: error.response?.data || error.message,
    });
  }
}
