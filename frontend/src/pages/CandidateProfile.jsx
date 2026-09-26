import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import {
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  BookOpenCheck,
  Award
} from 'lucide-react';

const CandidateProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Candidate Profile</h1>
        <p className="text-secondary-600 mt-1.5 text-base">
          Manage your candidate profile information, assessment access credentials, and security settings.
        </p>
      </header>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-secondary-100">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/40 text-brand-700 font-extrabold flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'C'}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                {user?.name || 'Candidate User'}
              </h2>
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                Candidate
              </span>
            </div>
            <p className="text-secondary-500 text-sm font-medium">
              Registered Candidate on AssessMate Proctoring Platform
            </p>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <User className="w-4 h-4 text-brand-600" />
              <span>Full Name</span>
            </div>
            <p className="text-base font-bold text-secondary-900">{user?.name || 'Candidate'}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Role</span>
            </div>
            <p className="text-base font-bold text-emerald-700 capitalize">{user?.role || 'Candidate'}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>User ID / Identifier</span>
            </div>
            <p className="text-sm font-mono font-bold text-secondary-800">{user?.id || 'candidate-user'}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Account Status</span>
            </div>
            <p className="text-sm font-bold text-green-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Active &amp; Verified
            </p>
          </div>
        </div>
      </div>

      {/* Proctoring & Examination Security Standards */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-5">
        <div className="flex items-center gap-2.5">
          <BookOpenCheck className="w-5 h-5 text-brand-600" />
          <h3 className="text-xl font-bold text-secondary-900">Proctoring &amp; Assessment Compliance</h3>
        </div>
        <p className="text-secondary-600 text-sm">
          Before taking assessments, ensure your workstation meets the proctoring requirements:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <h4 className="font-bold text-secondary-900 text-sm mb-1">Webcam Sensor</h4>
            <p className="text-secondary-500 leading-relaxed">
              Active camera monitoring is required during test sessions to ensure authentication.
            </p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <h4 className="font-bold text-secondary-900 text-sm mb-1">Fullscreen Mode</h4>
            <p className="text-secondary-500 leading-relaxed">
              Exiting full screen triggers automated anti-cheating log events in real time.
            </p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <h4 className="font-bold text-secondary-900 text-sm mb-1">AI Evaluation</h4>
            <p className="text-secondary-500 leading-relaxed">
              Gemini AI models automatically analyze submitted responses and provide targeted feedback.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4 pt-2">
        <Button onClick={() => navigate('/candidate/dashboard')} className="!w-auto px-6 py-2.5 text-sm">
          <span>Return to Dashboard</span>
        </Button>
        <Button
          onClick={() => navigate('/candidate/my-assessments')}
          variant="outline"
          className="!w-auto px-6 py-2.5 text-sm"
        >
          <span>View My Assessments</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CandidateProfile;
