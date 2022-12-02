import {
    PrimaryGeneratedColumn,
    Column,
    Entity
} from 'typeorm';
import BaseEntity from "./BaseEntity";

@Entity('imodels')
export class ImodelEntity extends BaseEntity {
    @Column({ default : "", nullable : false, comment : "Imodel Source Name"})
    imodel_name !: string;

    @Column({ unique : false, nullable : false, comment : "users id"})
    user_id !: number;
    
    @Column({ unique : false, nullable : false, comment : "EdmsDocuments -> docu_no" })
    docu_no !: number;

    @Column({ unique : false, nullable : false, comment : "EdmsFiles -> file_no" })
    file_no !: number;
    
}