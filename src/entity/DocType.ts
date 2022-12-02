/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * doctype
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

@Entity('doc_type')
export class DocType extends BaseEntity {
 
    @Column({ unique: false, length: 255, comment : "문서 종류 텍스트" })
    text : string;

    @Column({ unique : false, length : 10, comment : "문서 번호 기입 텍스트"})
    doc_key : string;
}