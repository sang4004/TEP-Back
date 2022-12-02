import {
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    Index
} from 'typeorm';
  
export default abstract class EdmsBaseEntity extends BaseEntity {
    @Column({ unique : false, default : 0, comment : "FK : EdmsUser->user_id"})
    user_id !: number;
    
    @Column({ unique : false, length : 20, default :null, comment : "등록자명" })
    create_by !: string;

    @Column({ type: 'datetime', default : ()=> "CURRENT_TIMESTAMP", nullable: true, comment : "등록일시" })
    create_tm !: Date;

    @Column({ unique : false, nullable: true, length : 20, comment : "최종수정자명" })
    modify_by !: string;

    @Column({ type: 'datetime', default : null, nullable: true, comment : "최종수정일시" })
    modify_tm : Date;

    @Index("base_is_use_index")
    @Column({ unique : false, nullable : false, default : 1, comment : "해당 데이터 사용 여부"})
    is_use !: number;
}