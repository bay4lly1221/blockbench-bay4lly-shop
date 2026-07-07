import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password, prNumber } = req.body;

  if (username !== "bay4lly" || password !== "zZxX62544+3388") {
    return res.status(401).json({ error: "Unauthorized admin credentials" });
  }

  const adminToken = process.env.GITHUB_ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: "GITHUB_ADMIN_TOKEN is not configured on the server." });
  }

  if (!prNumber) {
    return res.status(400).json({ error: "prNumber is required." });
  }

  try {
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      "User-Agent": "bay4lly_dev_portal_app",
      Accept: "application/vnd.github.v3+json",
    };

    const owner = "bay4lly1221";
    const repo = "bay4lly-shop-repo";

    console.log(`Merging PR #${prNumber} on ${owner}/${repo}...`);
    const mergeResponse = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      {
        commit_title: `Admin: Approve and Merge plugin submission #${prNumber}`,
        merge_method: "squash"
      },
      { headers }
    );

    res.status(200).json({ success: true, sha: mergeResponse.data.sha });
  } catch (error: any) {
    console.error("Merge PR error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to merge the pull request.",
      details: error.response?.data || error.message,
    });
  }
}
