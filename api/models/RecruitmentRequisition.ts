import mongoose from 'mongoose';

const candidateStageOptions = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const;
const requisitionStatusOptions = ['Draft', 'Open', 'On Hold', 'Closed'] as const;
const priorityOptions = ['Low', 'Medium', 'High', 'Critical'] as const;
const employmentTypeOptions = ['Full Time', 'Part Time', 'Contract', 'Internship'] as const;

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    source: { type: String, default: 'Direct' },
    stage: { type: String, enum: candidateStageOptions, default: 'Applied' },
    rating: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, default: '' },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

export const RecruitmentRequisitionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    employmentType: { type: String, enum: employmentTypeOptions, default: 'Full Time' },
    openings: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: requisitionStatusOptions, default: 'Open' },
    priority: { type: String, enum: priorityOptions, default: 'Medium' },
    description: { type: String, default: '' },
    hiringManager: { type: String, default: '' },
    mustHaveSkills: { type: [String], default: [] },
    salaryRangeMin: { type: Number, min: 0, default: 0 },
    salaryRangeMax: { type: Number, min: 0, default: 0 },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByName: { type: String, required: true },
    candidates: { type: [CandidateSchema], default: [] },
  },
  { timestamps: true }
);

RecruitmentRequisitionSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
RecruitmentRequisitionSchema.index({ organizationId: 1, department: 1, createdAt: -1 });

export const getRecruitmentRequisitionModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.RecruitmentRequisition as mongoose.Model<any>) ||
      connection.model('RecruitmentRequisition', RecruitmentRequisitionSchema);
  }

  return (mongoose.models.RecruitmentRequisition as mongoose.Model<any>) ||
    mongoose.model('RecruitmentRequisition', RecruitmentRequisitionSchema);
};

const RecruitmentRequisition = getRecruitmentRequisitionModel();

export default RecruitmentRequisition;

