'use client';

import React, { useRef, useState } from 'react';
import { Input, Modal, message } from 'antd';
import { useAuth } from '../hooks/use-auth';
import { usePathname } from '../hooks/use-navigation';
import { useUIPreferences, type AccentPalette } from '@/hooks/use-ui-preferences';

interface HeaderProps {
  isSidebarOpen: boolean;
  isDesktop: boolean;
  onMenuToggle: () => void;
}

type ProfileFormState = {
  name: string;
  email: string;
  avatar: string;
};

type SecurityFormState = {
  newPassword: string;
  confirmPassword: string;
};

const accentOptions: Array<{ id: AccentPalette; label: string; swatch: string }> = [
  { id: 'ocean', label: 'Ocean', swatch: 'linear-gradient(130deg,#0f4cde,#2b67f8)' },
  { id: 'mint', label: 'Mint', swatch: 'linear-gradient(130deg,#0f9a8a,#24bea7)' },
  { id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(130deg,#c95f27,#e57f49)' },
  { id: 'rose', label: 'Rose', swatch: 'linear-gradient(130deg,#d03f6c,#ea5d8a)' },
];

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/leave': 'Leave Management',
  '/payroll': 'Payroll',
  '/settings': 'Settings',
  '/recruitment': 'Recruitment',
  '/onboarding': 'Onboarding',
  '/performance': 'Performance',
  '/learning': 'Learning',
  '/helpdesk': 'Helpdesk',
  '/documents': 'Documents',
  '/expenses': 'Expenses',
  '/workforce': 'Workforce',
  '/compliance': 'Compliance',
  '/engagement': 'Engagement',
};

const buildAvatarFromSeed = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'user')}`;
const MAX_AVATAR_UPLOAD_SIZE = 800 * 1024;

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, isDesktop, onMenuToggle }) => {
  const { user, logout, updateUser } = useAuth();
  const pathname = usePathname();
  const { mode, accent, toggleMode, setAccent } = useUIPreferences();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    avatar: '',
  });
  const [securityForm, setSecurityForm] = useState<SecurityFormState>({
    newPassword: '',
    confirmPassword: '',
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const activeModule = routeNames[pathname] || 'Workspace';
  const isAdmin = user?.role === 'Admin';

  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '',
    });
    setShowProfileMenu(false);
    setIsProfileModalOpen(true);
  };

  const openSecurityModal = () => {
    setShowProfileMenu(false);
    setSecurityForm({ newPassword: '', confirmPassword: '' });
    setIsSecurityModalOpen(true);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('Please select a valid image file.');
      return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_SIZE) {
      message.error('Image size should be 800KB or less.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        message.error('Unable to process selected image.');
        return;
      }
      setProfileForm((prev) => ({ ...prev, avatar: result }));
      message.success('Photo selected. Click save to apply.');
    };
    reader.onerror = () => message.error('Unable to read selected image.');
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const cleanName = profileForm.name.trim();
    const cleanEmail = profileForm.email.trim().toLowerCase();
    const fallbackAvatar = buildAvatarFromSeed(cleanName || cleanEmail || user.name || user.email);
    const avatarToSave = profileForm.avatar.trim() || fallbackAvatar;

    if (isAdmin) {
      if (!cleanName) {
        message.error('Please enter a valid full name.');
        return;
      }
      if (!cleanEmail || !cleanEmail.includes('@')) {
        message.error('Please enter a valid email address.');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const payload: Record<string, unknown> = {
        avatar: avatarToSave,
        actorRole: user.role,
        creatorRole: user.role,
        actorUserId: user.id,
        organizationId: user.organizationId,
        organizationDb: user.organizationDb,
      };

      if (isAdmin) {
        payload.name = cleanName;
        payload.email = cleanEmail;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      const updatedUser = data.user || {};
      updateUser({
        name: updatedUser.name ?? user.name,
        email: updatedUser.email ?? user.email,
        avatar: updatedUser.avatar ?? avatarToSave,
      });
      message.success('Profile updated successfully.');
      setIsProfileModalOpen(false);
    } catch (error: any) {
      message.error(error?.message || 'Unable to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (securityForm.newPassword.length < 6) {
      message.error('New password must be at least 6 characters.');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      message.error('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: securityForm.newPassword,
          actorRole: user.role,
          creatorRole: user.role,
          actorUserId: user.id,
          organizationId: user.organizationId,
          organizationDb: user.organizationDb,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      message.success('Password updated successfully.');
      setSecurityForm({ newPassword: '', confirmPassword: '' });
      setIsSecurityModalOpen(false);
    } catch (error: any) {
      message.error(error?.message || 'Unable to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 px-3 pb-3 pt-3 md:px-6 md:pt-5">
        <div className="panel-surface motion-rise h-16 md:h-[74px] rounded-2xl md:rounded-[1.25rem] px-3 md:px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuToggle}
              className={`h-10 w-10 rounded-xl panel-soft transition-colors ${
                !isDesktop && isSidebarOpen ? 'ring-accent' : ''
              }`}
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg
                className="w-5 h-5 mx-auto text-[var(--color-text-soft)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isSidebarOpen ? 'M4 6h16M4 12h16M4 18h16' : 'M4 6h16M4 12h10M4 18h16'}
                />
              </svg>
            </button>

            <div className="hidden md:block min-w-0">
              <p className="ui-overline text-[var(--color-text-soft)]"></p>
              <p className="font-heading ui-nav-label md:text-[0.98rem] text-[var(--color-text)] truncate">
                {activeModule}
              </p>
            </div>

            <div className="relative flex-1 min-w-0 md:min-w-[280px] lg:min-w-[360px]">
              <input
                type="text"
                placeholder="Search employees, teams, docs..."
                className="w-full pl-10 pr-4 py-2.5 md:py-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] text-[0.93rem] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--accent-500)_42%,transparent)] transition"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-soft)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                setShowThemePanel((value) => !value);
                setShowProfileMenu(false);
              }}
              className={`h-10 px-3 md:px-3.5 rounded-xl panel-soft flex items-center gap-2 text-[var(--color-text-soft)] hover:text-[var(--color-text)] transition ${
                showThemePanel ? 'ring-accent' : ''
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.9}
                  d="M12 6V4m0 16v-2m8-6h-2M6 12H4m11.314 5.314l-1.414-1.414M8.1 8.1 6.686 6.686m8.628 0L13.9 8.1M8.1 15.9l-1.414 1.414M12 16a4 4 0 100-8 4 4 0 000 8z"
                />
              </svg>
              <span className="hidden md:inline ui-label">{mode === 'dark' ? 'Dark' : 'Light'}</span>
            </button>

            <button
              onClick={toggleMode}
              className="h-10 w-10 rounded-xl panel-soft text-[var(--color-text-soft)] hover:text-[var(--color-text)] transition"
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mode === 'dark' ? (
                <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m8.66-10h-1M4.34 12h-1m14.95 6.95-.7-.7M6.09 6.09l-.7-.7m12.72 0-.7.7M6.09 17.91l-.7.7M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 118.646 3.646a7 7 0 1011.708 11.708z"
                  />
                </svg>
              )}
            </button>

            <button className="h-10 w-10 rounded-xl panel-soft text-[var(--color-text-soft)] hover:text-[var(--color-text)] relative transition">
              <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger-500)]" />
            </button>

            <div className="h-8 w-px bg-[var(--border-soft)] hidden md:block" />

            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu((value) => !value);
                  setShowThemePanel(false);
                }}
                className={`flex items-center gap-3 p-1.5 rounded-xl transition-colors ${
                  showProfileMenu ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <img
                  src={user?.avatar || buildAvatarFromSeed(user?.name || user?.email || 'user')}
                  alt="Profile"
                  className="w-10 h-10 rounded-xl border border-[var(--border-soft)]"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {(showProfileMenu || showThemePanel) && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setShowThemePanel(false);
              setShowProfileMenu(false);
            }}
          />

          {showThemePanel && (
            <div className="fixed right-4 top-20 md:right-14 md:top-24 z-40 w-[290px] panel-surface rounded-2xl p-4 motion-pop">
              <p className="ui-overline text-[var(--color-text-soft)] mb-3">Theme Controls</p>

              <button
                onClick={toggleMode}
                className="w-full panel-soft rounded-xl px-3 py-3 flex items-center justify-between text-sm font-semibold text-[var(--color-text)] mb-4"
              >
                <span>{mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                <span className="h-7 w-7 rounded-lg bg-[var(--surface-1)] border border-[var(--border-soft)] flex items-center justify-center">
                  {mode === 'dark' ? 'L' : 'D'}
                </span>
              </button>

              <p className="text-[0.8rem] text-[var(--color-text-soft)] font-semibold mb-2">Accent Palette</p>
              <div className="grid grid-cols-2 gap-2">
                {accentOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setAccent(option.id)}
                    className={`rounded-xl border px-2 py-2 text-left transition ${
                      accent === option.id
                        ? 'border-[var(--accent-600)] bg-[var(--accent-50)] ring-accent'
                        : 'border-[var(--border-soft)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <span className="block h-8 rounded-lg mb-2" style={{ background: option.swatch }} />
                    <span className="text-[0.79rem] font-semibold text-[var(--color-text)]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showProfileMenu && (
            <div className="fixed right-4 top-20 md:right-6 md:top-[5.2rem] z-40 w-64 panel-surface rounded-2xl overflow-hidden motion-pop">
              <div className="p-4 border-b border-[var(--border-soft)] bg-[var(--surface-2)]">
                <p className="ui-label text-[var(--color-text-soft)] mb-1">Signed in as</p>
                <p className="text-[0.86rem] font-semibold text-[var(--color-text)] break-all">{user?.email}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={openProfileModal}
                  className="w-full text-left px-3 py-2.5 text-[0.88rem] text-[var(--color-text-soft)] font-semibold hover:bg-[var(--surface-2)] rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  My Profile
                </button>
                <button
                  onClick={openSecurityModal}
                  className="w-full text-left px-3 py-2.5 text-[0.88rem] text-[var(--color-text-soft)] font-semibold hover:bg-[var(--surface-2)] rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Account Security
                </button>
              </div>
              <div className="p-2 border-t border-[var(--border-soft)]">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2.5 text-[0.88rem] text-[var(--danger-500)] font-bold hover:bg-[color:color-mix(in_srgb,var(--danger-500)_12%,transparent)] rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        title={<span className="font-heading">My Profile</span>}
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        onOk={() => void handleSaveProfile()}
        okText={isAdmin ? 'Save Changes' : 'Update Photo'}
        confirmLoading={isSavingProfile}
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <img
              src={profileForm.avatar || buildAvatarFromSeed(profileForm.name || profileForm.email)}
              alt="Avatar Preview"
              className="h-14 w-14 rounded-xl border border-[var(--border-soft)]"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="px-3 py-2 rounded-lg border border-[var(--border-soft)] text-[0.82rem] font-semibold hover:bg-[var(--surface-2)]"
            >
              Upload Photo
            </button>
            <button
              type="button"
              onClick={() =>
                setProfileForm((prev) => ({
                  ...prev,
                  avatar: buildAvatarFromSeed(prev.name || prev.email || user?.name || 'user'),
                }))
              }
              className="px-3 py-2 rounded-lg border border-[var(--border-soft)] text-[0.82rem] font-semibold hover:bg-[var(--surface-2)]"
            >
              Generate Avatar
            </button>
          </div>
          <p className="text-[0.76rem] text-[var(--color-text-soft)]">
            Supported formats: JPG, PNG, WEBP. Max size: 800KB.
          </p>

          {isAdmin ? (
            <>
              <div>
                <p className="ui-label text-[var(--color-text-soft)] mb-1">Full Name</p>
                <Input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Your full name"
                />
              </div>

              <div>
                <p className="ui-label text-[var(--color-text-soft)] mb-1">Email</p>
                <Input
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <p className="ui-label text-[var(--color-text-soft)] mb-1">Avatar URL (optional)</p>
                <Input
                  value={profileForm.avatar}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, avatar: event.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-3">
              <p className="ui-label text-[var(--color-text-soft)] mb-1">Permission</p>
              <p className="text-[0.84rem] text-[var(--color-text)]">
                You can update only your profile photo. Name and email can be edited by Admin.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={<span className="font-heading">Account Security</span>}
        open={isSecurityModalOpen}
        onCancel={() => setIsSecurityModalOpen(false)}
        onOk={() => void handleChangePassword()}
        okText="Update Password"
        confirmLoading={isSavingPassword}
      >
        <div className="space-y-4 pt-2">
          <div>
            <p className="ui-label text-[var(--color-text-soft)] mb-1">New Password</p>
            <Input.Password
              value={securityForm.newPassword}
              onChange={(event) =>
                setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              placeholder="Minimum 6 characters"
            />
          </div>
          <div>
            <p className="ui-label text-[var(--color-text-soft)] mb-1">Confirm Password</p>
            <Input.Password
              value={securityForm.confirmPassword}
              onChange={(event) =>
                setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              placeholder="Re-enter new password"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;
