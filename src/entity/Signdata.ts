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
    Column,
} from 'typeorm';
import BaseEntity from "./BaseEntity";

enum sign_state {
    요청대기 = 0,
    결재대기 = 1,
    완료 = 2,
    발송완료 = 3,
    반려처리 = 4,
    결재취소 = 5,
    접수 = 6,
    재상신 = 7,
    오프라인접수 = 8,
    오프라인결재중 = 9,
    오프라인발송 = 10
}

@Entity('signdata')
export class Signdata extends BaseEntity {
    @Column({unique : false, default : 0, comment : "문서 번호"})
    document_id : number;

    @Column({ unique : false, comment : "기안자 유저아이디" })
    user_id !: number;

    @Column({ unique : false, comment : "결제 양식 아이디"})
    form_id !: number;

    @Column({ unique : false, comment : "부서 아이디" })
    group_id !: number;

    @Column({ unique : false, comment : "부서문함" })
    department_id !: number;

    @Column({ unique: false, type : "text", comment : "html 에디터" })
    html !: string;

    @Column({ nullable: true, unique: false, type : "text", comment : "html 헤더" })
    html_header !: string;

    @Column({ nullable: true, unique: false, type : "text", comment : "html 푸터" })
    html_footer !: string;

    @Column("enum", { enum : sign_state, default : 0, comment : "요청대기=0, 결재대기 = 1, 완료 = 2, 발송완료 = 3, 반려처리 = 4, 결재취소 = 5, 접수 = 6, 재상신 = 7, 오프라인접수 : 8, 오프라인결재중 : 9, 오프라인발송 : 10"})
    sign_state !: sign_state;

    @Column({ unique : false, default : "", comment : "결재 문서 번호" })
    document_code : string;

    @Column({ unique : false, length : 100, default : "", comment : "결재 문서 제목" })
    title : string;

    @Column({ unique : false, comment : "cop 아이디"})
    cop_id : number;

    @Column({ unique : false, comment : "문서 종류 아이디"})
    doc_type_id : number;

    @Column({ unique : false, comment : "문서 발송처 아이디"})
    doc_org_send_id : number;

    @Column({ unique : false, comment : "문서 수신처 아이디"})
    doc_org_recv_id : number;

    @Column({ unique : false, comment : "프로젝트 코드 아이디"})
    doc_proj_code_id : number;

    @Column({ default : 0, unique : false, comment : "대표이사 후결 플래그"})
    is_ceo_signed !: number;

    @Column({ default : false, unique : false, comment : "접수 문서 플래그"})
    is_regist !: boolean;

    @Column({ default : false, unique : false, comment : "재상신 표시"})
    is_re_request !: boolean;

    @Column({ default : "", unique : false, comment : "수신처 텍스트"})
    doc_recv_text !: string;

    // @Column({ default : "", unique : false, comment : "제목 텍스트"})
    // doc_subject_text !: string;

    @Column({ default : "", unique : false, comment : "참조 텍스트"})
    doc_refer_text !: string;
    
    @Column({ type: 'datetime', nullable: true, comment : "발송일" })
    sended_at!: Date;

    @Column({ type: 'datetime', nullable: true, comment : "접수일" })
    registed_at!: Date;

    @Column({ default : "", unique : false, nullable: true, comment : "이름 / 그룹"})
    doc_sender !: string;

    @Column({ default : "", nullable: true, comment : "작성일"})
    doc_date !: string;

    @Column({ default : "", unique : false, nullable: true, comment : "전화"})
    doc_tel !: string;

    @Column({ default : "", unique : false, nullable: true, comment : "팩스"})
    doc_fax !: string;

    @Column({ default : "", unique : false, nullable: true, comment : "주소"})
    doc_address !: string;

    @Column({ default : "", unique : false, nullable: true, comment : "이메일"})
    doc_email !: string;

    @Column({ default : "", unique : false, nullable: true, comment : ""})
    doc_recv !: string;

    @Column({ default : "", unique : false, nullable: true, comment : ""})
    doc_cc !: string;

    @Column({ default : "", unique : false, nullable: true, comment : ""})
    issue_signature_img !: string;

    @Column({ default : "", unique : false, nullable: true, comment : ""})
    recv_signature_img !: string;
    
    @Column({ default : -1, unique : false, nullable : true, comment : "접수한 결재의 sign id"})
    regist_sign_id !: number;

    @Column({ default : -1, unique : false, nullable : true, comment : "원본 결재 문서"})
    original_sign_id !: number;

    @Column({ default : -1, unique : false, nullable : true, comment : "수신처 회사 아이디"})
    recv_company_id !: number;
    
    @Column({ default : "", unique : false, nullable: true, comment : "접수 직접입력 텍스트"})
    custom_register !: string;

    @Column({ default : "", unique : false, nullable: true, comment : "참조 직접입력 텍스트"})
    custom_referer !: string;

    @Column({ default : 0, unique : false, nullable : false, comment : "document_code year" })
    document_year !: number;
}