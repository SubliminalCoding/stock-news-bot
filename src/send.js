import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBriefing(config, { html, text }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: config.schedule.timezone,
  });

  const { data, error } = await resend.emails.send({
    from: 'Stock News Bot <briefing@dadstocks.netlify.app>',
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
