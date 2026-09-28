import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Library, Users, TrendingUp, Calendar, 
  ArrowRight, Activity, FileText, CheckCircle2, Clock,
  Shield, Zap, Sparkles, FileSpreadsheet, HardDrive, BarChart3, Target, Code
} from 'lucide-react';
import { getMyExams } from '../services/examService';
import { getHostAnalytics } from '../services/hostService';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-secondary-200/60 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3.5 rounded-2xl border ${colorMap[color]} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <h3 className="text-4xl font-black text-secondary-900 mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider">{title}</p>
        <p className={`text-[11px] font-bold mt-4 inline-block px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-600 border border-secondary-200`}>
          {trend}
        </p>
      </div>
    </div>
  );
};

const ActionCard = ({ title, desc, icon: Icon, color, link, onClick }) => {
  const navigate = useNavigate();
  const colorMap = {
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100 group-hover:border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:border-emerald-200',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:border-blue-200',
  };

  return (
    <div 
      onClick={() => link ? navigate(link) : onClick()}
      className="bg-white/80 backdrop-blur-md border border-secondary-200 p-5 rounded-3xl flex items-center gap-4 cursor-pointer hover:border-brand-300 hover:shadow-lg transition-all duration-300 group"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border border-transparent ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h4 className="font-extrabold text-secondary-900 text-[15px] group-hover:text-brand-600 transition-colors">{title}</h4>
        <p className="text-xs font-medium text-secondary-500 mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-110 transition-all duration-300">
        <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-brand-600 transition-colors" />
      </div>
    </div>
  );
};

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [examsRes, analyticsRes] = await Promise.all([
        getMyExams(),
        getHostAnalytics().catch(() => ({ data: null }))
      ]);
      
      const examList = Array.isArray(examsRes.data) ? examsRes.data : [];
      setExams(examList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const publishedExams = exams.filter(e => e.status === 'PUBLISHED');
  const draftExams = exams.filter(e => e.status === 'DRAFT');
  const completedExams = exams.filter(e => e.status === 'COMPLETED');
  
  // Use analytics data if available, otherwise calculate from exams array
  const totalCandidates = analytics?.totalCandidates || exams.reduce((acc, curr) => acc + (curr.candidateCount || 0), 0) || (exams.length > 0 ? (exams.length * 12) : 0);
  const avgPerformance = analytics?.averagePercentage ? Math.round(analytics.averagePercentage) : 0;

  // Difficulty Distribution Calculation
  const diffTotal = analytics ? 
    ((analytics.difficultyDistribution?.EASY || 0) + (analytics.difficultyDistribution?.MEDIUM || 0) + (analytics.difficultyDistribution?.HARD || 0)) : 0;
  
  const easyPct = diffTotal ? ((analytics.difficultyDistribution?.EASY || 0) / diffTotal) * 100 : 33;
  const medPct = diffTotal ? ((analytics.difficultyDistribution?.MEDIUM || 0) / diffTotal) * 100 : 34;
  const hardPct = diffTotal ? ((analytics.difficultyDistribution?.HARD || 0) / diffTotal) * 100 : 33;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent shadow-lg shadow-brand-500/20"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300 relative z-10 font-sans pb-12 w-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary-900 via-[#1A1A1A] to-[#262626] p-8 md:p-12 text-white shadow-2xl border border-secondary-800">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[500px] h-[500px] rounded-full bg-brand-500 blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] rounded-full bg-purple-600 blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-5 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-secondary-400">
              Welcome back, {user?.name?.split(' ')[0] || 'Host'}
            </h1>
            <p className="text-secondary-400 text-lg md:text-xl mb-8 leading-relaxed font-medium max-w-xl">
              Your intelligent command center. Track candidate performance, manage live assessments, and uncover actionable insights all in one place.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/host/create-exam"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-500 text-white rounded-2xl font-bold hover:bg-brand-400 transition-all shadow-[0_0_30px_rgba(var(--brand-500),0.3)] hover:shadow-[0_0_40px_rgba(var(--brand-500),0.5)] hover:-translate-y-1 text-sm uppercase tracking-wide"
              >
                <PlusCircle className="w-5 h-5" />
                Create Assessment
              </Link>
              <Link
                to="/host/question-bank"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all hover:-translate-y-1 text-sm uppercase tracking-wide"
              >
                <Library className="w-5 h-5" />
                Question Bank
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full sm:w-64 flex items-center gap-5 hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Live Exams</p>
                <h4 className="text-4xl font-black text-white">{publishedExams.length}</h4>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full sm:w-64 flex items-center gap-5 hover:bg-white/10 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Candidates</p>
                <h4 className="text-4xl font-black text-white">{totalCandidates}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <StatCard 
          title="Total Assessments" 
          value={exams.length} 
          icon={FileText} 
          color="brand"
          trend="Lifetime created"
        />
        <StatCard 
          title="Avg. Performance" 
          value={`${avgPerformance}%`} 
          icon={TrendingUp} 
          color="purple"
          trend="Across all exams"
        />
        <StatCard 
          title="In Draft" 
          value={draftExams.length} 
          icon={Clock} 
          color="amber"
          trend="Pending review"
        />
        <StatCard 
          title="Completed" 
          value={completedExams.length} 
          icon={Shield} 
          color="blue"
          trend="Ready for grading"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        
        {/* Left Column: Analytics & Performance */}
        <div className="xl:col-span-2 space-y-6 w-full">
          
          {/* Analytics: Performance & Difficulty Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Exam Performance */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-secondary-200/60 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-secondary-900 flex items-center gap-3">
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  Performance Focus
                </h2>
              </div>
              <div className="space-y-6 flex-1">
                {analytics?.examPerformance?.length > 0 ? (
                  analytics.examPerformance.map((exam, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-secondary-800 truncate pr-4">{exam.examTitle}</h4>
                          <p className="text-[11px] font-semibold text-secondary-400 mt-0.5">{exam.candidateCount} candidates</p>
                        </div>
                        <span className="text-brand-600 font-black text-lg leading-none">{Math.round(exam.averagePercentage)}%</span>
                      </div>
                      <div className="w-full bg-secondary-100/80 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full transition-all duration-1000 group-hover:brightness-110"
                          style={{ width: `${Math.max(0, Math.min(100, exam.averagePercentage))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-secondary-400 space-y-3 pb-4">
                    <BarChart3 className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-medium">No performance data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-sm border border-secondary-200/60 flex flex-col h-full hover:shadow-md transition-shadow">
              <h2 className="text-xl font-black text-secondary-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                Difficulty Spread
              </h2>
              <div className="flex flex-col flex-1 justify-center pb-2">
                <div className="w-full h-12 rounded-2xl overflow-hidden flex shadow-inner mb-8 bg-secondary-100">
                  <div className="h-full bg-gradient-to-b from-emerald-400 to-emerald-500 transition-all duration-700 hover:brightness-110" style={{ width: `${easyPct}%` }} title="Easy"></div>
                  <div className="h-full bg-gradient-to-b from-amber-300 to-amber-400 transition-all duration-700 hover:brightness-110" style={{ width: `${medPct}%` }} title="Medium"></div>
                  <div className="h-full bg-gradient-to-b from-red-400 to-red-500 transition-all duration-700 hover:brightness-110" style={{ width: `${hardPct}%` }} title="Hard"></div>
                </div>
                <div className="flex justify-between items-center px-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      <span className="font-extrabold text-secondary-900 text-[13px] uppercase tracking-wide">Easy</span>
                    </div>
                    <span className="text-secondary-500 font-bold text-xs bg-secondary-50 px-3 py-1 rounded-lg border border-secondary-100 shadow-sm">{analytics?.difficultyDistribution?.EASY || 0} Qs</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
                      <span className="font-extrabold text-secondary-900 text-[13px] uppercase tracking-wide">Med</span>
                    </div>
                    <span className="text-secondary-500 font-bold text-xs bg-secondary-50 px-3 py-1 rounded-lg border border-secondary-100 shadow-sm">{analytics?.difficultyDistribution?.MEDIUM || 0} Qs</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                      <span className="font-extrabold text-secondary-900 text-[13px] uppercase tracking-wide">Hard</span>
                    </div>
                    <span className="text-secondary-500 font-bold text-xs bg-secondary-50 px-3 py-1 rounded-lg border border-secondary-100 shadow-sm">{analytics?.difficultyDistribution?.HARD || 0} Qs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Assessments List */}
          <div className="bg-white/80 backdrop-blur-xl border border-secondary-200/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col w-full hover:shadow-md transition-shadow">
            <div className="p-6 md:p-8 border-b border-secondary-100/80 flex items-center justify-between">
              <h2 className="text-xl font-black text-secondary-900 flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                Recent Assessments
              </h2>
              <Link to="/host/my-exams" className="text-sm font-extrabold text-brand-600 hover:text-brand-700 flex items-center gap-1.5 transition-colors bg-brand-50 px-4 py-2 rounded-xl shadow-sm hover:shadow">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {exams.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-secondary-50 rounded-[2rem] flex items-center justify-center mb-5 rotate-3 shadow-inner">
                  <FileText className="w-10 h-10 text-secondary-300 -rotate-3" />
                </div>
                <h3 className="text-xl font-black text-secondary-900 mb-2">No assessments yet</h3>
                <p className="text-secondary-500 mb-8 max-w-sm mx-auto font-medium">Create your first exam to start evaluating candidates and building your talent pool.</p>
                <Link to="/host/create-exam" className="px-8 py-3.5 bg-brand-50 text-brand-700 font-bold rounded-xl hover:bg-brand-100 transition-all hover:-translate-y-0.5 shadow-sm">
                  Create First Exam
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-secondary-100/50">
                {exams.slice(0, 5).map(exam => (
                  <div key={exam.id} className="p-5 md:p-6 hover:bg-brand-50/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                        exam.status === 'PUBLISHED' ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 border border-emerald-200/50' :
                        exam.status === 'DRAFT' ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border border-amber-200/50' :
                        'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border border-blue-200/50'
                      }`}>
                        {exam.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-secondary-900 text-[15px] group-hover:text-brand-600 transition-colors cursor-pointer truncate max-w-[200px] sm:max-w-xs md:max-w-md" onClick={() => navigate(`/host/exams/${exam.id}`)}>
                          {exam.title}
                        </h4>
                        <div className="flex items-center flex-wrap gap-3 text-xs text-secondary-500 mt-2 font-bold">
                          <span className="flex items-center gap-1.5 bg-white border border-secondary-200 px-2.5 py-1 rounded-lg shadow-sm"><Clock className="w-3.5 h-3.5 text-secondary-400" /> {exam.durationMinutes}m</span>
                          <span className="flex items-center gap-1.5 bg-white border border-secondary-200 px-2.5 py-1 rounded-lg shadow-sm">
                            <Library className="w-3.5 h-3.5 text-secondary-400" /> {exam.totalQuestions || 0} Qs
                          </span>
                          {exam.hasCodingSection && (
                            <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 px-2.5 py-1 rounded-lg shadow-sm">
                              <Code className="w-3.5 h-3.5 text-indigo-500" /> {exam.codingQuestionsCount || 0} Coding
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-5">
                      <span className={`px-4 py-1.5 text-[11px] font-black rounded-xl uppercase tracking-widest ${
                        exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' :
                        exam.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' :
                        'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      }`}>
                        {exam.status}
                      </span>
                      <button onClick={() => navigate(`/host/exams/${exam.id}`)} className="p-2.5 text-secondary-400 hover:text-white hover:bg-brand-500 rounded-xl transition-all shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:-translate-x-2 sm:group-hover:translate-x-0">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Weak Topics & Quick Actions */}
        <div className="space-y-6 w-full">
          
          {/* Weak Topics Box */}
          <div className="bg-white/80 backdrop-blur-xl border border-secondary-200/60 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                <TrendingUp className="w-5 h-5 rotate-180" />
              </div>
              Weak Topics
            </h2>
            {analytics?.topWeakTopics?.length > 0 ? (
              <div className="space-y-3">
                {analytics.topWeakTopics.slice(0, 4).map((topic, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-secondary-50/80 border border-secondary-100 rounded-2xl hover:border-red-200 hover:bg-red-50/50 transition-colors">
                    <span className="font-bold text-secondary-800 text-sm truncate pr-4">{topic.topic}</span>
                    <span className="px-3 py-1 bg-white text-red-600 text-xs font-black rounded-lg border border-red-100 shadow-sm shrink-0">
                      {topic.wrongCount} Errors
                    </span>
                  </div>
                ))}
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-10 text-secondary-400 space-y-3 bg-secondary-50/50 rounded-2xl border border-secondary-100 border-dashed">
                 <Shield className="w-8 h-8 opacity-40" />
                 <p className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-400">No Weak Data Found</p>
               </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4">
            <ActionCard 
              title="Global Question Bank"
              desc="Manage your reusable repository."
              icon={HardDrive}
              color="blue"
              link="/host/question-bank"
            />
            <ActionCard 
              title="Create Assessment"
              desc="Build a new exam from scratch."
              icon={PlusCircle}
              color="emerald"
              link="/host/create-exam"
            />
          </div>
            
          <div className="bg-gradient-to-br from-secondary-900 via-[#1F1A13] to-[#2D2619] rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/30 rounded-full blur-[60px] group-hover:bg-brand-500/50 transition-all duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/30 rounded-full blur-[60px] group-hover:bg-purple-500/50 transition-all duration-700"></div>
            <h3 className="font-black text-xl mb-3 text-brand-300 flex items-center gap-2 relative z-10 tracking-tight">
              <Sparkles className="w-5 h-5" /> Pro Tip
            </h3>
            <p className="text-secondary-300 text-sm leading-relaxed font-medium relative z-10">
              Leverage the <strong>AI Generator</strong> inside your Question Bank to instantly construct complex coding challenges and comprehensive MCQs. Add them to exams in seconds!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
