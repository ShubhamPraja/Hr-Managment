import mongoose from 'mongoose';

const onboardingStatusOptions = ['Planned', 'In Progress', 'Completed', 'On Hold', 'Cancelled'] as const;

const OnboardingTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    isDone: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true, timestamps: true }
);

export const OnboardingRecordSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    employeeEmail: { type: String, required: true, trim: true, lowercase: true },
    employeeCode: { type: String, default: '', trim: true, uppercase: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, default: '', trim: true },
    managerName: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    expectedEndDate: { type: String, default: '' }, // YYYY-MM-DD
    completedAt: { type: Date, default: null },
    status: { type: String, enum: onboardingStatusOptions, default: 'Planned' },
    notes: { type: String, default: '' },
    checklist: { type: [OnboardingTaskSchema], default: [] },
    startYear: { type: Number, required: true, index: true },
    startMonth: { type: Number, required: true, index: true }, // 1-12
    startMonthKey: { type: String, required: true, index: true }, // YYYY-MM
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

OnboardingRecordSchema.index({ organizationId: 1, startMonthKey: -1, createdAt: -1 });
OnboardingRecordSchema.index({ organizationId: 1, status: 1, startYear: -1, startMonth: -1 });

export const getOnboardingRecordModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.OnboardingRecord as mongoose.Model<any>) ||
      connection.model('OnboardingRecord', OnboardingRecordSchema);
  }
  return (mongoose.models.OnboardingRecord as mongoose.Model<any>) ||
    mongoose.model('OnboardingRecord', OnboardingRecordSchema);
};

const OnboardingRecord = getOnboardingRecordModel();

export default OnboardingRecord;

