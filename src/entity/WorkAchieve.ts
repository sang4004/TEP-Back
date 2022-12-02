/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Work Assign
 * column : 
    * id : row index By BaseEntity
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index
} from 'typeorm';
import Base from "./EdmsBaseEntity";


@Entity('work_achieve')
@Index(["wah_idx", "project_no"])
export class WorkAchieve extends Base {
    @PrimaryGeneratedColumn({ comment : "성과물 고유번호" })
    @Index("work_achieve_wah_idx")
    wah_idx !: number;

    @Column({ unique : false, comment : "TM wp_idx", nullable: true })
    tm_wp_idx !: number;

    @Column({ unique : false, comment : "project_no", nullable: true })
    @Index("work_achieve_project_no_index")
    project_no !: number;

    @Column({ unique : false, comment : "cate_no", nullable: true })
    cate_no !: number;

    @Column({ unique : false, comment : "docu_no", nullable: true })
    docu_no !: number;

    @Column({ unique : false, comment : "file_no", nullable: true })
    file_no !: number;

}