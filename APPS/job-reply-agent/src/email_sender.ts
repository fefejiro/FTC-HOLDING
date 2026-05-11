import nodemailer from "nodemailer";

export async function sendEmail(params: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: params.host,
    port: params.port,
    secure: params.secure,
    auth: {
      user: params.user,
      pass: params.pass
    }
  });

  await transporter.sendMail({
    from: params.user,
    to: params.to,
    subject: params.subject,
    text: params.body
  });
}
