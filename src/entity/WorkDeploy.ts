/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Assign
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

@Entity('work_deploy')
export class WorkDeploy extends Base {
    @PrimaryGeneratedColumn({ comment : "할당키" })
    wdp_idx !: number;

    @Column({ unique : false, comment : "docu_proc_idx", nullable: true })
    wp_idx !: number;

    @Column({ unique : false, comment : "할당한자 ID", nullable: true })
    assign_from_id !: number;

    @Column({ unique : false, comment : "할당받은자ID", nullable: true })
    assign_to_id !: number;

    @Column({ type: 'datetime', nullable: true, comment : "읽은 일자" })
    check_date : Date;

    @Column({ unique : false, default : 0, comment : "읽음 여부" })
    is_read !: boolean;

    @Column({ unique : false, length : 3, comment : "DIN, DRN, TM", nullable: true })
    wp_type !: string;
}