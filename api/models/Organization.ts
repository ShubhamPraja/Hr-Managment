
import mongoose from 'mongoose';

export const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const getOrganizationModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.Organization as mongoose.Model<any>) || connection.model('Organization', OrganizationSchema);
  }
  return (mongoose.models.Organization as mongoose.Model<any>) || mongoose.model('Organization', OrganizationSchema);
};

const Organization = getOrganizationModel();

export default Organization;
