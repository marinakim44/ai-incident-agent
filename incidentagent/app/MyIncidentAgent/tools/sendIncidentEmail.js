import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = 587;
const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_TO = process.env.EMAIL_TO;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: false,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  },
});

export async function sendIncidentEmail({ reportPath, reportFileName }) {
  const result = await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: "AI Incident Report",
    text: "Incident report attached.",
    attachments: [
      {
        filename: reportFileName,
        path: reportPath,
      },
    ],
  });

  return result;
}

export async function sendIncidentFailureEmail(error) {
  return transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: "AI Incident Investigation Failed",
    text: `
An incident was detected and the AI agent started investigating.

The agent crashed before completing the investigation.

Error:

${error}

The incident remains OPEN and requires manual review.
`,
  });
}
