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

enum select_num_id_rule {
    공용문서채번 = 1,
    통영에코파워=2,
    신한 = 3,
    휴먼텍본사 = 4,
    휴먼텍현장 = 5,
    신한현장 = 6,
    와이제이이앤씨본사 = 7,
    와이제이이앤씨현장 = 8
}

@Entity('signform')
export class Signform extends BaseEntity {
    @Column({ unique: false, length: 255, comment : "결재 양식 제목" })
    title!: string;

    @Column({ unique: false, length: 100, comment : "결재 양식 타입" })
    form!: string;

    @Column({ unique: false, type : "text", comment : "결재 직인 클래스" })
    form_key!: string;

    @Column({ unique: false, type : "text", comment : "html 로 문서 전달시 사용" })
    html !: string;

    @Column({ unique : false, default : 0, comment : "회사 아이디" })
    group_id !: number;

    @Column({ unique : false, default : 0, comment : "부서 아이디" })
    org_id !: number;

    @Column("enum", { enum : select_num_id_rule, default : 1, comment : "공용문서채번 = 1 통영에코파워=2 신한 = 3 휴먼텍본사 = 4 휴먼텍현장 = 5"})
    select_num_id !: select_num_id_rule;

    @Column({ unique : false, comment : "COP 아이디" })
    cop_type_id !: number;
    
    @Column({ unique : false, comment : "문서 타입 아이디" })
    doc_type_id !: number;

    @Column({ unique : false, comment : "문서 소속 회사 아이디" })
    doc_org_id !: number;

    @Column({ unique : false, comment : "프로젝트 아이디" })
    doc_proj_id !: number;

    @Column({ unique : false, type : "text", comment : "양식 헤더"})
    header !: string;

    @Column({ unique : false, type : "text", comment : "양식 푸터"})
    footer !: string;

    @Column({ unique : false, comment : "양식 순서" })
    form_order !: number;

}