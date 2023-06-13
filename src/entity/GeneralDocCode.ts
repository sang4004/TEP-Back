/******************************************************************************
 * general_doc_code
 * column : 
    * id : row index By BaseEntity
    * text : doc type name
 * function : 
    * findByName
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    CreateDateColumn,
} from 'typeorm';
import { generateToken } from '@/lib/token';
import BaseEntity from "./BaseEntity";

@Entity('general_doc_code')
export class GeneralDocCode extends BaseEntity {
 
    @Column({ nullable : true , unique: false, length: 100, comment : "일반문서 코드" })
    code !: string;

    @Column({ nullable : true , unique : false, length : 255, comment : "일반문서 타입 타이틀"})
    text !: string;

    @Column({ nullable : true , unique : false, comment : "일반문서 기본 양식 파일 아이디"})
    file_id !: number;

    @Column({ default : 0 , unique : false, comment : "일반문서 코드 정렬"})
    order !: number;
}