// src/Config/brevo.transport.js
import Brevo from '@getbrevo/brevo';

export class BrevoApiTransport {
  name = 'brevo-api';
  version = '1.0.0';

  constructor(opts = {}) {
    const { apiKey } = opts;
    if (!apiKey) throw new Error('BrevoApiTransport: missing apiKey');

    this.client = new Brevo.TransactionalEmailsApi();
    this.client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  // Nodemailer calls this
  async send(mail, callback) {
    try {
      const data = await mail.data; // nodemailer content

      const email = new Brevo.SendSmtpEmail();

      // sender
      if (typeof data.from === 'string') {
        email.sender = { email: data.from };
      } else if (data.from?.address) {
        email.sender = { email: data.from.address, name: data.from.name };
      }

      // recipients helpers
      const mapAddr = (v) =>
        (Array.isArray(v) ? v : [v])
          .filter(Boolean)
          .map((x) =>
            typeof x === 'string'
              ? { email: x }
              : { email: x.address || x.email, name: x.name }
          );

      if (data.to)   email.to = mapAddr(data.to);
      if (data.cc)   email.cc = mapAddr(data.cc);
      if (data.bcc)  email.bcc = mapAddr(data.bcc);

      // reply-to
      if (data.replyTo) {
        if (typeof data.replyTo === 'string') {
          email.replyTo = { email: data.replyTo };
        } else if (data.replyTo.address) {
          email.replyTo = { email: data.replyTo.address, name: data.replyTo.name };
        }
      }

      email.subject = data.subject || '';
      if (data.html) email.htmlContent = data.html;
      if (data.text) email.textContent = data.text;

      // headers / custom tags
      if (data.headers) email.headers = data.headers;

      // send via API
      const res = await this.client.sendTransacEmail(email);
      const messageId = res?.messageId || res?.messageIds?.[0] || null;

      // Nodemailer expects a response-like object
      callback(null, {
        envelope: {
          from: email.sender?.email,
          to: [...(email.to || []), ...(email.cc || []), ...(email.bcc || [])].map((r) => r.email),
        },
        messageId,
        accepted: (email.to || []).map((r) => r.email),
        rejected: [],
        response: `OK API ${messageId || ''}`.trim(),
      });
    } catch (err) {
      callback(err);
    }
  }
}
