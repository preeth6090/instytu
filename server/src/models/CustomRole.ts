import mongoose, { Document, Schema } from 'mongoose';

export interface IPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

const defaultPerm = (): IPermissions => ({ view: false, create: false, edit: false, delete: false, export: false });

export interface ICustomRole extends Document {
  name: string;
  institution: mongoose.Types.ObjectId;
  permissions: {
    fees: IPermissions;
    students: IPermissions;
    teachers: IPermissions;
    classes: IPermissions;
    attendance: IPermissions;
    grades: IPermissions;
    homework: IPermissions;
    notices: IPermissions;
    leaves: IPermissions;
    timetable: IPermissions;
    ptm: IPermissions;
    reports: IPermissions;
    settings: IPermissions;
  };
  isActive: boolean;
}

const PermSchema = new Schema({ view: Boolean, create: Boolean, edit: Boolean, delete: Boolean, export: Boolean }, { _id: false });

const CustomRoleSchema = new Schema<ICustomRole>({
  name: { type: String, required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  permissions: {
    fees:       { type: PermSchema, default: defaultPerm },
    students:   { type: PermSchema, default: defaultPerm },
    teachers:   { type: PermSchema, default: defaultPerm },
    classes:    { type: PermSchema, default: defaultPerm },
    attendance: { type: PermSchema, default: defaultPerm },
    grades:     { type: PermSchema, default: defaultPerm },
    homework:   { type: PermSchema, default: defaultPerm },
    notices:    { type: PermSchema, default: defaultPerm },
    leaves:     { type: PermSchema, default: defaultPerm },
    timetable:  { type: PermSchema, default: defaultPerm },
    ptm:        { type: PermSchema, default: defaultPerm },
    reports:    { type: PermSchema, default: defaultPerm },
    settings:   { type: PermSchema, default: defaultPerm },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<ICustomRole>('CustomRole', CustomRoleSchema);
