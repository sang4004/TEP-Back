import {
    PrimaryGeneratedColumn,
    Column,
    Entity
} from 'typeorm';
import BaseEntity from "./BaseEntity";
  
@Entity('imodel_datas')
export class ImodelDatas extends BaseEntity {
    @PrimaryGeneratedColumn({ comment : "고유 ID"})
    id!: number;

    @Column({ default : 0, nullable : false, comment : "Imodel Entity FK"})
    imodel_id !: number;

    @Column({ default : "", nullable : false, comment : "ECSQL Entity Name" })
    class !: string;

    @Column({ type : "text", nullable : true, comment : "ECSQL Datas" })
    data !: string;
}