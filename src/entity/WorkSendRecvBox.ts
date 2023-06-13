/******************************************************************************
 * WorkSendRecvBox
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';
import Base from "./EdmsBaseEntity";

@Entity('work_send_recv_box')
export class WorkSendRecvBox extends Base {
    @PrimaryGeneratedColumn({ comment : "송수신함 고유번호" })
    wsr_idx !: number;

    @Column({ unique : false, comment : "work_proc->wp_idx", nullable: true })
    wp_idx : number;

    @Column({ unique : false, comment : "Work Proc Code", nullable : true })
    work_code : string;

    @Column({ unique : false, comment : "보내는유저 ID", nullable : false, default : 0})
    sender !: number;

    @Column({ unique : false, comment : "받는 유저 ID", nullable : false, default : 0})
    recver !: number;

    @Column({ unique : false, comment : "코멘트 수", nullable : false, default : 0})
    comment !: number;

    @Column({ unique : false, comment : "상태 1 : 발송완료, 2: 확인완료", default : 1 })
    state !: number;
}