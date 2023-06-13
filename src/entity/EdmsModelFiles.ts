/******************************************************************************
 * EdmsModelFiles
 * table : edms_model_files
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
} from 'typeorm';
import BaseEntity from "./EdmsBaseEntity";

@Entity('edms_model_files')
export class EdmsModelFiles extends BaseEntity {
    @PrimaryGeneratedColumn({})
    model_file_no!: number;

    @Column({ unique : false, comment : 'TB : projects FK' })
    project_no !: number;
    
    @Column({ unique : false, length : 255, comment : 'ROOT 경로'})
    root_path !: string;

    @Column({ unique : false, length : 255, comment : '물리적 위치경로' })
    repo_path !: string;

    // @Column({ unique : false, length : 45, comment : '원본 파일코드(채번규칙에 의한 채번)'})
    // origin_file_code !: string;

    // @Column({ unique : false, length : 45, comment : '파일코드(채번규칙에 의한 채번)'})
    // file_code !: string;

    @Column({ unique : false, length : 255 })
    subject !: string;
    
    @Column({ unique : false, length : 45 })
    explan !: string;

    @Column({ unique : false, length : 100, comment : '파일명' })
    file_name !: string;

    @Column({ unique : false, length : 100, comment : '원본 파일명' })
    original_file_name !: string;

    @Column({ unique : false, comment : "TB : imodels FK", default : 0})
    imodel_id !: number;
}
