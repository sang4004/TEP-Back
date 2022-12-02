/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Proc
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
    Index,
} from 'typeorm';
import Base from "./EdmsBaseEntity";

@Entity('work_mail')
export class WorkMail extends Base {
    @PrimaryGeneratedColumn({ comment : "index_key" })
    wm_idx !: number;

    @Column({ unique : false, comment : "FK : WorkProc->wp_idx", nullable : false })
    wp_idx !: number;

    @Column({ unique : false, comment : "FK : EdmsUser->user_id", nullable : false })
    user_id !: number;
}