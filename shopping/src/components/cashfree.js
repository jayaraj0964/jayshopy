// api/user/webhook/cashfree.js
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('Webhook received:', req.headers, req.body); // ← DEBUG

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const body = req.body;

  if (!signature || !timestamp || !body) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret) {
    console.error('CASHFREE_SECRET_KEY not set in Vercel!');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const payloadString = JSON.stringify(body);
  const dataToSign = `${timestamp}.${payloadString}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataToSign);
  const computedSignature = hmac.digest('base64');

  console.log('Computed:', computedSignature);
  console.log('Received:', signature);

  if (computedSignature !== signature) {
    console.warn('Invalid signature!');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Forward to backend
  try {
    const backendRes = await fetch(`${process.env.BACKEND_URL}/api/user/webhook/cashfree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      body: payloadString
    });

    if (!backendRes.ok) {
      const err = await backendRes.text();
      console.error('Backend failed:', err);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }

  return res.status(200).json({ success: true });
}