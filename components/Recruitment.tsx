'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '@/hooks/use-auth';

type RequisitionStatus = 'Draft' | 'Open' | 'On Hold' | 'Closed';
type RequisitionPriority = 'Low' | 'Medium' | 'High' | 'Critical';
type EmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Internship';
type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';

type CandidateRecord = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
  stage: CandidateStage;
  rating?: number | null;
  notes?: string;
  createdAt?: string;
};

type RequisitionRecord = {
  _id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  openings: number;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  description?: string;
  hiringManager?: string;
  mustHaveSkills: string[];
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  candidates: CandidateRecord[];
  candidateCount: number;
  hiredCount: number;
  openPositions: number;
  pipeline: Record<CandidateStage, number>;
  createdByUserId?: string;
  createdByName?: string;
  createdAt?: string;
};

type RecruitmentSummary = {
  totalRequisitions: number;
  activeRequisitions: number;
  totalOpenings: number;
  totalCandidates: number;
  totalHired: number;
};

type RequisitionFormValues = {
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  openings: number;
  priority: RequisitionPriority;
  hiringManager: string;
  salaryRangeMin: number;
  salaryRangeMax: number;
  mustHaveSkills: string[];
  description: string;
};

type CandidateFormValues = {
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: CandidateStage;
  rating?: number;
  notes: string;
};

type ReferralFormValues = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const departmentOptions = ['Engineering', 'HR', 'Sales', 'Finance', 'Product', 'Operations', 'Marketing'];
const requisitionStatusOptions: RequisitionStatus[] = ['Draft', 'Open', 'On Hold', 'Closed'];
const requisitionPriorityOptions: RequisitionPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const employmentTypeOptions: EmploymentType[] = ['Full Time', 'Part Time', 'Contract', 'Internship'];
const candidateStageOptions: CandidateStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const statusColor = (status: RequisitionStatus) => {
  if (status === 'Open') return 'success';
  if (status === 'On Hold') return 'warning';
  if (status === 'Closed') return 'default';
  return 'processing';
};

const priorityColor = (priority: RequisitionPriority) => {
  if (priority === 'Critical') return 'red';
  if (priority === 'High') return 'volcano';
  if (priority === 'Medium') return 'gold';
  return 'default';
};

const stageColor = (stage: CandidateStage) => {
  if (stage === 'Hired') return 'success';
  if (stage === 'Rejected') return 'error';
  if (stage === 'Offer') return 'processing';
  if (stage === 'Interview') return 'purple';
  if (stage === 'Screening') return 'blue';
  return 'default';
};

const currency = (amount?: number) =>
  Number(amount || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const defaultSummary: RecruitmentSummary = {
  totalRequisitions: 0,
  activeRequisitions: 0,
  totalOpenings: 0,
  totalCandidates: 0,
  totalHired: 0,
};

const Recruitment: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [requisitionForm] = Form.useForm<RequisitionFormValues>();
  const [candidateForm] = Form.useForm<CandidateFormValues>();
  const [referralForm] = Form.useForm<ReferralFormValues>();
  const [searchTerm, setSearchTerm] = useState('');
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>([]);
  const [summary, setSummary] = useState<RecruitmentSummary>(defaultSummary);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRequisition, setIsCreatingRequisition] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [isUpdatingCandidate, setIsUpdatingCandidate] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showRequisitionDrawer, setShowRequisitionDrawer] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [editingRequisitionId, setEditingRequisitionId] = useState<string | null>(null);

  const normalizedRole = String(currentUser?.role || '').toLowerCase();
  const canManageRecruitment =
    normalizedRole === 'admin'
    || normalizedRole === 'hr'
    || normalizedRole === 'manager'
    || normalizedRole === 'team lead'
    || normalizedRole === 'teamlead';

  const canEditRequisition = (requisition: RequisitionRecord) =>
    canManageRecruitment
    && !!currentUser?.id
    && String(requisition.createdByUserId || '') === String(currentUser.id);

  const loadRecruitment = useCallback(async () => {
    if (!currentUser?.organizationId) {
      setRequisitions([]);
      setSummary(defaultSummary);
      setSelectedRequisitionId('');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb || '',
        role: currentUser.role,
      });

      const response = await fetch(`/api/recruitment?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load recruitment data');
      }

      const items: RequisitionRecord[] = data.requisitions || [];
      setRequisitions(items);
      setSummary(data.summary || defaultSummary);
      setSelectedRequisitionId((previousSelectedId) => {
        if (items.length === 0) return '';
        if (previousSelectedId && items.some((item) => item._id === previousSelectedId)) {
          return previousSelectedId;
        }
        return items[0]._id;
      });
    } catch (error: any) {
      message.error(error?.message || 'Unable to load recruitment data');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.organizationDb, currentUser?.organizationId, currentUser?.role]);

  useEffect(() => {
    void loadRecruitment();
  }, [loadRecruitment]);

  const filteredRequisitions = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return requisitions;

    return requisitions.filter((item) => {
      return (
        item.title?.toLowerCase().includes(cleanSearch) ||
        item.department?.toLowerCase().includes(cleanSearch) ||
        item.location?.toLowerCase().includes(cleanSearch) ||
        item.hiringManager?.toLowerCase().includes(cleanSearch) ||
        item.createdByName?.toLowerCase().includes(cleanSearch)
      );
    });
  }, [requisitions, searchTerm]);

  const selectedRequisition = useMemo(
    () => requisitions.find((item) => item._id === selectedRequisitionId),
    [requisitions, selectedRequisitionId]
  );

  const upsertRequisition = (next: RequisitionRecord) => {
    setRequisitions((prev) => {
      const exists = prev.some((item) => item._id === next._id);
      if (!exists) return [next, ...prev];
      return prev.map((item) => (item._id === next._id ? next : item));
    });
  };

  const removeRequisition = (requisitionId: string) => {
    setRequisitions((prev) => prev.filter((item) => item._id !== requisitionId));
    if (selectedRequisitionId === requisitionId) {
      setSelectedRequisitionId('');
    }
  };

  const openRequisitionModal = (requisition?: RequisitionRecord) => {
    if (requisition) {
      setEditingRequisitionId(requisition._id);
      setSelectedRequisitionId(requisition._id);
      requisitionForm.setFieldsValue({
        title: requisition.title || '',
        department: requisition.department || 'Engineering',
        location: requisition.location || 'Onsite',
        employmentType: requisition.employmentType || 'Full Time',
        openings: Number(requisition.openings || 1),
        priority: requisition.priority || 'Medium',
        hiringManager: requisition.hiringManager || '',
        salaryRangeMin: Number(requisition.salaryRangeMin || 0),
        salaryRangeMax: Number(requisition.salaryRangeMax || 0),
        mustHaveSkills: requisition.mustHaveSkills || [],
        description: requisition.description || '',
      });
    } else {
      setEditingRequisitionId(null);
      requisitionForm.setFieldsValue({
        title: '',
        department: 'Engineering',
        location: 'Onsite',
        employmentType: 'Full Time',
        openings: 1,
        priority: 'Medium',
        hiringManager: '',
        salaryRangeMin: 0,
        salaryRangeMax: 0,
        mustHaveSkills: [],
        description: '',
      });
    }
    setShowRequisitionModal(true);
  };

  const closeRequisitionModal = () => {
    setShowRequisitionModal(false);
    setEditingRequisitionId(null);
    requisitionForm.resetFields();
  };

  const openCandidateModal = (requisitionId: string) => {
    setSelectedRequisitionId(requisitionId);
    candidateForm.setFieldsValue({
      name: '',
      email: '',
      phone: '',
      source: 'Direct',
      stage: 'Applied',
      notes: '',
    });
    setShowCandidateModal(true);
  };

  const closeCandidateModal = () => {
    setShowCandidateModal(false);
    candidateForm.resetFields();
  };

  const openRequisitionDrawer = (requisitionId: string) => {
    setSelectedRequisitionId(requisitionId);
    setShowRequisitionDrawer(true);
  };

  const closeRequisitionDrawer = () => {
    setShowRequisitionDrawer(false);
  };

  const openReferralModal = () => {
    referralForm.setFieldsValue({
      name: '',
      email: '',
      phone: '',
      notes: '',
    });
    setShowReferralModal(true);
  };

  const closeReferralModal = () => {
    setShowReferralModal(false);
    referralForm.resetFields();
  };

  const handleSaveRequisition = async (values: RequisitionFormValues) => {
    if (!currentUser?.organizationId || !canManageRecruitment) return;

    setIsCreatingRequisition(true);
    try {
      const isEditMode = !!editingRequisitionId;
      const endpoint = isEditMode ? `/api/recruitment/${editingRequisitionId}` : '/api/recruitment';
      const response = await fetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          actorRole: currentUser.role,
          actorUserId: currentUser.id,
          creatorRole: currentUser.role,
          creatorUserId: currentUser.id,
          creatorName: currentUser.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (isEditMode ? 'Failed to update requisition' : 'Failed to create requisition'));
      }

      upsertRequisition(data.requisition);
      setSelectedRequisitionId(data.requisition._id);
      await loadRecruitment();
      message.success(isEditMode ? 'Requisition updated successfully' : 'Requisition created successfully');
      closeRequisitionModal();
    } catch (error: any) {
      message.error(error?.message || 'Unable to save requisition');
    } finally {
      setIsCreatingRequisition(false);
    }
  };

  const handleUpdateRequisitionStatus = async (requisitionId: string, status: RequisitionStatus) => {
    if (!currentUser?.organizationId || !canManageRecruitment) return;

    try {
      const response = await fetch(`/api/recruitment/${requisitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          actorRole: currentUser.role,
          actorUserId: currentUser.id,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update requisition');
      }
      upsertRequisition(data.requisition);
      message.success('Requisition status updated');
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to update requisition');
    }
  };

  const handleDeleteRequisition = async (requisitionId: string) => {
    if (!currentUser?.organizationId || !canManageRecruitment) return;
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb || '',
        actorRole: currentUser.role,
        actorUserId: currentUser.id,
      });
      const response = await fetch(`/api/recruitment/${requisitionId}?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete requisition');
      }
      removeRequisition(requisitionId);
      message.success('Requisition deleted');
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete requisition');
    }
  };

  const handleAddCandidate = async (values: CandidateFormValues) => {
    if (!selectedRequisition || !currentUser?.organizationId || !canManageRecruitment) return;

    setIsAddingCandidate(true);
    try {
      const response = await fetch(`/api/recruitment/${selectedRequisition._id}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          actorRole: currentUser.role,
          creatorUserId: currentUser.id,
          creatorName: currentUser.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add candidate');
      }

      upsertRequisition(data.requisition);
      message.success('Candidate added successfully');
      closeCandidateModal();
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to add candidate');
    } finally {
      setIsAddingCandidate(false);
    }
  };

  const handleSubmitReferral = async (values: ReferralFormValues) => {
    if (!selectedRequisition || !currentUser?.organizationId) return;

    setIsSubmittingReferral(true);
    try {
      const response = await fetch(`/api/recruitment/${selectedRequisition._id}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          source: 'Referral',
          stage: 'Applied',
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          actorRole: currentUser.role,
          creatorRole: currentUser.role,
          creatorUserId: currentUser.id,
          creatorName: currentUser.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit referral');
      }

      upsertRequisition(data.requisition);
      message.success(data.message || 'Referral submitted successfully');
      closeReferralModal();
      closeRequisitionDrawer();
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to submit referral');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const handleCandidateStageChange = async (
    requisitionId: string,
    candidateId: string,
    stage: CandidateStage
  ) => {
    if (!currentUser?.organizationId || !canManageRecruitment) return;

    setIsUpdatingCandidate(true);
    try {
      const response = await fetch(`/api/recruitment/${requisitionId}/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentUser.organizationId,
          organizationDb: currentUser.organizationDb,
          actorRole: currentUser.role,
          stage,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update candidate');
      }
      upsertRequisition(data.requisition);
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to update candidate stage');
    } finally {
      setIsUpdatingCandidate(false);
    }
  };

  const handleDeleteCandidate = async (requisitionId: string, candidateId: string) => {
    if (!currentUser?.organizationId || !canManageRecruitment) return;

    setIsUpdatingCandidate(true);
    try {
      const params = new URLSearchParams({
        organizationId: currentUser.organizationId,
        organizationDb: currentUser.organizationDb || '',
        actorRole: currentUser.role,
      });
      const response = await fetch(
        `/api/recruitment/${requisitionId}/candidates/${candidateId}?${params.toString()}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete candidate');
      }
      upsertRequisition(data.requisition);
      message.success('Candidate removed');
      await loadRecruitment();
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete candidate');
    } finally {
      setIsUpdatingCandidate(false);
    }
  };

  const requisitionColumns: ColumnsType<RequisitionRecord> = [
    {
      title: 'Role',
      key: 'title',
      render: (_, item) => (
        <div>
          <Typography.Text strong>{item.title}</Typography.Text>
          <div className="mt-1">
            <Typography.Text type="secondary">
              {item.department} | {item.location}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      render: (value) => <Tag color="blue">{value}</Tag>,
      responsive: ['lg'],
    },
    {
      title: 'Openings',
      key: 'openings',
      render: (_, item) => (
        <Space>
          <Tag color={item.openPositions > 0 ? 'success' : 'default'}>{item.openPositions} Open</Tag>
          <Typography.Text type="secondary">of {item.openings}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Candidates',
      dataIndex: 'candidateCount',
      key: 'candidateCount',
      render: (_, item) => (
        <Space>
          <TeamOutlined />
          <Typography.Text>{item.candidateCount}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => <Tag color={priorityColor(priority)}>{priority}</Tag>,
      responsive: ['md'],
    },
    {
      title: 'Created By',
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (createdByName) => createdByName || 'System',
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, item) =>
        canEditRequisition(item) ? (
          <Select
            size="small"
            value={status}
            style={{ width: 120 }}
            options={requisitionStatusOptions.map((value) => ({ value, label: value }))}
            onChange={(value) => void handleUpdateRequisitionStatus(item._id, value)}
          />
        ) : (
          <Tag color={statusColor(status)}>{status}</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, item) => (
        <Space>
          <Button
            size="small"
            type="default"
            icon={<EyeOutlined />}
            onClick={() => openRequisitionDrawer(item._id)}
          >
            View
          </Button>
          {canManageRecruitment && (
            <Button size="small" onClick={() => setSelectedRequisitionId(item._id)}>
              Candidates
            </Button>
          )}
          {canEditRequisition(item) && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openRequisitionModal(item)}>
              Edit
            </Button>
          )}
          {canEditRequisition(item) && (
            <Popconfirm
              title="Delete requisition?"
              description="This will also remove all candidate records in this requisition."
              onConfirm={() => void handleDeleteRequisition(item._id)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const candidateColumns: ColumnsType<CandidateRecord> = [
    {
      title: 'Candidate',
      key: 'name',
      render: (_, candidate) => (
        <div>
          <Typography.Text strong>{candidate.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{candidate.email}</Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source) => source || 'Direct',
      responsive: ['md'],
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage, candidate) =>
        canManageRecruitment ? (
          <Select
            size="small"
            value={stage}
            style={{ width: 130 }}
            loading={isUpdatingCandidate}
            options={candidateStageOptions.map((value) => ({ value, label: value }))}
            onChange={(value) =>
              void handleCandidateStageChange(selectedRequisition!._id, candidate._id, value)
            }
          />
        ) : (
          <Tag color={stageColor(stage)}>{stage}</Tag>
        ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => (rating ? `${rating}/5` : '-'),
      responsive: ['lg'],
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, candidate) =>
        canManageRecruitment ? (
          <Popconfirm
            title="Remove candidate?"
            onConfirm={() => void handleDeleteCandidate(selectedRequisition!._id, candidate._id)}
            okText="Remove"
            cancelText="Cancel"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recruitment and ATS</h1>
          <p className="text-slate-500">
            Open positions are visible to all employees. Requisition management is available for Admin, HR, Manager, and Team Lead.
          </p>
        </div>
        {canManageRecruitment && (
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => openRequisitionModal()}>
            New Requisition
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Requisitions</Typography.Text>
            <Typography.Title level={3} className="!m-0">
              {summary.totalRequisitions}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Active Roles</Typography.Text>
            <Typography.Title level={3} className="!m-0">
              {summary.activeRequisitions}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Total Openings</Typography.Text>
            <Typography.Title level={3} className="!m-0">
              {summary.totalOpenings}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Typography.Text type="secondary">Total Hired</Typography.Text>
            <Typography.Title level={3} className="!m-0">
              {summary.totalHired}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card className="border border-slate-200 rounded-xl">
        <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Search by title, department, location, manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-md"
          />
          <Button onClick={() => void loadRecruitment()} loading={isLoading}>
            Refresh
          </Button>
        </div>

        <Table<RequisitionRecord>
          rowKey="_id"
          columns={requisitionColumns}
          dataSource={filteredRequisitions}
          loading={isLoading}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          locale={{ emptyText: 'No requisitions created yet.' }}
          scroll={{ x: 1060 }}
        />
      </Card>

      <Drawer
        title={(
          <div className="leading-tight">
            <p className="text-lg font-bold text-slate-900">
              {selectedRequisition?.title || 'Role Details'}
            </p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Requisition Details
            </p>
          </div>
        )}
        width={620}
        open={showRequisitionDrawer}
        onClose={closeRequisitionDrawer}
        destroyOnHidden
        extra={
          !canManageRecruitment && selectedRequisition ? (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={openReferralModal}
              disabled={selectedRequisition.status !== 'Open'}
            >
              Refer Person
            </Button>
          ) : null
        }
      >
        {!selectedRequisition ? (
          <Typography.Text type="secondary">No requisition selected.</Typography.Text>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedRequisition.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedRequisition.department} | {selectedRequisition.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Openings</p>
                  <p className="text-xl font-black text-slate-900">{selectedRequisition.openPositions}</p>
                  <p className="text-xs text-slate-500">of {selectedRequisition.openings}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag color={priorityColor(selectedRequisition.priority)}>{selectedRequisition.priority}</Tag>
                <Tag color={statusColor(selectedRequisition.status)}>{selectedRequisition.status}</Tag>
                <Tag color="geekblue">
                  Budget: {currency(selectedRequisition.salaryRangeMin)} - {currency(selectedRequisition.salaryRangeMax)}
                </Tag>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employment Type</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{selectedRequisition.employmentType || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hiring Manager</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{selectedRequisition.hiringManager || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Created By</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{selectedRequisition.createdByName || 'System'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Candidates</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{selectedRequisition.candidateCount}</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {selectedRequisition.description || 'No role description provided.'}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Must-have Skills</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedRequisition.mustHaveSkills || []).length > 0 ? (
                  selectedRequisition.mustHaveSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <Typography.Text type="secondary">No skills listed.</Typography.Text>
                )}
              </div>
            </section>

            {!canManageRecruitment && selectedRequisition.status !== 'Open' && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                Referrals are accepted only for open requisitions.
              </div>
            )}
          </div>
        )}
      </Drawer>

      {canManageRecruitment && (
        <Card
          className="border border-slate-200 rounded-xl"
          title={selectedRequisition ? `Candidates | ${selectedRequisition.title}` : 'Candidates'}
          extra={
            selectedRequisition ? (
              <Button type="primary" onClick={() => openCandidateModal(selectedRequisition._id)}>
                Add Candidate
              </Button>
            ) : null
          }
        >
          {!selectedRequisition ? (
            <Typography.Text type="secondary">
              Select a requisition from the list to manage candidates.
            </Typography.Text>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {candidateStageOptions.map((stage) => (
                  <Tag key={stage} color={stageColor(stage)}>
                    {stage}: {selectedRequisition.pipeline?.[stage] || 0}
                  </Tag>
                ))}
              </div>
              <Table<CandidateRecord>
                rowKey="_id"
                columns={candidateColumns}
                dataSource={selectedRequisition.candidates || []}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                locale={{ emptyText: 'No candidates added yet.' }}
                scroll={{ x: 860 }}
              />
            </>
          )}
        </Card>
      )}

      <Modal
        title={<Typography.Title level={4}>Refer Candidate</Typography.Title>}
        open={showReferralModal}
        onCancel={closeReferralModal}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={closeReferralModal}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={isSubmittingReferral} onClick={() => referralForm.submit()}>
            Submit Referral
          </Button>,
        ]}
      >
        <Form<ReferralFormValues> layout="vertical" form={referralForm} onFinish={handleSubmitReferral}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Candidate Name" rules={[{ required: true, message: 'Enter candidate name' }]}>
                <Input size="large" placeholder="Candidate full name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Enter email' },
                  { type: 'email', message: 'Enter valid email' },
                ]}
              >
                <Input size="large" placeholder="candidate@email.com" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="phone" label="Phone">
                <Input size="large" placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Referral Notes">
                <Input.TextArea rows={4} placeholder="Add referral context, strengths, and relation..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {canManageRecruitment && (
        <>
          <Modal
            title={<Typography.Title level={4}>{editingRequisitionId ? 'Edit Requisition' : 'Create Requisition'}</Typography.Title>}
            open={showRequisitionModal}
            onCancel={closeRequisitionModal}
            destroyOnHidden
            width={860}
            footer={[
              <Button key="cancel" onClick={closeRequisitionModal}>
                Cancel
              </Button>,
              <Button key="save" type="primary" loading={isCreatingRequisition} onClick={() => requisitionForm.submit()}>
                {editingRequisitionId ? 'Save Changes' : 'Create'}
              </Button>,
            ]}
          >
            <Form<RequisitionFormValues> layout="vertical" form={requisitionForm} onFinish={handleSaveRequisition}>
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="title" label="Role Title" rules={[{ required: true, message: 'Enter role title' }]}>
                    <Input size="large" placeholder="Senior Frontend Engineer" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="department" label="Department" rules={[{ required: true, message: 'Select department' }]}>
                    <Select
                      size="large"
                      options={departmentOptions.map((department) => ({ value: department, label: department }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="location" label="Location" rules={[{ required: true, message: 'Enter location' }]}>
                    <Input size="large" placeholder="Remote / Bengaluru / New York" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="employmentType" label="Employment Type" rules={[{ required: true }]}>
                    <Select
                      size="large"
                      options={employmentTypeOptions.map((type) => ({ value: type, label: type }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="openings" label="Openings" rules={[{ required: true, message: 'Enter openings' }]}>
                    <InputNumber min={1} size="large" className="!w-full" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                    <Select
                      size="large"
                      options={requisitionPriorityOptions.map((priority) => ({ value: priority, label: priority }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="hiringManager" label="Hiring Manager">
                    <Input size="large" placeholder="Manager name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="salaryRangeMin" label="Salary Min">
                    <InputNumber min={0} size="large" className="!w-full" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="salaryRangeMax" label="Salary Max">
                    <InputNumber min={0} size="large" className="!w-full" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="description" label="Role Description">
                    <Input.TextArea rows={4} placeholder="Describe the role..." />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>

          <Modal
            title={<Typography.Title level={4}>Add Candidate</Typography.Title>}
            open={showCandidateModal}
            onCancel={closeCandidateModal}
            destroyOnHidden
            footer={[
              <Button key="cancel" onClick={closeCandidateModal}>
                Cancel
              </Button>,
              <Button key="add" type="primary" loading={isAddingCandidate} onClick={() => candidateForm.submit()}>
                Add Candidate
              </Button>,
            ]}
          >
            <Form<CandidateFormValues> layout="vertical" form={candidateForm} onFinish={handleAddCandidate}>
              <Form.Item name="name" label="Candidate Name" rules={[{ required: true }]}>
                <Input size="large" placeholder="Full name" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true },
                  { type: 'email', message: 'Enter valid email' },
                ]}
              >
                <Input size="large" placeholder="candidate@email.com" />
              </Form.Item>
              <Form.Item name="phone" label="Phone">
                <Input size="large" placeholder="Phone number" />
              </Form.Item>
              <Form.Item name="source" label="Source">
                <Select size="large" options={['Direct', 'LinkedIn', 'Referral', 'Job Portal'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
                <Select size="large" options={candidateStageOptions.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Add notes..." />
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Recruitment;
