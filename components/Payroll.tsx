'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';

interface PayrollRecord {
  _id: string;
  monthKey: string;
  monthLabel: string;
  basic: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Processed' | 'Pending';
  processedAt: string | null;
}

const currency = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const Payroll: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [latest, setLatest] = useState<PayrollRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayroll = async () => {
    if (!currentUser?.organizationId || !currentUser?.id) return;

    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        userId: currentUser.id,
      });
      if (currentUser.organizationDb) {
        params.set('organizationDb', currentUser.organizationDb);
      }
      const response = await fetch(`/api/payroll?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load payroll data');
      }
      setRecords(data.records || []);
      setLatest(data.latest || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayroll();
  }, [currentUser?.organizationId, currentUser?.id]);

  const employerPf = latest ? Math.round(latest.basic * 0.12 * 100) / 100 : 0;
  const employeePf = latest ? Math.round(latest.basic * 0.12 * 100) / 100 : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll & Benefits</h1>
          <p className="text-slate-500">View salary details, tax deductions, and payroll history.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadPayroll()}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Refresh Payroll
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Salary Breakdown</h3>
              <span className="text-sm font-semibold text-blue-600">{latest?.monthLabel || 'No cycle'}</span>
            </div>

            {!latest ? (
              <p className="text-sm text-slate-500">No payroll cycle has been generated for your account yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-bold text-slate-800">{currency(latest.basic)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-slate-600">Allowances</span>
                  <span className="font-bold text-slate-800">{currency(latest.allowances)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <span className="text-slate-600">Deductions</span>
                  <span className="font-bold text-slate-500 text-sm">-{currency(latest.deductions)}</span>
                </div>
                <div className="flex items-center justify-between py-4 bg-blue-50 px-4 rounded-lg mt-4">
                  <span className="font-bold text-blue-700">Monthly Net Pay</span>
                  <span className="text-xl font-black text-blue-700">{currency(latest.netPay)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Payslip History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Net Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Processed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!isLoading && records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                        No payroll records found.
                      </td>
                    </tr>
                  )}
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{record.monthLabel}</td>
                      <td className="px-6 py-4 text-slate-600">{currency(record.netPay)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            record.status === 'Processed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {record.processedAt ? new Date(record.processedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Tax Compliance</h4>
                <p className="text-xs text-slate-400">Status: {latest ? 'Active' : 'Pending Payroll'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Payroll values are generated from your organization payroll records. Contact Admin/HR for updates.
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl text-white">
            <h4 className="font-bold mb-4">EPF Contributions</h4>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Employer Contribution</span>
                <span>{currency(employerPf)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Employee Contribution</span>
                <span>{currency(employeePf)}</span>
              </div>
            </div>
            <div className="h-1 bg-slate-700 rounded-full mb-6">
              <div
                className="h-1 bg-green-500 rounded-full"
                style={{ width: `${latest && latest.netPay > 0 ? Math.min(100, Math.round((employeePf / latest.netPay) * 100)) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
