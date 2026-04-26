import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const ADMIN_CHAT_ID = Deno.env.get("ADMIN_CHAT_ID")
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

serve(async (req) => {
  const { record, table, type } = await req.json()
  
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) {
    return new Response("Missing secrets", { status: 500 })
  }

  let message = ""

  // Logic for different tables (Matching your actual schema)
  if (table === 'campaigns' && type === 'INSERT') {
    message = `🆕 *New Campaign Created!*\nPlatform: ${record.platform.toUpperCase()}\nURL: ${record.target_url}\nGoal: ${record.goal_count} engagements\nCost: ₦${record.total_cost}`
  } 
  else if (table === 'payouts' && type === 'INSERT') {
    message = `💰 *Withdrawal Request!*\nUser: ${record.user_id}\nAmount: ₦${record.amount}\nBank: ${record.bank_details}`
  }
  else if (table === 'submissions' && type === 'INSERT') {
    message = `✅ *New Proof Submitted!*\nUser: ${record.proof_username}\nReward: ₦${record.reward}\nComment: ${record.proof_text}`
  }

  // Send to Telegram
  if (message) {
    try {
      const response = await fetch(TELEGRAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve_${table}_${record.id}` },
            { text: "❌ Reject", callback_data: `reject_${table}_${record.id}` }
          ]]
        }
      })
    })
      if (!response.ok) console.error("Telegram API Error:", await response.text())
    } catch (err) {
      console.error("Fetch Error:", err)
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})