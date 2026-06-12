import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { passkeyService } from '../../services/passkey/passkey.service';

type RecoveryStep = 'idle' | 'email' | 'code' | 'reset' | 'done';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('idle');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const { login, loginWithPasskey } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithPasskey();
    } catch (err: any) {
      setError(err.message || 'Falha no login com passkey');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'request-password-reset',
        { body: { email: recoveryEmail } }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao solicitar recuperação');

      setRecoveryStep('code');
      setRecoverySuccess('Enviamos um código de verificação para seu WhatsApp/e-mail.');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar recuperação');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (recoveryCode.length < 4) {
      setError('Digite o código recebido');
      return;
    }

    setRecoveryStep('reset');
    setRecoverySuccess('Código verificado! Defina sua nova senha.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    setRecoveryLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'verify-reset-code',
        {
          body: {
            email: recoveryEmail,
            code: recoveryCode,
            newPassword,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao redefinir senha');

      setRecoveryStep('done');
      setRecoverySuccess('Senha redefinida com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #010d32, #0A1A4A)' }}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(1, 13, 50, 0.9)' }}
      >
        <div className="p-8 md:p-10">
          <div className="mb-10 flex justify-center">
            <img
              src="/logo-dromedario.png"
              alt="DromeFlow Logo"
              className="h-32 w-auto object-contain"
            />
          </div>

          {recoveryStep === 'email' ? (
            <form className="space-y-6" onSubmit={handleRequestReset}>
              <h2 className="text-white text-center text-lg font-semibold">Recuperar senha</h2>
              <p className="text-white/60 text-sm text-center">
                Digite seu e-mail cadastrado. Enviaremos um código para seu WhatsApp ou e-mail.
              </p>
              <div>
                <label htmlFor="recovery-email" className="block mb-2 text-sm font-medium text-white/90">
                  E-mail
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                  placeholder="Digite seu e-mail"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-[#FF6B6B] text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={recoveryLoading}
                className="relative w-full rounded-xl border-0 bg-[#fd24a0] px-4 py-3 text-base font-semibold text-[#010d32] transition hover:-translate-y-0.5 hover:bg-[#E01F8C] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fd24a0] disabled:opacity-70"
              >
                {recoveryLoading ? 'Enviando...' : 'Solicitar código'}
              </button>

              <button
                type="button"
                onClick={() => { setRecoveryStep('idle'); setError(''); setRecoverySuccess(''); }}
                className="w-full text-center text-sm text-white/60 hover:text-white/90 transition mt-2"
              >
                Voltar para o login
              </button>
            </form>

          ) : recoveryStep === 'code' ? (
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              <h2 className="text-white text-center text-lg font-semibold">Digite o código</h2>

              {recoverySuccess && (
                <p className="text-sm text-green-400 text-center">{recoverySuccess}</p>
              )}

              <div>
                <label htmlFor="recovery-code" className="block mb-2 text-sm font-medium text-white/90">
                  Código de verificação
                </label>
                <input
                  id="recovery-code"
                  type="text"
                  required
                  maxLength={6}
                  className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                  placeholder="000000"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {error && (
                <p className="text-sm text-[#FF6B6B] text-center">{error}</p>
              )}

              <button
                type="submit"
                className="relative w-full rounded-xl border-0 bg-[#fd24a0] px-4 py-3 text-base font-semibold text-[#010d32] transition hover:-translate-y-0.5 hover:bg-[#E01F8C] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fd24a0]"
              >
                Verificar código
              </button>

              <button
                type="button"
                onClick={() => { setRecoveryStep('email'); setError(''); setRecoveryCode(''); }}
                className="w-full text-center text-sm text-white/60 hover:text-white/90 transition mt-2"
              >
                Reenviar código
              </button>
            </form>

          ) : recoveryStep === 'reset' ? (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <h2 className="text-white text-center text-lg font-semibold">Redefinir senha</h2>

              {recoverySuccess && (
                <p className="text-sm text-green-400 text-center">{recoverySuccess}</p>
              )}

              <div>
                <label htmlFor="new-password" className="block mb-2 text-sm font-medium text-white/90">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium text-white/90">
                  Confirmar senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-[#FF6B6B] text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={recoveryLoading}
                className="relative w-full rounded-xl border-0 bg-[#fd24a0] px-4 py-3 text-base font-semibold text-[#010d32] transition hover:-translate-y-0.5 hover:bg-[#E01F8C] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fd24a0] disabled:opacity-70"
              >
                {recoveryLoading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </form>

          ) : recoveryStep === 'done' ? (
            <div className="space-y-6 text-center">
              <h2 className="text-white text-lg font-semibold">Senha redefinida!</h2>
              <p className="text-green-400 text-sm">{recoverySuccess}</p>
              <button
                type="button"
                onClick={() => {
                  setRecoveryStep('idle');
                  setRecoverySuccess('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setRecoveryCode('');
                  setError('');
                }}
                className="relative w-full rounded-xl border-0 bg-[#fd24a0] px-4 py-3 text-base font-semibold text-[#010d32] transition hover:-translate-y-0.5 hover:bg-[#E01F8C] hover:shadow-lg"
              >
                Ir para o login
              </button>
            </div>

          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="email-address" className="block mb-2 text-sm font-medium text-white/90">
                    E-mail
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block mb-2 text-sm font-medium text-white/90">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="block w-full rounded-xl border border-white/10 bg-white/15 px-4 py-3 pr-12 text-white placeholder-white/40 outline-none transition focus:border-[#fd24a0] focus:ring-2 focus:ring-[#fd24a0]"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${password ? 'text-[#010d32] hover:text-[#0A1A4A]' : 'text-white/60 hover:text-white/90'
                        }`}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm mt-2 text-[#FF6B6B] text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full rounded-xl border-0 bg-[#fd24a0] px-4 py-3 text-base font-semibold text-[#010d32] transition hover:-translate-y-0.5 hover:bg-[#E01F8C] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#fd24a0] disabled:opacity-70"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setRecoveryStep('email'); setError(''); setRecoverySuccess(''); setRecoveryEmail(''); }}
                  className="text-sm text-white/60 hover:text-white/90 transition"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[rgba(1,13,50,0.9)] px-3 text-white/40">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition py-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.7 3.7 5.7L8 18l4-2 4 2-1.7-4.3C16.5 12.7 18 10.5 18 8a6 6 0 0 0-6-6z" />
                  <circle cx="12" cy="8" r="2" />
                </svg>
                Face ID / Touch
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
