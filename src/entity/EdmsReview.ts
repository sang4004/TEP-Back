/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * General Doc Data
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_review')
export class EdmsReview extends BaseEntity {
    @PrimaryGeneratedColumn({ comment : "Default no" })
    review_no !: number;

    @Column({ unique : false, nullable : false, default : 0, comment : '도큐먼트 테이블 No'})
    docu_no !: number;

    @Column({ unique : false, nullable : true, comment : '파일 테이블 No'})
    file_no !: number;

    @Column({ unique: false, type : "text", comment : "리뷰 코멘트" })
    content !: string;

    @Column({ unique : false, default : "", comment : "리뷰 답변"})
    reply !: string;

    @Column({ unique : false, default : 0, comment : '리뷰자 user_id'})
    reviewer_id !: number;

}