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

@Entity('signreferer')
export class SignReferer extends BaseEntity{
    @Column({ unique: false, comment : "결재 테이블 아이디"})
    sign_id!: number;

    @Column({ unique : false, comment : "참조 유저 아이디" })
    user_id !: number;

    @Column({ unique : false, default : 0, comment : "외부참조 여부" })
    is_out_refer !: number;
}