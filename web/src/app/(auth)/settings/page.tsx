"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** Shell-06 — Settings (AUTH-17..21, RPT-10/11) */
export default function SettingsPage() {
  const [me, setMe] = useState<{ displayName: string; email?: string | null } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sessions, setSessions] = useState<{ sessionId: string; userAgent?: string }[]>([]);
  const [prefs, setPrefs] = useState<{ channel: string; kind: string; enabled: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = requireToken();
        const m = await getMe(token);
        setMe(m);
        setDisplayName(m.displayName);
        const s = await listSessions();
        setSessions(s.items as { sessionId: string; userAgent?: string }[]);
        try {
          const p = await getNotificationPreferences();
          setPrefs(p.items as { channel: string; kind: string; enabled: boolean }[]);
        } catch {
          /* student tokens skip RPT */
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Sign in required");
      }
    })();
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <ErrorState body={error} />
      </main>
    );
  }
  if (!me) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="mt-2 text-ink/70">{me.email}</p>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl">Profile</h2>
        <label htmlFor="dn" className="block text-sm font-medium">
          Display name
        </label>
        <input
          id="dn"
          className="w-full rounded-md border border-mist px-3 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Button
          onClick={async () => {
            try {
              await patchMe({ displayName });
              setNote("Profile updated");
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Update failed");
            }
          }}
        >
          Save profile
        </Button>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl">Password</h2>
        <label htmlFor="cur" className="block text-sm">
          Current password
        </label>
        <input
          id="cur"
          type="password"
          className="w-full rounded-md border border-mist px-3 py-2"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <label htmlFor="nw" className="block text-sm">
          New password
        </label>
        <input
          id="nw"
          type="password"
          className="w-full rounded-md border border-mist px-3 py-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          onClick={async () => {
            try {
              await changePassword(currentPassword, newPassword);
              setNote("Password changed");
              setCurrentPassword("");
              setNewPassword("");
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Change failed");
            }
          }}
        >
          Change password
        </Button>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Sessions</h2>
        <ul className="mt-3 space-y-2">
          {sessions.map((s) => (
            <li key={s.sessionId} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {s.sessionId.slice(0, 8)}… {s.userAgent || ""}
              </span>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await revokeSession(s.sessionId);
                    setSessions((prev) => prev.filter((x) => x.sessionId !== s.sessionId));
                  } catch (err) {
                    setNote(err instanceof ApiError ? err.message : "Revoke failed");
                  }
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {prefs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Notifications</h2>
          <ul className="mt-3 space-y-2">
            {prefs.map((p, i) => (
              <li key={`${p.channel}-${p.kind}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  id={`pref-${i}`}
                  onChange={(e) => {
                    const next = [...prefs];
                    next[i] = { ...p, enabled: e.target.checked };
                    setPrefs(next);
                  }}
                />
                <label htmlFor={`pref-${i}`}>
                  {p.channel} · {p.kind}
                </label>
              </li>
            ))}
          </ul>
          <Button
            className="mt-3"
            onClick={async () => {
              try {
                const res = await putNotificationPreferences(prefs);
                setPrefs(res.items as typeof prefs);
                setNote("Preferences saved");
              } catch (err) {
                setNote(err instanceof ApiError ? err.message : "Save failed");
              }
            }}
          >
            Save notifications
          </Button>
        </section>
      )}

      {note && (
        <p className="mt-6 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
