import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL = "DromeFlow <noreply@dromeflow.com>"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("email", email)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "E-mail não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))

    const { data: hashResult, error: hashError } = await supabase
      .rpc("hash_code", { p_code: code })

    if (hashError || !hashResult) {
      throw new Error("Falha ao gerar hash do código")
    }

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        email: email.toLowerCase(),
        token_hash: hashResult,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false,
      })

    if (insertError) {
      throw new Error("Falha ao salvar token de reset")
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a2e; margin-bottom: 16px;">Recuperação de Senha</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Olá <strong>${profile.full_name}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Seu código de recuperação é:</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #888; font-size: 13px;">Este código expira em 10 minutos.</p>
        <p style="color: #888; font-size: 13px;">Se você não solicitou esta alteração, ignore este e-mail.</p>
      </div>
    `

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email.toLowerCase(),
        subject: "Código de recuperação de senha - DromeFlow",
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Resend error:", err)
      throw new Error("Falha ao enviar e-mail de recuperação")
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
