import mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'HR', 'Employee'], default: 'Employee' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  avatar: String,
  department: String,
  designation: String,
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
