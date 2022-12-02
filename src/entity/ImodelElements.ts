import {
    PrimaryGeneratedColumn,
    Column,
    Entity
} from 'typeorm';
import BaseEntity from "./BaseEntity";
  
@Entity('imodel_elements')
export class ImodelElements extends BaseEntity {
    @PrimaryGeneratedColumn({ comment : "고유 ID"})
    id!: number;

    @Column({ default : 0, nullable : false, comment : "Imodel Entity FK"})
    imodel_id !: number;

    @Column({ default : "", nullable : false, comment : "Imodel Element ID" })
    element_id !: string;

    @Column({ default : "", nullable : false, comment : "Imodel class name ( test )"})
    class_name !: string;

    @Column({ default : "", nullable : true, comment : "code scope json" })
    code_scope !: string;

    @Column({ default : "", nullable : true, comment : "code spec json"})
    code_spec !: string;

    @Column({ default : "", nullable : true, comment : "부모 Element ID" })
    parent_id !: string;

    @Column({ default : "", nullable : true, comment : "유저가 작성한 라벨" })
    user_label !: string;
}