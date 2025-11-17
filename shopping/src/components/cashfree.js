// api/user/webhook/cashfree.js
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const body = req.body;

  if (!signature || !timestamp || !body) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const secret = process.env.CASHFREE_SECRET_KEY; // ← SAFE!
  if (!secret) {
    console.error('CASHFREE_SECRET_KEY not set');
    return res.status(500).json({ error: 'Server error' });
  }

  const payloadString = JSON.stringify(body);
  const dataToSign = `${timestamp}.${payloadString}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataToSign);
  const computedSignature = hmac.digest('base64');

  if (computedSignature !== signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await fetch(`${process.env.BACKEND_URL}/api/user/webhook/cashfree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      body: payloadString
    });
  } catch (err) {
    console.error('Backend webhook failed:', err);
  }

  return res.status(200).json({ success: true });
}