/******************************************************************************
 * employee
 * column : 
    * id : row index By BaseEntity
 * function : 
    * findByName
******************************************************************************/
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    CreateDateColumn,
} from 'typeorm';
import { generateToken } from '@/lib/token';
import BaseEntity from "./BaseEntity";

@Entity('organization')
export class Organization extends BaseEntity {
    @Column({ unique : false, comment : "각 부서 고유 아이디"})
    group_id !: number;
    
    @Column({ unique : false, comment : "부서 대표유저 아이디"})
    main_user !: number;

    @Column({ unique: false, length: 255, comment : "부서 이름" })
    name !: string;

    @Column({ unique : false, length : 10, comment : "문서 번호 기입 텍스트"})
    doc_key !: string;

    @Column({ nullable: true, length: 100, type: 'varchar'})
    company_tel !: string;

    @Column({ nullable:true, length: 100, type: 'varchar'})
    company !: string;

    @Column({ unique : false, nullable : true })
    group_order !: number;

    @Column({ nullable : true })
    is_head !: number;

    static findByName( name : string ){
        return this.createQueryBuilder("organization")
            .where("organization.name = :name", {name : name});
    }
}