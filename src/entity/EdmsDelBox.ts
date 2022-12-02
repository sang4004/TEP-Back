/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * Edms Del Box
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

@Entity('edms_del_box')
export class EdmsDelBox extends BaseEntity {
    @PrimaryGeneratedColumn({})
    @Index("edms_del_box_no")
    del_no!: number;

    @Column({ unique : false, comment : 'TB : edms_files FK' })
    file_no !: number;

    @Column({ unique : false, comment : 'TB : projects FK' })
    @Index("edms_del_box_project_no_index")
    project_no !: number;

    @Index("edms_del_box_cate_no_index")
    @Column({ unique : false, comment : 'TB : projects FK' })
    cate_no !: number;
    
    @Index("edms_del_box_docu_no_index")
    @Column({ unique : false, comment : '문서번호(TB : documents) FK' })
    docu_no !: number;
    
    @Column({ unique : false, default : 0, comment : '생성한 유저 아이디' })
    user_id !: number;

    @Column({ unique : false, length : 255, comment : 'ROOT 경로'})
    root_path !: string;

    @Column({ unique : false, length : 255, comment : '물리적 위치경로' })
    repo_path !: string;

    @Column({ unique : false, length : 45, comment : '원본 파일코드(채번규칙에 의한 채번)'})
    origin_file_code !: string;

    @Column({ unique : false, length : 45, comment : '파일코드(채번규칙에 의한 채번)'})
    file_code !: string;

    @Column({ unique : false, length : 100, comment : '파일명' })
    file_name !: string;

    @Column({ unique : false, length : 100, comment : '원본 파일명' })
    original_file_name !: string;

    @Column({ unique : false, type: "char", length : 3, comment : '파일의 유형(001:도면, 002:PDF, 003:DOC)' })
    file_type !: string;

    @Column({ unique : false, comment : '파일의 리비젼번호' })
    fversion !: number;
    
    @Column({ unique : false, type: "char", length : 1, comment : '최종파일여부(Y/N)' })
    is_last_version !: string;
    
    @Column({ type: 'datetime', nullable: true , comment : '등록일자(업로드일자)'})
    regi_dt !: Date;

    @Column({ unique : false, length : 45 , comment : '생성자명'})
    create_by !: string;
    
    @Column({ type: 'datetime', nullable: true , comment : '생성일시'})
    create_tm !: Date;
    
    @Column({ unique : false, nullable: true , length : 45 , comment : '최종수정자명'})
    modify_by !: string;
    
    @Column({ type: 'datetime', nullable: true , comment : '최종수정일시'})
    modify_tm !: Date;

    @Column({ unique : false, default : 0, length : 45, comment : "중요도" })
    weight !: string;

    @Column({ unique : false, length : 255, default : "", comment : "변경이력" })
    history !: string;

    @Column({ unique : false, type : 'char', length : 20, comment : "Stage 코드" })
    stage_code !: string;

    @Column({ unique : false, length : 50, comment : "Revision By Stage" })
    revision !: string;
}
