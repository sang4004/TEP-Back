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

@Entity('general_doc_register')
export class GeneralDocRegister extends BaseEntity{
    @Column({ unique: false, comment : "결재 테이블 아이디"})
    general_doc_id !: number;

    @Column({ unique : false, comment : "접수 유저 아이디" })
    user_id !: number;
}