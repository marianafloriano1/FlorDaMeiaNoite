"use client";

import { useEffect, useState } from "react";
import { normalizeAndValidateCpf } from "@/lib/auth/cpf";
import { normalizePhoneNumber } from "@/lib/auth/phone";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type PendingChallenge = {
  factorId: string;
  challengeId: string;
  purpose: "login" | "step-up" | "enroll";
};

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "recovery">("login");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [phonePending, setPhonePending] = useState(false);
  const [adminAccount, setAdminAccount] = useState(false);
  const [adminNeedsEnrollment, setAdminNeedsEnrollment] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "recovery") setMode("recovery");
  }, []);

  async function establishSession() {
    const response = await fetch("/api/auth/session", { method: "POST" });
    if (!response.ok) throw new Error("A conta ainda não está cadastrada ou verificada.");
  }

  async function continueSignedInUser() {
    const supabase = getSupabaseBrowserClient();
    const { data: result, error } = await supabase.auth.getUser();
    const user = result.user;
    if (error || !user) throw new Error("Entre novamente para continuar.");

    if (user.app_metadata.role === "admin") {
      setAdminAccount(true);
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.phone?.find((item) => item.status === "verified");
      setAdminNeedsEnrollment(!factor);
      if (level?.nextLevel === "aal2" && level.currentLevel !== "aal2" && factor) {
        await startChallenge(factor.id, "login");
        return;
      }
    }

    try {
      await establishSession();
      setShowProfile(false);
      setMessage("Sessão iniciada.");
    } catch {
      if (!user.email_confirmed_at) {
        setMessage("Confirme seu e-mail pelo link enviado e entre novamente para continuar.");
        return;
      }
      let draft: { fullName?: string; cpf?: string; phone?: string } = {};
      try {
        draft = JSON.parse(window.sessionStorage.getItem("fdmn-profile-draft") ?? "{}");
      } catch {
        draft = {};
      }
      setFullName(String(draft.fullName ?? user.user_metadata.full_name ?? ""));
      setCpf(String(draft.cpf ?? ""));
      setPhone(String(user.phone ?? draft.phone ?? ""));
      setEmail(user.email ?? "");
      setShowProfile(true);
      setMessage("Confirme seu celular e conclua o cadastro.");
    }
  }

  async function startChallenge(factorId: string, purpose: PendingChallenge["purpose"]) {
    const { data, error } = await getSupabaseBrowserClient().auth.mfa.challenge({ factorId });
    if (error || !data) throw new Error("Não foi possível enviar o código SMS.");
    setPendingChallenge({ factorId, challengeId: data.id, purpose });
    setMessage("Digite o código SMS para confirmar a ação.");
  }

  async function login() {
    setBusy(true);
    setErrorText("");
    setMessage("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      await continueSignedInUser();
    } catch {
      setErrorText("Não foi possível entrar. Confira os dados e a confirmação do e-mail.");
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setBusy(true);
    setErrorText("");
    setMessage("");
    try {
      const normalizedCpf = normalizeAndValidateCpf(cpf);
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedCpf || !normalizedPhone)
        throw new Error("Confira o CPF e informe um celular válido com código do país.");
      setPhone(normalizedPhone);
      window.sessionStorage.setItem(
        "fdmn-profile-draft",
        JSON.stringify({ fullName: fullName.trim(), cpf: normalizedCpf, phone: normalizedPhone }),
      );
      const { data, error } = await getSupabaseBrowserClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage(
          "Enviamos um link de confirmação ao e-mail. Depois de confirmar, entre para validar o celular.",
        );
      } else {
        await continueSignedInUser();
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPhoneCode() {
    setBusy(true);
    setErrorText("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: result, error: authError } = await supabase.auth.getUser();
      const user = result.user;
      const normalizedPhone = normalizePhoneNumber(phone);
      if (authError || !user?.email_confirmed_at || !normalizedPhone)
        throw new Error("Confirme o e-mail e informe o celular antes de continuar.");
      if (normalizePhoneNumber(user.phone) === normalizedPhone && user.phone_confirmed_at) {
        await completeCustomerRegistration();
        return;
      }
      const { error } = await supabase.auth.updateUser({ phone: normalizedPhone });
      if (error) throw error;
      setPhone(normalizedPhone);
      setPhonePending(true);
      setMessage("Enviamos um código SMS para confirmar o celular.");
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Não foi possível enviar o código SMS.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function completeCustomerRegistration() {
    const supabase = getSupabaseBrowserClient();
    const { data: result } = await supabase.auth.getUser();
    const user = result.user;
    if (!user?.phone) throw new Error("Confirme o celular para concluir o cadastro.");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, cpf, phoneNumber: user.phone }),
    });
    if (!response.ok)
      throw new Error("Cadastro não concluído. Confira os dados e as confirmações.");
    await supabase.auth.refreshSession();
    await establishSession();
    window.sessionStorage.removeItem("fdmn-profile-draft");
    setPhonePending(false);
    setShowProfile(false);
    setMessage("E-mail e celular confirmados. Cadastro concluído.");
  }

  async function confirmPhoneCode() {
    setBusy(true);
    setErrorText("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.verifyOtp({
        phone,
        token: code,
        type: "phone_change",
      });
      if (error) throw error;
      await completeCustomerRegistration();
      setCode("");
    } catch {
      setErrorText("Código SMS inválido ou expirado.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfaCode() {
    if (!pendingChallenge) return;
    setBusy(true);
    setErrorText("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId: pendingChallenge.factorId,
        challengeId: pendingChallenge.challengeId,
        code,
      });
      if (error) throw error;
      if (pendingChallenge.purpose === "enroll") {
        setAdminNeedsEnrollment(false);
        await establishSession();
        setMessage("Fator SMS cadastrado. As próximas ações administrativas exigirão confirmação.");
      } else if (pendingChallenge.purpose === "step-up") {
        const response = await fetch("/api/auth/step-up", { method: "POST" });
        if (!response.ok) throw new Error("Não foi possível renovar a verificação administrativa.");
        setMessage("Verificação administrativa renovada.");
      } else {
        await establishSession();
        setMessage("Sessão administrativa protegida iniciada.");
      }
      setPendingChallenge(null);
      setCode("");
    } catch {
      setErrorText("Código SMS inválido ou expirado.");
    } finally {
      setBusy(false);
    }
  }

  async function enrollAdminFactor() {
    setBusy(true);
    setErrorText("");
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.mfa.enroll({
        factorType: "phone",
        phone,
      });
      if (error) throw error;
      await startChallenge(data.id, "enroll");
    } catch {
      setErrorText(
        "Não foi possível iniciar o cadastro MFA. Verifique o celular e o provedor SMS.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function renewAdminStepUp() {
    setBusy(true);
    setErrorText("");
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.mfa.listFactors();
      if (error) throw error;
      const factor = data.phone.find((item) => item.status === "verified");
      if (!factor) throw new Error("Cadastre primeiro um fator SMS administrativo.");
      await startChallenge(factor.id, "step-up");
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Não foi possível solicitar novo código.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordRecovery() {
    setBusy(true);
    setErrorText("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=recovery`,
      });
      if (error) throw error;
      setMessage("Se houver uma conta para esse endereço, enviaremos um link de recuperação.");
    } catch {
      setMessage("Se houver uma conta para esse endereço, enviaremos um link de recuperação.");
    } finally {
      setBusy(false);
    }
  }

  async function completePasswordRecovery() {
    setBusy(true);
    setErrorText("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setMode("login");
      setMessage("Senha atualizada. Entre com a nova senha.");
    } catch {
      setErrorText(
        "Não foi possível atualizar a senha. Abra novamente o link recebido por e-mail.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await getSupabaseBrowserClient().auth.signOut();
    setAdminAccount(false);
    setMessage("Sessão encerrada.");
  }

  return (
    <main className="page-shell">
      <section className="intro auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">FLOR DA MEIA-NOITE</p>
        <h1 id="auth-title">
          {mode === "login"
            ? "Acesse sua conta"
            : mode === "register"
              ? "Crie sua conta"
              : "Recupere sua senha"}
        </h1>
        <p className="description">Cadastro e acesso protegidos pelo Supabase Auth.</p>
        <div className="auth-form">
          {(mode === "register" || showProfile) && !phonePending && (
            <>
              <label>
                Nome completo
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <label>
                CPF
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpf}
                  onChange={(event) => setCpf(event.target.value)}
                />
              </label>
            </>
          )}
          {mode !== "recovery" && (
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          {(mode === "login" || mode === "register" || mode === "recovery") &&
            !pendingChallenge &&
            !phonePending && (
              <label>
                {mode === "recovery" ? "Nova senha" : "Senha"}
                <input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
          {(mode === "register" || showProfile) && (
            <label>
              Celular com código do país (com ou sem +)
              <input
                type="tel"
                placeholder="5511999999999 ou +5511999999999"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          )}
          {(pendingChallenge || phonePending) && (
            <label>
              Código recebido
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
          )}

          {mode === "register" && !showProfile && (
            <button type="button" disabled={busy} onClick={() => void register()}>
              {busy ? "Aguarde…" : "Criar conta"}
            </button>
          )}
          {mode === "login" && !showProfile && !pendingChallenge && (
            <button type="button" disabled={busy} onClick={() => void login()}>
              {busy ? "Aguarde…" : "Entrar"}
            </button>
          )}
          {showProfile && !phonePending && (
            <button type="button" disabled={busy} onClick={() => void sendPhoneCode()}>
              {busy ? "Aguarde…" : "Enviar código SMS"}
            </button>
          )}
          {phonePending && (
            <button type="button" disabled={busy} onClick={() => void confirmPhoneCode()}>
              {busy ? "Aguarde…" : "Confirmar celular"}
            </button>
          )}
          {pendingChallenge && (
            <button type="button" disabled={busy} onClick={() => void verifyMfaCode()}>
              {busy ? "Aguarde…" : "Confirmar código"}
            </button>
          )}
          {mode === "recovery" && (
            <button type="button" disabled={busy} onClick={() => void completePasswordRecovery()}>
              Atualizar senha
            </button>
          )}
          {mode === "login" && !showProfile && !pendingChallenge && (
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => void requestPasswordRecovery()}
            >
              Recuperar senha por e-mail
            </button>
          )}
          {adminAccount && !pendingChallenge && (
            <>
              <label>
                Celular para MFA administrativo
                <input
                  type="tel"
                  placeholder="+5511999999999"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              {adminNeedsEnrollment ? (
                <button type="button" disabled={busy} onClick={() => void enrollAdminFactor()}>
                  Cadastrar fator SMS administrativo
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void renewAdminStepUp()}>
                  Renovar verificação administrativa
                </button>
              )}
            </>
          )}
          {adminAccount && (
            <button className="text-button" type="button" onClick={() => void logout()}>
              Encerrar sessão
            </button>
          )}
          {mode !== "recovery" && !showProfile && !pendingChallenge && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setErrorText("");
                setMessage("");
              }}
            >
              {mode === "login" ? "Ainda não tenho cadastro" : "Já tenho conta"}
            </button>
          )}
          {mode === "recovery" && (
            <button className="text-button" type="button" onClick={() => setMode("login")}>
              Voltar ao acesso
            </button>
          )}
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
          {errorText && (
            <p role="alert" className="form-error">
              {errorText}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
