'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, FilterOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '@/hooks/use-auth';

type OnboardingStatus = 'Planned' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

type OnboardingTask = {
  _id: string;
  title: string;
  isDone: boolean;
  completedAt?: string | null;
};

type OnboardingRecord = {
  _id: string;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  department: string;
  designation: string;
  managerName: string;
  location: string;
  startDate: string;
  expectedEndDate: string;
  completedAt?: string | null;
  status: OnboardingStatus;
  notes: string;
  checklist: OnboardingTask[];
  startYear: number;
  startMonth: number;
  startMonthKey: string;
  createdByName: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
};

type OnboardingSummary = {
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  completionRate: number;
};

type MonthlyBreakdown = {
  monthKey: string;
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
};

type NewOnboardingForm = {
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
  department: string;
  designation: string;
  managerName: string;
  location: string;
  startDate: string;
  expectedEndDate: string;
  status: OnboardingStatus;
  checklist: string[];
  notes: string;
};

const onboardingStatusOptions: OnboardingStatus[] = ['Planned', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
const departmentOptions = ['Engineering', 'HR', 'Sales', 'Finance', 'Product', 'Operations', 'Marketing'];

const defaultSummary: OnboardingSummary = {
  total: 0,
  completed: 0,
  inProgress: 0,
  planned: 0,
  completionRate: 0,
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const buildYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options: { label: string; value: string }[] = [{ label: 'All Years', value: 'all' }];

  for (let year = currentYear + 1; year >= currentYear - 6; year -= 1) {
    options.push({ label: String(year), value: String(year) });
  }

  return options;
};

const monthOptions = [
  { label: 'All Months', value: 'all' },
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

const Onboarding: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [form] = Form.useForm<NewOnboardingForm>();
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [summary, setSummary] = useState<OnboardingSummary>(defaultSummary);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdown[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | OnboardingStatus>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const canManageOnboarding = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const loadOnboarding = useCallback(async () => {
    if (!currentUser?.organizationId || !canManageOnboarding) {
      setRecords([]);
      setSummary(defaultSummary);
      setMonthlyBreakdown([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb || '',
        role: currentUser.role,
      });
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedMonth !== 'all') params.set('month', selectedMonth);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/onboarding?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load onboarding records');
      }

      setRecords(data.records || []);
      setSummary(data.summary || defaultSummary);
      setMonthlyBreakdown(data.monthlyBreakdown || []);
    } catch (error: any) {
      message.error(error?.message || 'Unable to load onboarding records');
    } finally {
      setIsLoading(false);
    }
  }, [
    canManageOnboarding,
    currentUser?.organizationDb,
    currentUser?.organizationId,
    currentUser?.role,
    searchTerm,
    selectedMonth,
    selectedStatus,
    selectedYear,
  ]);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

  const openAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    form.setFieldsValue({
      employeeName: '',
      employeeEmail: '',
      employeeCode: '',
      department: 'Engineering',
      designation: '',
      managerName: '',
      location: '',
      startDate: today,
      expectedEndDate: '',
      status: 'Planned',
      checklist: ['Collect documents', 'Issue laptop', 'Complete orientation'],
      notes: '',
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    form.resetFields();
  };

  const handleCreate = async (values: NewOnboardingForm) => {
    if (!currentUser?.organizationId || !canManageOnboarding) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          creatorRole: currentUser.role,
          creatorUserId: currentUser.id,
          creatorName: currentUser.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create onboarding record');
      }

      message.success('Onboarding record created');
      closeAddModal();
      await loadOnboarding();
    } catch (error: any) {
      message.error(error?.message || 'Unable to create onboarding record');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (recordId: string, status: OnboardingStatus) => {
    if (!currentUser?.organizationId || !canManageOnboarding) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/onboarding/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          status,
          actorRole: currentUser.role,
          actorUserId: currentUser.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update onboarding record');
      }
      message.success('Onboarding record updated');
      await loadOnboarding();
    } catch (error: any) {
      message.error(error?.message || 'Unable to update onboarding record');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!currentUser?.organizationId || !canManageOnboarding) return;

    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb || '',
        actorRole: currentUser.role,
        actorUserId: currentUser.id,
      });
      const response = await fetch(`/api/onboarding/${recordId}?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete onboarding record');
      }
      message.success('Onboarding record deleted');
      await loadOnboarding();
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete onboarding record');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedStatus('all');
  };

  const columns: ColumnsType<OnboardingRecord> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.employeeName}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{record.employeeEmail}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      render: (_, record) => (
        <div>
          <Typography.Text>{record.department}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{record.designation || 'N/A'}</Typography.Text>
          </div>
        </div>
      ),
      responsive: ['md'],
    },
    {
      title: 'Month',
      dataIndex: 'startMonthKey',
      key: 'startMonthKey',
      render: (monthKey) => <Tag color="blue">{monthKey || 'N/A'}</Tag>,
    },
    {
      title: 'Start / End',
      key: 'dates',
      render: (_, record) => (
        <div>
          <Typography.Text>{formatDate(record.startDate)}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{formatDate(record.expectedEndDate)}</Typography.Text>
          </div>
        </div>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Checklist',
      key: 'checklist',
      render: (_, record) => (
        <div style={{ minWidth: 130 }}>
          <Typography.Text>{record.completedTasks}/{record.totalTasks || 0}</Typography.Text>
          <Progress percent={record.progressPercent} size="small" showInfo={false} />
        </div>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Select
          size="small"
          value={status}
          loading={isUpdatingStatus}
          style={{ width: 130 }}
          options={onboardingStatusOptions.map((value) => ({ value, label: value }))}
          onChange={(value) => void handleStatusUpdate(record._id, value)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Delete onboarding record?"
          onConfirm={() => void handleDelete(record._id)}
          okText="Delete"
          cancelText="Cancel"
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  if (!canManageOnboarding) {
    return (
      <Card className="border border-slate-200 rounded-xl">
        <Typography.Title level={3}>Onboarding Access Required</Typography.Title>
        <Typography.Text type="secondary">
          This module is available for Admin and HR users.
        </Typography.Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Onboarding Tracker</h1>
          <p className="text-slate-500">Track onboarding month/year wise and filter records instantly.</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadOnboarding()} loading={isLoading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            Add Onboarding
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Total Records</Typography.Text>
            <Typography.Title level={3} className="!m-0">{summary.total}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">In Progress</Typography.Text>
            <Typography.Title level={3} className="!m-0">{summary.inProgress}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Completed</Typography.Text>
            <Typography.Title level={3} className="!m-0">{summary.completed}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Completion Rate</Typography.Text>
            <Typography.Title level={3} className="!m-0">{summary.completionRate}%</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="border border-slate-200 rounded-xl">
        <div className="mb-4 flex flex-col lg:flex-row gap-3">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Search employee, department, manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full lg:max-w-md"
          />
          <Select
            size="large"
            value={selectedYear}
            style={{ minWidth: 140 }}
            options={yearOptions}
            onChange={setSelectedYear}
          />
          <Select
            size="large"
            value={selectedMonth}
            style={{ minWidth: 150 }}
            options={monthOptions}
            onChange={setSelectedMonth}
          />
          <Select
            size="large"
            value={selectedStatus}
            style={{ minWidth: 150 }}
            options={[
              { label: 'All Status', value: 'all' },
              ...onboardingStatusOptions.map((status) => ({ label: status, value: status })),
            ]}
            onChange={setSelectedStatus}
          />
          <Button icon={<FilterOutlined />} onClick={resetFilters}>
            Reset
          </Button>
        </div>

        <Table<OnboardingRecord>
          rowKey="_id"
          columns={columns}
          dataSource={records}
          loading={isLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 980 }}
          locale={{ emptyText: 'No onboarding records found for selected filters.' }}
        />
      </Card>

      <Card className="border border-slate-200 rounded-xl" title="Month-wise Onboarding">
        {monthlyBreakdown.length === 0 ? (
          <Typography.Text type="secondary">No data available for current filters.</Typography.Text>
        ) : (
          <Row gutter={[12, 12]}>
            {monthlyBreakdown.slice(0, 12).map((item) => (
              <Col key={item.monthKey} xs={24} sm={12} lg={8} xl={6}>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <Typography.Text strong>{item.monthKey}</Typography.Text>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Total</span><span>{item.total}</span></div>
                    <div className="flex justify-between"><span>Completed</span><span>{item.completed}</span></div>
                    <div className="flex justify-between"><span>In Progress</span><span>{item.inProgress}</span></div>
                    <div className="flex justify-between"><span>Planned</span><span>{item.planned}</span></div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={<Typography.Title level={4}>Add Onboarding</Typography.Title>}
        open={showAddModal}
        onCancel={closeAddModal}
        destroyOnHidden
        width={900}
        footer={[
          <Button key="cancel" onClick={closeAddModal}>Cancel</Button>,
          <Button key="create" type="primary" loading={isCreating} onClick={() => form.submit()}>
            Save
          </Button>,
        ]}
      >
        <Form<NewOnboardingForm> form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="employeeName" label="Employee Name" rules={[{ required: true, message: 'Enter name' }]}>
                <Input size="large" placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="employeeEmail"
                label="Employee Email"
                rules={[
                  { required: true, message: 'Enter email' },
                  { type: 'email', message: 'Enter valid email' },
                ]}
              >
                <Input size="large" placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="employeeCode" label="Employee Code">
                <Input size="large" placeholder="EMP-2026-0001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                <Select size="large" options={departmentOptions.map((d) => ({ value: d, label: d }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="designation" label="Designation">
                <Input size="large" placeholder="Job title" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="managerName" label="Manager Name">
                <Input size="large" placeholder="Manager's name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="location" label="Location">
                <Input size="large" placeholder="Office location" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
                <Input size="large" type="date" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="expectedEndDate" label="Expected End Date">
                <Input size="large" type="date" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select size="large" options={onboardingStatusOptions.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Internal Notes">
                <Input.TextArea rows={3} placeholder="Add any internal notes..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Onboarding;
