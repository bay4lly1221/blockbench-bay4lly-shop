import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bay4lly_dev_portal_app"
      }
    });

    const { login, avatar_url, name } = userResponse.data;
    res.status(200).json({ login, avatar_url, name, token: accessToken });
  } catch (error: any) {
    console.error("GitHub auth exchange error:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Authentication failed during token exchange.",
      message: error.message
    });
  }
}
