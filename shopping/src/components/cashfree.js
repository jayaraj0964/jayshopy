// api/user/webhook/cashfree.js
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('CASHFREE WEBHOOK HIT:', req.headers, req.body); // ← MUST

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
    console.error('CASHFREE_SECRET_KEY missing in Vercel!');
    return res.status(500).json({ error: 'Server error' });
  }

  const payloadString = JSON.stringify(body);
  const dataToSign = `${timestamp}.${payloadString}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataToSign);
  const computedSignature = hmac.digest('base64');

  if (computedSignature !== signature) {
    console.warn('Invalid signature!', { computed: computedSignature, received: signature });
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

    const text = await backendRes.text();
    if (!backendRes.ok) {
      console.error('Backend failed:', backendRes.status, text);
    } else {
      console.log('Backend updated:', text);
    }
  } catch (err) {
    console.error('Fetch to backend failed:', err);
  }

  return res.status(200).json({ success: true });
}