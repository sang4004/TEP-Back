/******************************************************************************
 * Edms Discipline
 * column : 
    * id : unique key
    * name : 분야 이름
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

// Discipline : 건축학에서 사용하며, 공종(공사분야)을 뜻함
@Entity('edms_discipline')
export class EdmsDiscipline extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id !: number;

    @Column({ unique : false, length : 100 , nullable : true, comment : '분야 명'})
    name !: string;

    @Index("edms_discipline_proj_no_index")
    @Column({ unique : false, nullable : false, comment : "FK : EdmsProjectType->project_no"})
    project_no !: number;

    @Column({ unique : false, nullable : false, default : "", comment : "분야 Code"})
    code !: string;

    @Column({ type : "bigint", unique : false, default : 0, nullable : false, comment : "VP Flag" })
    is_vp !: number
}