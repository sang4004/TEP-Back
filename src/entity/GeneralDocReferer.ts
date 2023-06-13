/******************************************************************************
 * General Doc Referer
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

@Entity('general_doc_referer')
export class GeneralDocReferer extends BaseEntity{
    @Column({ unique: false, comment : "일반문서 아이디"})
    general_doc_id!: number;

    @Column({ unique : false, comment : "참조 유저 아이디" })
    user_id !: number;
}