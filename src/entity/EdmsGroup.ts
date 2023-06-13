/******************************************************************************
 * EDMS Group
 * column : 
    * user_id : base id
 * function : 
    *
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column
} from 'typeorm';
import BaseEntity from "./BaseEntity";

@Entity('edms_group')
export class EdmsGroup extends BaseEntity {
    @Column({ unique : false, default : "", nullable : true, comment : "그룹 이름"})
    group_name !: string;

    @Column({ unique : false, default : 0, nullable : false, comment : "회사 아이디 company_id" })
    company_id !: number;

    @Column({ unique : false, nullable : false, default : 0, comment : "이메일 그룹이라면 1 아니라면 0" })
    is_mail_group !: number;
}