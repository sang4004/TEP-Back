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

@Entity('organization_type')
export class OrganizationType extends BaseEntity {
    @Column({ nullable: true, length: 100, type: 'varchar'})
    tel : string;

    @Column({ nullable:true, length: 100, type: 'varchar'})
    fax : string;

    @Column({ nullable:true, length: 200, type: 'varchar'})
    address : string;

    @Column({ nullable:true, length: 200, type: 'varchar'})
    company : string;

    @Column({ nullable:true, length: 500, type: 'varchar'})
    signature_img : string;

    @Column({ nullable:true, length: 100, type: 'varchar'})
    company_abbr : string;
}