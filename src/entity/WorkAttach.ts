/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Attach
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
} from 'typeorm';
import Base from "./EdmsBaseEntity";

@Entity('work_attach')
export class WorkAttach extends Base {
    @PrimaryGeneratedColumn({ comment : "attach file idx" })
    wat_idx !: number;

    @Column({ unique : false, comment : "첨부할 프로세스 ID(work_proc)", nullable: true })
    wp_idx !: number;

    @Column({ unique : false, comment : "work_review->wr_idx", nullable : true, default : 0})
    wr_idx !: number;

    @Column({ unique : false, length : 300, comment : "첨부파일", nullable: true })
    file_name !: string;

    @Column({ unique : false, length : 200, comment : "파일 위치 경로", nullable: true })
    file_path !: string;

    @Column({ unique : false, length : 200, comment : "물리적 파일 위치 경로", nullable: true })
    repo_path !: string;

    @Column({ unique : false, length : 30, comment : "파일 구분 유일코드(생성해야함)", nullable: true })
    file_id !: string;

    @Column({ unique : false, default : 0, comment : "1 : review, 2: reply" })
    flag : number;
}