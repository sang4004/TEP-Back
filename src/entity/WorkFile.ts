/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work file
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    CreateDateColumn,
    Index
} from 'typeorm';
import Base from "./EdmsBaseEntity";

@Entity('work_file')
export class WorkFile extends Base {
    @PrimaryGeneratedColumn({ comment : "attach filement idx" })
    wf_idx !: number;

    @Column({ unique : false, comment : "첨부할 프로세스 ID(work_proc)", nullable: true })
    wp_idx !: number;

    @Index("work_file_no_index")
    @Column({ unique : false, comment : '파일번호(TB : filements) FK', nullable: true })
    file_no !: number;

    @Column({ unique : false, comment : '문서번호(TB : documents) FK', nullable: true })
    docu_no !: number;

    @Column({ unique : false, length : 20, nullable: true, comment : "등록자명", default : "" })
    create_by !: string;

    @Column({ type: 'datetime', default : ()=> "CURRENT_TIMESTAMP", nullable: true, comment: "등록일시" })
    create_tm !: Date;

    @Column({ unique : false, nullable: true, length : 20, comment : "최종수정자명" })
    modify_by !: string;

    @Column({ type: 'datetime', nullable: true, comment : "최종수정일시" })
    modify_tm : Date;
}