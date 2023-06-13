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
    Column
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_projects')
export class EdmsProjects extends BaseEntity {
    @PrimaryGeneratedColumn({})
    project_no !: number;

    @Column({ unique : false, length : 45 , nullable : true, comment : '프로젝트명'})
    project_name !: string;

    @Column({ unique : false, nullable : false, default : "", comment : "프로젝트코드" })
    code !: string;

    @Column({ type: 'datetime', nullable: true , default : null, comment : '시작일자'})
    start_dt !: Date;

    @Column({ type: 'datetime', nullable: true , default : null, comment : '종료일자'})
    end_dt !: Date;

    @Column({ unique : false, nullable: true , default : null, comment : 'FK : EdmsUser->user_id'})
    creator !: number;
    
    @Column({ type: 'datetime', nullable: true, default : ()=> "CURRENT_TIMESTAMP", comment : '생성일시'})
    create_tm !: Date;
    
    @Column({ unique : false, length : 45 , nullable: true , default : null, comment : '최종수정자명'})
    modify_by !: string;
    
    @Column({ type: 'datetime', nullable: true ,  default : null, comment : '최종수정일시'})
    modify_tm !: Date;
}