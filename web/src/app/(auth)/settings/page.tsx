"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Desktop, DeviceMobile, Key, UserCircle } from "@phosphor-icons/react";
import { getMe } from "@/lib/api/auth";
import { requireToken } from "@/lib/api/auth-extra";
import {
  changePassword,
  getNotificationPreferences,
  listSessions,
  patchMe,
  putNotificationPreferences,
  revokeSession,
} from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Checkbox, Field, Input, PageHeader } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatDateTime, humanise } from "@/components/marketing/format";

/** GET /me/sessions rows (AuthService.listSessions). */
type Session = {
  sessionId: string;
  userAgent?: string | null;
  createdAt?: string | number | null;
  lastUsedAt?: string | number | null;
  expiresAt?: string | number | null;
  mfaSatisfied?: boolean;
};
type Pref = { channel: string; kind: string; enabled: boolean };
type Note = { ok: boolean; text: string } | null;

/** Very small user-agent summary: "Chrome on Windows". */
function describeAgent(ua: string | null | undefined): { label: string; mobile: boolean } {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : null;
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  const mobile = /Mobile|iPhone|Android/.test(ua);
  if (browser && os) return { label: `${browser} on ${os}`, mobile };
  return { label: browser ?? os ?? ua.slice(0, 40), mobile };
}

function InlineNote({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <div aria-live="polite" className="mt-4">
      <Callout tone={note.ok ? "success" : "danger"}>{note.text}</Callout>
    </div>
  );
}

/** Shell-06 — Settings (AUTH-17..21, RPT-10/11) */
export default function SettingsPage() {
  const [me, setMe] = useState<{ displayName: string; email?: string | null; kind?: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNote, setProfileNote] = useState<Note>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState<Note>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [sessionNote, setSessionNote] = useState<Note>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsNote, setPrefsNote] = useState<Note>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = requireToken();
        const m = await getMe(token);
        setMe(m);
        setDisplayName(m.displayName);
        const s = await listSessions();
        setSessions(s.items as Session[]);
        try {
          const p = await getNotificationPreferences();
          setPrefs(p.items as Pref[]);
        } catch {
          /* student tokens skip RPT */
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Sign in required");
      }
    })();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileNote(null);
    try {
      await patchMe({ displayName });
      setMe((prev) => (prev ? { ...prev, displayName } : prev));
      setProfileNote({ ok: true, text: "Profile updated" });
    } catch (err) {
      setProfileNote({ ok: false, text: err instanceof ApiError ? err.message : "Update failed" });
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwNote(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPwNote({ ok: true, text: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwNote({ ok: false, text: err instanceof ApiError ? err.message : "Change failed" });
    } finally {
      setPwBusy(false);
    }
  }

  async function onRevoke(sessionId: string) {
    setRevoking(sessionId);
    setSessionNote(null);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((x) => x.sessionId !== sessionId));
      setSessionNote({ ok: true, text: "Session signed out" });
    } catch (err) {
      setSessionNote({ ok: false, text: err instanceof ApiError ? err.message : "Revoke failed" });
    } finally {
      setRevoking(null);
    }
  }

  async function savePrefs() {
    setPrefsBusy(true);
    setPrefsNote(null);
    try {
      const res = await putNotificationPreferences(prefs);
      setPrefs(res.items as Pref[]);
      setPrefsNote({ ok: true, text: "Preferences saved" });
    } catch (err) {
      setPrefsNote({ ok: false, text: err instanceof ApiError ? err.message : "Save failed" });
    } finally {
      setPrefsBusy(false);
    }
  }

  if (error) {
    return (
      <AppPage width="content">
        <PageHeader title="Settings" />
        <ErrorState title="We couldn't load your settings" body={`${error}. Log in again and retry.`} action={<ButtonLink href="/login" variant="secondary">Log in</ButtonLink>} />
      </AppPage>
    );
  }
  if (!me) {
    return (
      <AppPage width="content">
        <PageHeader title="Settings" description="Profile, security and notifications." />
        <div className="space-y-5">
          <LoadingState label="Loading settings…" />
          <LoadingState lines={2} />
        </div>
      </AppPage>
    );
  }

  const tooShort = newPassword.length > 0 && newPassword.length < 10;
  const prefsByChannel = prefs.reduce<Record<string, { pref: Pref; index: number }[]>>((acc, p, index) => {
    (acc[p.channel] ??= []).push({ pref: p, index });
    return acc;
  }, {});

  return (
    <AppPage width="content">
      <PageHeader title="Settings" description={me.email ?? "Profile, security and notifications."} />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Profile" description="How your name appears across Study Loop." action={<UserCircle size={22} className="text-neutral-400" aria-hidden />} />
          <CardBody>
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Display name" htmlFor="dn">
                <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
              </Field>
              {me.email && (
                <Field label="Email" htmlFor="em" hint="Contact support to change the email on your account.">
                  <Input id="em" type="email" value={me.email} disabled readOnly />
                </Field>
              )}
              <div className="flex justify-end">
                <Button type="submit" loading={profileBusy} disabled={displayName === me.displayName}>
                  Save profile
                </Button>
              </div>
            </form>
            <InlineNote note={profileNote} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Password" description="Choose a password of at least 10 characters." action={<Key size={22} className="text-neutral-400" aria-hidden />} />
          <CardBody>
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Current password" htmlFor="cur">
                <Input
                  id="cur"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field label="New password" htmlFor="nw" error={tooShort ? "Use at least 10 characters." : undefined}>
                <Input
                  id="nw"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={tooShort || undefined}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" loading={pwBusy}>
                  Change password
                </Button>
              </div>
            </form>
            <InlineNote note={pwNote} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Signed-in devices" description="Sign out of any device you don’t recognise." />
          <CardBody className="py-2">
            {sessions.length === 0 ? (
              <div className="py-3">
                <EmptyState title="No active sessions" body="Devices you sign in on will appear here." />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {sessions.map((s) => {
                  const agent = describeAgent(s.userAgent);
                  const last = formatDateTime(s.lastUsedAt ?? s.createdAt);
                  const DeviceIcon = agent.mobile ? DeviceMobile : Desktop;
                  return (
                    <li key={s.sessionId} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                          <DeviceIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-neutral-900">
                            {agent.label}
                            {s.mfaSatisfied && <Badge tone="success">2-step verified</Badge>}
                          </p>
                          <p className="text-caption text-neutral-600">
                            {last ? `Last active ${last}` : `Session ${String(s.sessionId).slice(0, 8)}…`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        loading={revoking === s.sessionId}
                        disabled={revoking !== null && revoking !== s.sessionId}
                        onClick={() => onRevoke(s.sessionId)}
                        aria-label={`Sign out ${agent.label}`}
                      >
                        Sign out
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <InlineNote note={sessionNote} />
          </CardBody>
        </Card>

        {prefs.length > 0 && (
          <Card>
            <CardHeader title="Notifications" description="Choose what we send you and where." action={<Bell size={22} className="text-neutral-400" aria-hidden />} />
            <CardBody>
              <div className="space-y-5">
                {Object.entries(prefsByChannel).map(([channel, list]) => (
                  <fieldset key={channel}>
                    <legend className="text-caption font-semibold uppercase tracking-wide text-neutral-600">{humanise(channel)}</legend>
                    <div className="mt-2 space-y-2.5">
                      {list.map(({ pref, index }) => (
                        <Checkbox
                          key={`${pref.channel}-${pref.kind}`}
                          id={`pref-${index}`}
                          checked={pref.enabled}
                          label={humanise(pref.kind)}
                          onChange={(e) => {
                            const next = [...prefs];
                            next[index] = { ...pref, enabled: e.target.checked };
                            setPrefs(next);
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" loading={prefsBusy} onClick={savePrefs}>
                  Save notifications
                </Button>
              </div>
              <InlineNote note={prefsNote} />
            </CardBody>
          </Card>
        )}
      </div>
    </AppPage>
  );
}
