import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  Fingerprint,
  Globe2,
  Loader2,
  Lock,
  LogOut,
  MailCheck,
  Radar,
  ScanSearch,
  Shield,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  UserPlus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./lib/api";

const SAMPLE_MESSAGE =
  "Security alert: unusual activity detected. Verify your account immediately at https://secure-paypal-login.xyz/update or your mailbox will be suspended.";

const EMPTY_ANALYTICS = {
  total_scans: 0,
  phishing_count: 0,
  scam_count: 0,
  safe_count: 0,
  average_confidence: 0,
  average_risk: 0,
  label_breakdown: [
    { label: "Phishing", count: 0 },
    { label: "Scam", count: 0 },
    { label: "Safe", count: 0 },
  ],
  trend: [],
};

const labelStyles = {
  phishing: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/50",
    icon: ShieldAlert,
    label: "Phishing",
  },
  scam: {
    text: "text-amberwire",
    bg: "bg-amberwire/10",
    border: "border-amberwire/50",
    icon: AlertTriangle,
    label: "Scam",
  },
  safe: {
    text: "text-mint",
    bg: "bg-mint/10",
    border: "border-mint/50",
    icon: CheckCircle2,
    label: "Safe",
  },
};

const chartColors = ["#ff5c7a", "#ffce65", "#72f5a6"];

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "Security Analyst",
    email: "analyst@cybershield.ai",
    password: "CyberShield123",
  });
  const [authError, setAuthError] = useState("");
  const [scanMode, setScanMode] = useState("email");
  const [input, setInput] = useState(SAMPLE_MESSAGE);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("cybershield_token");
    if (!token) return;
    api
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        refreshSecureData();
      })
      .catch(() => {
        localStorage.removeItem("cybershield_token");
      });
  }, []);

  async function refreshSecureData() {
    try {
      const [historyPayload, analyticsPayload, alertsPayload] = await Promise.all([
        api.history(),
        api.analytics(),
        api.alerts(),
      ]);
      setHistory(historyPayload);
      setAnalytics(analyticsPayload);
      setAlerts(alertsPayload);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    try {
      const payload =
        authMode === "signup"
          ? await api.signup(authForm)
          : await api.login({
              email: authForm.email,
              password: authForm.password,
            });
      localStorage.setItem("cybershield_token", payload.access_token);
      setUser(payload.user);
      setStatus(`Welcome, ${payload.user.name}. Threat console synchronized.`);
      await refreshSecureData();
    } catch (error) {
      setAuthError(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("cybershield_token");
    setUser(null);
    setHistory([]);
    setAlerts([]);
    setAnalytics(EMPTY_ANALYTICS);
    setStatus("Analyst session ended.");
  }

  async function runScan(event) {
    event?.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const payload =
        scanMode === "url"
          ? await api.scanUrl(input.trim())
          : await api.scan({ content: input, content_type: scanMode });
      setResult(payload);
      setStatus("Scan completed. Indicators are mapped below.");
      if (user) await refreshSecureData();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation() {
    if (!user) {
      setStatus("Sign in to run the mailbox simulation and save results.");
      return;
    }
    setSimulationLoading(true);
    try {
      const payload = await api.simulateScanner();
      setStatus(`Email scanner simulation processed ${payload.processed} messages.`);
      await refreshSecureData();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSimulationLoading(false);
    }
  }

  async function downloadReport(scanId) {
    if (!user) {
      setStatus("Sign in before exporting PDF reports.");
      return;
    }
    try {
      const token = localStorage.getItem("cybershield_token");
      const response = await fetch(api.reportUrl(scanId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Report export failed");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `cybershield-${scanId}.pdf`;
      link.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      setStatus(error.message);
    }
  }

  const recentCritical = useMemo(
    () => history.filter((scan) => scan.risk_score >= 70).slice(0, 3),
    [history],
  );

  return (
    <main className="min-h-screen bg-obsidian text-slate-100">
      <Landing
        user={user}
        authMode={authMode}
        authForm={authForm}
        authError={authError}
        onAuthMode={setAuthMode}
        onAuthForm={setAuthForm}
        onAuth={handleAuth}
        onLogout={logout}
        onTrySample={() => {
          setInput(SAMPLE_MESSAGE);
          document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <section id="scanner" className="border-y border-panelLine/80 bg-[#091513]">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 md:px-6 lg:grid-cols-[280px_1fr]">
          <CommandRail
            user={user}
            analytics={analytics}
            alerts={alerts}
            recentCritical={recentCritical}
            onSimulation={runSimulation}
            simulationLoading={simulationLoading}
          />

          <div className="grid gap-5">
            <ScanConsole
              scanMode={scanMode}
              input={input}
              loading={loading}
              result={result}
              status={status}
              onScanMode={setScanMode}
              onInput={setInput}
              onScan={runScan}
              onReport={downloadReport}
            />

            <DashboardGrid
              analytics={analytics}
              alerts={alerts}
              history={history}
              result={result}
              onReport={downloadReport}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Landing({
  user,
  authMode,
  authForm,
  authError,
  onAuthMode,
  onAuthForm,
  onAuth,
  onLogout,
  onTrySample,
}) {
  return (
    <section className="relative min-h-[86vh] overflow-hidden border-b border-panelLine bg-[#07100f]">
      <ThreatMatrix />
      <div className="relative mx-auto grid min-h-[86vh] w-full max-w-7xl content-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_390px]">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyanfire/40 bg-cyanfire/10 px-3 py-2 text-sm text-cyanfire">
            <Radar size={16} />
            AI threat detection for email, messages, and URLs
          </div>
          <h1 className="text-5xl font-semibold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
            CyberShield AI
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A full-stack cybersecurity command center that combines TF-IDF NLP,
            logistic regression, suspicious keyword extraction, fake-link heuristics,
            scan history, PDF reports, and live threat alerts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="button-primary" onClick={onTrySample}>
              <ScanSearch size={18} />
              Open Scanner
            </button>
            <a className="button-secondary" href="#dashboard">
              <BarChart3 size={18} />
              View Dashboard
            </a>
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            <SignalCard label="Model" value="TF-IDF NLP" icon={Bot} />
            <SignalCard label="Storage" value="SQLite" icon={Fingerprint} />
            <SignalCard label="Exports" value="PDF Reports" icon={Download} />
          </div>
        </div>

        <div className="animate-float-panel border border-panelLine bg-panel/80 p-5 shadow-glow backdrop-blur rounded-lg">
          {user ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Signed in as</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{user.name}</h2>
                  <p className="mt-1 text-sm text-cyanfire">{user.email}</p>
                </div>
                <button className="icon-button" onClick={onLogout} title="Log out">
                  <LogOut size={18} />
                </button>
              </div>
              <div className="mt-6 border border-panelLine bg-black/20 p-4 rounded-lg">
                <div className="flex items-center gap-3 text-mint">
                  <CheckCircle2 size={22} />
                  <span className="font-medium">Analyst session active</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Scan records, analytics, real-time alerts, and PDF exports are
                  available for this authenticated workspace.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onAuth} className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyanfire">Secure analyst access</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    {authMode === "signup" ? "Create Account" : "Log In"}
                  </h2>
                </div>
                <Shield className="text-mint" size={30} />
              </div>
              <div className="flex rounded-lg border border-panelLine bg-black/25 p-1">
                <button
                  type="button"
                  className={`segmented ${authMode === "login" ? "segmented-active" : ""}`}
                  onClick={() => onAuthMode("login")}
                >
                  <Lock size={15} />
                  Login
                </button>
                <button
                  type="button"
                  className={`segmented ${authMode === "signup" ? "segmented-active" : ""}`}
                  onClick={() => onAuthMode("signup")}
                >
                  <UserPlus size={15} />
                  Signup
                </button>
              </div>
              {authMode === "signup" && (
                <label className="field-label">
                  Name
                  <input
                    className="field-input"
                    value={authForm.name}
                    onChange={(event) =>
                      onAuthForm({ ...authForm, name: event.target.value })
                    }
                  />
                </label>
              )}
              <label className="field-label">
                Email
                <input
                  className="field-input"
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    onAuthForm({ ...authForm, email: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Password
                <input
                  className="field-input"
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    onAuthForm({ ...authForm, password: event.target.value })
                  }
                />
              </label>
              {authError && <p className="text-sm text-danger">{authError}</p>}
              <button className="button-primary w-full justify-center" type="submit">
                <Shield size={18} />
                {authMode === "signup" ? "Create Secure Session" : "Enter Dashboard"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ThreatMatrix() {
  const nodes = [
    ["top-[16%] left-[12%]", "critical"],
    ["top-[26%] left-[78%]", "safe"],
    ["top-[62%] left-[20%]", "warning"],
    ["top-[74%] left-[70%]", "critical"],
    ["top-[46%] left-[48%]", "safe"],
  ];
  return (
    <div className="absolute inset-0">
      <div className="matrix-grid absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(77,247,255,0.14),transparent_30%),linear-gradient(180deg,rgba(7,16,15,0.1),#07100f_95%)]" />
      <div className="absolute left-0 right-0 top-1/3 h-px bg-cyanfire/30 shadow-[0_0_28px_rgba(77,247,255,0.45)]" />
      {nodes.map(([position, tone], index) => (
        <div
          key={position}
          className={`absolute ${position} hidden h-4 w-4 rounded-full md:block ${
            tone === "critical"
              ? "bg-danger"
              : tone === "warning"
                ? "bg-amberwire"
                : "bg-mint"
          }`}
        >
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-current" />
          <span className="absolute left-5 top-[-6px] whitespace-nowrap text-xs text-slate-400">
            node-{index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ label, value, icon: Icon }) {
  return (
    <div className="border border-panelLine bg-black/25 p-4 rounded-lg">
      <Icon className="text-cyanfire" size={22} />
      <p className="mt-3 text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function CommandRail({
  user,
  analytics,
  alerts,
  recentCritical,
  onSimulation,
  simulationLoading,
}) {
  return (
    <aside className="grid gap-5 self-start lg:sticky lg:top-5">
      <div className="panel">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyanfire/40 bg-cyanfire/10 text-cyanfire">
            <TerminalSquare size={20} />
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Command Rail</p>
            <h2 className="font-semibold text-white">Threat Ops</h2>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Scans" value={analytics.total_scans} />
          <Metric label="Avg Risk" value={analytics.average_risk} />
          <Metric label="Phishing" value={analytics.phishing_count} danger />
          <Metric label="Scams" value={analytics.scam_count} warning />
        </div>
        <button className="button-secondary mt-5 w-full justify-center" onClick={onSimulation}>
          {simulationLoading ? <Loader2 className="animate-spin" size={18} /> : <MailCheck size={18} />}
          Run Mailbox Simulation
        </button>
        {!user && (
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to persist scan history, load analytics, and export PDF reports.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="flex items-center gap-2">
          <Activity className="text-mint" size={18} />
          <h3 className="font-semibold text-white">Live Alerts</h3>
        </div>
        <div className="mt-4 grid gap-3">
          {(alerts.length ? alerts.slice(0, 4) : fallbackAlerts).map((alert) => (
            <AlertRow key={alert.id || alert.title} alert={alert} />
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center gap-2">
          <Eye className="text-amberwire" size={18} />
          <h3 className="font-semibold text-white">Critical Queue</h3>
        </div>
        <div className="mt-4 grid gap-3">
          {recentCritical.length ? (
            recentCritical.map((scan) => (
              <div key={scan.scan_id} className="rounded-lg border border-danger/40 bg-danger/10 p-3">
                <p className="text-sm font-medium text-danger">
                  {labelStyles[scan.prediction]?.label} · {scan.risk_score}/100
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                  {scan.content_preview}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-400">No high-risk scans in queue.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, danger, warning }) {
  return (
    <div className="rounded-lg border border-panelLine bg-black/20 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          danger ? "text-danger" : warning ? "text-amberwire" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ScanConsole({
  scanMode,
  input,
  loading,
  result,
  status,
  onScanMode,
  onInput,
  onScan,
  onReport,
}) {
  return (
    <section className="panel relative overflow-hidden">
      <div className="absolute left-0 right-0 top-0 h-px bg-cyanfire/60" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={onScan} className="grid gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-cyanfire">AI Scan Console</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">Inspect a message or URL</h2>
            </div>
            <div className="flex rounded-lg border border-panelLine bg-black/25 p-1">
              {["email", "message", "url"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`segmented capitalize ${scanMode === mode ? "segmented-active" : ""}`}
                  onClick={() => onScanMode(mode)}
                >
                  {mode === "url" ? <Globe2 size={15} /> : <FileSearch size={15} />}
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="min-h-[220px] resize-y rounded-lg border border-panelLine bg-[#050b0a] p-4 text-sm leading-7 text-slate-100 outline-none transition focus:border-cyanfire/70 focus:shadow-glow"
            value={input}
            onChange={(event) => onInput(event.target.value)}
            placeholder="Paste an email, SMS, chat message, or suspicious URL..."
          />
          <div className="flex flex-wrap items-center gap-3">
            <button className="button-primary" disabled={loading || input.trim().length < 3}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? "Scanning" : "Analyze Threat"}
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() =>
                onInput(
                  "Your password expires today. Login immediately at http://microsoft-365-secure.top/reset and confirm your one-time password.",
                )
              }
            >
              <ScanSearch size={18} />
              Load Risk Sample
            </button>
            {status && <p className="text-sm text-slate-400">{status}</p>}
          </div>
        </form>

        <ResultPanel result={result} loading={loading} content={input} onReport={onReport} />
      </div>
    </section>
  );
}

function ResultPanel({ result, loading, content, onReport }) {
  if (loading) {
    return (
      <div className="relative min-h-[340px] overflow-hidden rounded-lg border border-cyanfire/40 bg-cyanfire/10 p-5">
        <div className="scan-line absolute left-0 right-0 h-16 bg-cyanfire/20 blur-sm" />
        <div className="grid h-full place-items-center text-center">
          <div>
            <Loader2 className="mx-auto animate-spin text-cyanfire" size={34} />
            <p className="mt-4 font-semibold text-white">Running NLP and URL heuristics</p>
            <p className="mt-2 text-sm text-slate-400">Vectorizing text, scoring links, and mapping indicators.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[340px] rounded-lg border border-panelLine bg-black/20 p-5">
        <div className="grid h-full place-items-center text-center">
          <div>
            <Shield className="mx-auto text-cyanfire" size={42} />
            <p className="mt-4 text-lg font-semibold text-white">Awaiting scan input</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Results will include a prediction, confidence, highlighted keywords,
              URL findings, and a report export action.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const style = labelStyles[result.prediction] || labelStyles.safe;
  const Icon = style.icon;
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Prediction</p>
          <div className={`mt-2 flex items-center gap-2 text-3xl font-semibold ${style.text}`}>
            <Icon size={30} />
            {style.label}
          </div>
        </div>
        <button className="icon-button" title="Export report" onClick={() => onReport(result.scan_id)}>
          <Download size={18} />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="Confidence" value={`${result.confidence}%`} />
        <Metric label="Risk Score" value={`${result.risk_score}/100`} danger={result.risk_score >= 70} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-white">Highlighted Indicators</p>
        <div className="max-h-36 overflow-auto rounded-lg border border-panelLine bg-black/30 p-3 text-sm leading-7 text-slate-300">
          {highlightContent(content, result.suspicious_keywords)}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {result.reasons.map((reason) => (
          <div key={reason} className="flex gap-2 text-sm leading-6 text-slate-300">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${style.text.replace("text", "bg")}`} />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardGrid({ analytics, alerts, history, result, onReport }) {
  return (
    <section id="dashboard" className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cyanfire">Threat Analytics</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Detection telemetry</h2>
          </div>
          <BarChart3 className="text-mint" size={26} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.label_breakdown}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={4}
                >
                  {analytics.label_breakdown.map((entry, index) => (
                    <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.trend}>
                <defs>
                  <linearGradient id="phishing" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ff5c7a" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#ff5c7a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="safe" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#72f5a6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#72f5a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e3834" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#6b7d78" tickLine={false} />
                <YAxis stroke="#6b7d78" tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="phishing" stroke="#ff5c7a" fill="url(#phishing)" />
                <Area type="monotone" dataKey="scam" stroke="#ffce65" fill="#ffce6530" />
                <Area type="monotone" dataKey="safe" stroke="#72f5a6" fill="url(#safe)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amberwire" size={20} />
          <h2 className="text-2xl font-semibold text-white">Threat alerts</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {(alerts.length ? alerts.slice(0, 5) : fallbackAlerts).map((alert) => (
            <AlertRow key={alert.id || alert.title} alert={alert} />
          ))}
        </div>
      </div>

      <div className="panel xl:col-span-2">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-cyanfire">Recent Scan History</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Analyst activity</h2>
          </div>
          {result && (
            <button className="button-secondary" onClick={() => onReport(result.scan_id)}>
              <Download size={18} />
              Export Latest
            </button>
          )}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-panelLine text-slate-500">
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Prediction</th>
                <th className="py-3 pr-4 font-medium">Confidence</th>
                <th className="py-3 pr-4 font-medium">Risk</th>
                <th className="py-3 pr-4 font-medium">Preview</th>
                <th className="py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                history.map((scan) => <HistoryRow key={scan.scan_id} scan={scan} onReport={onReport} />)
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Sign in and run a scan to populate persistent history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function HistoryRow({ scan, onReport }) {
  const style = labelStyles[scan.prediction] || labelStyles.safe;
  return (
    <tr className="border-b border-panelLine/70 text-slate-300">
      <td className="py-4 pr-4 capitalize text-slate-400">{scan.content_type}</td>
      <td className={`py-4 pr-4 font-semibold ${style.text}`}>{style.label}</td>
      <td className="py-4 pr-4">{scan.confidence}%</td>
      <td className="py-4 pr-4">{scan.risk_score}/100</td>
      <td className="max-w-[360px] py-4 pr-4 text-slate-400">
        <span className="line-clamp-2">{scan.content_preview}</span>
      </td>
      <td className="py-4">
        <button className="icon-button" title="Download report" onClick={() => onReport(scan.scan_id)}>
          <Download size={16} />
        </button>
      </td>
    </tr>
  );
}

function AlertRow({ alert }) {
  const severity =
    alert.severity === "critical"
      ? "border-danger/40 bg-danger/10 text-danger"
      : alert.severity === "high"
        ? "border-amberwire/40 bg-amberwire/10 text-amberwire"
        : "border-cyanfire/40 bg-cyanfire/10 text-cyanfire";
  return (
    <div className={`rounded-lg border p-3 ${severity}`}>
      <p className="text-sm font-semibold">{alert.title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{alert.description}</p>
    </div>
  );
}

function highlightContent(content, hits) {
  if (!hits?.length) return content || "No suspicious keyword matches.";
  const pieces = [];
  let cursor = 0;
  const sortedHits = [...hits].sort((a, b) => a.start - b.start);
  sortedHits.forEach((hit) => {
    if (hit.start < cursor) return;
    if (hit.start > cursor) {
      pieces.push(<span key={`text-${cursor}`}>{content.slice(cursor, hit.start)}</span>);
    }
    pieces.push(
      <mark
        key={`${hit.keyword}-${hit.start}`}
        className="rounded bg-amberwire/25 px-1 text-amberwire"
        title={`${hit.category} risk ${hit.risk}`}
      >
        {content.slice(hit.start, hit.end)}
      </mark>,
    );
    cursor = hit.end;
  });
  if (cursor < content.length) {
    pieces.push(<span key={`text-${cursor}`}>{content.slice(cursor)}</span>);
  }
  return pieces;
}

const tooltipStyle = {
  background: "#0d1816",
  border: "1px solid #1e3834",
  color: "#e2e8f0",
  borderRadius: 8,
};

const fallbackAlerts = [
  {
    title: "Credential harvesting campaign detected",
    severity: "critical",
    description: "Messages impersonating cloud services are requesting password resets.",
  },
  {
    title: "Gift card scam language trending",
    severity: "high",
    description: "Urgent purchasing phrases are appearing in recent scam attempts.",
  },
  {
    title: "Lookalike domains observed",
    severity: "medium",
    description: "Hyphenated brand domains and unusual top-level domains remain active.",
  },
];

export default App;
