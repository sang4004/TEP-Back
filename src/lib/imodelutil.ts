import {
  Element,
  IModelDb,
  IModelTransformer,
  IModelTransformOptions,
  OrthographicViewDefinition,
  SheetViewDefinition,
  SpatialViewDefinition,
  Subject,
  BackendRequestContext,
  ElementRefersToElements,
  IModelHost,
  IModelHostConfiguration,
  IModelJsFs,
  SnapshotDb,
} from "@bentley/imodeljs-backend";
import { IModel } from "@bentley/imodeljs-common";
import { Id64Array, Id64String } from "@bentley/bentleyjs-core";
import express, { Application, Request, Response } from "express";

export class Transformer extends IModelTransformer {
  public constructor(
    sourceDb: IModelDb,
    targetDb: IModelDb,
    options?: IModelTransformOptions
  ) {
    super(sourceDb, targetDb, options);
  }

  //onTransformElement를 override하면 merge하는 과정에서 하나의 view로 통합 가능하다함.
  //   public override onTransformElement(sourceElement: Element): ElementProps {

  //   }

  protected override shouldExportElement(_sourceElement: Element): boolean {
    if (_sourceElement.classFullName !== undefined) {
      if (
        _sourceElement.classFullName ===
          OrthographicViewDefinition.classFullName ||
        _sourceElement.classFullName === SheetViewDefinition.classFullName
      ) {
        return false;
      }
    }
    return true;
  }
}

const getOutputFileName = (fileNames: string[]): string => {
  let _iModelList = [];
  for (const file of fileNames) {
    const split = file
      .split(".")
      .filter((name) => name !== "i" && name !== "bim");
    split.length >= 1
      ? _iModelList.push(split.join("."))
      : _iModelList.push(split.toString());
  }
  let outputFileName = "";
  _iModelList.forEach((val, idx) =>
    idx === _iModelList.length - 1
      ? (outputFileName += val.trim() + ".bim")
      : (outputFileName += val.trim() + "_")
  );

  return outputFileName;
};

//merge multiple imodel
export const mergeMultipleModels = async (req: Request): Promise<string> => {
  const { dirPath, sources }: { dirPath: string; sources: string[] } = req.body;
  const outputFileName = getOutputFileName(sources);
  const requestContext = new BackendRequestContext();
  if (sources.length < 2) {
    console.error("At least two sources must be provided");
    return "At least two sources must be provided";
  }
  const fullOutpath = `${dirPath}/${outputFileName}`;
  await IModelHost.startup();
  //Logger if i want

  if (IModelJsFs.existsSync(fullOutpath)) {
    IModelJsFs.removeSync(fullOutpath);
  }
  const mergedDb = SnapshotDb.createEmpty(fullOutpath, {
    rootSubject: { name: "Merged IModel" },
  });
  mergedDb.saveChanges("Create Root Subject");

  let idx = 0;
  try {
    for (const source of sources) {
      const fileName = `${dirPath}/${source}`;

      const sourceDb = SnapshotDb.openFile(fileName);
      const subjectId: Id64String = Subject.insert(
        mergedDb,
        IModel.rootSubjectId,
        `Source${idx}`
      );
      const transformer = new Transformer(sourceDb, mergedDb, {
        targetScopeElementId: subjectId,
      });

      await transformer.processSchemas(requestContext);
      transformer.context.remapElement(IModel.rootSubjectId, subjectId[idx]);
      await transformer.processAll();
      transformer.dispose();
      mergedDb.saveChanges(`Imported Source${idx + 1}`);
      sourceDb.close();
      console.log(`Source ${idx + 1} done`);
      idx++;
    }
    mergedDb.close();
    return outputFileName;
  } catch (err) {
    console.error(
      `Problem occurred while trasnforming data from the source ${idx + 1}`,
      err
    );
    return "failed";
  }
};
