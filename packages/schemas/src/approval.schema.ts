import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Change } from './utils/changes-generate';

export type ApprovalDocument = HydratedDocument<Approval>;

@Schema({ timestamps: true })
export class Approval {
    @Prop({
        required: [true, 'Target model is required'],
        enum: ['User', 'Report', 'Employee', 'Order', 'Client', 'Schedule'],
    })
    target_model:
        | 'User'
        | 'Report'
        | 'Employee'
        | 'Order'
        | 'Client'
        | 'Schedule';

    @Prop({
        required: [true, 'Action is required'],
        enum: ['create', 'update', 'delete'],
    })
    action: 'create' | 'update' | 'delete';

    /*
        The id of the document that is being updated or deleted. Not required for create requests
        Not applicable for create requests
     */
    @Prop({
        refPath: 'target_model',
        required: function () {
            return this.action !== 'create';
        },
        default: null,
        type: mongoose.Schema.Types.ObjectId,
    })
    object_id: mongoose.Types.ObjectId | null;

    /*
        The changes made to the document.
        Not applicable for create and delete requests
        It holds only the fields that were changed with their new values
    */
    @Prop({
        required: function () {
            return this.action === 'update';
        },
        type: [
            {
                field: { type: String, required: true },
                oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
                newValue: { type: mongoose.Schema.Types.Mixed, default: null },
                arrayChanges: {
                    type: {
                        added: {
                            type: [mongoose.Schema.Types.Mixed],
                            default: [],
                        },
                        removed: {
                            type: [mongoose.Schema.Types.Mixed],
                            default: [],
                        },
                    },
                    default: undefined,
                },
            },
        ],
        default: [],
    })
    changes: Change[];

    /*
        The new data of a document to be created.
        Not applicable for update and delete requests
        It holds the entire document as it will be after creation
    */
    @Prop({
        required: function () {
            return this.action === 'create';
        },
        default: null,
        type: Object,
    })
    new_data: Record<string, unknown> | null;

    /*
        The data of the document that was deleted.
        Not applicable for create and update requests
        It holds the entire document as it was before deletion
    */
    @Prop({
        required: function () {
            return this.action === 'delete';
        },
        default: null,
        type: Object,
    })
    deleted_data: Record<string, unknown> | null;

    @Prop({
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    })
    status: 'pending' | 'approved' | 'rejected';

    @Prop({ ref: 'User', required: true })
    req_by: mongoose.Types.ObjectId;

    @Prop({ ref: 'User', default: null, type: mongoose.Schema.Types.ObjectId })
    rev_by: mongoose.Types.ObjectId | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const ApprovalSchema = SchemaFactory.createForClass(Approval);
