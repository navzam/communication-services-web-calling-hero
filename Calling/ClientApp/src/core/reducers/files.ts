import { Reducer } from 'redux';
import { FileTypes, SET_FILES, SET_FILE_BLOB_URL, SET_FILE_IS_DOWNLOADING } from '../actions/files';

interface File {
    filename: string;
    blobUrl: string | null;
    isDownloading: boolean;
}

export interface FilesState {
    files: Map<string, File>,
}

const initialState: FilesState = {
    files: new Map<string, File>(),
};

export const filesReducer: Reducer<FilesState, FileTypes> = (state = initialState, action: FileTypes): FilesState => {
    switch (action.type) {
        case SET_FILES: {
            const newFilesMap = new Map<string, File>();
            for (const file of action.files) {
                const existingFile = state.files.get(file.id);
                newFilesMap.set(file.id, {
                    filename: file.filename,
                    blobUrl: existingFile?.blobUrl ?? null,
                    isDownloading: existingFile?.isDownloading ?? false,
                });
            }
            return { ...state, files: newFilesMap };
        }
        case SET_FILE_BLOB_URL: {
            if (!state.files.has(action.fileId)) return state;

            const copiedFilesMap = new Map<string, File>(state.files);
            copiedFilesMap.set(action.fileId, {
                ...copiedFilesMap.get(action.fileId)!,
                blobUrl: action.blobUrl,
            });
            return { ...state, files: copiedFilesMap }
        }
        case SET_FILE_IS_DOWNLOADING: {
            if (!state.files.has(action.fileId)) return state;

            const copiedFilesMap = new Map<string, File>(state.files);
            copiedFilesMap.set(action.fileId, {
                ...copiedFilesMap.get(action.fileId)!,
                isDownloading: action.isDownloading,
            });
            return { ...state, files: copiedFilesMap }
        }
        default:
            return state;
    }
};