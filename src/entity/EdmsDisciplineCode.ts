/******************************************************************************
 * Edms Discipline Code
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
@Entity('edms_discipline_code')
export class EdmsDisciplineCode extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id !: number;

    @Column({ unique : false, default : "", comment : "분야 code" })
    code !: string;
    
    @Column({ unique : false, default : "", comment : "분야 type text"})
    type_code !: string;
}