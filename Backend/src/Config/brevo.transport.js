// brevo.transport.js
import axios from 'axios';

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeAddress(v) {
  // Accept: "a@b.com" | { address, name } | { email, name }
  if (!v) return null;
  if (typeof v === 'string') return { email: v, name: '' };
  if (v.address) return { email: v.address, name: v.name || '' };
  if (v.email) return { email: v.email, name: v.name || '' };
  return null;
}

function normalizeList(v) {
  return toArray(v).map(normalizeAddress).filter(Boolean);
}

export class BrevoApiTransport {
  constructor(options) {
    this.name = 'BrevoApiTransport';
    this.version = '1.1.0';
    this.apiKey = options.apiKey;
  }

  async send(mail, callback) {
    try {
      const data = await mail.data;

      // FROM
      let from = normalizeAddress(data.from) ||
        normalizeAddress({
          email: process.env.BREVO_FROM_EMAIL,
          name: process.env.BREVO_FROM_NAME,
        });

      // TO/CC/BCC
      const to = normalizeList(data.to);
      const cc = normalizeList(data.cc);
      const bcc = normalizeList(data.bcc);

      if (!from?.email) throw new Error('Missing/invalid "from" address');
      if (!to.length) throw new Error('Missing "to" recipients');

      const payload = {
        sender: { email: from.email, name: from.name || undefined },
        to,
        subject: data.subject || '',
        htmlContent: data.html || data.htmlContent || undefined,
        textContent: data.text || undefined,
      };

      const replyTo = normalizeAddress(data.replyTo);
      if (replyTo) payload.replyTo = { email: replyTo.email, name: replyTo.name || undefined };
      if (cc.length) payload.cc = cc;
      if (bcc.length) payload.bcc = bcc;

      const res = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        payload,
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Hand back something Nodemailer-ish
      const messageId =
        res.data?.messageId ||
        res.data?.messageIds?.[0] ||
        res.headers['x-message-id'];

      callback(null, { messageId, response: res.data });
    } catch (err) {
      const details = err.response?.data || err.message || err;
      console.error('❌ Brevo API error:', details);
      callback(err);
    }
  }
}
