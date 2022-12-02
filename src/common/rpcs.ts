import { IModelReadRpcInterface, IModelTileRpcInterface, RpcInterfaceDefinition, SnapshotIModelRpcInterface } from "@bentley/imodeljs-common";
import { PresentationRpcInterface } from "@bentley/presentation-common";

/**
 * Returns a list of RPCs supported by this application
 */
export function getSupportedRpcs(): RpcInterfaceDefinition[] {
  return [
    IModelReadRpcInterface,
    IModelTileRpcInterface,
    PresentationRpcInterface,
    SnapshotIModelRpcInterface,
  ];
}