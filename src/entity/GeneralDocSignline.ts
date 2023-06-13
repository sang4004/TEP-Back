/******************************************************************************
 * digital signature
 * column : 
    * id : row index By BaseEntity
 * function : 
    * findByName
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

enum sign_state {
    기안 = 1,
    대기 = 2,
    결재 = 3,
    반려 = 4,
    결재취소 = 5,
    전결 = 6,
    전결처리 = 7,
    후결대기 = 8,
    후결처리 = 9,
}

@Entity('general_doc_signline')
export class GeneralDocSignline extends BaseEntity {
    @Column({ unique: false, comment : "일반문서 아이디"})
    general_doc_id!: number;

    @Column({ unique : false, comment : "결재할 유저 아이디" })
    user_id !: number;
    
    @Column("enum", {enum : sign_state, default : sign_state[0], comment : "기안 = 1, 대기 = 2, 결재 = 3, 반려 = 4, 결재취소 = 5, 전결 = 6, 전결 처리 = 7, 후결 대기 = 8, 후결 처리 = 9"})
    state : sign_state;

    @Column({ type: 'datetime', nullable: true, comment : "결재 시간" })
    approval_at!: Date;

    @Column({ unique : false, default : 0, comment : "결재 라인 순서 ( 0 = 기안 )" })
    order!: number;
}