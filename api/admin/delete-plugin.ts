import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password, pluginId } = req.body;

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

    // 2. Remove the plugin from metadata list
    const updatedPlugins = existingPlugins.filter((p: any) => p.id !== pluginId);

    // 3. Commit updated plugins.json directly to main branch
    const updatedPluginsJsonB64 = Buffer.from(
      JSON.stringify(updatedPlugins, null, 2),
      "utf-8"
    ).toString("base64");

    console.log("Committing updated plugins.json...");
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/plugins.json`,
      {
        message: `Admin: Delete plugin entry ${pluginId}`,
        content: updatedPluginsJsonB64,
        sha: pluginsJsonSha,
        branch,
      },
      { headers }
    );

    // 4. Delete the plugin directory files on GitHub
    const folderPath = `plugins/${pluginId}`;
    console.log(`Checking files in folder ${folderPath}...`);
    try {
      const filesResp = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`,
        { headers }
      );

      if (Array.isArray(filesResp.data)) {
        for (const file of filesResp.data) {
          console.log(`Deleting file: ${file.path}...`);
          await axios.delete(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            {
              headers,
              data: {
                message: `Admin: Delete ${file.name} for ${pluginId}`,
                sha: file.sha,
                branch,
              }
            }
          );
        }
      }
    } catch (e: any) {
      if (e.response?.status !== 404) {
        throw e;
      }
      console.log(`Directory ${folderPath} was already empty or not found.`);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Admin delete plugin error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to delete plugin from GitHub.",
      details: error.response?.data || error.message,
    });
  }
}
