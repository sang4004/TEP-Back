/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * General Doc Data
 * column :
 * id : row index By BaseEntity
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "./EdmsBaseEntity";

@Entity("edms_stage_type")
export class EdmsStageType extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;

    @Column({ unique: false, default: "", length: 45, comment: "스테이지 명" })
    stage_name!: string;

    @Column({ unique: false, default: false, comment: "issue/approval 나눠지는지 여부" })
    is_type!: boolean;
}
