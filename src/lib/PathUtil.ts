import path from "path";
import fs from "fs";
import dirTree from "directory-tree";

export type DirResultType = { folder: string; items: string[] };
export const CallDirTree = (dir: string, results: DirResultType[], onlyZip?: boolean) => {
    let tree = dirTree(dir, { attributes: ["size", "type", "extension"] });
    GetAllFilesFromFolder(tree.children, results, onlyZip);
    return { tree, results };
};

const GetAllFilesFromFolder = (children: directoryTree.DirectoryTree[], results: DirResultType[], onlyZip: boolean) => {
    for (var child of children) {
        if (onlyZip) {
            if (child.type == "directory") {
                let zipPaths = child.children.filter(raw => raw.extension && raw.extension.indexOf(".zip") != -1 && raw.path.indexOf("._") == -1).map(raw => raw.path);
                results.push({ folder: child.path, items: [...zipPaths] });
            }
        } else {
            if (child.type == "directory") {
                let filePaths = child.children.filter(raw => raw.type == "file").map(raw => raw.path);
                results.push({ folder: child.path, items: [...filePaths] });
            }
        }
        if (child.children) GetAllFilesFromFolder(child.children, results, onlyZip);
    }
    return results;
};
