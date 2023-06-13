/******************************************************************************
 * General Doc Data
 * column :
 * id : row index By BaseEntity
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column, Index, Tree } from "typeorm";
import BaseEntity from "./EdmsBaseEntity";

@Entity("edms_plant_files")
export class EdmsPlantFiles extends BaseEntity {
    @PrimaryGeneratedColumn({})
    @Index("edms_plant_file_no")
    id!: number;

    @Column({ comment: "TB : work_proc PK", nullable: true })
    wp_idx!: number;

    @Column({ comment: "EdmsProjectType PK", nullable: true })
    project_no!: number;

    @Column({ comment: "TB : edms_other_files PK", nullable: true })
    file_no!: number;

    @Column({ length: 200, comment: "Transmittal #", default: "" })
    transmittal!: string;

    @Column({ length: 50, comment: "Equipment", default: "" })
    equipment!: string;

    @Column({ length: 50, comment: "MDL/MLI", default: "" })
    mdl!: string;

    @Column({ length: 200, comment: "Customer Transmittal #", default: "" })
    customer_transmittal!: string;

    @Column({ type: "datetime", comment: "Contract Due Date", nullable: true })
    contract_due_date!: Date;

    @Column({ type: "datetime", comment: "Issue Date", nullable: true })
    issue_date!: Date;

    @Column({ length: 200, comment: "File Name", default: "" })
    file_name!: string;

    @Column({ length: 200, comment: "Title", default: "" })
    title!: string;

    @Column({ length: 200, comment: "Document Rev.", default: "" })
    rev!: string;

    @Column({ length: 50, comment: "Document Issue", default: "" })
    document_issue!: string;

    @Column({ length: 50, comment: "For Contractual Review", default: "" })
    for_contractual_review!: string;

    @Column({ length: 50, comment: "For Contractual Approval", default: "" })
    for_contractual_approval!: string;

    @Column({ length: 100, comment: "Status Issued", default: "" })
    status_issued!: string;

    @Column({ length: 500, comment: "Documentum Folder Link", default: "" })
    documentum_folder_link!: string;

    @Column({ length: 100, comment: "Customer Return XMTL#", default: "" })
    customer_return_xml!: string;

    @Column({ length: 100, comment: "Review Result and Code #", default: "" })
    review_result!: string;
}
