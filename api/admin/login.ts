import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (username === "bay4lly" && password === "zZxX62544+3388") {
    return res.status(200).json({ success: true, token: "admin_token_placeholder" });
  }

  return res.status(401).json({ error: "Invalid admin credentials" });
}
