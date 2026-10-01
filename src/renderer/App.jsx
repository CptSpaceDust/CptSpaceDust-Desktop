import { useEffect, useMemo, useState } from "react";
import { Bell, MessageCircle } from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import LockScreen from "./components/LockScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import Sidebar from "./components/Sidebar";
import AppSettings from "./components/AppSettings";
import { getActiveRestrictions, getProfile, updatePresence } from "./lib/data";
import { supabase } from "./lib/supabase";
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
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        ({ new: item }) => {
          setUnread((n) => n + 1);
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
    setPage(next.page);
    if (next.page === "messages") setMessageRoute(next);
    if (next.page === "notifications") setUnread(0);
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
    </div>
  );
}
