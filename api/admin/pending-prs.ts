import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

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

    console.log("Fetching open pull requests...");
    const pullsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
      { headers }
    );

    // Filter open PRs to only those originating from submission (starts with "Add plugin:")
    const pendingPlugins = pullsResponse.data
      .filter((pr: any) => pr.title.startsWith("Add plugin:"))
      .map((pr: any) => ({
        number: pr.number,
        title: pr.title.replace("Add plugin:", "").trim(),
        user: pr.user.login,
        created_at: pr.created_at,
        html_url: pr.html_url,
        body: pr.body,
        head_ref: pr.head.ref,
        head_label: pr.head.label,
      }));

    res.status(200).json(pendingPlugins);
  } catch (error: any) {
    console.error("Fetch pending PRs error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch open pull requests from GitHub.",
      details: error.response?.data || error.message,
    });
  }
}
