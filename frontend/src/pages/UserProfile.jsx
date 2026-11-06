import React, { useEffect, useRef, useState } from 'react';
import { Lock, Loader2, Eye, EyeOff, AlertCircle, Save, Check, Circle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getMyProfile, updateProfile, changePassword } from '../services/authService';

const NAME_MIN = 2;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;

const ROLE_LABEL = { ADMIN: 'Administrator', HOST: 'Host', CANDIDATE: 'Candidate' };

const inputCls = (hasError) =>
  `w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 transition shadow-sm ${
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-secondary-300 focus:ring-brand-500 focus:border-brand-500'
  }`;

const Card = ({ icon: Icon, title, description, children, className = '', innerRef }) => (
  <section ref={innerRef} className={`bg-white rounded-2xl border shadow-sm p-6 md:p-8 ${className || 'border-secondary-200'}`}>
    <div className="flex items-start gap-3.5 mb-6">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-secondary-900 tracking-tight">{title}</h2>
        {description && <p className="text-sm text-secondary-500 mt-0.5">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

const PasswordField = ({ id, label, value, onChange, show, onToggle, autoComplete, placeholder }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-secondary-800 mb-1.5">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputCls(false)} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-secondary-400 hover:text-secondary-700 transition"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

const Rule = ({ ok, children }) => (
  <li className={`flex items-center gap-2 text-sm ${ok ? 'text-emerald-700' : 'text-secondary-500'}`}>
    {ok ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Circle className="w-4 h-4 shrink-0 text-secondary-300" aria-hidden="true" />}
    <span>{children}</span>
    <span className="sr-only">{ok ? '(done)' : '(not yet)'}</span>
  </li>
);

const UserProfile = () => {
  const { user: authUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const securityRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Name
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  // Load once. (The old effect depended on authUser, so saving your name changed authUser,
  // re-ran the fetch and could overwrite what you had just typed.)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await getMyProfile();
        if (!isMounted) return;
        const data = response.data?.user || response.data?.data || response.data || {};
        setProfile(data);
        const initial = data.name || authUser?.name || '';
        setName(initial);
        setSavedName(initial);
      } catch (err) {
        console.error('Failed to fetch profile', err);
        if (isMounted) {
          setName(authUser?.name || '');
          setSavedName(authUser?.name || '');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayUser = profile || authUser || {};
  const currentRole = displayUser.role || authUser?.role || 'CANDIDATE';
  const roleName = ROLE_LABEL[currentRole] || 'Candidate';
  const email = displayUser.email || authUser?.email || '';
  const status = displayUser.status || 'ACTIVE';
  const isActive = status === 'ACTIVE';
  const mustChangePassword = Boolean(displayUser.mustChangePassword);
  const displayName = savedName || displayUser.name || authUser?.name || 'Unnamed user';
  const initial = ((displayName || email || 'U').trim()[0] || 'U').toUpperCase();
  const memberSince = displayUser.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const nameDirty = name.trim() !== savedName.trim();

  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < NAME_MIN) return setNameError(`Name must be at least ${NAME_MIN} characters.`);
    if (trimmed.length > NAME_MAX) return setNameError(`Name can't be longer than ${NAME_MAX} characters.`);

    setSavingName(true);
    setNameError('');
    try {
      const res = await updateProfile({ name: trimmed });
      const updated = res.data?.user || res.data?.data || res.data || {};
      setProfile((prev) => ({ ...(prev || {}), ...updated, name: trimmed }));
      setName(trimmed);
      setSavedName(trimmed);
      if (updateUser) updateUser({ name: trimmed });
      showToast('Name updated.', 'success');
    } catch (err) {
      console.error('Failed to update name', err);
      showToast(err.response?.data?.message || err.response?.data?.error || 'Failed to update name.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  // Rules shown live next to the form
  const rules = {
    length: newPassword.length >= PASSWORD_MIN,
    match: newPassword.length > 0 && newPassword === confirmPassword,
    different: newPassword.length > 0 && newPassword !== currentPassword,
  };
  const canChangePassword = Boolean(currentPassword) && rules.length && rules.match && rules.different && !changingPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!canChangePassword) return;
    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showToast('Password updated. Your other devices have been signed out.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShow({ current: false, next: false, confirm: false });
      if (profile?.mustChangePassword) {
        setProfile((prev) => ({ ...(prev || {}), mustChangePassword: false }));
        if (updateUser) updateUser({ mustChangePassword: false });
      }
    } catch (err) {
      console.error('Password change error', err);
      showToast(
        err.response?.data?.message || err.response?.data?.error || 'Could not update your password. Check your current password and try again.',
        'error'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 pb-16 animate-pulse font-sans" role="status" aria-label="Loading profile">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-secondary-200/80 rounded-xl" />
          <div className="h-4 w-72 bg-secondary-200/50 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          <div className="bg-white rounded-2xl border border-secondary-200 h-80" />
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-secondary-200 h-56" />
            <div className="bg-white rounded-2xl border border-secondary-200 h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 tracking-tight">My profile</h1>
        <p className="text-secondary-600 mt-1 text-sm sm:text-base">Manage your account details and password.</p>
      </header>

      {mustChangePassword && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-wrap items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-[16rem] text-sm">
            <p className="font-bold">Choose a new password</p>
            <p className="text-amber-800 mt-0.5">You're signed in with a temporary password. Set your own to keep full access.</p>
          </div>
          <button
            type="button"
            onClick={() => securityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition shadow-sm"
          >
            Change password
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        {/* Identity Summary Card */}
        <aside aria-label="Account summary" className="w-full lg:sticky lg:top-6 bg-white rounded-2xl border border-secondary-200 shadow-sm p-6 md:p-7">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="w-20 h-20 rounded-2xl bg-brand-100 border border-brand-200 text-brand-700 font-extrabold flex items-center justify-center text-3xl shadow-sm" aria-hidden="true">
              {initial}
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-secondary-900 tracking-tight break-words max-w-full">{displayName}</h2>
            <p className="text-sm text-secondary-500 mt-1 break-all">{email}</p>
            <span className="mt-3.5 inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-brand-50 text-brand-700 border border-brand-200">{roleName}</span>
          </div>

          <dl className="mt-6 pt-6 border-t border-secondary-100 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary-500">Status</dt>
              <dd className={`flex items-center gap-1.5 font-semibold ${isActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                {isActive ? 'Active' : status}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary-500">Member since</dt>
              <dd className="font-semibold text-secondary-900 text-right">{memberSince}</dd>
            </div>
          </dl>
        </aside>

        {/* Details + Security sections */}
        <div className="space-y-6 min-w-0">
          <Card title="Account details" description="Update the name shown on your account.">
            <form onSubmit={handleSaveName} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-secondary-800 mb-1.5">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={name}
                    maxLength={NAME_MAX}
                    autoComplete="name"
                    placeholder="Your full name"
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'fullName-error' : undefined}
                    onChange={(e) => { setName(e.target.value); setNameError(''); }}
                    className={inputCls(Boolean(nameError))}
                  />
                  {nameError && <p id="fullName-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600">{nameError}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-secondary-800 mb-1.5">Email address</label>
                  <div className="relative">
                    <input id="email" type="email" value={email} readOnly disabled className={`${inputCls(false)} pr-10 bg-secondary-50 text-secondary-600 cursor-not-allowed`} />
                    <Lock className="w-4 h-4 text-secondary-400 absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 text-xs text-secondary-500">Your email can't be changed here.</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!nameDirty || savingName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                  Save changes
                </button>
                {nameDirty && !savingName && (
                  <button
                    type="button"
                    onClick={() => { setName(savedName); setNameError(''); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-secondary-700 hover:bg-secondary-100 transition"
                  >
                    Discard
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card
            innerRef={securityRef}
            icon={KeyRound}
            title="Password"
            description="Changing your password signs you out of your other devices."
            className={`scroll-mt-6 ${mustChangePassword ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-secondary-200'}`}
          >
            <form onSubmit={handleChangePassword} noValidate className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8 items-start">
              <div className="space-y-4 max-w-xl">
                <PasswordField
                  id="currentPassword"
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={show.current}
                  onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
                  autoComplete="current-password"
                  placeholder={mustChangePassword ? 'Your temporary password' : 'Enter your current password'}
                />
                <PasswordField
                  id="newPassword"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={show.next}
                  onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
                  autoComplete="new-password"
                  placeholder="Enter a new password"
                />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={show.confirm}
                  onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                  autoComplete="new-password"
                  placeholder="Re-enter the new password"
                />
                <button
                  type="submit"
                  disabled={!canChangePassword}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
                  Update password
                </button>
              </div>

              <div className="rounded-2xl bg-secondary-50 border border-secondary-200 p-5 self-start space-y-3">
                <p className="text-sm font-semibold text-secondary-800">Your new password needs to</p>
                <ul className="space-y-2.5" aria-live="polite">
                  <Rule ok={rules.length}>Be at least {PASSWORD_MIN} characters</Rule>
                  <Rule ok={rules.different}>Differ from your current password</Rule>
                  <Rule ok={rules.match}>Match the confirmation</Rule>
                </ul>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
