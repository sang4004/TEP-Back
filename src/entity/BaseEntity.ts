import {
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    Index
} from 'typeorm';
  
export default abstract class _BaseEntity extends BaseEntity {
    @PrimaryGeneratedColumn({ comment : "고유 ID"})
    id!: number;

    @Column({ type: 'datetime', nullable: true, default : ()=> "CURRENT_TIMESTAMP", comment : "생성일"})
    created_at!: Date;

    @Index("updated_at_index")
    @Column({ type: 'datetime', nullable: true, default : ()=> "CURRENT_TIMESTAMP", comment : "수정일" })
    updated_at!: Date;

    @Column({ type: 'datetime', nullable: true, comment : "삭제일" })
    deleted_at!: Date;

    @Column({ default : false, comment : "삭제 여부" })
    is_delete !: boolean;
}