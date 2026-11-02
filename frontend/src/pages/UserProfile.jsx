import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/authService';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  BookOpenCheck,
  Loader2
} from 'lucide-react';

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const response = await getMyProfile();
        if (isMounted) {
          setProfile(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayUser = profile?.user || profile?.data || profile || authUser;
  const currentRole = displayUser?.role || authUser?.role || 'CANDIDATE';
  const isHost = currentRole === 'HOST';
  const roleName = currentRole === 'ADMIN' ? 'Administrator' : isHost ? 'Host' : 'Candidate';
  const roleBadge = currentRole;
  const fullName = displayUser?.name || authUser?.name || `${roleName} User`;
  const email = displayUser?.email || authUser?.email || (currentRole === 'ADMIN' ? 'admin@assessmate.com' : isHost ? 'host@assessmate.com' : 'candidate@assessmate.com');
  const userId = displayUser?.id || displayUser?._id || authUser?.id || authUser?._id || 'N/A';

  const rawCreatedAt = displayUser?.createdAt || profile?.createdAt;
  const joinedDate = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recent Member';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-pulse font-sans">
        <div className="space-y-2">
          <div className="h-8 w-36 bg-secondary-200/80 rounded-xl" />
          <div className="h-4 w-64 bg-secondary-200/50 rounded-lg" />
        </div>
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-secondary-200 space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-secondary-100">
            <div className="w-20 h-20 rounded-2xl bg-secondary-200/70" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-secondary-200/80 rounded-lg" />
              <div className="h-4 w-32 bg-secondary-200/50 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-2">
                <div className="h-3 w-24 bg-secondary-200/70 rounded" />
                <div className="h-5 w-40 bg-secondary-200/90 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
          Profile
        </h1>
        <p className="text-secondary-600 mt-1.5 text-base">
          Manage your profile information, access credentials, and security settings.
        </p>
      </header>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-secondary-200 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-secondary-100">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/40 text-brand-700 font-extrabold flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
            {fullName ? fullName[0].toUpperCase() : (isHost ? 'H' : 'C')}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-secondary-900 tracking-tight">
                {fullName}
              </h2>
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                {roleBadge}
              </span>
            </div>
            <p className="text-secondary-500 text-sm font-medium">
              Registered {roleName} on AssessMate Proctoring Platform
            </p>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Mail className="w-4 h-4 text-brand-600" />
              <span>Email Address</span>
            </div>
            <p className="text-base font-bold text-secondary-900 truncate">{email}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Role</span>
            </div>
            <p className="text-base font-bold text-emerald-700 capitalize">{roleName}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Joined On</span>
            </div>
            <p className="text-base font-bold text-secondary-900">{joinedDate}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>User ID / Identifier</span>
            </div>
            <p className="text-sm font-mono font-bold text-secondary-800 truncate">{userId}</p>
          </div>

          <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-200 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Account Status</span>
            </div>
            <p className="text-base font-bold text-emerald-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
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

    </div>
  );
};

export default UserProfile;
