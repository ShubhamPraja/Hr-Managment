import mongoose from 'mongoose';

export const OrganizationSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    registrationNumber: { type: String, default: '' },
    emailDomain: { type: String, default: '' },
    openPositions: { type: Number, default: 0 },
    leavePolicy: {
      annual: { type: Number, default: 12 },
      sick: { type: Number, default: 6 },
      casual: { type: Number, default: 6 },
      maternity: { type: Number, default: 90 },
    },
    notifications: {
      leaveApprovals: { type: Boolean, default: true },
      payslipGenerated: { type: Boolean, default: true },
      clockInReminder: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const getOrganizationSettingsModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.OrganizationSettings as mongoose.Model<any>) ||
      connection.model('OrganizationSettings', OrganizationSettingsSchema);
  }
  return (mongoose.models.OrganizationSettings as mongoose.Model<any>) ||
    mongoose.model('OrganizationSettings', OrganizationSettingsSchema);
};

const OrganizationSettings = getOrganizationSettingsModel();

export default OrganizationSettings;
