'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';

interface SettingsModel {
  companyName: string;
  registrationNumber: string;
  emailDomain: string;
  openPositions: number;
  notifications: {
    leaveApprovals: boolean;
    payslipGenerated: boolean;
    clockInReminder: boolean;
  };
}

const defaultSettings: SettingsModel = {
  companyName: '',
  registrationNumber: '',
  emailDomain: '',
  openPositions: 0,
  notifications: {
    leaveApprovals: true,
    payslipGenerated: true,
    clockInReminder: true,
  },
};

const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<SettingsModel>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    if (!currentUser?.organizationId) return;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
      });
      if (currentUser.organizationDb) {
        params.set('organizationDb', currentUser.organizationDb);
      }
      const response = await fetch(`/api/settings?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load settings');
      }

      setSettings({
        companyName: data.settings?.companyName || '',
        registrationNumber: data.settings?.registrationNumber || '',
        emailDomain: data.settings?.emailDomain || '',
        openPositions: Number(data.settings?.openPositions || 0),
        notifications: {
          leaveApprovals: Boolean(data.settings?.notifications?.leaveApprovals),
          payslipGenerated: Boolean(data.settings?.notifications?.payslipGenerated),
          clockInReminder: Boolean(data.settings?.notifications?.clockInReminder),
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [currentUser?.organizationId]);

  const saveSettings = async () => {
    if (!currentUser?.organizationId) return;
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          companyName: settings.companyName,
          registrationNumber: settings.registrationNumber,
          emailDomain: settings.emailDomain,
          openPositions: Number(settings.openPositions || 0),
          notifications: settings.notifications,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save settings');
      }
      setMessage(data.message || 'Settings saved successfully');
      if (data.settings) {
        setSettings({
          companyName: data.settings.companyName || '',
          registrationNumber: data.settings.registrationNumber || '',
          emailDomain: data.settings.emailDomain || '',
          openPositions: Number(data.settings.openPositions || 0),
          notifications: {
            leaveApprovals: Boolean(data.settings?.notifications?.leaveApprovals),
            payslipGenerated: Boolean(data.settings?.notifications?.payslipGenerated),
            clockInReminder: Boolean(data.settings?.notifications?.clockInReminder),
          },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
        <p className="text-slate-500">Configure your workspace and personal preferences.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-semibold">
          {message}
        </div>
      )}

      <div className="max-w-3xl space-y-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Company Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Company Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Registration Number</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.registrationNumber}
                onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700">Official Email Domain</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.emailDomain}
                onChange={(e) => setSettings({ ...settings, emailDomain: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-700">Open Positions</label>
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.openPositions}
                onChange={(e) =>
                  setSettings({ ...settings, openPositions: Math.max(0, Number(e.target.value || 0)) })
                }
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => void saveSettings()}
              disabled={isSaving || isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notification Preferences
          </h3>
          <div className="space-y-4">
            {[
              {
                key: 'leaveApprovals' as const,
                title: 'Leave Approvals',
                desc: 'Notify me when my leave request is approved or rejected.',
              },
              {
                key: 'payslipGenerated' as const,
                title: 'New Payslip Generated',
                desc: 'Receive an email when monthly payslip is ready for download.',
              },
              {
                key: 'clockInReminder' as const,
                title: 'Clock-in Reminder',
                desc: 'Mobile notification if forgot to clock-in by office start time.',
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications[item.key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
