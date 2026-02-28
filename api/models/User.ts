import mongoose from 'mongoose';

const SalaryBreakupSchema = new mongoose.Schema(
  {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
  },
  { _id: false },
);

export const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'HR', 'Employee'], default: 'Employee' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  avatar: String,
  department: String,
  designation: String,
  phoneCountryCode: { type: String, default: '+1' },
  phoneNumber: String,
  employeeCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
  employeeType: {
    type: String,
    enum: ['Freelancing', 'Part Time', 'Full Time', 'On Contract'],
    default: 'Full Time',
  },
  salaryBreakup: { type: SalaryBreakupSchema, default: () => ({}) },
  status: { type: String, default: 'Active' },
  joinDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const getUserModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.User as mongoose.Model<any>) || connection.model('User', UserSchema);
  }
  return (mongoose.models.User as mongoose.Model<any>) || mongoose.model('User', UserSchema);
};

const User = getUserModel();

export default User;
