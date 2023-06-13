/******************************************************************************
 * Work Proc
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
    Index,
} from 'typeorm';
import Base from "./EdmsBaseEntity";

enum wp_tm_state {
    기안 = 1,
    내부결재대기 = 2,
    내부결재완료 = 3,
    반려 = 4,
    발신 = 5, 
    발신완료 = 6, 
    접수및배포완료 = 7,
    회신 = 8, 
    회신결재 = 9, 
    회신결재반려 = 10,
    회신결재완료 = 11,
    최종완료 = 12,
    참조처결재대기 = 13,
    참조처결재완료 = 14
}

@Entity('work_proc')
@Index(["wp_idx", "wp_type"])
export class WorkProc extends Base {
    @PrimaryGeneratedColumn({ comment : "index_key" })
    @Index(["work_proc_wp_idx"])
    wp_idx !: number;

    @Column({ unique : false, length : 3, comment : "DIN, DRN, TM", nullable: true })
    wp_type !: string;

    @Column({ type: 'datetime', nullable: true, comment : "적용일자" })
    wp_date : Date;

    @Column({ unique : false, length : 50, comment : "프로세스코드", nullable: true })
    wp_code !: string;

    @Column({ unique : false, comment : "FK : EdmsProjectType->project_no", nullable : false })
    project_no !: number;

    @Column({ unique : false, type : "smallint", unsigned : true, nullable : true, comment : "프로젝트별, 타입별 일련번호 5자리" })
    series_no !: number;

    @Column({ unique : false, length : 6, comment : "작성년월(예:202106)" })
    account_ym !: string;

    @Column({ unique : false, length : 200, nullable : true, comment : "전달명" })
    subject !: string;

    @Column({ unique : false, length : 225, nullable : true, comment : "상세설명" })
    explan !: string;

    @Column({ unique : false, nullable : true, default : null, comment : '요청자 (users)'})
    requester_id !: number;

    @Column({ unique : false, nullable : true, default : null, comment : '승인자 (users)'})
    approver_id !: number;

    @Column({ type: 'datetime', nullable: true, comment : "기한일자" })
    due_date : Date

    @Column({ unique : false, length : 20, nullable: true, comment : "등록자명", default : "" })
    create_by !: string;

    @Column({ type: 'datetime', default : ()=> "CURRENT_TIMESTAMP", nullable: true, comment: "등록일시" })
    create_tm !: Date;

    @Column({ unique : false, nullable: true, length : 20, comment : "최종수정자명" })
    modify_by !: string;

    @Column({ type: 'datetime', nullable: true, comment : "최종수정일시" })
    modify_tm : Date;

    @Column({ unique : false, nullable : false, default : 0, comment : "대기 : 0, 승인 : 1, 반려 : 2"})
    is_approval !: number;

    @Column({ unique : false, nullable : false, default : 0, comment : "Orign Tm Wp_idx, 0 : DIN , -1 : 초기TM, other: 파생된 TM"})
    original_tm_id !: number;

    @Column("enum", {enum : wp_tm_state, default : wp_tm_state[0], comment : "work_proc tm status"})
    tm_state !: number;

    @Column({ unique : false, nullable : false, default : 0, comment : "TM 회차"})
    tm_idx !: number;

    @Column({ unique : false, nullable : true, comment : "EdmsStageType-> id", default : 0 })
    stage_type_id !: number;

    @Column({ unique : false, nullable : true, default : 0, comment : "TR Issue Reason 1-For Ref, 2-For Review, 3-For Info, 4-For Approval, 5-For Con, 6-For Final" })
    for_type !: number;
}