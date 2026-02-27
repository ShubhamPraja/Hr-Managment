import mongoose from 'mongoose';

export const LeaveRequestSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ['Admin', 'HR', 'Employee'], default: 'Employee' },
    type: { type: String, enum: ['Sick', 'Casual', 'Annual', 'Maternity'], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    actionByUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actionByName: { type: String, default: '' },
    actionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ organizationId: 1, userId: 1, startDate: -1 });

export const getLeaveRequestModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.LeaveRequest as mongoose.Model<any>) ||
      connection.model('LeaveRequest', LeaveRequestSchema);
  }
  return (mongoose.models.LeaveRequest as mongoose.Model<any>) ||
    mongoose.model('LeaveRequest', LeaveRequestSchema);
};

const LeaveRequest = getLeaveRequestModel();

export default LeaveRequest;
