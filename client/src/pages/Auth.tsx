import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Container } from "../components/ui";
import { useToast } from "../components/Toast";
import { ApiError } from "../services/api";
export function AuthPage({ register = false }: { register?: boolean }) {
  const nav = useNavigate(),
    auth = useAuth(),
    toast = useToast();
  const [form, setForm] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      if (register) await auth.register(form);
      else await auth.login(form.email, form.password);
      toast.success(
        register
          ? "Your account was created successfully."
          : "Welcome back. You are now signed in.",
      );
      nav("/");
    } catch (e: any) {
      setError(e.message);
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <Container>
        <div className="auth-intro">
          <span>MEMBER AREA</span>
          <h1>{register ? "Join the community" : "Welcome back."}</h1>
          <p>Access your research profile and the center's management tools.</p>
        </div>
        <form className="form-card" onSubmit={submit}>
          <h2>{register ? "Create an account" : "Sign in"}</h2>
          {error && <div className="form-error">{error}</div>}
          {register && (
            <div className="form-row">
              <label>
                First name
                <input
                  required
                  minLength={2}
                  aria-invalid={Boolean(fieldErrors.firstName?.length)}
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                {fieldErrors.firstName?.[0] && (
                  <span className="field-error">
                    {fieldErrors.firstName[0]}
                  </span>
                )}
              </label>
              <label>
                Last name
                <input
                  required
                  minLength={2}
                  aria-invalid={Boolean(fieldErrors.lastName?.length)}
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
                {fieldErrors.lastName?.[0] && (
                  <span className="field-error">{fieldErrors.lastName[0]}</span>
                )}
              </label>
            </div>
          )}
          <label>
            Email address
            <input
              type="email"
              required
              aria-invalid={Boolean(fieldErrors.email?.length)}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {fieldErrors.email?.[0] && (
              <span className="field-error">{fieldErrors.email[0]}</span>
            )}
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password?.length)}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {fieldErrors.password?.[0] && (
              <span className="field-error">{fieldErrors.password[0]}</span>
            )}
          </label>
          {register && (
            <ul className="password-rules" aria-label="Password requirements">
              <li className={form.password.length >= 8 ? "valid" : ""}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(form.password) ? "valid" : ""}>
                At least one uppercase letter
              </li>
              <li className={/[0-9]/.test(form.password) ? "valid" : ""}>
                At least one number
              </li>
            </ul>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create my account" : "Sign in"}
          </button>
          <p>
            {register ? "Already a member?" : "New to the center?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </Container>
    </section>
  );
}
