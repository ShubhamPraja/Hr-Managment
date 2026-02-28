import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { getRecruitmentRequisitionModel } from '../models/RecruitmentRequisition';
import { resolveTenantOrFail, toNumber } from './shared';

const requisitionStatuses = ['Draft', 'Open', 'On Hold', 'Closed'] as const;
const requisitionPriorities = ['Low', 'Medium', 'High', 'Critical'] as const;
const employmentTypes = ['Full Time', 'Part Time', 'Contract', 'Internship'] as const;
const candidateStages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const;

const toCleanString = (value: unknown) => String(value || '').trim();

const isRecruitmentManager = (role: string) => {
  const cleanRole = toCleanString(role).toLowerCase();
  return cleanRole === 'admin'
    || cleanRole === 'hr'
    || cleanRole === 'manager'
    || cleanRole === 'team lead'
    || cleanRole === 'teamlead';
};

const normalizeSkills = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => toCleanString(item))
      .filter(Boolean);
  }

  const plain = toCleanString(value);
  if (!plain) return [];

  return plain
    .split(',')
    .map((item) => toCleanString(item))
    .filter(Boolean);
};

const normalizeStatus = (value: unknown) => {
  const clean = toCleanString(value);
  return requisitionStatuses.includes(clean as any) ? clean : '';
};

const normalizePriority = (value: unknown) => {
  const clean = toCleanString(value);
  return requisitionPriorities.includes(clean as any) ? clean : '';
};

const normalizeEmploymentType = (value: unknown) => {
  const clean = toCleanString(value);
  return employmentTypes.includes(clean as any) ? clean : '';
};

const normalizeCandidateStage = (value: unknown) => {
  const clean = toCleanString(value);
  return candidateStages.includes(clean as any) ? clean : '';
};

const buildPipeline = (candidates: any[]) => {
  const pipeline = {
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
  };

  candidates.forEach((candidate) => {
    const stage = normalizeCandidateStage(candidate?.stage) || 'Applied';
    pipeline[stage as keyof typeof pipeline] += 1;
  });

  return pipeline;
};

const sanitizeCandidate = (candidate: any) => ({
  _id: candidate?._id,
  name: candidate?.name || '',
  email: candidate?.email || '',
  phone: candidate?.phone || '',
  source: candidate?.source || 'Direct',
  stage: normalizeCandidateStage(candidate?.stage) || 'Applied',
  rating: typeof candidate?.rating === 'number' ? candidate.rating : null,
  notes: candidate?.notes || '',
  createdByUserId: candidate?.createdByUserId || null,
  createdByName: candidate?.createdByName || '',
  createdAt: candidate?.createdAt || null,
  updatedAt: candidate?.updatedAt || null,
});

const sanitizeRequisition = (requisition: any) => {
  const candidates = Array.isArray(requisition?.candidates)
    ? requisition.candidates.map(sanitizeCandidate)
    : [];
  const hiredCount = candidates.filter((candidate) => candidate.stage === 'Hired').length;
  const pipeline = buildPipeline(candidates);
  const openings = Math.max(1, Number(requisition?.openings || 1));

  return {
    _id: requisition?._id,
    organizationId: requisition?.organizationId,
    title: requisition?.title || '',
    department: requisition?.department || '',
    location: requisition?.location || '',
    employmentType: normalizeEmploymentType(requisition?.employmentType) || 'Full Time',
    openings,
    status: normalizeStatus(requisition?.status) || 'Open',
    priority: normalizePriority(requisition?.priority) || 'Medium',
    description: requisition?.description || '',
    hiringManager: requisition?.hiringManager || '',
    mustHaveSkills: Array.isArray(requisition?.mustHaveSkills)
      ? requisition.mustHaveSkills.filter(Boolean)
      : [],
    salaryRangeMin: Math.max(0, Number(requisition?.salaryRangeMin || 0)),
    salaryRangeMax: Math.max(0, Number(requisition?.salaryRangeMax || 0)),
    createdByUserId: requisition?.createdByUserId || null,
    createdByName: requisition?.createdByName || '',
    createdAt: requisition?.createdAt || null,
    updatedAt: requisition?.updatedAt || null,
    candidates,
    candidateCount: candidates.length,
    hiredCount,
    openPositions: Math.max(0, openings - hiredCount),
    pipeline,
  };
};

const guardRecruitmentAccess = (role: string, res: Response) => {
  if (!isRecruitmentManager(role)) {
    res.status(403).json({ message: 'Only Admin, HR, Manager, and Team Lead can manage recruitment' });
    return false;
  }

  return true;
};

export const getRecruitment = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const role = toCleanString(req.query.role || 'Employee');
  const canManageRecruitment = isRecruitmentManager(role);

  const { organizationId, tenantScope } = scope;
  const status = normalizeStatus(req.query.status);
  const search = toCleanString(req.query.search).toLowerCase();

  const query: Record<string, unknown> = { organizationId };
  if (canManageRecruitment) {
    if (status) query.status = status;
  } else {
    // Non-managers can only view active openings.
    query.status = 'Open';
  }

  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  let requisitions = await (RecruitmentRequisition as any).find(query).sort({ createdAt: -1 });
  if (search) {
    requisitions = requisitions.filter((item: any) => {
      return (
        String(item.title || '').toLowerCase().includes(search) ||
        String(item.department || '').toLowerCase().includes(search) ||
        String(item.location || '').toLowerCase().includes(search) ||
        String(item.hiringManager || '').toLowerCase().includes(search) ||
        String(item.createdByName || '').toLowerCase().includes(search)
      );
    });
  }

  const data = requisitions.map(sanitizeRequisition);
  const summary = {
    totalRequisitions: data.length,
    activeRequisitions: data.filter((item) => item.status === 'Open').length,
    totalOpenings: data.reduce((sum, item) => sum + item.openings, 0),
    totalCandidates: data.reduce((sum, item) => sum + item.candidateCount, 0),
    totalHired: data.reduce((sum, item) => sum + item.hiredCount, 0),
  };

  res.status(200).json({ requisitions: data, summary });
};

export const createRecruitment = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const role = toCleanString((req.body || {}).creatorRole || 'Employee');
  if (!guardRecruitmentAccess(role, res)) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const title = toCleanString(body.title);
  const department = toCleanString(body.department);
  const location = toCleanString(body.location);
  const openings = Math.max(1, Math.floor(toNumber(body.openings, 1)));
  const creatorUserId = toCleanString(body.creatorUserId);
  const creatorName = toCleanString(body.creatorName);

  if (!title || !department || !location || !creatorUserId || !creatorName) {
    res.status(400).json({
      message: 'title, department, location, creatorUserId, and creatorName are required',
    });
    return;
  }

  if (!Types.ObjectId.isValid(creatorUserId)) {
    res.status(400).json({ message: 'Valid creatorUserId is required' });
    return;
  }

  const employmentType = normalizeEmploymentType(body.employmentType) || 'Full Time';
  const status = normalizeStatus(body.status) || 'Open';
  const priority = normalizePriority(body.priority) || 'Medium';
  const mustHaveSkills = normalizeSkills(body.mustHaveSkills);
  const salaryRangeMin = Math.max(0, toNumber(body.salaryRangeMin, 0));
  const salaryRangeMax = Math.max(0, toNumber(body.salaryRangeMax, 0));

  if (salaryRangeMax > 0 && salaryRangeMax < salaryRangeMin) {
    res.status(400).json({ message: 'salaryRangeMax cannot be lower than salaryRangeMin' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const created = await (RecruitmentRequisition as any).create({
    organizationId,
    title,
    department,
    location,
    employmentType,
    openings,
    status,
    priority,
    description: toCleanString(body.description),
    hiringManager: toCleanString(body.hiringManager),
    mustHaveSkills,
    salaryRangeMin,
    salaryRangeMax,
    createdByUserId: creatorUserId,
    createdByName: creatorName,
    candidates: [],
  });

  res.status(201).json({
    requisition: sanitizeRequisition(created),
    message: 'Requisition created successfully',
  });
};

export const updateRecruitment = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requisitionId = toCleanString(req.params.requisitionId);
  if (!requisitionId || !Types.ObjectId.isValid(requisitionId)) {
    res.status(400).json({ message: 'Valid requisition id is required' });
    return;
  }

  const role = toCleanString((req.body || {}).actorRole || (req.body || {}).creatorRole || 'Employee');
  if (!guardRecruitmentAccess(role, res)) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const actorUserId = toCleanString(body.actorUserId || body.creatorUserId);
  if (!actorUserId || !Types.ObjectId.isValid(actorUserId)) {
    res.status(400).json({ message: 'Valid actorUserId is required' });
    return;
  }
  const updatePayload: Record<string, unknown> = {};

  if (typeof body.title === 'string') updatePayload.title = toCleanString(body.title);
  if (typeof body.department === 'string') updatePayload.department = toCleanString(body.department);
  if (typeof body.location === 'string') updatePayload.location = toCleanString(body.location);
  if (typeof body.description === 'string') updatePayload.description = toCleanString(body.description);
  if (typeof body.hiringManager === 'string') updatePayload.hiringManager = toCleanString(body.hiringManager);
  if (body.mustHaveSkills !== undefined) updatePayload.mustHaveSkills = normalizeSkills(body.mustHaveSkills);

  if (body.openings !== undefined) {
    updatePayload.openings = Math.max(1, Math.floor(toNumber(body.openings, 1)));
  }

  const status = normalizeStatus(body.status);
  if (status) updatePayload.status = status;

  const priority = normalizePriority(body.priority);
  if (priority) updatePayload.priority = priority;

  const employmentType = normalizeEmploymentType(body.employmentType);
  if (employmentType) updatePayload.employmentType = employmentType;

  if (body.salaryRangeMin !== undefined) {
    updatePayload.salaryRangeMin = Math.max(0, toNumber(body.salaryRangeMin, 0));
  }
  if (body.salaryRangeMax !== undefined) {
    updatePayload.salaryRangeMax = Math.max(0, toNumber(body.salaryRangeMax, 0));
  }

  const effectiveMin = Number(updatePayload.salaryRangeMin ?? body.salaryRangeMin ?? 0);
  const effectiveMax = Number(updatePayload.salaryRangeMax ?? body.salaryRangeMax ?? 0);
  if (effectiveMax > 0 && effectiveMax < effectiveMin) {
    res.status(400).json({ message: 'salaryRangeMax cannot be lower than salaryRangeMin' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const existing = await (RecruitmentRequisition as any)
    .findOne({ _id: requisitionId, organizationId })
    .select('createdByUserId');

  if (!existing) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  if (String(existing.createdByUserId || '') !== actorUserId) {
    res.status(403).json({ message: 'Only requisition creator can update this record' });
    return;
  }

  const updated = await (RecruitmentRequisition as any).findOneAndUpdate(
    { _id: requisitionId, organizationId },
    { $set: updatePayload },
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  res.status(200).json({
    requisition: sanitizeRequisition(updated),
    message: 'Requisition updated successfully',
  });
};

export const deleteRecruitment = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requisitionId = toCleanString(req.params.requisitionId);
  if (!requisitionId || !Types.ObjectId.isValid(requisitionId)) {
    res.status(400).json({ message: 'Valid requisition id is required' });
    return;
  }

  const role = toCleanString(req.query.actorRole || (req.body || {}).actorRole || 'Employee');
  if (!guardRecruitmentAccess(role, res)) return;
  const actorUserId = toCleanString(req.query.actorUserId || (req.body || {}).actorUserId);
  if (!actorUserId || !Types.ObjectId.isValid(actorUserId)) {
    res.status(400).json({ message: 'Valid actorUserId is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const existing = await (RecruitmentRequisition as any)
    .findOne({ _id: requisitionId, organizationId })
    .select('createdByUserId');

  if (!existing) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  if (String(existing.createdByUserId || '') !== actorUserId) {
    res.status(403).json({ message: 'Only requisition creator can delete this record' });
    return;
  }

  const deleted = await (RecruitmentRequisition as any).findOneAndDelete({
    _id: requisitionId,
    organizationId,
  });

  if (!deleted) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  res.status(200).json({ message: 'Requisition deleted successfully' });
};

export const addRecruitmentCandidate = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requisitionId = toCleanString(req.params.requisitionId);
  if (!requisitionId || !Types.ObjectId.isValid(requisitionId)) {
    res.status(400).json({ message: 'Valid requisition id is required' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const role = toCleanString(body.actorRole || body.creatorRole || 'Employee');
  const canManageRecruitment = isRecruitmentManager(role);

  const name = toCleanString(body.name);
  const email = toCleanString(body.email).toLowerCase();
  const creatorUserId = toCleanString(body.creatorUserId);
  const creatorName = toCleanString(body.creatorName);

  if (!name || !email || !creatorUserId || !creatorName) {
    res.status(400).json({ message: 'name, email, creatorUserId, and creatorName are required' });
    return;
  }

  if (!Types.ObjectId.isValid(creatorUserId)) {
    res.status(400).json({ message: 'Valid creatorUserId is required' });
    return;
  }

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const requisition = await (RecruitmentRequisition as any).findOne({
    _id: requisitionId,
    organizationId,
  });

  if (!requisition) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  if (String(requisition.status || '') === 'Closed') {
    res.status(400).json({ message: 'Cannot add candidates to a closed requisition' });
    return;
  }
  if (!canManageRecruitment && String(requisition.status || '') !== 'Open') {
    res.status(403).json({ message: 'Referrals are allowed for open requisitions only' });
    return;
  }

  const duplicate = Array.isArray(requisition.candidates)
    ? requisition.candidates.some((item: any) => String(item.email || '').toLowerCase() === email)
    : false;
  if (duplicate) {
    res.status(409).json({ message: 'Candidate with this email already exists in the requisition' });
    return;
  }

  requisition.candidates.push({
    name,
    email,
    phone: toCleanString(body.phone),
    source: canManageRecruitment ? (toCleanString(body.source) || 'Direct') : 'Referral',
    stage: canManageRecruitment ? (normalizeCandidateStage(body.stage) || 'Applied') : 'Applied',
    rating: canManageRecruitment && body.rating !== undefined && body.rating !== null ? toNumber(body.rating, 0) : null,
    notes: toCleanString(body.notes),
    createdByUserId: creatorUserId,
    createdByName: creatorName,
  });

  await requisition.save();

  res.status(201).json({
    requisition: sanitizeRequisition(requisition),
    message: canManageRecruitment ? 'Candidate added successfully' : 'Referral submitted successfully',
  });
};

export const updateRecruitmentCandidate = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requisitionId = toCleanString(req.params.requisitionId);
  const candidateId = toCleanString(req.params.candidateId);

  if (!requisitionId || !Types.ObjectId.isValid(requisitionId)) {
    res.status(400).json({ message: 'Valid requisition id is required' });
    return;
  }
  if (!candidateId || !Types.ObjectId.isValid(candidateId)) {
    res.status(400).json({ message: 'Valid candidate id is required' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const role = toCleanString(body.actorRole || body.creatorRole || 'Employee');
  if (!guardRecruitmentAccess(role, res)) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const requisition = await (RecruitmentRequisition as any).findOne({
    _id: requisitionId,
    organizationId,
  });
  if (!requisition) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  const candidate = requisition.candidates?.id(candidateId);
  if (!candidate) {
    res.status(404).json({ message: 'Candidate not found' });
    return;
  }

  const nextStage = normalizeCandidateStage(body.stage);
  if (nextStage && nextStage === 'Hired' && String(candidate.stage || '') !== 'Hired') {
    const hiredCount = requisition.candidates.filter((item: any) => String(item.stage || '') === 'Hired').length;
    if (hiredCount >= Number(requisition.openings || 1)) {
      res.status(400).json({ message: 'Openings already filled for this requisition' });
      return;
    }
  }

  if (typeof body.name === 'string') candidate.name = toCleanString(body.name);
  if (typeof body.email === 'string') candidate.email = toCleanString(body.email).toLowerCase();
  if (typeof body.phone === 'string') candidate.phone = toCleanString(body.phone);
  if (typeof body.source === 'string') candidate.source = toCleanString(body.source);
  if (nextStage) candidate.stage = nextStage;
  if (typeof body.notes === 'string') candidate.notes = toCleanString(body.notes);

  if (body.rating === null || body.rating === '') {
    candidate.rating = null;
  } else if (body.rating !== undefined) {
    const rating = Math.max(1, Math.min(5, Math.round(toNumber(body.rating, 0))));
    if (rating > 0) candidate.rating = rating;
  }

  await requisition.save();

  res.status(200).json({
    requisition: sanitizeRequisition(requisition),
    message: 'Candidate updated successfully',
  });
};

export const deleteRecruitmentCandidate = async (req: Request, res: Response) => {
  const scope = await resolveTenantOrFail(req, res);
  if (!scope) return;

  const requisitionId = toCleanString(req.params.requisitionId);
  const candidateId = toCleanString(req.params.candidateId);

  if (!requisitionId || !Types.ObjectId.isValid(requisitionId)) {
    res.status(400).json({ message: 'Valid requisition id is required' });
    return;
  }
  if (!candidateId || !Types.ObjectId.isValid(candidateId)) {
    res.status(400).json({ message: 'Valid candidate id is required' });
    return;
  }

  const role = toCleanString(req.query.actorRole || (req.body || {}).actorRole || 'Employee');
  if (!guardRecruitmentAccess(role, res)) return;

  const { organizationId, tenantScope } = scope;
  const { tenantConnection } = tenantScope;
  const RecruitmentRequisition = getRecruitmentRequisitionModel(tenantConnection);

  const requisition = await (RecruitmentRequisition as any).findOne({
    _id: requisitionId,
    organizationId,
  });
  if (!requisition) {
    res.status(404).json({ message: 'Requisition not found' });
    return;
  }

  const candidate = requisition.candidates?.id(candidateId);
  if (!candidate) {
    res.status(404).json({ message: 'Candidate not found' });
    return;
  }

  candidate.deleteOne();
  await requisition.save();

  res.status(200).json({
    requisition: sanitizeRequisition(requisition),
    message: 'Candidate removed successfully',
  });
};
