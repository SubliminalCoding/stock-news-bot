import { Resend } from 'resend';

let resend;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendBriefing(config, { html, text }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: config.schedule.timezone,
  });

  const { data, error } = await getResend().emails.send({
    from: process.env.RESEND_FROM || 'Stock News Bot <onboarding@resend.dev>',
    to: config.email,
    subject: `Your Market Briefing - ${dateStr}`,
    html,
    text,
  });

  if (error) {
    throw new Error(`Failed to send to ${config.email}: ${JSON.stringify(error)}`);
  }

  console.log(`Sent briefing to ${config.name} (${config.email}), id: ${data.id}`);
  return data;
}
