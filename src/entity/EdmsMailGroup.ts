/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * EDMS Group
 * column :
 * user_id : base id
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "./BaseEntity";

@Entity("edms_mail_group")
export class EdmsMailGroup extends BaseEntity {
    @Column({ unique: false, nullable: false, comment: "edms_group->id" })
    group_id!: number;

    @Column({ unique: false, nullable: false, comment: "edms_user->user_id" })
    user_id!: number;
}