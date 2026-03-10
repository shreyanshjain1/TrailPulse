import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "";
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";
const from = process.env.SMTP_FROM || "";

export function mailerReady() {
  return Boolean(host && port && user && pass && from);
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!mailerReady()) throw new Error("MAILER_NOT_CONFIGURED");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}