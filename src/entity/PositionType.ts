/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
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

@Entity('position_type')
export class PositionType extends BaseEntity {

    @Column({ unique: false, length: 100 })
    name!: string;

    @Column({ unique: false, comment : "직급 순서"})
    priority!: number;
   
}