/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * EdmsOtherFiles.
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
    Index
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_other_files')
@Index(["file_no", "project_no"])
export class EdmsOtherFiles extends BaseEntity {
    @PrimaryGeneratedColumn({})
    @Index("edms_other_files_file_no")
    file_no!: number;

    @Column({ unique : false, comment : 'TB : projects FK' })
    @Index("edms_other_files_project_no")
    project_no !: number;

    @Column({ unique : false, default : 0, comment : '생성한 유저 아이디' })
    user_id !: number;

    @Column({ unique : false, length : 500, comment : '다운로드 URL'})
    root_path !: string;

    @Column({ unique : false, length : 500, comment : '물리적 위치경로' })
    repo_path !: string;

    @Column({ unique : false, length : 255, comment : '파일명' })
    file_name !: string;

    @Column({ unique : false, length : 255, comment : '원본 파일명' })
    original_file_name !: string;

    @Column({ unique : false, type: "char", length : 3, comment : '파일의 유형(001:도면, 002:PDF, 003:DOC)' })
    file_type !: string;
    
    @Column({ unique : false, length : 100, comment : 'file extension' })
    file_ext !: string;

    @Column({ unique : false, length : 45 , comment : '생성자명'})
    create_by !: string;
    
    @Column({ type: 'datetime', nullable: true , comment : '생성일시'})
    create_tm !: Date;
    
    @Column({ unique : false, default : 0, comment : "TR. No." })
    wp_idx !: number;
}
