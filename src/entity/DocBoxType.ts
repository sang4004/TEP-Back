/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * employee
 * column : 
    * id : row index By BaseEntity
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

@Entity('doc_box_type')
export class DocBoxType extends BaseEntity {
    @Column({ unique: false, length: 255, comment : "문서함 이름" })
    name!: string;
}