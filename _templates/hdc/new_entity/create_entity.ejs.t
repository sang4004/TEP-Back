---
to: src/entity/<%=name.charAt(0).toUpperCase() + name.slice(1)%>.ts
---
/******************************************************************************
 * Copyright (c) 2021. Moornmo Inc. Rights reserved.                          *
 * Data modelings and methods used are assets of Moornmo Inc.                 *
 * <%=name%>
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
import { generateToken } from '@/lib/token';
import BaseEntity from "./BaseEntity";

@Entity('<%=name%>')
export class <%=name.charAt(0).toUpperCase() + name.slice(1)%> extends BaseEntity {
    @Column({ unique: false, length: 255 })
    name!: string;
    
    static findByName( name : string ){
        return this.createQueryBuilder("users")
            .where("users.username = :name", {name : name});
    }
}