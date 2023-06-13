/******************************************************************************
 * Edms area
 * column : 
    * id : unique key
    * name : 영역 이름
    * 
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

@Entity('edms_area')
@Index(['id', 'project_no'])
export class EdmsArea extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id !: number;

    @Column({ unique : false, length : 100 , nullable : true, comment : '영역 명'})
    name !: string;
    
    @Index("edms_area_proj_no_index")
    @Column({ unique : false, nullable : false, comment : "FK : EdmsProjectType->project_no"})
    project_no !: number;
}