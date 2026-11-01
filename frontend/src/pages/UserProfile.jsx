import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/authService';
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
  Award,
  Loader2
} from 'lucide-react';

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();
        setProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const displayUser = profile || authUser;
  const isHost = displayUser?.role === 'HOST';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">My Profile</h1>
        <p className="text-secondary-600 mt-1.5 text-base">
          Manage your profile information, access credentials, and security settings.
        </p>
      </header>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-secondary-100">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/40 text-brand-700 font-extrabold flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
            {displayUser?.name ? displayUser.name[0].toUpperCase() : (isHost ? 'H' : 'C')}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                {displayUser?.name || 'User'}
              </h2>
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                {displayUser?.role || 'User'}
              </span>
            </div>
            <p className="text-secondary-500 text-sm font-medium">
              Registered {isHost ? 'Host' : 'Candidate'} on AssessMate Proctoring Platform
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
            <p className="text-base font-bold text-secondary-900">{displayUser?.name || 'User'}</p>
          </div>
          
          {profile?.email && (
            <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>Email Address</span>
              </div>
              <p className="text-base font-bold text-secondary-900">{profile.email}</p>
            </div>
          )}

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Role</span>
            </div>
            <p className="text-base font-bold text-emerald-700 capitalize">{displayUser?.role || 'User'}</p>
          </div>
          
          {profile?.createdAt && (
            <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>Joined On</span>
              </div>
              <p className="text-sm font-bold text-secondary-800">
                {new Date(profile.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>User ID / Identifier</span>
            </div>
            <p className="text-sm font-mono font-bold text-secondary-800">{displayUser?.id || 'unknown'}</p>
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

      {/* Dynamic Features & Compliance Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-5">
        <div className="flex items-center gap-2.5">
          <BookOpenCheck className="w-5 h-5 text-brand-600" />
          <h3 className="text-xl font-bold text-secondary-900">
            {isHost ? 'Platform Capabilities & Management' : 'Security & Compliance'}
          </h3>
        </div>
        <p className="text-secondary-600 text-sm">
          {isHost 
            ? 'As a Host, you have full access to these intelligent assessment capabilities:' 
            : 'Before taking assessments, ensure your workstation meets the proctoring requirements:'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {isHost ? (
            <>
              <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
                <h4 className="font-bold text-secondary-900 text-sm mb-1">AI Exam Generation</h4>
                <p className="text-secondary-500 leading-relaxed">
                  Automatically generate balanced question sets from topics, PDFs, or pasted notes using Gemini AI.
                </p>
              </div>

              <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
                <h4 className="font-bold text-secondary-900 text-sm mb-1">Live Proctoring</h4>
                <p className="text-secondary-500 leading-relaxed">
                  Monitor candidates in real-time. Detect tab-switching, copy-pasting, and missing webcam feeds instantly.
                </p>
              </div>

              <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
                <h4 className="font-bold text-secondary-900 text-sm mb-1">Advanced Analytics</h4>
                <p className="text-secondary-500 leading-relaxed">
                  View automated grading, score distributions, and individual candidate performance reports.
                </p>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4 pt-2">
        <Button onClick={() => navigate(isHost ? '/host/dashboard' : '/candidate/dashboard')} className="!w-auto px-6 py-2.5 text-sm">
          <span>Return to Dashboard</span>
        </Button>
      </div>
    </div>
  );
};

export default UserProfile;
