/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Proc
 * column :
 * id : row index By BaseEntity
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from "typeorm";
import Base from "./EdmsBaseEntity";

@Entity("work_review")
export class WorkReview extends Base {
    @PrimaryGeneratedColumn({ comment: "review_comment_idx" })
    wr_idx!: number;

    @Column({ unique: false, comment: "work_proc id" })
    wp_idx!: number;

    @Column({ unique: false, length: 3, comment: "WOR(TB:work_proc), DOC(work_docu)", nullable: true })
    review_owner!: string;

    @Column({ unique: false, comment: "리뷰주체코드(work_proc 또는 work_docu idx)", nullable: true })
    pwork_code!: number;

    @Column({ unique: false, type: "text", comment: "리뷰내용" })
    contents!: string;

    @Column({ unique: false, nullable : true, type: "text", comment: "답글" })
    reply!: string;

    @Column({ unique: false, comment: "리뷰작성자ID" })
    reviewer_id!: number;

    @Column({ unique: false, type: "datetime", comment: "리뷰작성일자" })
    review_date!: Date;

    @Column({ unique: false, comment: "TB : document FK", nullable: true })
    docu_no!: number;

    @Column({ unique: false, comment: "TB : files FK", nullable: true })
    file_no!: number;

    @Column({ unique: false, comment: "문서의 페이지 번호", nullable: true })
    page_sheet_no!: string;

    @Column({ unique: false, comment: "코드 1,2,3,4", nullable: false })
    code: number;

    @Column({ type: "bigint", unique: false, comment: "Reply 여부, 1 : 답장완료, 0 : 답장가능", nullable: false, default: 0 })
    is_reply!: number;

    @Column({ unique: false, type: "char", length: 1, default: "N", comment: "설계변경 해당유무(Y/N)" })
    is_change_design!: string;

    @Column({ unique: false, default: 0, comment: "부모 work_review wr_idx" })
    p_wr_idx!: number;

    @Column({ unique : false, default : 1, comment : "회차"})
    order !: number;

    @Column({ type:"bigint", unique : false, default : 0, comment : "회신처리된 리뷰일경우 1"})
    is_fin !: number;
    
    @Column({ unique : false, comment : "stage_code", default : ""})
    stage_code !: string
    
    @Column({ unique : false, comment : "revision", default : ""})
    revision !: string;

}
