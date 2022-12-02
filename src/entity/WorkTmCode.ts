/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Edms Work Tm
 * column :
 * id : unique key
 * name : 영역 이름
 *
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "./EdmsBaseEntity";

@Entity("work_tm_code")
export class WorkTmCode extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;

    @Column({ unique : false, nullable : false, default : -1, comment : "FK : EdmsProjectType->project_no" })
    project_no !: number;

    @Column({ unique : false, nullable : false, comment : "FK : EdmsCompany->id"})
    company_id !: number;

    @Column({ unique : false, nullable : false, comment : "TM Code Start"})
    tm_code_start !: string;

    @Column({ unique : false, nullable : false, comment : "TM Code Mid"})
    tm_code_mid !: string;

    @Column({ unique : false, nullable : false, comment : "TM Code Last"})
    tm_code_last !: string;

    @Column({ unique : false, nullable : false, comment : "FK : EdmsUser->user_id ( TM 담당자 유저 아이디 )"})
    tm_user_id !: number;
}
