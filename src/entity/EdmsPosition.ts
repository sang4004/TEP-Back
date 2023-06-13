/******************************************************************************
 * EDMS Position
 * 직급 테이블
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

@Entity('edms_position')
export class EdmsPosition extends BaseEntity {
    @Column({ unique : false, default : "", nullable : true, comment : "직급 이름"})
    position_name !: string;

    @Column({ unique : false, default : 0, nullable : false, comment : "FK : EdmsCompany->id" })
    company_id !: number;

    @Column({ unique : false, default : 0, nullable : false, comment : "FK : EdmsGroup->id" })
    group_id !: number;

    @Column({ unique: false, comment : "직급 순서 높을수록 높은직급을 의미"})
    priority!: number;
}