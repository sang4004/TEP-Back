/******************************************************************************
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

@Entity("work_tm_history")
export class WorkTmHistory extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;

    @Column({ unique: false, nullable: false, comment: "FK : EdmsCompany->id" })
    company_id!: number;

    @Column({ unique: false, nullable: false, comment: "FK : WorkProc->wp_idx" })
    wp_idx!: number;

    @Column({ nullable: false, comment: "FK : EmdsFiles -> file_no" })
    file_no!: number;

    @Column({ nullable: false, default: "", comment: "Stage Text" })
    stage_name!: string;

    @Column({ nullable: false, length : 50, default: 0, comment: "Revision Text" })
    revision!: string;

    @Column({ nullable: false, default: 0, comment: "1 : Stage Up, 2: revision Up" })
    status!: number;

    @Column({ nullable: false, comment: "next stage : 1, revisionup : 2, nothing :3" })
    code!: number;

    @Column({ nullable: false, comment: "Result Code 1,2,3,4" })
    review_code!: number;
}
