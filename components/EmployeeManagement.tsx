'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { countryCodeOptions } from '@/constants/country-code-options';
import { useAuth } from '../hooks/use-auth';

type RoleOption = 'Employee' | 'HR';
type EmployeeType = 'Freelancing' | 'Part Time' | 'Full Time' | 'On Contract';

type SalaryBreakup = {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
};

type SalaryBreakupInput = {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  deductions: number;
};

type EmployeeRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  organizationId?: string;
  avatar?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  mobileNumber?: string;
  employeeCode?: string;
  employeeType?: EmployeeType;
  salaryBreakup?: SalaryBreakup;
  status?: string;
  joinDate?: string;
};

type NewEmployeeForm = {
  name: string;
  email: string;
  password: string;
  role: RoleOption;
  department: string;
  designation: string;
  phoneCountryCode: string;
  phoneNumber: string;
  employeeCode: string;
  employeeType: EmployeeType;
  salaryBreakup: SalaryBreakupInput;
};

const employeeTypes: EmployeeType[] = ['Freelancing', 'Part Time', 'Full Time', 'On Contract'];
const departmentOptions = ['Engineering', 'HR', 'Sales', 'Finance', 'Product', 'Operations', 'Marketing'];

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const buildSalaryBreakup = (value?: Partial<SalaryBreakupInput>): SalaryBreakup => {
  const basic = toPositiveNumber(value?.basic);
  const hra = toPositiveNumber(value?.hra);
  const allowances = toPositiveNumber(value?.allowances);
  const bonus = toPositiveNumber(value?.bonus);
  const deductions = toPositiveNumber(value?.deductions);
  const grossSalary = basic + hra + allowances + bonus;
  const netSalary = Math.max(0, grossSalary - deductions);

  return {
    basic,
    hra,
    allowances,
    bonus,
    deductions,
    grossSalary,
    netSalary,
  };
};

const buildNextEmployeeCode = (employees: EmployeeRecord[]) => {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;
  let highestSequence = 0;

  employees.forEach((emp) => {
    const code = String(emp.employeeCode || '').toUpperCase();
    if (!code.startsWith(prefix)) return;

    const sequence = Number(code.slice(prefix.length));
    if (Number.isInteger(sequence)) {
      highestSequence = Math.max(highestSequence, sequence);
    }
  });

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
};

const buildInitialFormValues = (employees: EmployeeRecord[]): NewEmployeeForm => ({
  name: '',
  email: '',
  password: 'password123',
  role: 'Employee',
  department: 'Engineering',
  designation: 'Associate',
  phoneCountryCode: '+1',
  phoneNumber: '',
  employeeCode: buildNextEmployeeCode(employees),
  employeeType: 'Full Time',
  salaryBreakup: {
    basic: 0,
    hra: 0,
    allowances: 0,
    bonus: 0,
    deductions: 0,
  },
});

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString();
};

const formatMobile = (countryCode?: string, phoneNumber?: string) => {
  if (!phoneNumber) return 'N/A';
  return `${countryCode || '+1'} ${phoneNumber}`;
};

const roleColor = (role: string) => {
  if (role === 'Admin') return 'purple';
  if (role === 'HR') return 'blue';
  return 'default';
};

const EmployeeManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [form] = Form.useForm<NewEmployeeForm>();
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const canCreateUsers = currentUser?.role === 'Admin' || currentUser?.role === 'HR';
  const availableRoles = currentUser?.role === 'Admin' ? (['Employee', 'HR'] as const) : (['Employee'] as const);

  const watchedSalary = Form.useWatch('salaryBreakup', form) as SalaryBreakupInput | undefined;
  const computedSalary = useMemo(() => buildSalaryBreakup(watchedSalary), [watchedSalary]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!currentUser?.organizationId) {
        setEmployees([]);
        return;
      }

      setIsLoadingEmployees(true);
      try {
        const params = new URLSearchParams({
          organizationId: currentUser.organizationId,
        });
        if (currentUser.organizationDb) {
          params.set('organizationDb', currentUser.organizationDb);
        }

        const response = await fetch(`/api/users?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch employees');
        }
        setEmployees(data.users || []);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        message.error('Unable to load employees.');
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    void fetchEmployees();
  }, [currentUser?.organizationDb, currentUser?.organizationId]);

  const openAddModal = () => {
    form.setFieldsValue(buildInitialFormValues(employees));
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    form.resetFields();
  };

  const fillAutoEmployeeCode = () => {
    form.setFieldValue('employeeCode', buildNextEmployeeCode(employees));
  };

  const filteredEmployees = useMemo(() => {
    const cleanSearchTerm = searchTerm.trim().toLowerCase();
    if (!cleanSearchTerm) return employees;

    return employees.filter((emp) => {
      return (
        emp.name?.toLowerCase().includes(cleanSearchTerm) ||
        emp.department?.toLowerCase().includes(cleanSearchTerm) ||
        emp.role?.toLowerCase().includes(cleanSearchTerm) ||
        emp.employeeCode?.toLowerCase().includes(cleanSearchTerm) ||
        emp.employeeType?.toLowerCase().includes(cleanSearchTerm) ||
        emp.phoneNumber?.toLowerCase().includes(cleanSearchTerm)
      );
    });
  }, [employees, searchTerm]);

  const columns: ColumnsType<EmployeeRecord> = [
    {
      title: 'Employee',
      dataIndex: 'name',
      key: 'employee',
      render: (_, emp) => (
        <Space>
          <Avatar size={42} src={emp.avatar} icon={<UserOutlined />} />
          <div>
            <Typography.Text strong>{emp.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary">{emp.email}</Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Employee Code',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (code) => <Tag color="geekblue">{code || 'N/A'}</Tag>,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => department || 'General',
      responsive: ['md'],
    },
    {
      title: 'Mobile',
      key: 'mobile',
      render: (_, emp) => formatMobile(emp.phoneCountryCode, emp.phoneNumber),
      responsive: ['lg'],
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color={roleColor(role)}>{role}</Tag>,
    },
    {
      title: 'Employment Type',
      dataIndex: 'employeeType',
      key: 'employeeType',
      render: (type) => <Tag color="cyan">{type || 'Full Time'}</Tag>,
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const cleanStatus = status || 'Active';
        return <Tag color={cleanStatus === 'Active' ? 'success' : 'warning'}>{cleanStatus}</Tag>;
      },
    },
    {
      title: 'Join Date',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (joinDate) => formatDate(joinDate),
      responsive: ['md'],
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: () => (
        <Button type="text" icon={<EditOutlined />} disabled aria-label="Edit employee" />
      ),
    },
  ];

  const handleAddEmployee = async (values: NewEmployeeForm) => {
    if (!currentUser?.organizationId || !canCreateUsers) return;

    setIsCreatingEmployee(true);
    try {
      const salaryBreakup = buildSalaryBreakup(values.salaryBreakup);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          phoneCountryCode: values.phoneCountryCode,
          phoneNumber: values.phoneNumber.replace(/\D/g, ''),
          employeeCode: values.employeeCode.trim().toUpperCase(),
          employeeType: values.employeeType,
          salaryBreakup,
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          creatorRole: currentUser.role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${values.name || values.email}`,
          status: 'Active',
          joinDate: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create employee');
      }

      setEmployees((prev) => [...prev, data.user]);
      message.success('Employee created successfully.');
      closeAddModal();
    } catch (error: any) {
      message.error(error?.message || 'Error creating employee.');
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employee Management</h1>
          <p className="text-slate-500">Directory for {currentUser?.organizationName || 'your organization'}.</p>
        </div>
        {canCreateUsers && (
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openAddModal}>
            Add New Employee
          </Button>
        )}
      </div>

      <Card className="shadow-sm border border-slate-200 rounded-xl">
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
          <Input
            allowClear
            size="large"
            placeholder="Search by name, role, employee code, type..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-md"
          />
        </div>

        <Table<EmployeeRecord>
          rowKey="_id"
          columns={columns}
          dataSource={filteredEmployees}
          loading={isLoadingEmployees}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: 'No employees found for this organization.' }}
        />
      </Card>

      <Modal
        title={<Typography.Title level={4}>Add New Employee</Typography.Title>}
        open={showAddModal}
        onCancel={closeAddModal}
        width={920}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={closeAddModal}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={isCreatingEmployee}
            onClick={() => form.submit()}
          >
            Create User
          </Button>,
        ]}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form<NewEmployeeForm> form={form} layout="horizontal" onFinish={handleAddEmployee}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input size="large" placeholder="Enter employee full name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Enter a valid email address' },
                ]}
              >
                <Input size="large" placeholder="example@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Select role' }]}>
                <Select
                  size="large"
                  options={availableRoles.map((role) => ({
                    label: role === 'HR' ? 'HR Manager' : 'Employee',
                    value: role,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Select department' }]}
              >
                <Select
                  size="large"
                  options={departmentOptions.map((department) => ({
                    label: department,
                    value: department,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Mobile Number" required>
                <Space.Compact block>
                  <Form.Item
                    name="phoneCountryCode"
                    noStyle
                    rules={[{ required: true, message: 'Select code' }]}
                  >
                    <Select
                      size="large"
                      style={{ width: 130 }}
                      showSearch
                      options={countryCodeOptions}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item
                    name="phoneNumber"
                    noStyle
                    rules={[
                      { required: true, message: 'Enter mobile number' },
                      { pattern: /^[0-9]{6,15}$/, message: 'Enter 6 to 15 digits' },
                    ]}
                  >
                    <Input
                      size="large"
                      maxLength={15}
                      placeholder="Mobile number"
                      onChange={(e) => form.setFieldValue('phoneNumber', e.target.value.replace(/\D/g, ''))}
                    />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="designation"
                label="Designation"
                rules={[{ required: true, message: 'Enter designation' }]}
              >
                <Input size="large" placeholder="Associate" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Default Password"
                rules={[
                  { required: true, message: 'Enter default password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password size="large" placeholder="Enter default password" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Employee Code" required>
                <Space.Compact block>
                  <Form.Item
                    name="employeeCode"
                    noStyle
                    rules={[
                      { required: true, message: 'Employee code is required' },
                      { pattern: /^[A-Z0-9-]+$/, message: 'Use uppercase letters, numbers, and hyphen only' },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder="EMP-2026-0001"
                      style={{ textTransform: 'uppercase' }}
                      onChange={(e) => form.setFieldValue('employeeCode', e.target.value.toUpperCase())}
                    />
                  </Form.Item>
                  <Button size="large" icon={<ReloadOutlined />} onClick={fillAutoEmployeeCode}>
                    Auto
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="employeeType"
                label="Employee Type"
                rules={[{ required: true, message: 'Select employee type' }]}
              >
                <Select
                  size="large"
                  options={employeeTypes.map((type) => ({
                    label: type,
                    value: type,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Card
            size="small"
            title="Salary Breakup"
            className="!border-slate-200"
            styles={{ body: { paddingBottom: 8 } }}
          >
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name={['salaryBreakup', 'basic']} label="Basic">
                  <InputNumber size="large" min={0} precision={2} step={100} className="!w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name={['salaryBreakup', 'hra']} label="HRA">
                  <InputNumber size="large" min={0} precision={2} step={100} className="!w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name={['salaryBreakup', 'allowances']} label="Allowances">
                  <InputNumber size="large" min={0} precision={2} step={100} className="!w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name={['salaryBreakup', 'bonus']} label="Bonus">
                  <InputNumber size="large" min={0} precision={2} step={100} className="!w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name={['salaryBreakup', 'deductions']} label="Deductions">
                  <InputNumber size="large" min={0} precision={2} step={100} className="!w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <div className="rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
                  <Typography.Text type="secondary">Gross Salary</Typography.Text>
                  <Typography.Title level={5} className="!mt-1 !mb-0">
                    {currency(computedSalary.grossSalary)}
                  </Typography.Title>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="rounded-xl border border-green-200 px-4 py-3 bg-green-50">
                  <Typography.Text type="secondary">Net Salary</Typography.Text>
                  <Typography.Title level={5} className="!mt-1 !mb-0 !text-green-700">
                    {currency(computedSalary.netSalary)}
                  </Typography.Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
