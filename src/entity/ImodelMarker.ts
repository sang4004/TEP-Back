import {
    PrimaryGeneratedColumn,
    Column,
    Entity
} from 'typeorm';
import BaseEntity from "./BaseEntity";
  
@Entity('imodel_marker')
export class ImodelMarker extends BaseEntity {
    @Column({ default : 0, nullable : false, comment : "Imodel Entity FK"})
    imodel_id !: number;

    @Column({ unique : false, type: "decimal", precision : 20, scale : 10, nullable : false, default : 0, comment : "position x"})
    x !: number;

    @Column({ unique : false, type: "decimal", precision : 20, scale : 10, nullable : false, default : 0, comment : "position x"})
    y !: number;

    @Column({ unique : false, type: "decimal", precision : 20, scale : 10, nullable : false, default : 0, comment : "position x"})
    z !: number;

    @Column({ unique : false, length : "100", nullable : false, default : "", comment : "마커 제목"})
    title !: string;

    @Column({ unique : false, length : "500", nullable : false, default : "", comment : "마커 텍스트"})
    text !: string;

    @Column({ unique : false, nullable : false, comment : "users id"})
    user_id !: number;
}