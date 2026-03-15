/**
 * TON AI Agent - Telegram Webhook Handler
 *
 * Vercel serverless function for handling Telegram bot updates.
 * Processes messages, commands, and callback queries.
 *
 * @endpoint POST /api/telegram/webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
  inline_query?: InlineQuery;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: MessageEntity[];
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface MessageEntity {
  type: string;
  offset: number;
  length: number;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface InlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
}

// Telegram API helper
async function sendTelegramMessage(
  chatId: number,
  text: string,
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: object;
  } = {}
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'HTML',
        reply_markup: options.replyMarkup,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Answer callback query
async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Verify Telegram webhook signature (optional but recommended)
function verifyTelegramSignature(
  body: string,
  signature: string | undefined,
  secretToken: string | undefined
): boolean {
  if (!secretToken || !signature) return true; // Skip if not configured

  const expectedSignature = crypto.createHmac('sha256', secretToken).update(body).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Command handlers
const commands: Record<string, (message: TelegramMessage) => Promise<void>> = {
  start: async (message) => {
    const user = message.from;
    const welcomeText = `
<b>Welcome to TON AI Agent!</b>

Your autonomous AI trading assistant on TON blockchain.

<b>Quick Start:</b>
1. Connect your TON wallet
2. Choose a strategy
3. Set your parameters
4. Let AI do the work

<b>Commands:</b>
/agents - View your agents
/strategies - Browse strategies
/portfolio - Check portfolio
/help - Get help

Ready to start? Tap the button below!
`;

    await sendTelegramMessage(message.chat.id, welcomeText, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: 'Open Mini App',
              web_app: { url: process.env.TELEGRAM_MINI_APP_URL || 'https://t.me/tonaiagent/app' },
            },
          ],
          [{ text: 'Join Community', url: 'https://t.me/xlab_tg' }],
        ],
      },
    });
  },

  agents: async (message) => {
    const text = `
<b>Your AI Agents</b>

You don't have any agents yet.

Create your first agent to start autonomous trading!
`;

    await sendTelegramMessage(message.chat.id, text, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: 'Create Agent',
              web_app: {
                url: `${process.env.TELEGRAM_MINI_APP_URL || 'https://t.me/tonaiagent/app'}?startapp=create`,
              },
            },
          ],
        ],
      },
    });
  },

  strategies: async (message) => {
    const text = `
<b>Strategy Marketplace</b>

Browse and copy successful trading strategies:

<b>Popular Strategies:</b>
1. DCA TON - Dollar cost average into TON
2. Grid Trading - Buy low, sell high automatically
3. AI Momentum - AI-powered trend following

Explore more in the app!
`;

    await sendTelegramMessage(message.chat.id, text, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: 'Browse Strategies',
              web_app: {
                url: `${process.env.TELEGRAM_MINI_APP_URL || 'https://t.me/tonaiagent/app'}?startapp=strategies`,
              },
            },
          ],
        ],
      },
    });
  },

  portfolio: async (message) => {
    const text = `
<b>Your Portfolio</b>

Connect your wallet to view your portfolio.

<b>Quick Actions:</b>
- View balances
- Track performance
- Check P&L
`;

    await sendTelegramMessage(message.chat.id, text, {
      parseMode: 'HTML',
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: 'Open Portfolio',
              web_app: {
                url: `${process.env.TELEGRAM_MINI_APP_URL || 'https://t.me/tonaiagent/app'}?startapp=portfolio`,
              },
            },
          ],
        ],
      },
    });
  },

  help: async (message) => {
    const text = `
<b>TON AI Agent Help</b>

<b>What is TON AI Agent?</b>
An autonomous AI trading platform on TON blockchain.

<b>Commands:</b>
/start - Welcome message
/agents - View your AI agents
/strategies - Browse strategies
/portfolio - Check portfolio
/help - This help message

<b>Need Help?</b>
Join our community: @xlab_tg
Documentation: docs.tonaiagent.io

<b>Security:</b>
- Non-custodial (you control keys)
- MPC wallet support
- Risk controls built-in
`;

    await sendTelegramMessage(message.chat.id, text, {
      parseMode: 'HTML',
    });
  },
};

// Process text message
async function processMessage(message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  if (!text) return;

  // Check for commands
  if (text.startsWith('/')) {
    const commandEntity = message.entities?.find((e) => e.type === 'bot_command');
    if (commandEntity) {
      const command = text.substring(commandEntity.offset + 1, commandEntity.offset + commandEntity.length).split('@')[0];

      const handler = commands[command];
      if (handler) {
        await handler(message);
        return;
      }
    }

    // Unknown command
    await sendTelegramMessage(
      message.chat.id,
      'Unknown command. Use /help to see available commands.'
    );
    return;
  }

  // Non-command messages - could integrate AI chat here
  await sendTelegramMessage(
    message.chat.id,
    'Use commands to interact with the bot, or open the Mini App for full features.',
    {
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: 'Open Mini App',
              web_app: { url: process.env.TELEGRAM_MINI_APP_URL || 'https://t.me/tonaiagent/app' },
            },
          ],
        ],
      },
    }
  );
}

// Process callback query
async function processCallbackQuery(query: CallbackQuery): Promise<void> {
  const data = query.data;
  if (!data) {
    await answerCallbackQuery(query.id);
    return;
  }

  // Handle different callback actions
  const [action, ...params] = data.split(':');

  switch (action) {
    case 'refresh':
      await answerCallbackQuery(query.id, 'Refreshing...');
      // Handle refresh logic
      break;

    case 'agent':
      await answerCallbackQuery(query.id);
      // Handle agent-specific actions
      break;

    default:
      await answerCallbackQuery(query.id);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request (optional signature verification)
  const signature = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (secretToken && signature) {
    const body = JSON.stringify(req.body);
    if (!verifyTelegramSignature(body, signature, secretToken)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    const update: TelegramUpdate = req.body;

    // Process different update types
    if (update.message) {
      await processMessage(update.message);
    } else if (update.callback_query) {
      await processCallbackQuery(update.callback_query);
    }

    // Always respond 200 to Telegram
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Telegram from retrying
    return res.status(200).json({ ok: true, error: 'Internal error' });
  }
}
