import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

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
    const { email, code, newPassword } = await req.json()

    if (!email || !code || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, código e nova senha são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "A senha deve ter no mínimo 6 caracteres" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: tokens, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Código inválido ou expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const token = tokens[0]

    const { data: verifyResult, error: verifyError } = await supabase
      .rpc("verify_code", { p_code: code, p_hash: token.token_hash })

    if (verifyError || !verifyResult) {
      return new Response(
        JSON.stringify({ success: false, error: "Código inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const { data: passwordHash, error: hashError } = await supabase
      .rpc("hash_code", { p_code: newPassword })

    if (hashError || !passwordHash) {
      throw new Error("Falha ao processar nova senha")
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("email", email.toLowerCase())

    if (updateError) {
      throw new Error("Falha ao atualizar senha")
    }

    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", token.id)

    return new Response(
      JSON.stringify({ success: true, message: "Senha redefinida com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
