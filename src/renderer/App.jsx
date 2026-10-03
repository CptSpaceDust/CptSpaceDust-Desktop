import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, MessageCircle, Phone, PhoneOff } from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import LockScreen from "./components/LockScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import Sidebar from "./components/Sidebar";
import AppSettings from "./components/AppSettings";
import { getActiveRestrictions, getProfile, updatePresence } from "./lib/data";
import { supabase } from "./lib/supabase";
import {
  playNotificationSound,
  startRingtone,
  stopRingtone,
} from "./lib/sounds";
import {
  CollabsPage,
  IdeasPage,
  IntroductionsPage,
  ProfilePage,
  SupportPage,
} from "./pages/CommunityPagesV2";
import {
  BirthdaysPage,
  CrewPage,
  CrewProfilePage,
  GuidelinesPage,
  MeetupsPage,
} from "./pages/EnhancedCommunityPages";
import MessagesPage from "./pages/MessagesPageV2";
import NotificationsPage from "./pages/NotificationsPage";
import { useMessageAlerts } from "./lib/messageAlerts";
import CaptainPage from "./pages/CaptainPage";
import UpdateOverlay from "./components/UpdateVisual";
import {
  ConnectivityBanner,
  InactivityLock,
  useMeetupReminders,
  WhatsNew,
} from "./components/DesktopEnhancements";
import {
  getPreferences,
  isQuietTime,
  totalMessageUnread,
} from "./lib/preferences";

function parseNavigation(value) {
  const raw = String(value || "");
  let url;
  try {
    url = new URL(raw, "https://app.local/");
  } catch {
    return { page: "introductions" };
  }
  const name = url.pathname
    .split("/")
    .pop()
    .replace(/\.html$/i, "")
    .toLowerCase();
  const map = {
    communityintroductions: "introductions",
    ideas: "ideas",
    collab: "collabs",
    crew: "crew",
    memberbirthdays: "birthdays",
    communityguidelines: "guidelines",
    meetupcalendar: "meetups",
    mymeetups: "meetups",
    support: "support",
    profile: "profile",
    security: "profile",
    messages: "messages",
    conversation: "messages",
    notifications: "notifications",
    appsettings: "settings",
    captainpanel: "captain",
  };
  return {
    page: map[name] || "introductions",
    conversation:
      url.searchParams.get("id") || url.searchParams.get("conversation"),
    group: url.searchParams.get("group"),
    call: url.searchParams.get("call"),
  };
}

async function consumeDeepLink(link, setRecovery) {
  try {
    const url = new URL(link);
    if (url.hostname !== "reset-password") return;
    const params = new URLSearchParams(url.hash.replace(/^#/, ""));
    const access_token = params.get("access_token"),
      refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) throw error;
    }
    setRecovery(true);
  } catch (error) {
    console.error("Could not open recovery link", error);
  }
}

export default function App() {
  const [lock, setLock] = useState({ loading: true, locked: false });
  const [session, setSession] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("introductions");
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [initialPerson, setInitialPerson] = useState(null);
  const [viewedPerson, setViewedPerson] = useState(null);
  const [messageRoute, setMessageRoute] = useState(null);
  const [unread, setUnread] = useState(0);
  const [messageUnread, setMessageUnread] = useState(() =>
    totalMessageUnread(),
  );
  const [toast, setToast] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const incomingCallRef = useRef(null);
  useMessageAlerts(mfaRequired ? null : session?.user?.id);
  useMeetupReminders(mfaRequired ? null : session?.user?.id);
  useEffect(() => {
    const refresh = () => setMessageUnread(totalMessageUnread());
    window.addEventListener("message-reads", refresh);
    return () => window.removeEventListener("message-reads", refresh);
  }, []);
  useEffect(() => {
    window.desktop.appLock
      .getState()
      .then((value) => setLock({ loading: false, ...value }));
    return window.desktop.appLock.onState((value) =>
      setLock({ loading: false, ...value }),
    );
  }, []);
  useEffect(() => {
    let active = true;
    async function apply(next) {
      if (!active) return;
      setSession(next);
      if (next) {
        const { data } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (active)
          setMfaRequired(
            data?.nextLevel === "aal2" && data?.currentLevel !== "aal2",
          );
      } else setMfaRequired(false);
      setLoading(false);
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setTimeout(() => apply(next), 0);
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    getProfile(session.user.id).then(setProfile);
  }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    let interval;
    let channel;
    async function refresh() {
      const restrictions = await getActiveRestrictions(userId).catch(() => []);
      const site = restrictions.find((item) => item.action === "site");
      if (site) {
        window.desktop.notify(
          "Site access suspended",
          `Your account is restricted until ${new Date(site.expires_at).toLocaleString()}.`,
        );
        await supabase.auth.signOut();
        return;
      }
      await updatePresence(userId).catch(() => {});
    }
    refresh();
    interval = setInterval(refresh, 30000);
    channel = supabase
      .channel(`desktop-restrictions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_restrictions",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);
  useEffect(
    () =>
      window.desktop.onDeepLink((link) => consumeDeepLink(link, setRecovery)),
    [],
  );
  useEffect(() => window.desktop.onNavigate((value) => navigate(value)), []);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (!incomingCall) return;
    const timeout = window.setTimeout(() => {
      stopRingtone();
      setIncomingCall(null);
    }, 90000);
    return () => window.clearTimeout(timeout);
  }, [incomingCall]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count || 0));
    const channel = supabase
      .channel(`desktop-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            if (payload.old?.id === incomingCallRef.current?.id) {
              stopRingtone();
              setIncomingCall(null);
            }
            return;
          }
          if (payload.eventType !== "INSERT") return;
          const item = payload.new;
          setUnread((n) => n + 1);
          // Per-message alerts handle chat messages, including repeated messages
          // while the website's notification row is already unread.
          if (
            item.type === "message" &&
            /Conversation\.html/i.test(item.link || "")
          )
            return;
          let cancelledCall = false;
          if (item.type === "voice_call") {
            try {
              const target = new URL(item.link || "", "https://app.local/");
              cancelledCall = target.searchParams.get("cancelled") === "1";
            } catch {
              cancelledCall = false;
            }
          }
          if (item.type === "voice_call" && !cancelledCall) {
            setIncomingCall(item);
            startRingtone();
          } else {
            if (cancelledCall) {
              stopRingtone();
              setIncomingCall(null);
            }
            if (!isQuietTime(getPreferences())) playNotificationSound();
            setToast(item);
          }
          if (!isQuietTime(getPreferences()))
            window.desktop.notify(
              item.title || "Community update",
              item.message || "You have a new notification.",
              item.link || "Notifications.html",
            );
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);
  function navigate(value) {
    const next = parseNavigation(value);
    if (next.page === "messages") {
      stopRingtone();
      setIncomingCall(null);
    }
    setPage(next.page);
    if (next.page === "messages") setMessageRoute(next);
    if (next.page === "notifications") setUnread(0);
  }
  async function closeIncomingCall(open = false) {
    const item = incomingCallRef.current;
    stopRingtone();
    setIncomingCall(null);
    if (!open && item?.link) {
      try {
        const target = new URL(item.link, "https://app.local/");
        const callerId = target.searchParams.get("caller_id");
        const callId = target.searchParams.get("call");
        if (callerId && callId && callerId !== session.user.id) {
          target.searchParams.set("response", "declined");
          target.searchParams.set("responder_id", session.user.id);
          target.searchParams.set(
            "responder_name",
            profile?.username || "A crew member",
          );
          await supabase.rpc("create_notification", {
            target_user_id: callerId,
            notification_type: "voice_call_response",
            notification_title: "Call declined",
            notification_message: `${profile?.username || "A crew member"} declined your voice call.`,
            notification_link: `${target.pathname.split("/").pop()}${target.search}`,
          });
        }
      } catch {}
    }
    if (item?.id) {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", item.id)
        .eq("user_id", session.user.id);
      setUnread((count) => Math.max(0, count - 1));
    }
    if (open && item?.link) navigate(item.link);
  }
  async function logout() {
    await supabase.auth.signOut();
    setPage("introductions");
  }
  function viewPerson(person) {
    setViewedPerson(person);
    setPage("crew-profile");
  }
  const content = useMemo(() => {
    if (!session?.user || !profile) return null;
    const props = { user: session.user, profile };
    switch (page) {
      case "captain":
        return <CaptainPage {...props} />;
      case "ideas":
        return <IdeasPage {...props} />;
      case "collabs":
        return <CollabsPage {...props} />;
      case "crew":
        return <CrewPage onViewProfile={viewPerson} />;
      case "crew-profile":
        return (
          <CrewProfilePage
            person={viewedPerson}
            user={session.user}
            onBack={() => setPage("crew")}
          />
        );
      case "birthdays":
        return <BirthdaysPage />;
      case "guidelines":
        return <GuidelinesPage />;
      case "meetups":
        return <MeetupsPage {...props} />;
      case "support":
        return <SupportPage profile={profile} onUpdated={setProfile} />;
      case "profile":
        return <ProfilePage {...props} onUpdated={setProfile} />;
      case "messages":
        return (
          <MessagesPage
            {...props}
            initialPerson={initialPerson}
            route={messageRoute}
          />
        );
      case "notifications":
        return <NotificationsPage user={session.user} onNavigate={navigate} />;
      case "settings":
        return <AppSettings />;
      default:
        return <IntroductionsPage {...props} />;
    }
  }, [
    page,
    session?.user?.id,
    profile,
    initialPerson,
    messageRoute,
    viewedPerson,
  ]);
  if (lock.loading || loading)
    return (
      <div className="boot-screen">
        <div className="boot-orbit" />
        <strong>Establishing orbit…</strong>
      </div>
    );
  if (lock.locked) return <LockScreen />;
  if (recovery)
    return <ResetPasswordScreen onDone={() => setRecovery(false)} />;
  if (!session) return <AuthScreen />;
  if (mfaRequired)
    return (
      <AuthScreen
        initialMode="mfa"
        onMfaVerified={() => setMfaRequired(false)}
      />
    );
  if (!profile)
    return (
      <div className="boot-screen">
        <div className="boot-orbit" />
        <strong>Loading your crew profile…</strong>
      </div>
    );
  return (
    <div className="app-shell">
      <UpdateOverlay />
      <WhatsNew />
      <InactivityLock enabled={lock.enabled} />
      <Sidebar
        page={page}
        setPage={(id) => {
          setPage(id);
          if (id === "notifications") setUnread(0);
        }}
        profile={profile}
        onLogout={logout}
        unread={unread}
      />
      <main className="main-shell">
        <ConnectivityBanner />
        <header className="topbar">
          <div className="desktop-drag-region" />
          <div className="topbar-actions">
            <button
              className={page === "messages" ? "active" : ""}
              title="Messages"
              aria-label="Messages"
              onClick={() => setPage("messages")}
            >
              <MessageCircle />
              {messageUnread > 0 && (
                <b>{messageUnread > 99 ? "99+" : messageUnread}</b>
              )}
            </button>
            <button
              className={page === "notifications" ? "active" : ""}
              title="Notifications"
              aria-label="Notifications"
              onClick={() => setPage("notifications")}
            >
              <Bell />
              {unread > 0 && <b>{unread}</b>}
            </button>
          </div>
        </header>
        <div className="content-shell">{content}</div>
      </main>
      {toast && !incomingCall && (
        <button
          type="button"
          className="desktop-notification-toast"
          onClick={() => {
            if (toast.link) navigate(toast.link);
            setToast(null);
          }}
        >
          <Bell />
          <span>
            <strong>{toast.title || "Community update"}</strong>
            <small>{toast.message || "You have a new notification."}</small>
          </span>
        </button>
      )}
      {incomingCall && (
        <section
          className="incoming-call-card"
          role="dialog"
          aria-modal="true"
          aria-label="Incoming voice call"
        >
          <span className="incoming-call-pulse">
            <Phone />
          </span>
          <div>
            <small>Incoming voice call</small>
            <strong>
              {incomingCall.message || "A crew member wants to call you!"}
            </strong>
          </div>
          <div className="incoming-call-actions">
            <button
              type="button"
              className="decline"
              onClick={() => closeIncomingCall(false)}
              title="Dismiss call"
            >
              <PhoneOff />
            </button>
            <button type="button" onClick={() => closeIncomingCall(true)}>
              <Phone /> Answer
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
