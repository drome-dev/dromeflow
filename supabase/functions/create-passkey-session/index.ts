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
      .select("auth_user_id")
      .eq("email", email)
      .single()

    if (profileError || !profile?.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não encontrado ou sem vinculo com Supabase Auth" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
      profile.auth_user_id
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não encontrado no Supabase Auth" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: user.id,
    })

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao criar sessão" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
