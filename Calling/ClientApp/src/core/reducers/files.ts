import { Reducer } from 'redux';
import { FileTypes, SET_FILES } from '../actions/files';

interface File {
    id: string;
    filename: string;
    size: number;
    imageUrl: string | null;
}

export interface FilesState {
    files: File[]
}

const initialState: FilesState = {
    files: [],
};

export const filesReducer: Reducer<FilesState, FileTypes> = (state = initialState, action: FileTypes): FilesState => {
    switch (action.type) {
        case SET_FILES:
            return { ...state, files: action.files };
        default:
            return state;
    }
};