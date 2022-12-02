/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * General Doc Data
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_document')
@Index(["cate_no", "area_id"])
@Index(["docu_no", "project_no"])
@Index(["docu_no", "is_use"])
export class EdmsDocument extends BaseEntity {
    @PrimaryGeneratedColumn({})
    docu_no !: number;

    @Index("edms_document_project_no_index")
    @Column({ unique : false })
    project_no !: number;

    @Index("edms_document_cate_index")
    @Column({ unique : false })
    cate_no !: number;

    @Index("edms_document_area_index")
    @Column({ unique : false, default : -1, nullable : false, comment : "FK : EdmsArea->id" })
    area_id !: number;

    @Column({ unique : false, length : 45 })
    docu_code !: string;

    @Column({ unique : false, type : 'char', length : 3, comment : "001 : 설계성과품, " })
    docu_type !: string;

    @Column({ unique : false, length : 255 })
    docu_subject !: string;

    @Column({ unique : false, length : 45 })
    explan !: string;

    @Column({ unique : false, type : 'char', default : "Start", length : 20, comment : "Stage 코드" })
    stage_code !: string;

    @Column({ unique : false, type : 'char', length : 3, comment : "처리코드" })
    process_code !: string;

    @Column({ type: 'datetime', nullable: true })
    plan_submit_dt !: Date;
    
    @Column({ type: 'datetime', nullable: true })
    real_submit_dt !: Date;

    @Column({ unique : false, type : 'char', length : 3 })
    status !: string;

    @Column({ unique : false, type : 'float', nullable : true, default : 0.0 })
    wv_rate !: number;

    @Column({ unique : false, type : 'float', nullable : true, default : 0.0 })
    plan_rate !: number;

    @Column({ unique : false, type : 'float', nullable : true, default : 0.0 })
    actual_rate !: number;

    @Column({ unique : false, default : 0 })
    revision !: number;

    @Column({ type : "bigint", unique : false, default : 0, nullable : false, comment : "VP Flag" })
    is_vp !: number;

    @Column({ type : "bigint", unique : false, default : 0, nullable : false, comment : "주기기(Blanace Of Plant) Flag" })
    is_bop !: number;
}