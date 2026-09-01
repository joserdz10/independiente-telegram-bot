import "dotenv/config";
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = `${process.env.PUBLIC_BASE_URL.replace(/\/$/,"")}/telegram-webhook`;
const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method:"POST", headers:{"content-type":"application/json"},
  body:JSON.stringify({ url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates:["message","callback_query"] })
});
console.log(await r.json());
