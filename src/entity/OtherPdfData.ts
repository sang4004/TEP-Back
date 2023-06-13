/******************************************************************************
 * PDFData
 * column :
 *
 * function :
 *
 ******************************************************************************/
import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from "typeorm";

@Entity("other_pdf_data")
export class OtherPDFData {
    @PrimaryGeneratedColumn({ comment: "PDFData 고유 ID" })
    id!: number;

    @Column({ unique: false, comment: "TB : files table FK " })
    file_no!: number;

    @Column({ unique: false, type: "text", comment: "PDF Viewer Data" })
    data!: string;

    @Column({ unique: false, comment: "물리적 파일 경로" })
    repo_path!: string;

    @Column({ unique: false, comment: "PDFGateway oid (PK)", primary: true })
    oid: string;

    @Column({ unique: false, comment: "StreamDocs PDF ID", primary: true })
    sid!: string;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP", nullable: true, comment: "등록일시" })
    create_tm!: Date;
}
