/******************************************************************************
 * Edms Document Author
 * 도큐먼트의 담당자들 리스트
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

@Entity('edms_document_manager')
export class EdmsDocumentManager extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id !: number;

    @Column({ unique : false, nullable : false, default : 0, comment : "FK project_type->project_no" })
    project_type_no : number;

    @Column({ unique : false, nullable : false, comment : "FK EdmsCompany->company_id"})
    company_id : number;

    @Column({ unique : false, nullable : false, default : 0 , comment : "FK edms_discipline-> discipline_id" })
    discipline_id : number;

    @Column({ unique : false, nullable : false, comment : "FK EdmsUser->username"})
    username !: string;

    @Column({ unique : false, nullable : false, default : 0 , comment : "FK edms_documents -> docu_no" })
    docu_no : number;

    @Column({ unique : false, nullable : false, default : 0 , comment : "FK edms_category -> cate_no" })
    cate_no : number;
    
    @Column({ unique : false, nullable : false, default : 0 , comment : "FK edms_group-> id" })
    group_id : number;
}