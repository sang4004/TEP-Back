/******************************************************************************
 * DocRecvList
 * column : 
    * id : row index By BaseEntity
    * text : doc type name
 * function : 
 * 
******************************************************************************/
import {
    Entity,
    Column,
} from 'typeorm';
import BaseEntity from "./BaseEntity";

@Entity('signfile')
export class Signfile extends BaseEntity {
 
    @Column({ unique: false, comment : "결재 문서 아이디" })
    sign_id !: number;

    @Column({ unique: false, comment : "첨부파일 용량" })
    size !: number;

    @Column({ unique : false, type : 'varchar', length : 1024, comment : "첨부 파일 이름"})
    filename !: string;

    @Column({ unique : false, type : 'varchar', length : 1024, comment : "첨부 파일 url"})
    url !: string;
   
}