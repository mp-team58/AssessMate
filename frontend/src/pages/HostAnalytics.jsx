import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Library, Users, TrendingUp, BarChart3, Target, Activity } from 'lucide-react';
import { getHostAnalytics } from '../services/hostService';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';

const HostAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await getHostAnalytics();
        setAnalytics(response.data);
      } catch (error) {
        showToast('Unable to load analytics. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [showToast]);

  if (isLoading) {
    return (
      <div className="w-full h-full space-y-8 animate-in fade-in duration-500">
        <div className="h-24 bg-secondary-100 rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-secondary-100 rounded-2xl animate-pulse"></div>
          <div className="h-32 bg-secondary-100 rounded-2xl animate-pulse"></div>
          <div className="h-32 bg-secondary-100 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-96 bg-secondary-100 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  // Handle Empty State safely
  if (!analytics || analytics.totalExams === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-500 space-y-6">
        <div className="w-24 h-24 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-secondary-900">No exam analytics yet</h2>
        <p className="text-secondary-600 max-w-md text-lg">
          Create an exam and have candidates complete it to start seeing performance insights.
        </p>
        <div className="flex gap-4 mt-8">
          <Link to="/host/create-exam">
            <Button className="px-8 py-3 text-lg flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              Create Exam
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Distribution Percentages safely
  const diffTotal = 
    (analytics.difficultyDistribution?.EASY || 0) + 
    (analytics.difficultyDistribution?.MEDIUM || 0) + 
    (analytics.difficultyDistribution?.HARD || 0);

  const easyPct = diffTotal ? ((analytics.difficultyDistribution?.EASY || 0) / diffTotal) * 100 : 0;
  const medPct = diffTotal ? ((analytics.difficultyDistribution?.MEDIUM || 0) / diffTotal) * 100 : 0;
  const hardPct = diffTotal ? ((analytics.difficultyDistribution?.HARD || 0) / diffTotal) * 100 : 0;

  return (
    <div className="w-full h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-secondary-800 tracking-tight">Analytics</h1>
        <p className="text-secondary-500 mt-2 text-lg">Monitor exam performance, candidate activity, and learning trends.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
          <div className="p-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
            <Library className="w-8 h-8" />
          </div>
          <div>
            <p className="text-secondary-600 font-semibold mb-1">Total Exams</p>
            <h3 className="text-3xl font-extrabold text-[#362E20]">{analytics.totalExams}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
          <div className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-secondary-600 font-semibold mb-1">Total Candidates</p>
            <h3 className="text-3xl font-extrabold text-[#362E20]">{analytics.totalCandidates}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-200 flex items-start gap-4 group hover:shadow-md hover:border-brand-300 transition-all">
          <div className="p-4 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-secondary-600 font-semibold mb-1">Average Performance</p>
            <h3 className="text-3xl font-extrabold text-[#362E20]">{Math.round(analytics.averagePercentage || 0)}%</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exam Performance Horizontal Bars */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-200 flex flex-col h-full">
          <h2 className="text-xl font-bold text-secondary-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            Exam Performance
          </h2>
          <div className="space-y-5 flex-1">
            {analytics.examPerformance && analytics.examPerformance.length > 0 ? (
              analytics.examPerformance.map((exam, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <span className="text-secondary-800 truncate pr-4">{exam.examTitle}</span>
                    <span className="text-brand-700">{Math.round(exam.averagePercentage)}%</span>
                  </div>
                  <div className="text-xs text-secondary-500 mb-2">{exam.candidateCount} candidates</div>
                  <div className="w-full bg-secondary-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(0, Math.min(100, exam.averagePercentage))}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-secondary-500 text-center mt-10">No exam data available.</p>
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-200 flex flex-col h-full">
          <h2 className="text-xl font-bold text-secondary-800 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-600" />
            Difficulty Distribution
          </h2>
          {diffTotal > 0 ? (
            <div className="flex flex-col flex-1 justify-center">
              {/* Stacked Horizontal Bar */}
              <div className="w-full h-8 rounded-xl overflow-hidden flex shadow-inner mb-6">
                <div className="h-full bg-emerald-500 transition-all duration-700 hover:brightness-110" style={{ width: `${easyPct}%` }} title="Easy"></div>
                <div className="h-full bg-amber-400 transition-all duration-700 hover:brightness-110" style={{ width: `${medPct}%` }} title="Medium"></div>
                <div className="h-full bg-red-500 transition-all duration-700 hover:brightness-110" style={{ width: `${hardPct}%` }} title="Hard"></div>
              </div>
              <div className="flex justify-around text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-secondary-800">EASY</span>
                  </div>
                  <span className="text-secondary-500 text-sm">{analytics.difficultyDistribution?.EASY || 0}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="font-bold text-secondary-800">MEDIUM</span>
                  </div>
                  <span className="text-secondary-500 text-sm">{analytics.difficultyDistribution?.MEDIUM || 0}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="font-bold text-secondary-800">HARD</span>
                  </div>
                  <span className="text-secondary-500 text-sm">{analytics.difficultyDistribution?.HARD || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-secondary-500 text-center mt-10">No difficulty data available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Trend (Column Chart via Flex) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-200">
          <h2 className="text-xl font-bold text-secondary-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            Performance Trend
          </h2>
          <div className="h-56 flex items-end justify-between gap-1 mt-4 pt-4 border-t border-secondary-100">
            {analytics.performanceTrend && analytics.performanceTrend.length > 0 ? (
              analytics.performanceTrend.map((pt, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute -top-10 bg-secondary-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {pt.date}: {Math.round(pt.averagePercentage)}%
                  </div>
                  <div 
                    className="w-full max-w-[2rem] bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-md transition-all duration-700 group-hover:brightness-110 min-w-[8px]"
                    style={{ height: `${Math.max(5, pt.averagePercentage)}%` }}
                  ></div>
                  <span className="text-[10px] text-secondary-500 mt-2 truncate w-full text-center block" title={pt.date}>
                    {new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-secondary-500 text-center w-full self-center">No trend data available.</p>
            )}
          </div>
        </div>

        {/* Top Weak Topics */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-secondary-200">
          <h2 className="text-xl font-bold text-secondary-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
            Top Weak Topics
          </h2>
          {analytics.topWeakTopics && analytics.topWeakTopics.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-secondary-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary-50 text-secondary-600 text-sm uppercase tracking-wider">
                    <th className="p-3 font-semibold border-b border-secondary-200">Topic</th>
                    <th className="p-3 font-semibold border-b border-secondary-200 text-right">Wrong Answers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {analytics.topWeakTopics.map((topic, idx) => (
                    <tr key={idx} className="hover:bg-secondary-50/50 transition-colors">
                      <td className="p-3 text-secondary-800 font-medium">{topic.topic}</td>
                      <td className="p-3 text-red-600 font-bold text-right">{topic.wrongCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-secondary-500 text-center mt-10">No weak topics identified yet.</p>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default HostAnalytics;
