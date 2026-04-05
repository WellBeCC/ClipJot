import type { VercelRequest, VercelResponse } from '@vercel/node';

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? '';
const BUTTONDOWN_URL = 'https://buttondown.com/api/emails/embed-subscribe/clipjot';

interface RecaptchaResponse {
  success: boolean;
  score: number;
  action: string;
  'error-codes'?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({});
  }

  const { email, token } = req.body as { email?: string; token?: string };

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  // Verify reCAPTCHA v3 token
  const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token }).toString(),
  });

  const verifyData = (await verifyRes.json()) as RecaptchaResponse;

  if (!verifyData.success || verifyData.score < 0.5) {
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }

  // Forward to Buttondown
  const bdRes = await fetch(BUTTONDOWN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email }).toString(),
  });

  if (!bdRes.ok) {
    return res.status(500).json({ error: 'Subscription failed' });
  }

  return res.status(200).json({ ok: true });
}
