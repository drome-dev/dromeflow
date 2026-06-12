import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const N8N_WEBHOOK_URL = "https://n8n.dromedario.cloud/webhook/password-reset"

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

    const webhookPayload: Record<string, unknown> = {
      email,
      code,
      name: profile.full_name,
      type: profile.phone ? "whatsapp" : "email",
    }
    if (profile.phone) {
      webhookPayload.phone = profile.phone
    }

    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      })
    } catch {
      console.warn("Falha ao chamar webhook n8n, código gerado mas não enviado")
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
