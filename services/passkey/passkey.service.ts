import { supabase } from '../supabaseClient'
import { supabasePasskey } from '../passkeySupabaseClient'

export interface PasskeyInfo {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export const passkeyService = {
  async register(): Promise<{ id: string }> {
    const { data, error } = await supabasePasskey.auth.registerPasskey()
    if (error) throw new Error(error.message)
    return { id: data.id }
  },

  async signIn(): Promise<{ email: string; userId: string }> {
    const { data, error } = await supabasePasskey.auth.signInWithPasskey()
    if (error) throw new Error(error.message)
    if (!data.user?.email) throw new Error('Email não disponível após autenticação')
    return { email: data.user.email, userId: data.user.id }
  },

  async list(): Promise<PasskeyInfo[]> {
    const { data, error } = await supabasePasskey.auth.passkey.list()
    if (error) throw new Error(error.message)
    return data as PasskeyInfo[]
  },

  async update(passkeyId: string, friendlyName: string) {
    const { error } = await supabasePasskey.auth.passkey.update({
      passkeyId,
      friendlyName,
    })
    if (error) throw new Error(error.message)
  },

  async remove(passkeyId: string) {
    const { error } = await supabasePasskey.auth.passkey.delete({
      passkeyId,
    })
    if (error) throw new Error(error.message)
  },

  async createAuthSession(email: string): Promise<{ access_token: string; refresh_token: string }> {
    const { data, error } = await supabase.functions.invoke(
      'create-passkey-session',
      { body: { email } }
    )
    if (error || !data?.success) throw new Error(data?.error || 'Falha ao criar sessão')
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    }
  },
}
