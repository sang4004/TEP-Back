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
import BaseEntity from "./BaseEntity";

@Entity('signregister')
export class SignRegister extends BaseEntity{
    @Column({ unique: false, comment : "결재 테이블 아이디"})
    sign_id!: number;

    @Column({ unique : false, comment : "접수 유저 아이디" })
    user_id !: number;
}