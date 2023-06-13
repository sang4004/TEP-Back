/******************************************************************************
 * digital signature
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
    ManyToOne,
    OneToMany,
} from 'typeorm';
import { generateToken } from '@/lib/token';
import BaseEntity from "./BaseEntity";

export enum sign_history_type {
    수정 = 0,
    반려 = 1,
    결재 = 2,
    결재취소 = 3,
    전결 = 4
}

@Entity('signcomment')
export class Signcomment extends BaseEntity{
    @Column({unique : false, default : 0, comment : "수정자"})
    user_id : number;

    @Column({unique : false, default : 0, comment : "결재 문서 번호"})
    sign_id : number;

    @Column({ unique: false, length: 255, default : "", comment : "코멘트 텍스트" })
    comment!: string;

    @Column("enum", { enum : sign_history_type , default : 0, comment : "수정 : 0, 반려 : 1, 결재 : 2, 결재취소 : 3, 전결 : 4"})
    type !: sign_history_type;
} 