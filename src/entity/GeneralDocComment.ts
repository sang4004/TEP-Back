/******************************************************************************
 * digital signature
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    Column,
} from 'typeorm';
import BaseEntity from "./BaseEntity";

export enum general_doc_history_state {
    수정 = 0,
    반려 = 1,
    결재 = 2,
    결재취소 = 3,
    전결 = 4
}

@Entity('general_doc_comment')
export class GeneralDocComment extends BaseEntity{
    @Column({unique : false, default : 0, comment : "수정자"})
    user_id : number;

    @Column({unique : false, default : 0, comment : "결재 일반 문서 번호"})
    general_doc_id : number;

    @Column({ unique: false, length: 255, default : "", comment : "코멘트 텍스트" })
    comment!: string;

    @Column("enum", { enum : general_doc_history_state , default : 0, comment : "수정 : 0, 반려 : 1, 결재 : 2, 결재취소 : 3, 전결 : 4"})
    type !: general_doc_history_state;
} 