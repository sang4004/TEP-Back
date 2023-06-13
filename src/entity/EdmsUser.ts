/******************************************************************************
 * EDMS User
 * column :
 * user_id : base id
 * function :
 *
 ******************************************************************************/
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { generateToken } from "../lib/token";
import { logger } from "../lib/winston";

@Entity("edms_user")
export class EdmsUser {
    @PrimaryGeneratedColumn({ comment: "고유 ID" })
    user_id!: number;

    @Column({ unique: false, nullable: false, default: 0, comment: "users 테이블 id" })
    doc_user_id!: number;

    @Column({ unique: false, default: "", length: 100 })
    userid!: string;

    @Column({ nullable: true, length: 100, type: "varchar" })
    password!: string | null;

    @Column({ nullable: true, length: 100, type: "varchar" })
    email!: string;

    @Column({ nullable: true, length: 100, type: 'varchar'})
    phone_number !: string;

    @Column({ unique: false, length: 100 })
    username!: string;

    @Column({ nullable: true, type: "varchar", length: 512, default: "/uploads/user_default.svg" })
    profile_img!: string;

    @Column({ unique: false, default: 1, comment: "FK : EdmsCompany->id" })
    company_id: number;

    @Column({ unique: false, default: 1, comment: "FK : EdmsGroup->id" })
    group_id: number;

    @Column({ unique: false, default: 1, comment: "FK : EdmsPosition->id" })
    position_id: number;

    @Column({ unique: false, nullable: false, default: 1, comment: "해당 데이터 사용 여부" })
    is_use!: number;

    @Column({
        unique: false,
        default: 3,
        comment: "등급 1 : 총관리자, 2 : 회사 담당자, 3 : 회사구성원, 4 : 이메일유저",
    })
    level: number;

    @Column({ default: 0, unique : false, comment : "승인 여부"})
    approved !: number;

    @Column({ default: 1, unique : false, comment : "first menu permission"})
    is_menu1 !: number;

    @Column({ default: 1, unique : false, comment : "second menu permission"})
    is_menu2 !: number;

    async generateUserToken() {
        // refresh token is valid for 30days
        const edmsRefreshToken = await generateToken(
            {
                user_id: this.user_id,
            },
            {
                subject: "edms_refresh_token",
                expiresIn: "30d",
            }
        );

        const edmsAccessToken = await generateToken(
            {
                user_id: this.user_id,
            },
            {
                subject: "emds_access_token",
                expiresIn: "30d",
            }
        );

        return {
            edmsAccessToken,
            edmsRefreshToken,
        };
    }

    async refreshUserToken(refreshTokenExp: number, originalRefreshToken: string) {
        const now = new Date().getTime();
        const diff = refreshTokenExp * 1000 - now;
        logger.info("refreshing..");
        let emdsRefreshToken = originalRefreshToken;
        // renew refresh token if remaining life is less than 15d
        if (diff < 1000 * 60 * 60 * 24 * 15) {
            logger.info("refreshing refreshToken");
            emdsRefreshToken = await generateToken(
                {
                    user_id: this.user_id,
                },
                {
                    subject: "edms_refresh_token",
                    expiresIn: "30d",
                }
            );
        }
        const edmsAccessToken = await generateToken(
            {
                user_id: this.user_id,
            },
            {
                subject: "edms_access_token",
                expiresIn: "30d",
            }
        );

        return { edmsAccessToken, emdsRefreshToken };
    }
}
