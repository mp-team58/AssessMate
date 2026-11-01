import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Code2,
  Eye,
  BarChart3,
  KeyRound,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function RoleFeatureRow({ icon: Icon, title, description, accent, reverse }) {
  const accentBg = accent === "brand" ? "bg-brand-50" : "bg-purple-50";
  const accentText = accent === "brand" ? "text-brand-600" : "text-purple-600";

  return (
    <div
      className={`flex flex-col md:flex-row ${
        reverse ? "md:flex-row-reverse" : ""
      } items-start md:items-center gap-6 md:gap-12 py-10`}
    >
      <div
        className={`shrink-0 w-16 h-16 rounded-2xl ${accentBg} flex items-center justify-center shadow-sm border border-transparent`}
      >
        <Icon className={`w-8 h-8 ${accentText}`} strokeWidth={2} />
      </div>
      <div className="max-w-md">
        <h3 className="text-2xl font-black tracking-tight text-secondary-900 mb-3">{title}</h3>
        <p className="text-secondary-600 font-medium leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      if (user?.role === 'HOST') {
        navigate('/host/dashboard');
      } else if (user?.role === 'CANDIDATE') {
        navigate('/candidate/dashboard');
      }
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <div className="min-h-screen bg-secondary-50 font-sans text-secondary-900">
      <style>{`
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
        .check-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: draw-check 0.6s 0.8s ease-out forwards;
        }
      `}</style>

      {/* Navbar */}
      <header className="max-w-[1600px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
        <span className="text-2xl font-black tracking-tight text-brand-600 flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          AssessMate
        </span>
        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-bold text-secondary-600 hover:text-brand-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-secondary-900 text-white hover:bg-secondary-800 transition-colors shadow-sm"
          >
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-secondary-900">
            Exams that write themselves. <br className="hidden md:block" /><span className="text-brand-600">Results you can trust.</span>
          </h1>
          <p className="text-lg text-secondary-500 font-medium leading-relaxed mb-10 max-w-lg">
            Generate questions from a topic, a document, or a paragraph of
            notes. Add coding rounds with real test cases. Proctor and grade
            it all from one dashboard — then share a single code and let
            candidates in.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/signup?role=host"
              className="px-8 py-4 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-500 transition-all shadow-[0_0_20px_rgba(var(--brand-500),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand-500),0.4)] text-sm uppercase tracking-wide"
            >
              Create an exam
            </Link>
            <Link
              to="/signup?role=candidate"
              className="px-8 py-4 rounded-2xl bg-white border border-secondary-200 text-secondary-700 font-bold hover:bg-secondary-50 hover:border-secondary-300 transition-all text-sm uppercase tracking-wide shadow-sm"
            >
              Join an exam
            </Link>
          </div>
        </div>

        {/* Mock exam card */}
        <div className="relative w-full max-w-md mx-auto lg:ml-auto">
          <div className="absolute top-10 -right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-[80px] -z-10"></div>
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-[80px] -z-10"></div>
          
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-secondary-200/60 shadow-xl p-8 w-full">
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">Question 4 of 20</p>
            <p className="text-lg font-extrabold text-secondary-900 mb-6 leading-snug">
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
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                    i === 2
                      ? "border-brand-300 bg-brand-50 text-brand-900 shadow-sm"
                      : "border-secondary-100 text-secondary-700 bg-white"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      i === 2 ? "border-brand-500 bg-brand-100" : "border-secondary-200"
                    }`}
                  >
                    {i === 2 && mounted && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          className="check-path text-brand-600"
                          d="M4 12l6 6L20 6"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="font-bold text-[15px]">{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-secondary-200/50">
        <div className="mb-4">
          <span className="text-xs font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">For hosts</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-12 max-w-xl text-secondary-900">
          Build a full exam in minutes, not days.
        </h2>
        <div className="divide-y divide-secondary-100/60">
          <RoleFeatureRow
            icon={Sparkles}
            accent="brand"
            title="AI-generated questions"
            description="Give it a topic, paste in notes, or upload a PDF, slide deck, or Word doc — get grounded, difficulty-balanced questions back, with answers verified against your source material."
          />
          <RoleFeatureRow
            icon={Code2}
            accent="brand"
            reverse
            title="Coding questions, real execution"
            description="Assign programming problems with actual test cases, run against multiple languages, graded automatically — not just multiple choice."
          />
          <RoleFeatureRow
            icon={Eye}
            accent="brand"
            title="Live proctoring"
            description="See flagged events as they happen during an exam, not after — tab switches, copy-paste attempts, and more, timestamped per candidate."
          />
          <RoleFeatureRow
            icon={BarChart3}
            accent="brand"
            reverse
            title="Analytics that explain results"
            description="Score distributions, per-question difficulty, and topic-level breakdowns — so you know which questions actually worked."
          />
          <RoleFeatureRow
            icon={FileSpreadsheet}
            accent="brand"
            title="Bulk import from Excel"
            description="Already have a question bank in a spreadsheet? Import it directly instead of re-typing everything."
          />
        </div>
      </section>

      {/* For Candidates */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-secondary-200/50">
        <div className="mb-4">
          <span className="text-xs font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
            For candidates
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-12 max-w-xl text-secondary-900">
          One code. Straight into the exam.
        </h2>
        <div className="divide-y divide-secondary-100/60">
          <RoleFeatureRow
            icon={KeyRound}
            accent="purple"
            title="Join with a code"
            description="No account setup ceremony — enter the code your host shared and you're in, right on time."
          />
          <RoleFeatureRow
            icon={Clock}
            accent="purple"
            reverse
            title="Timed, in one place"
            description="Multiple choice and coding rounds in a single session, with a clear countdown — no juggling separate tools."
          />
          <RoleFeatureRow
            icon={CheckCircle2}
            accent="purple"
            title="Instant results"
            description="See your score and review your answers right after submitting — no waiting on someone to grade it by hand."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-secondary-200/50">
        <h2 className="text-3xl font-black tracking-tight mb-12 text-secondary-900">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            ["Host creates an exam", "Set topics, difficulty mix, and question types."],
            ["Share the join code", "One code, sent however you like."],
            ["Candidate takes it", "MCQ and coding, timed, in one session."],
            ["Host reviews results", "Scores, answer review, and analytics — ready immediately."],
          ].map(([title, desc], i) => (
            <div key={title} className="bg-white/60 p-6 rounded-[2rem] border border-secondary-100/50 hover:shadow-lg hover:border-brand-100 transition-all">
              <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center text-xl font-black text-secondary-400 mb-5">
                {i + 1}
              </div>
              <h3 className="font-extrabold text-[15px] mb-2 text-secondary-900">{title}</h3>
              <p className="text-sm text-secondary-500 leading-relaxed font-medium">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-secondary-200/50 flex flex-col sm:flex-row items-center justify-between gap-6">
        <span className="text-lg font-black tracking-tight text-secondary-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" /> AssessMate
        </span>
        <div className="flex gap-8 text-sm font-bold text-secondary-500">
          <Link to="/login" className="hover:text-brand-600 transition-colors">
            Log in
          </Link>
          <Link to="/signup" className="hover:text-brand-600 transition-colors">
            Sign up
          </Link>
        </div>
      </footer>
    </div>
  );
}
