import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from "typeorm";
import { generateToken } from "../lib/token";
import BaseEntity from "./BaseEntity";
import { logger } from "../lib/winston";

enum admin_level {
    adminManager = 1,
    admin = 2,
    user = 3,
    guest = 4,
    testuser = 5,
}

@Entity("users")
export class User extends BaseEntity {
    @Column({ nullable: true, length: 100, type: "varchar" })
    email!: string;

    @Column({ unique: false, length: 100 })
    username!: string;

    @Column({ unique: false, length: 100 })
    userid!: string;

    @Column({ nullable: true, length: 100, type: "varchar" })
    password!: string | null;

    @Column({ default: false })
    is_certified!: boolean;

    @Column({ nullable: true, type: "varchar", length: 512, default: "/uploads/user_default.svg" })
    profile_img!: string;

    @Column({ nullable: true, type: "varchar", length: 512 })
    signature_img!: string;

    @Column({ nullable: true, type: "varchar", length: 512 })
    sign_img!: string;

    @Column("enum", {
        enum: admin_level,
        default: admin_level.user,
        comment: "adminManager = 1, admin = 2, user = 3, guest = 4, testuser = 5",
    })
    admin_level: admin_level;

    @Column({ unique: false, comment: "organization id" })
    group_id: number;

    @Column({ nullable: true, length: 100, type: "varchar" })
    phone_number!: string;

    @Column({ nullable: true, length: 100, type: "varchar" })
    fax_number!: string;

    @Column({ default: false })
    approved!: boolean;

    @Column({ unique: false, comment: "position id" })
    position: number;

    @Column({ default: false, comment: "문서 담당자 flag" })
    doc_mng!: boolean;

    @Column({ default: 0, comment: "현장 대리인 flag" })
    sub_field!: number;

    @Column({ default: 0, comment: "직인 사용 flag" })
    use_sign!: number;

    @Column({ default: 0, comment: "수정자 user id" })
    edit_user!: number;

    static findByName(name: string) {
        return this.createQueryBuilder("users").where("users.username = :name", { name: name });
    }

    async generateUserToken() {
        // refresh token is valid for 30days
        const refreshToken = await generateToken(
            {
                user_id: this.id,
            },
            {
                subject: "refresh_token",
                expiresIn: "30d",
            }
        );

        const accessToken = await generateToken(
            {
                user_id: this.id,
            },
            {
                subject: "access_token",
                expiresIn: "30d",
            }
        );

        return {
            accessToken,
            refreshToken,
        };
    }

    async refreshUserToken(refreshTokenExp: number, originalRefreshToken: string) {
        const now = new Date().getTime();
        const diff = refreshTokenExp * 1000 - now;
        logger.info("refreshing..");
        let refreshToken = originalRefreshToken;
        // renew refresh token if remaining life is less than 15d
        if (diff < 1000 * 60 * 60 * 24 * 15) {
            logger.info("refreshing refreshToken");
            refreshToken = await generateToken(
                {
                    user_id: this.id,
                },
                {
                    subject: "refresh_token",
                    expiresIn: "30d",
                }
            );
        }
        const accessToken = await generateToken(
            {
                user_id: this.id,
            },
            {
                subject: "access_token",
                expiresIn: "30d",
            }
        );

        return { accessToken, refreshToken };
    }
}
