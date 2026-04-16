import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMode = 'cash' | 'cheque' | 'dd' | 'online_transfer' | 'card' | 'cash_deposit' | 'upi' | 'scholarship' | 'concession' | 'fee_reduction';

export interface IInvoiceLineItem {
  description: string;
  amount: number;
  taxable: boolean;
  taxType?: string;
  taxRate?: number;
  taxAmount?: number;
}

export interface IInvoice extends Document {
  invoiceNumber?: string;           // null for concession-only
  student: mongoose.Types.ObjectId;
  institution: mongoose.Types.ObjectId;
  campus?: mongoose.Types.ObjectId;
  feeIds: mongoose.Types.ObjectId[];
  lineItems: IInvoiceLineItem[];
  discounts: { description: string; amount: number }[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paymentMode: PaymentMode;
  chequeNo?: string;
  ddNo?: string;
  bankName?: string;
  transactionRef?: string;
  paymentDate: Date;
  isConcessionOnly: boolean;
  // Frozen snapshot of school at time of generation
  schoolSnapshot: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstn?: string;
    gstPercentage?: number;
    logo?: string;
    headerText?: string;
    footerText?: string;
    terms?: string;
  };
  generatedBy: mongoose.Types.ObjectId;
  isVoid: boolean;
  voidReason?: string;
  academicYear: string;
}

const LineItemSchema = new Schema({ description: String, amount: Number, taxable: Boolean, taxType: String, taxRate: Number, taxAmount: Number }, { _id: false });
const DiscountSchema = new Schema({ description: String, amount: Number }, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { type: String, sparse: true },
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  campus: { type: Schema.Types.ObjectId, ref: 'Campus' },
  feeIds: [{ type: Schema.Types.ObjectId, ref: 'Fee' }],
  lineItems: [LineItemSchema],
  discounts: [DiscountSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash','cheque','dd','online_transfer','card','cash_deposit','upi','scholarship','concession','fee_reduction'], required: true },
  chequeNo: String,
  ddNo: String,
  bankName: String,
  transactionRef: String,
  paymentDate: { type: Date, default: Date.now },
  isConcessionOnly: { type: Boolean, default: false },
  schoolSnapshot: {
    name: String, address: String, phone: String, email: String,
    gstn: String, gstPercentage: Number, logo: String,
    headerText: String, footerText: String, terms: String,
  },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isVoid: { type: Boolean, default: false },
  voidReason: String,
  academicYear: { type: String, default: '2025-26' },
}, { timestamps: true });

InvoiceSchema.index({ institution: 1, invoiceNumber: 1 });
InvoiceSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
