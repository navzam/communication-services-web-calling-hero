import { TableClient } from "@azure/data-tables";
import { ContainerClient, RestError } from "@azure/storage-blob";

export async function ensureTableCreated(tableClient: TableClient): Promise<void> {
    try {
        await tableClient.create();
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 409) {
            return;
        }

        throw e;
    }
}

export async function ensureBlobContainerCreated(containerClient: ContainerClient): Promise<void> {
    await containerClient.createIfNotExists();
}