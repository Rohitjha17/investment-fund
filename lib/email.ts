import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Missing SMTP configuration. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

export async function sendEmail(options: { to: string; subject: string; html: string }) {
  const from = process.env.SMTP_FROM_EMAIL;
  if (!from) {
    throw new Error('Missing SMTP_FROM_EMAIL environment variable.');
  }

  const tx = getTransporter();
  await tx.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html
  });
}

