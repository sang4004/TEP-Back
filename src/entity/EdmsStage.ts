/******************************************************************************
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

@Entity('edms_stage')
export class EdmsStage extends BaseEntity {
    @PrimaryGeneratedColumn({})
    stage_no !: number;

    @Index("edms_stage_file_no_index")
    @Column({ unique : false, default : 0, comment : "FK : EdmsFiles->file_no" })
    file_no !: number;

    @Index("edms_stage_docu_no_index")
    @Column({ unique : false, comment : "FK : EdmsDocument->docu_no" })
    docu_no !: number;

    @Column({ unique : false, type : 'char', length : 20, comment : "Stage 코드" })
    stage_code !: string;

    @Index("edms_stage_revision_index")
    @Column({ unique : false, default : 1, comment : "리비전 1부터 시작" })
    revision !: number;

    @Column({ type: 'datetime', nullable: true, comment : "제출 계획일" })
    plan_dt !: Date;

    @Column({ type: 'datetime', nullable: true, comment : "제출 예정일" })
    forecast_dt !: Date;
    
    @Column({ type: 'datetime', nullable: true, comment : "실제 제출일" })
    actual_dt !: Date;

    @Column({ type: 'char', length : 1, comment : "i: issue, a: approval"})
    stage_type !: string;

    @Column({ unique : false, type : 'char', length : 3, comment : "001 대기중, 002 진행중, 003 완료" })
    status !: string;

    @Column({ unique : false, default : "", length : 100, comment : "지연 사유" })
    delay_reason !: string;

    @Column({ type: 'datetime', nullable: true, comment : "회신일" })
    reply_dt !: Date;

    @Column({ unique : false, default : "", comment :"승인 결과"})
    approval_result !: string;

    @Column({ unique : false, type: "float", comment : "할증률"})
    actual_rate !: number;
}