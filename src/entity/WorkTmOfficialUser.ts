/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Proc
 * column :
 * id : row index By BaseEntity
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, Index } from "typeorm";
import Base from "./EdmsBaseEntity";

@Entity("work_tm_official_user")
export class WorkTmOfficialUser extends Base {
    @PrimaryGeneratedColumn({ comment: "index_key" })
    wtou_idx!: number;

    @Index("wtou_project_no")
    @Column({ unique: false, comment: "FK : EdmsProjectType->project_no", nullable: false })
    project_no!: number;

    @Column({
        unique: false,
        comment: "0 : From, 1 : To, 2 : CC, 3 : Issued, 4 : Received",
        nullable: false,
        default: 0,
    })
    off_type!: number;

    @Column({ unique: false, comment: "FK : EdmsUser -> user_id ", nullable: false })
    user_id!: number;

    @Column({ unique: false, default: 0, comment: "0: ALL, 1: IFA, 2: AFC, 3 : As-Bult" })
    stage_type_no!: number;

    @Column({ unique: false, default: 0, comment: "0: 한화공문, 1: 신한공문" })
    off_docu_type!: number;
}
