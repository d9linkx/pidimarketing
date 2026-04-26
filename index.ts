import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = "8769241851:AAGR6OF_nq_ipZEI5-ZhjrogGDDxPJgXH4o"
const ADMIN_CHAT_ID = "-5284911043" // The ID you just found

serve(async (req) => {
  const { record, table, type } = await req.json()
  let message = ""

  // Logic for different tables
  if (table === 'tasks' && type === 'INSERT') {
    message = `🆕 *New Task Submitted!*\nUser: ${record.user_id}\nPost: ${record.post_url}\nComment: ${record.comment_text}`
  } 
  else if (table === 'withdrawals' && type === 'INSERT') {
    message = `💰 *Withdrawal Request!*\nUser: ${record.user_id}\nAmount: ₦${record.amount}\nBank: ${record.bank_details}`
  }
  else if (table === 'orders' && type === 'INSERT') {
    message = `🛍️ *New Order Created!*\nCreator: ${record.creator_id}\nPackage: ${record.package_type}`
  }

  // Send to Telegram
  if (message) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})