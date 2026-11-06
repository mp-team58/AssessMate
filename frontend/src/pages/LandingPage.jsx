import { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Sparkles,
  Code2,
  Eye,
  BarChart3,
  KeyRound,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Menu,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { SITE, toTelHref } from "../config/site";

const NAV_LINKS = [
  { label: "For hosts", href: "#hosts" },
  { label: "For candidates", href: "#candidates" },
  { label: "How it works", href: "#how-it-works" },
];

const checkAnimStyles = `
  @keyframes draw-check {
    to { stroke-dashoffset: 0; }
  }
  .check-path {
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: draw-check 0.6s 0.8s ease-out forwards;
  }
`;

function RoleFeatureRow({ icon: Icon, title, description, accent, reverse }) {
  const accentBg = accent === "green" ? "bg-brand-500" : "bg-accent-500";

  return (
    <div
      className={`flex flex-col md:flex-row ${reverse ? "md:flex-row-reverse" : ""
        } items-start md:items-center gap-6 md:gap-12 py-8`}
    >
      <div
        className={`shrink-0 w-14 h-14 rounded-full ${accentBg} flex items-center justify-center`}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
      </div>
      <div className={`max-w-3xl${reverse ? " md:text-right" : ""}`}>
        <h3 className="font-display text-3xl mb-2 text-secondary-900">{title}</h3>
        <p className="font-sans text-lg text-secondary-700/80 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef(null);
  const menuRef = useRef(null);
  const isClosingViaKeyboard = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile menu keyboard accessibility & outside click handling
  useEffect(() => {
    if (!menuOpen) return undefined;

    // Focus first link in mobile menu when opened
    const timer = setTimeout(() => {
      const firstLink = menuRef.current?.querySelector('a, button');
      if (firstLink && typeof firstLink.focus === 'function') {
        firstLink.focus();
      }
    }, 40);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        isClosingViaKeyboard.current = true;
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        menuTriggerRef.current &&
        !menuTriggerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  // Logged-in users land straight in their dashboard, never on
  // the marketing page.
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (token) {
    if (role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (role === "HOST") return <Navigate to="/host/dashboard" replace />;
    if (role === "CANDIDATE") return <Navigate to="/candidate/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-secondary-900 overflow-x-hidden">
      <style>{checkAnimStyles}</style>

      {/* Navbar */}
      <header className="relative w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-tight" aria-label="AssessMate home">
          AssessMate
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-sans text-base px-3 py-2 text-secondary-900/70 hover:text-secondary-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            className="font-sans text-base px-4 py-2 text-secondary-900/80 hover:text-secondary-900 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="font-sans text-base px-4 py-2 rounded-md bg-secondary-900 text-white hover:bg-secondary-700 transition-colors"
          >
            Sign up
          </Link>
        </nav>

        {/* Mobile: sign up + menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/signup"
            className="font-sans text-base px-3 py-2 rounded-md bg-secondary-900 text-white"
          >
            Sign up
          </Link>
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => {
              setMenuOpen((o) => !o);
            }}
            className="p-2 rounded-lg text-secondary-900 hover:bg-secondary-900/5 focus:outline-none focus:ring-2 focus:ring-secondary-900/20 transition-colors"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <nav
            ref={menuRef}
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="md:hidden absolute left-4 right-4 top-full z-50 bg-white rounded-2xl border border-secondary-900/10 shadow-2xl p-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => {
                  setMenuOpen(false);
                  menuTriggerRef.current?.focus();
                }}
                className="px-4 py-3 rounded-xl font-medium text-secondary-900 hover:bg-secondary-50 focus:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-secondary-900/15 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => {
                setMenuOpen(false);
                menuTriggerRef.current?.focus();
              }}
              className="px-4 py-3 rounded-xl font-medium text-secondary-900 hover:bg-secondary-50 focus:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-secondary-900/15 transition-colors"
            >
              Log in
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 pt-8 pb-20 md:pt-16 md:pb-28 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.0] mb-4">
            Exams that write themselves. Results you can trust.
          </h1>
          <p className="text-xl text-secondary-700/80 leading-relaxed mb-5">
            Generate questions from a topic, a document, or a paragraph of
            notes. Add coding rounds with real test cases. Proctor and grade
            it all from one dashboard — then share a single code and let
            candidates in.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/signup?role=host"
              className="px-7 py-3.5 rounded-md bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              Create an exam
            </Link>
            <Link
              to="/signup?role=candidate"
              className="px-7 py-3.5 rounded-md border border-accent-500 text-accent-500 font-medium hover:bg-accent-500 hover:text-white transition-colors"
            >
              Join an exam
            </Link>
          </div>
        </div>

        {/* Mock exam card — the one deliberate visual moment */}
        <div className="relative flex items-center justify-center md:justify-end">
          <div className="bg-white rounded-2xl border border-secondary-900/10 shadow-[0_20px_60px_-15px_rgba(22,36,31,0.25)] p-9 max-w-md w-full">
            <p className="text-sm text-secondary-500 mb-5">Question 4 of 20</p>
            <p className="font-display text-xl mb-7">
              Which method safely closes a database connection pool?
            </p>
            <div className="space-y-3">
              {[
                "connection.terminate()",
                "pool.shutdown()",
                "pool.close()",
                "db.disconnect()",
              ].map((option, i) => (
                <div
                  key={option}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border ${i === 2
                    ? "border-brand-500 bg-brand-50"
                    : "border-secondary-900/10"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === 2 ? "border-brand-500" : "border-secondary-900/20"
                      }`}
                  >
                    {i === 2 && mounted && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          className="check-path"
                          d="M4 12l6 6L20 6"
                          stroke="#2F6F4E"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-base">{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section id="hosts" className="scroll-mt-4 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 border-t border-secondary-900/10">
        <div className="mb-4">
          <span className="text-base font-medium text-brand-600">For hosts</span>
        </div>
        <h2 className="font-display text-4xl mb-8">
          Build a full exam in minutes, not days.
        </h2>
        <div className="divide-y divide-secondary-900/10">
          <RoleFeatureRow
            icon={Sparkles}
            accent="green"
            title="AI-generated questions"
            description="Give it a topic, paste in notes, or upload a PDF, slide deck, or Word doc — get grounded, difficulty-balanced questions back, with answers verified against your source material."
          />
          <RoleFeatureRow
            icon={Code2}
            accent="green"
            reverse
            title="Coding questions, real execution"
            description="Assign programming problems with actual test cases, run against multiple languages, graded automatically — not just multiple choice."
          />
          <RoleFeatureRow
            icon={Eye}
            accent="green"
            title="Live proctoring"
            description="See flagged events as they happen during an exam, not after — tab switches, copy-paste attempts, and more, timestamped per candidate."
          />
          <RoleFeatureRow
            icon={BarChart3}
            accent="green"
            reverse
            title="Analytics that explain results"
            description="Score distributions, per-question difficulty, and topic-level breakdowns — so you know which questions actually worked."
          />
          <RoleFeatureRow
            icon={FileSpreadsheet}
            accent="green"
            title="Bulk import from Excel"
            description="Already have a question bank in a spreadsheet? Import it directly instead of re-typing everything."
          />
        </div>
      </section>

      {/* For Candidates */}
      <section id="candidates" className="scroll-mt-4 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 border-t border-secondary-900/10">
        <div className="mb-4">
          <span className="text-base font-medium text-accent-600">
            For candidates
          </span>
        </div>
        <h2 className="font-display text-4xl mb-8">
          One code. Straight into the exam.
        </h2>
        <div className="divide-y divide-secondary-900/10">
          <RoleFeatureRow
            icon={KeyRound}
            accent="warm"
            title="Join with a code"
            description="No account setup ceremony — enter the code your host shared and you're in, right on time."
          />
          <RoleFeatureRow
            icon={Clock}
            accent="warm"
            reverse
            title="Timed, in one place"
            description="Multiple choice and coding rounds in a single session, with a clear countdown — no juggling separate tools."
          />
          <RoleFeatureRow
            icon={CheckCircle2}
            accent="warm"
            title="Instant results"
            description="See your score and review your answers right after submitting — no waiting on someone to grade it by hand."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-4 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 border-t border-secondary-900/10">
        <h2 className="font-display text-4xl mb-10">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            ["Host creates an exam", "Set topics, difficulty mix, and question types."],
            ["Share the join code", "One code, sent however you like."],
            ["Candidate takes it", "MCQ and coding, timed, in one session."],
            ["Host reviews results", "Scores, answer review, and analytics — ready immediately."],
          ].map(([title, desc], i) => (
            <div key={title}>
              <div className="font-display text-4xl text-brand-500 mb-3">
                {i + 1}
              </div>
              <h3 className="text-lg font-medium mb-2">{title}</h3>
              <p className="text-base text-secondary-600 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-secondary-900/10">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link to="/" className="font-display text-lg" aria-label="AssessMate home">
              {SITE.name}
            </Link>
            <p className="mt-2 text-sm text-secondary-600 max-w-xs leading-relaxed">
              AI-generated exams, coding rounds and proctoring in one place.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-secondary-600">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-secondary-900 transition-colors w-fit">
                {l.label}
              </a>
            ))}
            <Link to="/login" className="hover:text-secondary-900 transition-colors w-fit">Log in</Link>
            <Link to="/signup" className="hover:text-secondary-900 transition-colors w-fit">Sign up</Link>
          </nav>

          {(SITE.contactEmail || SITE.contactPhone) && (
            <div className="flex flex-col gap-2 text-sm text-secondary-600">
              {SITE.contactEmail && (
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${SITE.contactEmail}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-secondary-900 transition-colors cursor-pointer w-fit break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" /> {SITE.contactEmail}
                </a>
              )}
              {SITE.contactPhone && (
                <a href={toTelHref(SITE.contactPhone)} className="inline-flex items-center gap-2 hover:text-secondary-900 transition-colors w-fit">
                  <Phone className="w-4 h-4 shrink-0" /> {SITE.contactPhone}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-5 border-t border-secondary-900/10 text-xs text-secondary-500">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
