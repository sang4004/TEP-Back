/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
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
} from 'typeorm';
import { generateToken } from '@/lib/token';
import BaseEntity from "./BaseEntity";

@Entity('doc_proj_code_type')
export class DocProjCodeType extends BaseEntity {
    
    @Column({ unique: false, length: 255, comment : "문서 프로젝트 코드 텍스트" })
    text!: string;

    @Column({ unique : false, length : 10, comment : "문서 번호 기입 텍스트"})
    doc_key : string;
}