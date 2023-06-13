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
    Column,
    UpdateDateColumn,
    CreateDateColumn,
    Index
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_category')
export class EdmsCategory extends BaseEntity {
    @PrimaryGeneratedColumn({})
    cate_no!: number;

    @Column({ unique : false, nullable : false, comment : "FK : EdmsProjects->project_no" })
    p_project_no !: number;

    @Column({ unique : false, nullable : false, comment : "FK : EdmsProjectType->project_no" })
    project_no !: number;

    @Index("edms_category_discipline_index")
    @Column({ unique : false, nullable : false, comment : "FK : EdmsDiscipline->id"})
    discipline_id !: number;

    @Column({ unique : false, comment : "최상위 루트여부" })
    is_root !: boolean;

    @Column({ unique : false, comment : "담당자" })
    pm_id !: number;

    @Column({ unique : false, comment : "부모 카테고리번호" })
    pcate_no !: number;

    @Column({ unique : false, default : 0, comment : "카테고리 위치" })
    dept !: number;

    @Column({ unique : false, length : 45, comment : "카테고리 A~Z 순서 알파벳" , default : "A" })
    cate_code !: string;

    @Column({ unique : false, length : 45, comment : "카테고리 명" })
    cate_name !: string;

    @Column({ unique : false, length : 45, comment : "" })
    explan !: string;
    
    @Column({ unique : false, default : 0.0, type : "float", comment : "가중치" })
    weight !: number;

    @Column({ unique : false, type: "char", length : 3, comment : "상태코드" })
    status !: string;

    @Column({ unique : false, comment : "결재필요여부" })
    is_approval !: boolean;

    @Column({ unique : false, length : 100, default : "/", comment : "디렉토리 경로" })
    dir_path !: string;

    @Column({ type : "bigint", unique : false, default : 0, nullable : false, comment : "VP Flag" })
    is_vp !: number
}