"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = { full_name: string; email: string; phone_e164: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phonePending, setPhonePending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) throw new Error("Entre como cliente para acessar o perfil.");
    const data = (await response.json()) as Profile;
    setProfile(data);
    setName(data.full_name);
    setEmail(data.email);
    setPhone(data.phone_e164);
  }, []);

  useEffect(() => {
    void load().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Falha ao carregar perfil."),
    );
  }, [load]);

  async function updateName() {
    setError("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name }),
    });
    if (!response.ok) {
      setError("Não foi possível atualizar o nome.");
      return;
    }
    setMessage("Nome atualizado.");
    await load();
  }

  async function requestEmailChange() {
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: result, error: authError } = await supabase.auth.getUser();
      if (authError || !result.user?.email || !currentPassword)
        throw new Error("Entre novamente e informe sua senha atual.");
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: result.user.email,
        password: currentPassword,
      });
      if (loginError) throw loginError;
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/profile` },
      );
      if (error) throw error;
      setMessage(
        "Enviamos confirmações ao endereço atual e ao novo e-mail. A alteração será concluída após a confirmação.",
      );
    } catch {
      setError(
        "Não foi possível iniciar a alteração do e-mail. Confira a senha e o endereço informado.",
      );
    }
  }

  async function syncVerifiedProfile() {
    setError("");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      setError("Confirme o novo e-mail e celular antes de sincronizar o perfil.");
      return;
    }
    setMessage("Dados confirmados atualizados no perfil.");
    await load();
  }

  async function requestPhoneChange() {
    setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ phone });
      if (error) throw error;
      setPhonePending(true);
      setMessage("Enviamos um código SMS ao novo celular.");
    } catch {
      setError("Não foi possível enviar o código ao celular.");
    }
  }

  async function confirmPhoneChange() {
    setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.verifyOtp({
        phone,
        token: phoneCode,
        type: "phone_change",
      });
      if (error) throw error;
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Falha ao sincronizar telefone confirmado.");
      setPhonePending(false);
      setPhoneCode("");
      setMessage("Celular confirmado e atualizado.");
      await load();
    } catch {
      setError("Não foi possível confirmar o celular. Confira o código e tente novamente.");
    }
  }

  async function changePassword() {
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: result, error: authError } = await supabase.auth.getUser();
      if (authError || !result.user?.email || !currentPassword || !password)
        throw new Error("Informe sua senha atual e a nova senha.");
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: result.user.email,
        password: currentPassword,
      });
      if (loginError) throw loginError;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setCurrentPassword("");
      setMessage("Senha atualizada.");
    } catch {
      setError(
        "Não foi possível atualizar a senha. Verifique a senha atual e os requisitos do provedor.",
      );
    }
  }

  return (
    <main className="page-shell">
      <section className="intro auth-card">
        <p className="eyebrow">FLOR DA MEIA-NOITE</p>
        <h1>Meu perfil</h1>
        {profile ? (
          <div className="auth-form">
            <label>
              Nome completo
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button type="button" onClick={() => void updateName()}>
              Salvar nome
            </button>
            <p>CPF: não pode ser alterado pelo cliente.</p>
            <label>
              Novo e-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Senha atual para confirmar alterações
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void requestEmailChange()}>
              Confirmar novo e-mail
            </button>
            <button type="button" onClick={() => void syncVerifiedProfile()}>
              Sincronizar dados confirmados
            </button>
            <label>
              Novo celular
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            {!phonePending ? (
              <button type="button" onClick={() => void requestPhoneChange()}>
                Enviar código SMS
              </button>
            ) : (
              <>
                <label>
                  Código SMS
                  <input
                    inputMode="numeric"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value)}
                  />
                </label>
                <button type="button" onClick={() => void confirmPhoneChange()}>
                  Confirmar celular
                </button>
              </>
            )}
            <label>
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void changePassword()}>
              Atualizar senha
            </button>
          </div>
        ) : (
          <p className="description">Carregando seus dados…</p>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
