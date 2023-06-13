/******************************************************************************
 * Work Docu
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

@Entity('work_docu')
export class WorkDocu extends Base {
    @PrimaryGeneratedColumn({ comment : "attach document idx" })
    wd_idx !: number;

    @Column({ unique : false, comment : "첨부할 프로세스 ID(work_proc)", nullable: true })
    wp_idx !: number;

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

    @Column({ type: "bigint", unique : false, nullable : false, default : 0, comment : "0 : 완료된 문서, 1 : 미완료 문서 (only tm)" })
    is_complete !: number;
}