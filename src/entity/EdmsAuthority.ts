/******************************************************************************
 * EDMS Authority
 * column :
 * id : row index By BaseEntity
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import BaseEntity from "./BaseEntity";

@Entity("edms_authority")
@Index(["user_id", "is_delete", "read"])
@Index(["user_id", "is_delete", "write"])
@Index(["user_id", "is_delete", "download"])
@Index(["user_id", "is_delete", "delete"])
@Index(["company_id","group_id", "user_id", "is_delete", "read"])
@Index(["company_id","group_id", "user_id", "is_delete", "write"])
@Index(["company_id","group_id", "user_id", "is_delete", "download"])
@Index(["company_id","group_id", "user_id", "is_delete", "delete"])
@Index(["group_id", "user_id", "is_delete", "read"])
@Index(["group_id", "user_id", "is_delete", "write"])
@Index(["group_id", "user_id", "is_delete", "download"])
@Index(["group_id", "user_id", "is_delete", "delete"])
export class EdmsAuthority extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;

    @Column({ unique: false, nullable: false, comment: "FK : EdmsCompany-> id" })
    company_id!: number;

    @Column({ unique: false, nullable: false, default: -1, comment: "edms_group 테이블 group_id" })
    group_id!: number;

    @Column({ unique: false, nullable: true, default: -1, comment: "edms_user 테이블 user_id" })
    user_id!: number;

    @Column({ unique: false, type: "bigint", comment: "읽기 권한  0 : 권한 없음, 1 : 권한 있음" })
    read!: number;

    @Column({ unique: false, type: "bigint", comment: "작성 권한  0 : 권한 없음, 1 : 권한 있음" })
    write!: number;

    @Column({
        unique: false,
        type: "bigint",
        comment: "다운로드 권한  0 : 권한 없음, 1 : 권한 있음",
    })
    download!: number;

    @Column({
        unique: false,
        type: "bigint",
        comment: "삭제 권한  0 : 권한 없음, 1 : 권한 있음",
    })
    delete!: number;

    @Column({ unique: false, nullable: false, comment: "FK : EdmsProjects->project_no" })
    project_no!: number;

    @Column({
        unique: false,
        nullable: false,
        default: -1,
        comment: "FK : EdmsProjectType->project_no",
    })
    project_type_no!: number;

    @Column({ unique: false, nullable: false, default: -1, comment: "FK : EdmsDiscipline->id" })
    discipline_id!: number;

    @Column({ unique: false, nullable: false, default: -1, comment: "FK : EdmsArea->id" })
    area_id!: number;

    @Column({
        unique: false,
        nullable: true,
        default: -1,
        comment: "카테고리 대한 권한 cate_no",
    })
    cate_no!: number;

    @Column({ unique: false, nullable: true, default: -1, comment: "도큐먼트에 대한 권한 docu_no" })
    docu_no!: number;
}
