import JSZip from "jszip";
import fs from "fs";
import path from "path";
import il from "iconv-lite";
import mkdirp from "mkdirp";
import archiver from "archiver";
import { edmsUploadFolder } from "../constant";
type FileObj = {
    originalname: string;
    filename: string;
    path: string;
};

export const GenerateZip = (
    file_name: string,
    dir_path: string[],
    dest_path: string[],
    specificFolder?: string
): Promise<string> => {
    return new Promise(async r => {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const output = path.resolve(globalThis.HOME_PATH, specificFolder ? specificFolder : "", file_name);
        const stream = fs.createWriteStream(output);

        // stream.on("close", () => r(output));
        archive.on("error", err => {
            console.log(err);
            throw err;
        });
        archive.pipe(stream);
        for (var i = 0; i < dir_path.length; i++) {
            let _dir_path = path.resolve(globalThis.HOME_PATH, dir_path[i]);
            let _dest_path = dest_path[i];
            try {
                let stat = fs.lstatSync(_dir_path);
                if (stat) {
                    let isDir = stat.isDirectory();
                    if (isDir)
                        archive.directory(_dir_path, _dest_path, {
                            date: new Date(),
                        });
                    else archive.append(fs.createReadStream(_dir_path), { name: _dest_path });
                }
            } catch (err) {
                console.log(err);
            } finally {
            }
        }
        await archive.finalize();
        r(output);
    });
};

export const UnZip = (zip_path: string): Promise<FileObj[]> => {
    let fileList: FileObj[] = [];
    return new Promise(async r => {
        fs.readFile(zip_path, async (err, data) => {
            if (!err) {
                var zip = new JSZip();
                let contents = await zip.loadAsync(data, {
                    decodeFileName: function (bytes: any) {
                        return il.decode(bytes, "EUC-KR");
                    },
                }); // ** decodeFileName Key Need Force Add
                for (var filename of Object.keys(contents.files)) {
                    if (filename && filename[filename.length - 1] != "/") {
                        let content = await zip.file(filename).async("nodebuffer");
                        let dest = path.resolve(zip_path, "../", filename);
                        let dir = dest
                            .split("/")
                            .slice(0, dest.split("/").length - 1)
                            .join("/");
                        await mkdirp(dir);
                        fs.writeFileSync(dest, content, { encoding: "utf-8" });
                        fileList.push({
                            filename: filename,
                            originalname: filename,
                            path: edmsUploadFolder + filename,
                        });
                    }
                }
            }
            r(fileList);
        });
    });
};
