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
import { Index } from 'typeorm';

enum assign_state {
    기안 = 1,
    대기 = 2,
    결재 = 3,
    회신 = 4, // DIN, DRN
    반려 = 5,
    발신 = 6, // TM
    발신완료 = 7, // TM
    접수대기 = 8,
    참조승인대기 = 9,
    회신대기 = 10, // TM
    최종완료 = 11, //TM
    회신하기 = 12, // TM
    회신결재 = 13, // TM
    회신완료 = 14, // TM
    참조 = 15, // TM
    참조수신 = 16,
    참조승인 = 17,
    참조반려 = 18,
    참조접수 = 19,
}

@Entity('work_assign')
@Index(["assign_from_id", "assign_to_id"])
export class WorkAssign extends Base {
    @PrimaryGeneratedColumn({ comment : "할당키" })
    @Index(["work_assign_wa_idx"])
    wa_idx !: number;

    @Column({ unique : false, comment : "docu_proc_idx", nullable: true })
    wp_idx !: number;

    @Column("enum", {enum : assign_state, default : assign_state[0], comment : "기안 = 1, 대기 = 2, 결재 = 3, 회신 = 4, 반려 = 5"})
    assign_state : assign_state;

    @Column({ unique : false, comment : "할당한자 ID", nullable: true })
    assign_from_id !: number;

    @Column({ unique : false, comment : "할당받은자ID", nullable: true })
    assign_to_id !: number;

    @Column({ type: 'datetime', nullable: true, comment : "할당한 일자" })
    assign_date : Date;

    @Column({ type: 'datetime', nullable: true, comment : "이슈종료예정일자" })
    due_to_date : Date;

    @Column({ unique : false, default : 0, comment : "승인절차 여부" })
    is_approval !: boolean;

    @Column({ unique : false, type : "smallint", unsigned : true, nullable : true, comment : "결재 필요시 결재 순서" })
    approval_order !: number;

    @Column({ unique : false, nullable : true, default : 0, comment : "최종승인권자인지 여부" })
    is_last_approve !: boolean;

    @Column({ unique : false, nullable : false, default : 0, comment : "참조자 여부 0 : 수신처or발신처 , 1 : 수신참조처 " })
    is_cc !: number;

    @Column({ unique : false, nullable : true, comment : "반려사유 코멘트", length : 255 })
    comment : string;

    @Column({ unique : false, nullable : true, default : 0, comment : "종료된 DRN인지 여부" })
    is_fin !: number;
}