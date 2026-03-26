import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIGS_DIR = join(__dirname, '../../configs');

export async function loadConfig(username) {
  const path = join(CONFIGS_DIR, `${username}.json`);
  const raw = await readFile(path, 'utf-8');
  const config = JSON.parse(raw);
  validate(config, username);
  return config;
}

export async function loadAllConfigs() {
  const files = await readdir(CONFIGS_DIR);
  const configs = [];

  for (const file of files) {
    if (!file.endsWith('.json') || file === 'example.json') continue;
    const username = file.replace('.json', '');
    const config = await loadConfig(username);
    configs.push({ username, ...config });
  }

  return configs;
}

export function shouldRunNow(config, toleranceMinutes = 15) {
  const now = new Date();
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: config.schedule.timezone }));
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentDay = userTime.getDay();

  const isWeekend = currentDay === 0 || currentDay === 6;
  if (isWeekend && !config.schedule.weekends && !config.schedule.weekly_recap) return false;
  if (isWeekend && config.schedule.weekly_recap && currentDay !== 0) return false;

  for (const time of config.schedule.times) {
    const [targetHour, targetMinute] = time.split(':').map(Number);
    const diffMinutes = Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute));
    if (diffMinutes <= toleranceMinutes) return true;
  }

  return false;
}

function validate(config, username) {
  if (!config.email) throw new Error(`Config ${username}: missing email`);
  if (!config.watchlist?.length) throw new Error(`Config ${username}: missing watchlist`);
  if (!config.schedule?.times?.length) throw new Error(`Config ${username}: missing schedule.times`);
  if (!config.schedule?.timezone) throw new Error(`Config ${username}: missing schedule.timezone`);
}
