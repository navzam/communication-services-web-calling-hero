import { Reducer } from 'redux';
import { FileTypes, SET_FILES, SET_FILE_IMAGE_URL } from '../actions/files';

interface File {
    filename: string;
    imageUrl: string | null;
}

export interface FilesState {
    files: Map<string, File>,
}

const initialState: FilesState = {
    files: new Map<string, File>(),
};

export const filesReducer: Reducer<FilesState, FileTypes> = (state = initialState, action: FileTypes): FilesState => {
    switch (action.type) {
        case SET_FILES:
            const newFilesMap = new Map<string, File>();
            for (const file of action.files) {
                newFilesMap.set(file.id, {
                    filename: file.filename,
                    imageUrl: state.files.has(file.id) ? state.files.get(file.id)!.imageUrl : null,
                });
            }
            return { ...state, files: newFilesMap };
        case SET_FILE_IMAGE_URL:
            if (!state.files.has(action.fileId)) return state;

            const copiedFilesMap = new Map<string, File>(state.files);
            copiedFilesMap.set(action.fileId, {
                ...copiedFilesMap.get(action.fileId)!,
                imageUrl: action.imageUrl,
            });
            return { ...state, files: copiedFilesMap }
        default:
            return state;
    }
};