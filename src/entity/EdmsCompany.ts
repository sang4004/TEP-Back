/******************************************************************************
 * EDMS Company
 * column :
 * user_id : base id
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "./BaseEntity";

@Entity("edms_company")
export class EdmsCompany extends BaseEntity {
    @Column({ unique: false, default: "", nullable: true, comment : "회사 이름"})
    company_name!: string;

    @Column({ unique: false, default: 0, nullable: false, comment : "FK EdmsProjects project_no" })
    project_no!: number;
}
