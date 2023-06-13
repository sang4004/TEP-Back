/******************************************************************************
 * Edms Category Code
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
    Index,
} from "typeorm";
import BaseEntity from "./EdmsBaseEntity";

@Entity("edms_category_code")
export class EdmsCategoryCode extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id!: number;

    @Column({ unique: false, default: "", comment: "category code" })
    code!: string;

    @Column({ unique: false, default: "", comment: "category text. ,로 구분" })
    type_code!: string;
}
