/******************************************************************************
 * General Doc Data
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
import BaseEntity from "./BaseEntity";

@Entity('general_doc_data')
export class GeneralDocData extends BaseEntity {

    @Column({ unique : false, nullable : true, comment : "일반문서 코드" })
    code_id !: number;

    @Column({comment : "일반문서 번호", default : "" })
    code_no !: string;
    
    @Column({ unique : false, comment : "기안자 유저아이디" })
    user_id !: number;

    @Column({ unique : false, default : 0, comment : "요청대기=0, 결재대기 = 1, 완료 = 2, 발송완료 = 3, 반려처리 = 4, 결재취소 = 5, 접수 = 6, 재상신 = 7" })
    state !: number;

    @Column({ default : "", nullable: true, comment : ""})
    title !: string;

    @Column({ type: 'longtext', nullable: true, comment : ""})
    content !: string;

    @Column({ type: 'datetime', nullable: true, comment : "발송일" })
    sended_at!: Date;

    @Column({ default : "", nullable: true, comment : "발신자"})
    sender !: string;

    @Column({ unique : false, default : 0, comment : "회신필요 여부" })
    reply !: number;

    @Column({ default : false, unique : false, comment : "접수 문서 플래그"})
    is_regist !: boolean;

    @Column({ default : false, unique : false, comment : "재상신 표시"})
    is_re_request !: boolean;

    @Column({ unique : false, nullable: true, comment : "기안자 부서 아이디" })
    group_id !: number;
}