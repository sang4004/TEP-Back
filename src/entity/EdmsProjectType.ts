/******************************************************************************
 * Edms Project Type
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
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_project_type')
export class EdmsProjectType extends BaseEntity {
    @PrimaryGeneratedColumn({})
    @Index("edms_project_type_project_no")
    project_no !: number;

    @Column({ unique : false, nullable : true , default : null, comment : 'FK : EdmsProjects->project_no'})
    p_project_no !: number;

    @Column({ unique : false, length : 45 , nullable : true, comment : '프로젝트코드'})
    project_code !: string;

    @Column({ unique : false, length : 45 , nullable : true, comment : '프로젝트명'})
    project_name !: string;

    @Column({ unique: false, type : "text", comment : "프로젝트 설명" })
    explan !: string;

    @Column({ unique : false, nullable : true , default : null, comment : '담당PM (users)'})
    PM_idx !: number;

    @Column({ unique : false, length : 100 , default : null, comment : '승인필요여부'})
    is_use_approval !: string;

    @Column({ unique : false, type: "char", length : 3, nullable : true, comment : '상태코드 0-대기 1-진행중 2-완료'})
    state !: string;

    @Column({ type: 'datetime', nullable: true , default : null, comment : '시작일자'})
    start_dt !: Date;

    @Column({ type: 'datetime', nullable: true , default : null, comment : '종료일자'})
    end_dt !: Date;

    @Column({ unique : false, length : 45 , nullable: true , default : null, comment : '생성자명'})
    create_by !: string;
    
    @Column({ type: 'datetime', nullable: true, default : ()=> "CURRENT_TIMESTAMP", comment : '생성일시'})
    create_tm !: Date;
    
    @Column({ unique : false, length : 45 , nullable: true , default : null, comment : '최종수정자명'})
    modify_by !: string;
    
    @Column({ type: 'datetime', nullable: true ,  default : null, comment : '최종수정일시'})
    modify_tm !: Date;

    @Column({ unique : false, length : 255 , default : null, comment : '승인필요여부'})
    partner_company !: string;
}