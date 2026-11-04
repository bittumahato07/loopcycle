"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Role = "citizen" | "admin";
type View = "home" | "overview" | "report" | "pickup" | "requests" | "request-detail" | "notifications" | "profile" | "analytics";
type WasteType = "Plastic" | "Organic" | "E-waste" | "Glass" | "Other";
type RequestStatus = "Pending" | "Assigned" | "Collected" | "Completed" | "Cancelled";

type Request = {
  id: string;
  type: WasteType;
  location: string;
  date: string;
  quantity: string;
  status: RequestStatus;
  collector: string;
  description: string;
  photo: boolean;
  history: { status: RequestStatus; note: string; changedAt: string }[];
};

const categories: { type: WasteType; icon: string; tone: string; rule: string }[] = [
  { type: "Plastic", icon: "♢", tone: "blue", rule: "Bottles, bags and packaging are recyclable when empty and clean." },
  { type: "Organic", icon: "✦", tone: "green", rule: "Food scraps and garden waste can be composted locally." },
  { type: "E-waste", icon: "⌁", tone: "purple", rule: "Batteries and devices need specialist handling — never bin them." },
  { type: "Glass", icon: "◯", tone: "orange", rule: "Rinse jars and bottles. Keep broken glass separate." },
  { type: "Other", icon: "＋", tone: "grey", rule: "Our collection team will assess and route unusual materials safely." }
];

const navItems: { view: View; label: string; icon: string }[] = [
  { view: "overview", label: "Dashboard", icon: "⌂" },
  { view: "report", label: "Report waste", icon: "＋" },
  { view: "pickup", label: "Request pickup", icon: "↗" },
  { view: "requests", label: "My requests", icon: "▤" },
  { view: "notifications", label: "Notifications", icon: "◔" },
  { view: "profile", label: "Profile", icon: "○" },
  { view: "analytics", label: "Analytics", icon: "▥" }
];

export default function Home() {
  const [user, setUser] = useState<{ name: string; email: string; role: Role; preferences: { pickupReminders: boolean; impactUpdates: boolean } } | null>(null);
  const [role, setRole] = useState<Role>("citizen");
  const [view, setView] = useState<View>("home");
  const [requests, setRequests] = useState<Request[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      setLoadError("");
      let authenticated = false;
      try {
        const response = await fetch("/api/auth/me");
        const result = await response.json();
        if (response.ok && result.user) {
          authenticated = true;
          setUser(result.user);
          setRole(result.user.role);
          const requestsResponse = await fetch("/api/requests");
          const requestsResult = await requestsResponse.json();
          if (!requestsResponse.ok) throw new Error(requestsResult.error ?? "Unable to load requests.");
          setRequests(requestsResult.requests);
          setView("overview");
        } else if (response.status === 401) {
          setUser(null);
          setRequests([]);
        } else {
          throw new Error(result.error ?? "Unable to check your account.");
        }
      } catch (error) {
        if (authenticated) {
          setLoadError(getFriendlyError(error, "We couldn’t load your workspace data."));
        } else {
          setUser(null);
          setLoadError(getFriendlyError(error, "We couldn’t connect to LoopCycle."));
        }
      } finally {
        setLoading(false);
      }
    };
    void loadSession();
  }, [retryAttempt]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const retryLoading = () => setRetryAttempt((attempt) => attempt + 1);

  const navigate = (nextView: View) => {
    setView(nextView);
    setMobileNavOpen(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const updateProfile = async (profile: { name: string; email: string; preferences: { pickupReminders: boolean; impactUpdates: boolean } }) => {
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to update your profile.");
    setUser(result.user);
    setRole(result.user.role);
  };

  const submitSupport = async (ticket: { category: string; subject: string; message: string }) => {
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to send your support request.");
    setShowSupport(false);
    notify("Support request sent. We’ll get back to you soon.");
  };

  const addRequest = async (request: Omit<Request, "id" | "status" | "collector" | "history">) => {
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to submit request.");
      setRequests((current) => [result.request, ...current]);
      navigate("requests");
      notify("Your waste report has been received.");
    } catch (error) {
      notify(getFriendlyError(error, "Unable to submit request."));
    }
  };

  const updateRequest = async (id: string, updates: Partial<Request>) => {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update request.");
      setRequests((current) => current.map((request) => request.id === id ? result.request : request));
      notify("Request updated successfully.");
    } catch (error) {
      notify(getFriendlyError(error, "Unable to update request."));
    }
  };

  if (loading) return <WorkspaceLoadingState />;
  if (!user && loadError) return <LoadErrorScreen message={loadError} onRetry={retryLoading} />;

  const openRequest = (id: string) => {
    setSelectedRequestId(id);
    setView("request-detail");
  };

  if (view === "home") {
    return <>
      <PublicHome onGetStarted={() => { window.location.href = "/login"; }} />
      {showLogin && <LoginModal role={role} onClose={() => setShowLogin(false)} onSelect={(nextRole) => { setRole(nextRole); setView("overview"); setShowLogin(false); notify(`${nextRole === "admin" ? "Admin" : "Citizen"} workspace loaded.`); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>;
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={mobileNavOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="logo"><span>↻</span><strong>loop<span>cycle</span></strong></div>
        <div className="workspace-switcher"><div className="avatar">{user?.name.slice(0, 2).toUpperCase()}</div><div><strong>{user?.name}</strong><small>{role === "admin" ? "Admin workspace" : "Citizen account"}</small></div><span>⌄</span></div>
        <nav className="side-nav" aria-label="Dashboard navigation">
          <small className="nav-label">{role === "admin" ? "OPERATIONS" : "MY SPACE"}</small>
          {(role === "admin" ? navItems.filter((item) => ["overview", "requests", "analytics", "profile"].includes(item.view)) : navItems.filter((item) => item.view !== "analytics")).map((item) => (
            <button key={item.view} className={view === item.view ? "nav-item active" : "nav-item"} onClick={() => navigate(item.view)}><span>{item.icon}</span>{item.label}{item.view === "notifications" && <b>3</b>}</button>
          ))}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item support" onClick={() => setShowSupport(true)}><span>?</span>Help & support</button><button className="nav-item" onClick={logout}><span>⇥</span>Log out</button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="topbar-leading"><button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{role === "admin" ? "Admin dashboard" : view === "overview" ? "Overview" : navItems.find((item) => item.view === view)?.label}</strong></div></div><div className="topbar-actions"><button className="icon-button" onClick={() => navigate("notifications")} aria-label="Notifications">◔</button><button className="mobile-logout-button" onClick={logout}>Log out</button><button className="profile-chip" onClick={() => navigate("profile")}><span className="avatar small">{user?.name.slice(0, 2).toUpperCase()}</span><span>{user?.name}</span><span>⌄</span></button></div></header>
        {loadError && <InlineLoadError message={loadError} onRetry={retryLoading} />}
        {role === "admin" ? <AdminView user={user} view={view} requests={requests} navigate={navigate} updateRequest={updateRequest} updateProfile={updateProfile} openRequest={openRequest} selectedRequestId={selectedRequestId} /> : <CitizenView user={user} view={view} requests={requests} navigate={navigate} addRequest={addRequest} notify={notify} updateProfile={updateProfile} updateRequest={updateRequest} openRequest={openRequest} selectedRequestId={selectedRequestId} />}
      </main>
      {showLogin && <LoginModal role={role} onClose={() => setShowLogin(false)} onSelect={(nextRole) => { setRole(nextRole); setView("overview"); setShowLogin(false); notify(`${nextRole === "admin" ? "Admin" : "Citizen"} workspace loaded.`); }} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} onSubmit={submitSupport} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function getFriendlyError(error: unknown, fallback: string) {
 if (typeof navigator !== "undefined" && !navigator.onLine) return "You appear to be offline. Check your connection and try again.";
 if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) return "We couldn’t reach LoopCycle. Check your connection and try again.";
 return error instanceof Error && error.message ? error.message : fallback;
}

function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
 return <main className="load-state-page"><div className="load-state-card"><span className="load-state-icon">!</span><p className="eyebrow">CONNECTION ISSUE</p><h1>We couldn’t load LoopCycle.</h1><p>{message}</p><button className="primary-button" onClick={onRetry}>Try again <span>↻</span></button></div></main>;
}

function InlineLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
 return <div className="inline-load-error" role="alert"><div><strong>Some workspace data is unavailable.</strong><p>{message}</p></div><button className="secondary-button" onClick={onRetry}>Retry</button></div>;
}

function WorkspaceLoadingState() {
 return <main className="skeleton-shell" aria-label="Loading LoopCycle workspace" aria-busy="true"><aside className="skeleton-sidebar"><span className="skeleton-line logo-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></aside><section className="skeleton-content"><span className="skeleton-line skeleton-topbar" /><div className="skeleton-heading"><span className="skeleton-line" /><span className="skeleton-line short" /></div><div className="skeleton-cards"><span /><span /><span /></div><div className="skeleton-panel"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div></section></main>;
}

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function PublicHome({ onGetStarted }: { onGetStarted: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const materials = [
    ["Plastic", "Bottles, bags and clean packaging.", "♢"],
    ["Organic", "Food scraps and garden waste.", "✦"],
    ["E-waste", "Devices, batteries and chargers.", "⌁"],
    ["Glass", "Jars and bottles, kept separate.", "◯"],
    ["Paper", "Cardboard, sheets and packaging.", "▤"],
    ["Metal", "Cans and other recoverable metals.", "◇"]
  ];
  const faqs = [
    ["What can I report?", "Plastic, organic waste, e-waste, glass, paper, metal, and other materials that need safe collection."],
    ["Does it cost anything?", "Household waste reports and standard pickup requests are free for residents within our service area."],
    ["How does waste pickup work?", "Add the material, location, quantity, and preferred date. Our team reviews the request and updates its status."],
    ["How do I track my report?", "Sign in to see every request move from pending to assigned, collected, and completed."],
    ["Can I use LoopCycle as an admin?", "Yes. Admin accounts can manage requests, assign collectors, update statuses, and review analytics."]
  ];
  return <div className="public-home">
    <header className="public-nav">
      <a className="logo" href="#public-home" aria-label="LoopCycle home"><span>↻</span><strong>loop<span>cycle</span></strong></a>
      <nav className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)}><a href="#how-it-works">How it works</a><a href="#materials">Materials</a><a href="#impact">Our impact</a><a href="#faq">FAQ</a></nav>
      <div className="public-actions"><button className="public-login" onClick={onGetStarted}>Log in</button><button className="public-cta" onClick={onGetStarted}>Get started <span>↗</span></button><button className="menu-toggle" onClick={() => setMenuOpen((current) => !current)} aria-label="Toggle navigation" aria-expanded={menuOpen}>{menuOpen ? "×" : "☰"}</button></div>
    </header>
    <main id="public-home">
      <section className="public-hero">
        <div className="hero-content"><span className="public-eyebrow"><i />Waste management, made simple</span><h1>Report waste.<br /><em>Track cleanup.</em><br /><em>Keep your city clean.</em></h1><p>Report waste, request a pickup, and follow the cleanup from your neighborhood — all in one place.</p><div className="public-hero-actions"><button className="public-cta large" onClick={onGetStarted}>Report waste <span>→</span></button><a className="public-text-link" href="#how-it-works">See how it works <span>→</span></a></div><div className="trust-line"><span className="mini-avatars"><i>R</i><i>A</i><i>M</i><i>+</i></span><span>Trusted by <strong>2,400+ residents</strong></span></div></div>
        <div className="hero-art"><div className="art-sun" /><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><div className="art-leaf leaf-a">♣</div><div className="art-leaf leaf-b">✦</div><div className="floating-card card-impact"><span className="card-round">♻</span><div><small>Community impact</small><strong>68,420 kg</strong><em>+18% this month</em></div></div><div className="floating-card card-pickup"><span className="pickup-pin">●</span><div><small>Next collection</small><strong>Tomorrow, 9:00 AM</strong></div><span>↗</span></div><div className="art-bottle bottle-a" /><div className="art-bottle bottle-b" /></div>
      </section>
      <section className="public-proof" aria-label="Why use LoopCycle"><div><strong>01</strong><span>Simple reporting from any device</span></div><div><strong>02</strong><span>Clear pickup status updates</span></div><div><strong>03</strong><span>Responsible material sorting</span></div><div><strong>04</strong><span>One account for your whole loop</span></div></section>
      <section className="public-section" id="how-it-works"><div className="public-section-heading"><div><span className="section-kicker">01 / THE LOOP</span><h2>Make a difference<br /><em>in three steps.</em></h2></div><p>LoopCycle connects residents, collectors, and recovery partners so less waste ends up in landfills.</p></div><div className="public-step-grid"><article><b>01</b><span className="step-symbol green-symbol">♻</span><h3>Report waste</h3><p>Tell us what you found, where it is, and add a photo so our team can help.</p></article><article><b>02</b><span className="step-symbol orange-symbol">◷</span><h3>We collect it</h3><p>Choose a convenient time and our local collection team will take it from there.</p></article><article><b>03</b><span className="step-symbol purple-symbol">✦</span><h3>Track your impact</h3><p>Follow your request from pending to completed and see your contribution grow.</p></article></div></section>
      <section className="material-highlight" id="materials"><div><span className="section-kicker">02 / KNOW YOUR MATERIALS</span><h2>Every item has<br /><em>a next chapter.</em></h2><p>Not sure where something belongs? Our simple guide helps you sort with confidence.</p><button className="public-text-link" onClick={onGetStarted}>Explore materials <span>→</span></button></div><div className="material-pills">{materials.map(([name, description, icon]) => <div className="material-pill" key={name}><span className="guide-icon green">{icon}</span><div><strong>{name}</strong><small>{description}</small></div><span>→</span></div>)}</div></section>
      <section className="public-impact" id="impact"><div className="impact-copy"><span className="section-kicker light">03 / OUR IMPACT</span><h2>Good data makes<br /><em>better decisions.</em></h2><p>Every report helps our city understand where waste is coming from and how to recover more of it responsibly.</p><button className="outline-light" onClick={onGetStarted}>Join the movement <span>↗</span></button></div><div className="impact-chart"><div className="chart-label"><span>Waste recovered this year</span><strong>12,840 kg</strong></div><div className="chart-bars">{[42, 55, 48, 69, 61, 82, 94].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][index]}</small></div>)}</div><div className="chart-note"><i />On track to recover 18,000 kg by year end</div></div></section>
      <section className="public-benefits"><div><span className="section-kicker">WHY LOOPCYCLE</span><h2>Less friction.<br /><em>More follow-through.</em></h2><p>Everything you need to move waste from your street to its next useful chapter.</p></div><div className="benefit-grid"><article><span>⌁</span><h3>Know what happens next</h3><p>See each request move from pending to collected in one clear timeline.</p></article><article><span>◷</span><h3>Plan with confidence</h3><p>Add a location, date, quantity, and context so collections are easier to coordinate.</p></article><article><span>♻</span><h3>Build better habits</h3><p>Use material guidance to sort responsibly before you submit a request.</p></article></div></section>
      <section className="public-faq" id="faq"><div><span className="section-kicker">04 / NEED TO KNOW</span><h2>Questions,<br /><em>answered.</em></h2><p>Ready to make your first report?</p><button className="public-cta" onClick={onGetStarted}>Get started <span>↗</span></button></div><div className="public-faq-list">{faqs.map(([question, answer], index) => <div className={openFaq === index ? "faq-item open" : "faq-item"} key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{question}</span><b>+</b></button><p>{answer}</p></div>)}</div></section>
      <section className="public-final-cta"><span className="section-kicker">CLOSE THE LOOP</span><h2>Ready to make your<br /><em>neighborhood cleaner?</em></h2><p>Report waste, track collections, and help build a cleaner community.</p><button className="public-cta large" onClick={onGetStarted}>Report waste <span>→</span></button></section>
    </main>
    <footer className="public-footer"><div className="footer-brand"><a className="logo" href="#public-home"><span>↻</span><strong>loop<span>cycle</span></strong></a><p>Making waste management simpler for everyone.</p></div><div className="footer-links"><div><strong>Product</strong><a href="#how-it-works">How it works</a><a href="#materials">Materials</a><a href="#impact">Impact</a></div><div><strong>Company</strong><a href="#faq">FAQ</a><a href="#public-home">About</a><button onClick={onGetStarted}>Contact</button></div></div><small className="footer-copyright">© 2026 LoopCycle. Waste, back in the loop.</small></footer>
  </div>;
}

function CitizenView({ user, view, requests, navigate, addRequest, notify, updateProfile, updateRequest, openRequest, selectedRequestId }: { user: { name: string; email: string; role: Role; preferences: { pickupReminders: boolean; impactUpdates: boolean } } | null; view: View; requests: Request[]; navigate: (view: View) => void; addRequest: (request: Omit<Request, "id" | "status" | "collector" | "history">) => Promise<void>; notify: (message: string) => void; updateProfile: (profile: { name: string; email: string; preferences: { pickupReminders: boolean; impactUpdates: boolean } }) => Promise<void>; updateRequest: (id: string, updates: Partial<Request>) => Promise<void>; openRequest: (id: string) => void; selectedRequestId: string | null }) {
  if (view === "report" || view === "pickup") return <RequestForm mode={view} onSubmit={addRequest} onCancel={() => navigate("overview")} />;
  if (view === "request-detail") return <RequestDetail request={requests.find((request) => request.id === selectedRequestId) ?? null} admin={false} onBack={() => navigate("requests")} onUpdate={updateRequest} />;
  if (view === "requests") return <RequestsView requests={requests} admin={false} onUpdate={() => undefined} onOpen={openRequest} />;
  if (view === "notifications") return <NotificationsView requests={requests} />;
  if (view === "profile") return <ProfileView user={user} notify={notify} updateProfile={updateProfile} />;
  return <CitizenOverview user={user} requests={requests} navigate={navigate} openRequest={openRequest} />;
}

function CitizenOverview({ user, requests, navigate, openRequest }: { user: { name: string } | null; requests: Request[]; navigate: (view: View) => void; openRequest: (id: string) => void }) {
  const active = requests.filter((request) => request.status !== "Completed");
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">YOUR LOOPCYCLE ACCOUNT</p><h1>Welcome, {user?.name} <span>✦</span></h1><p className="subtitle">Make your neighborhood cleaner, one report at a time.</p></div><button className="primary-button" onClick={() => navigate("report")}>＋ Report waste</button></div>
    <div className="hero-banner"><div><span className="banner-tag">YOUR IMPACT</span><h2>{requests.length} <em>reports submitted.</em></h2><p>Your collection activity will appear here as you submit reports.</p></div><div className="banner-illustration">♻</div></div>
    <div className="stat-grid"><StatCard label="Total reports" value={String(requests.length)} change="Your submitted reports" icon="▤" /><StatCard label="Active requests" value={String(active.length)} change="Awaiting collection" icon="↗" /><StatCard label="Completed requests" value={String(requests.filter((request) => request.status === "Completed").length)} change="Successfully collected" icon="✦" /></div>
    <div className="section-heading"><div><p className="eyebrow">KEEP AN EYE ON IT</p><h2>Recent requests</h2></div><button className="text-button" onClick={() => navigate("requests")}>View all requests →</button></div>
    <RequestsTable requests={active.slice(0, 3)} onOpen={openRequest} />
    <div className="quick-grid"><button onClick={() => navigate("report")}><span className="quick-icon green">＋</span><strong>Report waste</strong><small>Tell us what needs collecting</small><span className="quick-arrow">↗</span></button><button onClick={() => navigate("pickup")}><span className="quick-icon orange">◷</span><strong>Schedule a pickup</strong><small>Choose a time that works for you</small><span className="quick-arrow">↗</span></button><button onClick={() => navigate("notifications")}><span className="quick-icon purple">◔</span><strong>View notifications</strong><small>3 updates waiting for you</small><span className="quick-arrow">↗</span></button></div>
  </div>;
}

function AdminView({ user, view, requests, navigate, updateRequest, updateProfile, openRequest, selectedRequestId }: { user: { name: string; email: string; role: Role; preferences: { pickupReminders: boolean; impactUpdates: boolean } } | null; view: View; requests: Request[]; navigate: (view: View) => void; updateRequest: (id: string, updates: Partial<Request>) => Promise<void>; updateProfile: (profile: { name: string; email: string; preferences: { pickupReminders: boolean; impactUpdates: boolean } }) => Promise<void>; openRequest: (id: string) => void; selectedRequestId: string | null }) {
  if (view === "analytics") return <AnalyticsView requests={requests} />;
  if (view === "profile") return <ProfileView user={user} notify={() => undefined} updateProfile={updateProfile} />;
  if (view === "request-detail") return <RequestDetail request={requests.find((request) => request.id === selectedRequestId) ?? null} admin onBack={() => navigate("requests")} onUpdate={updateRequest} />;
  const pending = requests.filter((request) => request.status === "Pending").length;
  const collected = requests.filter((request) => ["Collected", "Completed"].includes(request.status)).length;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">OPERATIONS CENTER</p><h1>Good morning, Admin <span>✦</span></h1><p className="subtitle">Here&apos;s what&apos;s happening across LoopCycle today.</p></div><button className="primary-button" onClick={() => navigate("analytics")}>View analytics ↗</button></div>
    <div className="stat-grid admin-stats"><StatCard label="Total waste reports" value={String(requests.length)} change="All submitted requests" icon="▤" /><StatCard label="Pending requests" value={String(pending)} change="Needs attention" icon="◷" alert /><StatCard label="Collected requests" value={String(collected)} change="Collected or completed" icon="♻" /><StatCard label="Assigned requests" value={String(requests.filter((request) => request.status === "Assigned").length)} change="Currently assigned" icon="♙" /></div>
    <div className="section-heading"><div><p className="eyebrow">ACTION REQUIRED</p><h2>Collection requests</h2></div><button className="text-button" onClick={() => navigate("requests")}>Manage all →</button></div>
    <RequestsTable requests={requests} admin onUpdate={updateRequest} onOpen={openRequest} />
    <div className="admin-lower"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">ALL TIME</p><h3>Waste by category</h3></div></div><CategoryBars requests={requests} /></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Collection requests</h3></div><span className="live-dot">● Live</span></div><ActivityFeed requests={requests} /></div></div>
  </div>;
}

function AnalyticsView({ requests }: { requests: Request[] }) {
  const completed = requests.filter((request) => request.status === "Completed").length;
  const collected = requests.filter((request) => request.status === "Collected").length;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">OPERATIONS CENTER</p><h1>Analytics</h1><p className="subtitle">Live metrics from submitted collection requests.</p></div></div><div className="stat-grid admin-stats"><StatCard label="Total requests" value={String(requests.length)} change="All time" icon="▤" /><StatCard label="Completed" value={String(completed)} change="Successfully processed" icon="✓" /><StatCard label="Collected" value={String(collected)} change="Ready for completion" icon="♻" /><StatCard label="Completion rate" value={requests.length ? `${Math.round((completed / requests.length) * 100)}%` : "0%"} change="Based on current requests" icon="↗" /></div><div className="panel"><div className="panel-heading"><div><p className="eyebrow">BREAKDOWN</p><h3>Requests by material</h3></div></div><CategoryBars requests={requests} /></div></div>;
}

function StatCard({ label, value, change, icon, alert = false }: { label: string; value: string; change: string; icon: string; alert?: boolean }) { return <div className={alert ? "stat-card alert" : "stat-card"}><span className="stat-icon">{icon}</span><p>{label}</p><strong>{value}</strong><small>{change}</small></div>; }

function RequestsTable({ requests, admin = false, onUpdate = () => undefined, onOpen }: { requests: Request[]; admin?: boolean; onUpdate?: (id: string, updates: Partial<Request>) => void; onOpen?: (id: string) => void }) {
  return <div className="table-card">{requests.length === 0 ? <div className="empty-table-state"><span className="empty-state-icon">▤</span><strong>{admin ? "No collection requests yet" : "Your request list is empty"}</strong><p>{admin ? "New citizen reports will appear here." : "Report waste or schedule a pickup to start tracking your impact."}</p></div> : <><div className="table-head"><span>Request</span><span>Waste type</span><span>Location</span><span>Date</span><span>Status</span><span>{admin ? "Action" : ""}</span></div>{requests.map((request) => <div className="table-row" key={request.id} onClick={() => onOpen?.(request.id)}><div className="request-id"><button className="request-link" onClick={(event) => { event.stopPropagation(); onOpen?.(request.id); }}>{request.id}</button><small>{request.photo ? "▣ Photo attached" : "No photo"}</small></div><div><span className={`category-dot ${request.type.toLowerCase().replace("-", "")}`} />{request.type}</div><div className="muted">{request.location}</div><div className="muted">{request.date}</div><StatusBadge status={request.status} />{admin ? <div className="request-actions"><select className="status-select" value={request.status} onClick={(event) => event.stopPropagation()} onChange={(event) => onUpdate(request.id, { status: event.target.value as RequestStatus })}><option>Pending</option><option>Assigned</option><option>Collected</option><option>Completed</option></select><input className="collector-input" defaultValue={request.collector === "Unassigned" ? "" : request.collector} placeholder="Collector" onClick={(event) => event.stopPropagation()} onBlur={(event) => { if (event.target.value.trim() && event.target.value.trim() !== request.collector) onUpdate(request.id, { collector: event.target.value.trim() }); }} /></div> : <span className="row-chevron">→</span>}</div>)}</>}</div>;
}

function StatusBadge({ status }: { status: RequestStatus }) { return <span className={`status ${status.toLowerCase()}`}><i />{status}</span>; }

function RequestForm({ mode, onSubmit, onCancel }: { mode: "report" | "pickup"; onSubmit: (request: Omit<Request, "id" | "status" | "collector" | "history">) => void; onCancel: () => void }) {
  const [type, setType] = useState<WasteType>("Plastic");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(false);
  const [formError, setFormError] = useState("");
  const [classification, setClassification] = useState(categories[0]);
  const handleType = (event: ChangeEvent<HTMLSelectElement>) => { const next = event.target.value as WasteType; setType(next); setClassification(categories.find((category) => category.type === next) ?? categories[0]); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!location || !date) return; if (date < getTodayDate()) { setFormError("Please choose today or a future date."); return; } setFormError(""); onSubmit({ type, location, date, quantity: quantity || "Not specified", description: description || "Waste report submitted by citizen.", photo }); };
  return <div className="page narrow-page"><button className="back-button" onClick={onCancel}>← Back to dashboard</button><div className="form-heading"><p className="eyebrow">{mode === "report" ? "REPORT WASTE" : "COLLECTION REQUEST"}</p><h1>{mode === "report" ? "Report waste in your area." : "Schedule a collection."}</h1><p>Give our team the details they need to make your pickup quick and responsible.</p></div><form className="request-form" onSubmit={submit}><div className="form-section"><div className="form-section-title"><span>01</span><div><h3>What are you reporting?</h3><p>Choose the closest waste category.</p></div></div><div className="field-grid"><label>Waste type<select value={type} onChange={handleType}>{categories.map((category) => <option key={category.type}>{category.type}</option>)}</select></label><label>Approximate quantity<input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="e.g. 2 bags or 5 kg" /></label></div><div className="classification"><span className={`guide-icon ${classification.tone}`}>{classification.icon}</span><div><strong>Rule-based classification: {classification.type}</strong><p>{classification.rule}</p></div><span className="classification-label">Recyclable</span></div></div><div className="form-section"><div className="form-section-title"><span>02</span><div><h3>Where and when?</h3><p>We&apos;ll use this to plan your collection route.</p></div></div><div className="field-grid"><label>Pickup location<input required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Neighborhood or full address" /></label><label>Preferred date<input required min={getTodayDate()} type="date" value={date} onChange={(event) => { setDate(event.target.value); setFormError(""); }} /></label></div>{formError && <p className="form-error" role="alert">{formError}</p>}</div><div className="form-section"><div className="form-section-title"><span>03</span><div><h3>Add more context</h3><p>A photo helps our team prepare the right collection.</p></div></div><label>Short description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell us a little more about the waste..." rows={4} /></label><label className="upload-box"><input type="file" accept="image/*" onChange={() => setPhoto(true)} /><span className="upload-icon">↑</span><strong>{photo ? "Photo attached successfully" : "Upload a photo of the waste"}</strong><small>PNG, JPG up to 10MB</small></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit">Submit {mode === "report" ? "report" : "request"} <span>↗</span></button></div></form></div>;
}

function RequestsView({ requests, admin, onUpdate, onOpen }: { requests: Request[]; admin: boolean; onUpdate: (id: string, updates: Partial<Request>) => void; onOpen: (id: string) => void }) { return <div className="page"><div className="page-heading"><div><p className="eyebrow">{admin ? "OPERATIONS" : "YOUR ACTIVITY"}</p><h1>{admin ? "All requests" : "My requests"}</h1><p className="subtitle">{admin ? "Assign collectors and keep every collection moving." : "Track each report from pending to completed."}</p></div><span className="request-count">{requests.length} total</span></div><RequestsTable requests={requests} admin={admin} onUpdate={onUpdate} onOpen={onOpen} /></div>; }

function RequestDetail({ request, admin, onBack, onUpdate }: { request: Request | null; admin: boolean; onBack: () => void; onUpdate: (id: string, updates: Partial<Request>) => Promise<void> }) {
  if (!request) return <div className="page narrow-page"><button className="back-button" onClick={onBack}>← Back to requests</button><div className="empty-table-state"><strong>Request not found</strong><p>This request may have been removed or is no longer available.</p></div></div>;
  return <div className="page narrow-page"><button className="back-button" onClick={onBack}>← Back to requests</button><div className="form-heading"><p className="eyebrow">REQUEST DETAILS</p><h1>{request.id}</h1><p>Review the collection information and status history.</p></div><div className="detail-card"><div className="detail-card-header"><div><span className={`category-dot ${request.type.toLowerCase().replace("-", "")}`} />{request.type}<p>{request.description || "No description provided."}</p></div><StatusBadge status={request.status} /></div><div className="detail-grid"><div><small>Location</small><strong>{request.location}</strong></div><div><small>Preferred date</small><strong>{request.date}</strong></div><div><small>Quantity</small><strong>{request.quantity}</strong></div><div><small>Collector</small><strong>{request.collector}</strong></div></div>{!admin && request.status === "Pending" && <button className="danger-button" onClick={() => void onUpdate(request.id, { status: "Cancelled" })}>Cancel request</button>}{admin && <div className="detail-admin-actions"><label>Assign collector<input defaultValue={request.collector === "Unassigned" ? "" : request.collector} placeholder="Collector name" onBlur={(event) => { if (event.target.value.trim()) void onUpdate(request.id, { collector: event.target.value.trim() }); }} /></label><label>Update status<select value={request.status} onChange={(event) => void onUpdate(request.id, { status: event.target.value as RequestStatus })}><option>Pending</option><option>Assigned</option><option>Collected</option><option>Completed</option></select></label></div>}</div><div className="detail-card"><h3>Status history</h3><div className="history-list">{(request.history ?? []).length === 0 ? <p className="empty-state">No status history available.</p> : request.history.map((item, index) => <div className="history-item" key={`${item.status}-${index}`}><span className="history-dot" /><div><strong>{item.status}</strong><p>{item.note}</p><small>{new Date(item.changedAt).toLocaleString()}</small></div></div>)}</div></div></div>;
}

function SupportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (ticket: { category: string; subject: string; message: string }) => Promise<void> }) {
  const [category, setCategory] = useState("Request");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Add a subject and describe how we can help.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ category, subject, message });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your request.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="support-backdrop" onClick={onClose}><section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title" onClick={(event) => event.stopPropagation()}><button className="support-close" onClick={onClose} aria-label="Close support form">×</button><div className="form-heading"><p className="eyebrow">HELP & SUPPORT</p><h2 id="support-title">How can we help?</h2><p>Send us a message and our team will follow up.</p></div><form onSubmit={submit} className="support-form"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Request</option><option>Account</option><option>Technical</option><option>Other</option></select></label><label>Subject<input required maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></label><label>Message<textarea required maxLength={2000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened..." /></label>{error && <p className="auth-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Sending..." : "Send request"}</button></div></form></section></div>;
}

function NotificationsView({ requests }: { requests: Request[] }) { return <div className="page narrow-page"><div className="form-heading"><p className="eyebrow">INBOX</p><h1>Notifications</h1><p>Stay up to date with your reports and collection requests.</p></div><div className="notification-list">{requests.length === 0 ? <p className="empty-state">No request updates yet.</p> : requests.map((request) => <div className="notification" key={request.id}><span className="notification-icon green">◔</span><div><strong>Request {request.id} is {request.status.toLowerCase()}</strong><p>{request.type} collection at {request.location}.</p><small>Scheduled for {request.date}</small></div><span className="unread" /></div>)}</div></div>; }

function ProfileView({ user, notify, updateProfile }: { user: { name: string; email: string; role: Role; preferences: { pickupReminders: boolean; impactUpdates: boolean } } | null; notify: (message: string) => void; updateProfile: (profile: { name: string; email: string; preferences: { pickupReminders: boolean; impactUpdates: boolean } }) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pickupReminders, setPickupReminders] = useState(user?.preferences.pickupReminders ?? false);
  const [impactUpdates, setImpactUpdates] = useState(user?.preferences.impactUpdates ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPickupReminders(user?.preferences.pickupReminders ?? false);
    setImpactUpdates(user?.preferences.impactUpdates ?? false);
  }, [user]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, email, preferences: { pickupReminders, impactUpdates } });
      setEditing(false);
      notify("Profile updated successfully.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="page narrow-page"><div className="form-heading"><p className="eyebrow">ACCOUNT SETTINGS</p><h1>Your profile</h1><p>Manage your personal details and collection preferences.</p></div>{editing ? <form className="profile-edit-form" onSubmit={save}><label>Full name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div></form> : <div className="profile-panel"><div className="profile-large avatar">{user?.name.slice(0, 2).toUpperCase()}</div><div><h3>{user?.name}</h3><p>{user?.email}</p><small>{user?.role === "admin" ? "Admin account" : "Citizen account"}</small></div><button className="secondary-button" onClick={() => setEditing(true)}>Edit profile</button></div>}<div className="preference-panel"><h3>Collection preferences</h3><label className="toggle-row"><span><strong>Pickup reminders</strong><small>Get a reminder the day before collection.</small></span><input type="checkbox" checked={pickupReminders} onChange={(event) => { setPickupReminders(event.target.checked); if (!editing) void updateProfile({ name, email, preferences: { pickupReminders: event.target.checked, impactUpdates } }).then(() => notify("Preference saved.")).catch((error) => notify(error instanceof Error ? error.message : "Unable to save preference.")); }} /></label><label className="toggle-row"><span><strong>Impact updates</strong><small>Receive a monthly summary of your contribution.</small></span><input type="checkbox" checked={impactUpdates} onChange={(event) => { setImpactUpdates(event.target.checked); if (!editing) void updateProfile({ name, email, preferences: { pickupReminders, impactUpdates: event.target.checked } }).then(() => notify("Preference saved.")).catch((error) => notify(error instanceof Error ? error.message : "Unable to save preference.")); }} /></label></div></div>;
}

function CategoryBars({ requests }: { requests: Request[] }) { const counts = categories.map((category) => ({ label: category.type, count: requests.filter((request) => request.type === category.type).length, tone: category.tone })); const max = Math.max(...counts.map((item) => item.count), 1); return <div className="category-bars">{counts.map((item) => <div className="bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.count}</strong></div><div className="bar-track"><span className={item.tone} style={{ width: `${(item.count / max) * 100}%` }} /></div></div>)}</div>; }
function ActivityFeed({ requests }: { requests: Request[] }) { return <div className="activity-feed">{requests.length === 0 ? <p className="empty-state">No activity yet.</p> : requests.slice(0, 5).map((request) => <div className="activity" key={request.id}><span>♻</span><div><strong>Request {request.id} {request.status.toLowerCase()}</strong><small>{request.type} · {request.location}</small></div><time>{request.date}</time></div>)}</div>; }
function LoginModal({ role, onClose, onSelect }: { role: Role; onClose: () => void; onSelect: (role: Role) => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="login-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="logo"><span>↻</span><strong>loop<span>cycle</span></strong></div><h2>Switch workspace</h2><p>Choose a demo role to explore the MVP.</p><div className="role-options"><button className={role === "citizen" ? "role-option selected" : "role-option"} onClick={() => onSelect("citizen")}><span className="role-icon green">○</span><span><strong>Citizen account</strong><small>Report waste and track pickups</small></span><b>→</b></button><button className={role === "admin" ? "role-option selected" : "role-option"} onClick={() => onSelect("admin")}><span className="role-icon purple">♙</span><span><strong>Admin account</strong><small>Manage collections and analytics</small></span><b>→</b></button></div></div></div>; }
