
/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * GeneralDocRecvList
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

@Entity('general_doc_recv_list')
export class GeneralDocRecvList extends BaseEntity {
 
    @Column({ unique: false, comment : "일반 문서 아이디" })
    general_doc_id : number;

    @Column({ unique : false, comment : "유저 아이디"})
    user_id : number;

    @Column ({ unique : false, default : 0, comment : "visible flag" })
    visible : number;

    @Column ({ unique : false, default : 0, comment : "readed flag" })
    is_read : number;

    @Column ({ unique : false, default : 0, comment : "refer flag" })
    is_refer : number;
}