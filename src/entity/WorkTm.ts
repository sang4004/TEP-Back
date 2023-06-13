/******************************************************************************
 * Edms Work Tm
 * column :
 * id : unique key
 * name : 영역 이름
 *
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import BaseEntity from "./EdmsBaseEntity";

@Entity("work_tm")
export class WorkTm extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;
    
    @Index("work_tm_wp_idx_index")
    @Column({ unique : false, nullable : false, comment : "FK : WorkProc->wp_idx"})
    wp_idx !: number;

    @Column({ unique: false, nullable: false, comment: "FK : EdmsProjectType->project_no" })
    project_type_no!: number;

    @Column({ unique : false, nullable : false, comment : "FK : EdmsDiscipline->id" })
    discipline_id !: number;

    @Column({ unique : false, nullable : false, comment : "TM.No "})
    tm_code !: string;

    @Column({ unique : false, nullable : true, comment : "참조처 EdmsCompany->id" })
    cc_company_id !: number;
    
    @Column({ unique : false, nullable : true, comment : "발신처 EdmsCompany->id" })
    send_company_id !: number;

    @Column({ type: 'datetime', nullable: true, comment: "발송일자" })
    sended_tm !: Date;

    @Column({ type: 'datetime', nullable: true, comment: "접수및배포일자" })
    deploy_tm !: Date;
}
