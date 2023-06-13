/******************************************************************************
 * Work Docu
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
import Base from "./EdmsBaseEntity";

@Entity('work_tmp_box')
@Index(["wtb_idx"])
@Index(["docu_no", "owner_id"])
export class WorkTmpBox extends Base {
    @PrimaryGeneratedColumn({ comment : "primary" })
    wtb_idx !: number;

    @Column({ unique : false, comment : "프로젝트번호(TB : projects) FK", nullable: true })
    project_no !: number;

    @Column({ unique : false, comment : '문서번호(TB : documents) FK', nullable: true })
    docu_no !: number;

    @Column({ unique : false, comment : "소유자" })
    owner_id !: number;
}