import nodemailer, { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getEnv(name: string): string {
  return String(process.env[name] || '').trim();
}

function parseBool(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

export function getSmtpConfig() {
  const host = getEnv('SMTP_HOST') || getEnv('EMAIL_HOST');
  const portRaw = getEnv('SMTP_PORT') || getEnv('EMAIL_PORT') || '587';
  const user = getEnv('SMTP_USER') || getEnv('EMAIL_USER');
  const passRaw = getEnv('SMTP_PASS') || getEnv('SMTP_PASSWORD') || getEnv('EMAIL_PASS') || getEnv('EMAIL_PASSWORD');

  // Gmail app passwords are sometimes pasted with spaces.
  const pass = passRaw.replace(/\s+/g, '');
  const port = Number(portRaw) || 587;
  const secureFromEnv = parseBool(getEnv('SMTP_SECURE') || getEnv('EMAIL_SECURE'));
  const secure = typeof secureFromEnv === 'boolean' ? secureFromEnv : port === 465;
  const from = getEnv('SMTP_FROM') || getEnv('EMAIL_FROM') || user;

  return { host, port, user, pass, secure, from };
}

export function isSmtpConfigured(): boolean {
  const cfg = getSmtpConfig();
  return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const cfg = getSmtpConfig();
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    }
  });

  return cachedTransporter;
}

export async function sendTeamInviteEmail(params: {
  to: string;
  teamName: string;
  role: 'editor' | 'viewer';
  inviteUrl: string;
  signupInviteUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: 'SMTP is not configured' };
  }

  const cfg = getSmtpConfig();
  const transporter = getTransporter();

  const roleLabel = params.role === 'viewer' ? 'Viewer (read-only)' : 'Editor (can edit)';
  const subject = `You are invited to join ${params.teamName} on IDEA Platform`;

  const text = [
    `You have been invited to join the team "${params.teamName}" as ${roleLabel}.`,
    '',
    'If you already have an IDEA account, join directly:',
    params.inviteUrl,
    '',
    'If you are new, create your account with this invite link:',
    params.signupInviteUrl,
    '',
    'This invite expires in 7 days.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Team Invitation</h2>
      <p>You have been invited to join <strong>${params.teamName}</strong> as <strong>${roleLabel}</strong>.</p>
      <p style="margin: 16px 0 8px;">Already have an account?</p>
      <p><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
      <p style="margin: 16px 0 8px;">New to IDEA Platform?</p>
      <p><a href="${params.signupInviteUrl}">${params.signupInviteUrl}</a></p>
      <p style="margin-top: 16px; color: #475569;">This invite expires in 7 days.</p>
    </div>
  `;

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject,
    text,
    html
  });

  return { sent: true };
}
