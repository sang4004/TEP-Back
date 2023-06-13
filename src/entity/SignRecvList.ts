
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

@Entity('sign_recv_list')
export class SignRecvList extends BaseEntity {
 
    @Column({ unique: false, comment : "결재 문서 아이디" })
    sign_id : number;

    @Column({ unique : false, comment : "유저 아이디"})
    user_id : number;

    @Column ({ unique : false, default : false, comment : "visible flag" })
    visible : boolean;

    @Column ({ unique : false, default : false, comment : "접수 가능 여부" })
    is_doc_mng : boolean;

    @Column ({ unique : false, default : 0, comment : "readed flag" })
    is_read : number;

    @Column ({ unique : false, default : 0, comment : "refer flag" })
    is_refer : number;
}