import mongoose from 'mongoose';

export const PayrollRecordSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userName: { type: String, required: true },
    monthKey: { type: String, required: true, index: true }, // YYYY-MM
    monthLabel: { type: String, required: true },
    basic: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: { type: String, enum: ['Processed', 'Pending'], default: 'Pending' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PayrollRecordSchema.index({ organizationId: 1, userId: 1, monthKey: 1 }, { unique: true });

export const getPayrollRecordModel = (connection?: mongoose.Connection) => {
  if (connection) {
    return (connection.models.PayrollRecord as mongoose.Model<any>) ||
      connection.model('PayrollRecord', PayrollRecordSchema);
  }
  return (mongoose.models.PayrollRecord as mongoose.Model<any>) ||
    mongoose.model('PayrollRecord', PayrollRecordSchema);
};

const PayrollRecord = getPayrollRecordModel();

export default PayrollRecord;
