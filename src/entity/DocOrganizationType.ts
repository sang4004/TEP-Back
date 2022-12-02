/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * docorganization
 * column : 
    * id : row index By BaseEntity
    * text : organization name
 * function : 
    *
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

@Entity('doc_organization_type')
export class DocOrganizationType extends BaseEntity {
    
    @Column({ unique: false, length: 255, comment : "문서 발수처/접수처 회사 이름" })
    text!: string;

    @Column({ unique : false, length : 10, comment : "문서 번호 기입 텍스트"})
    doc_key : string;

    @Column({ unique : false, comment : "회사 아이디"})
    group_id : number;
}