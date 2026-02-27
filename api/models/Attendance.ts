import mongoose from 'mongoose';

export const AttendanceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD (local server date)
    punchInAt: { type: Date, required: true },
    punchOutAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ['Present', 'WFH', 'Leave'], default: 'Present' },
  },
  { timestamps: true }
);

AttendanceSchema.index({ organizationId: 1, userId: 1, dateKey: 1 }, { unique: true });

export const getAttendanceModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.Attendance as mongoose.Model<any>) || connection.model('Attendance', AttendanceSchema);
  }
  return (mongoose.models.Attendance as mongoose.Model<any>) || mongoose.model('Attendance', AttendanceSchema);
};

const Attendance = getAttendanceModel();

export default Attendance;
