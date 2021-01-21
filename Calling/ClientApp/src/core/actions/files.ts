const SET_FILES = 'SET_FILES';
const SET_FILE_BLOB_URL = 'SET_FILE_BLOB_URL';
const SET_FILE_IS_DOWNLOADING = 'SET_FILE_IS_DOWNLOADING';

interface SetFilesActionFile {
    id: string;
    filename: string;
}

interface SetFilesAction {
    type: typeof SET_FILES;
    files: SetFilesActionFile[];
}

interface SetFileBlobUrlAction {
    type: typeof SET_FILE_BLOB_URL;
    fileId: string;
    blobUrl: string | null;
}

interface SetFileIsDownloadingAction {
    type: typeof SET_FILE_IS_DOWNLOADING;
    fileId: string;
    isDownloading: boolean;
}

export const setFiles = (files: SetFilesActionFile[]): SetFilesAction => {
    return {
        type: SET_FILES,
        files
    };
};

export const setFileBlobUrl = (fileId: string, blobUrl: string | null): SetFileBlobUrlAction => {
    return {
        type: SET_FILE_BLOB_URL,
        fileId,
        blobUrl
    };
};

export const setFileIsDownloading = (fileId: string, isDownloading: boolean): SetFileIsDownloadingAction => {
    return {
        type: SET_FILE_IS_DOWNLOADING,
        fileId,
        isDownloading
    };
};

export { SET_FILES, SET_FILE_BLOB_URL, SET_FILE_IS_DOWNLOADING };

export type FileTypes =
    | SetFilesAction
    | SetFileBlobUrlAction
    | SetFileIsDownloadingAction;