import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

type ReportEmailData = {
  reason: string;
  description: string;
  status: string;
  createdAt: Date;
  resolvedAt?: Date;
  evidenceUrls: string[];
};

let transporterPromise: Promise<Transporter> | undefined;
let usesEthereal = false;

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.nodeEnv === 'test') {
      return nodemailer.createTransport({ jsonTransport: true });
    }

    if (env.smtpHost) {
      usesEthereal = false;
      return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined
      });
    }

    usesEthereal = true;
    const account = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass }
    });
  })();

  return transporterPromise;
}

async function sendWithTransporter(message: SendMailOptions): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail(message);

  if (usesEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`Email preview: ${previewUrl}`);
  }
}

export async function sendReportCreatedEmail(report: ReportEmailData, channelName: string): Promise<void> {
  // TODO V6 MAIL 1
  // Construye la notificación de Report creado con los datos recibidos: canal,
  // reason, descripción, status y fecha de creación. Define un asunto adecuado
  // y usa el helper de transporte existente para enviarla con Nodemailer.
  await sendWithTransporter({
    from: env.smtpFrom,
    to: env.reportNotificationEmail,
    subject: `New report created: ${channelName}`,
    text: [
      'A new report has been created in TV Hub.',
      '',
      `Channel: ${channelName}`,
      `Reason: ${report.reason}`,
      `Description: ${report.description}`,
      `Status: ${report.status}`,
      `Created at: ${report.createdAt.toISOString()}`
    ].join('\n')
  });
}

// TODO V6 MAIL 2
// Implementa la función sendReportResolvedEmail() que construya la notificación
// de Report resuelto con los datos recibidos: canal, reason, descripción,
export async function sendReportResolvedEmail(report: ReportEmailData, channelName: string, recipient: string): Promise<void> {
  await sendWithTransporter({
    from: env.smtpFrom,
    to: recipient,
    subject: `Report resolved: ${channelName}`,
    text: [
      'Your TV Hub report has been resolved by support.',
      '',
      `Channel: ${channelName}`,
      `Reason: ${report.reason}`,
      `Description: ${report.description}`,
      `Final status: ${report.status}`,
      `Resolved at: ${report.resolvedAt?.toISOString() ?? 'Not available'}`
    ].join('\n')
  });
}
