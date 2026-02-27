
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  joinDate: string;
  photo: string;
}

export interface AttendanceRecord {
  date: string;
  punchIn: string;
  punchOut: string;
  status: 'Present' | 'Absent' | 'WFH' | 'Leave';
  duration: string;
}

export interface LeaveRequest {
  id: string;
  type: 'Sick' | 'Casual' | 'Annual' | 'Maternity';
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
}

export interface PayrollRecord {
  month: string;
  year: number;
  basic: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Processed' | 'Pending';
}

export enum Page {
  Dashboard = 'dashboard',
  Employees = 'employees',
  Attendance = 'attendance',
  Leave = 'leave',
  Payroll = 'payroll',
  Settings = 'settings'
}
