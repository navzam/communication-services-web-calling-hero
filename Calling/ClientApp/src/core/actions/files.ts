const SET_FILES = 'SET_FILES';
const SET_FILE_IMAGE_URL = 'SET_FILE_IMAGE_URL';

interface SetFilesActionFile {
    id: string;
    filename: string;
    size: number;
}

interface SetFilesAction {
    type: typeof SET_FILES;
    files: SetFilesActionFile[];
}

interface SetFileImageUrlAction {
    type: typeof SET_FILE_IMAGE_URL;
    fileId: string;
    imageUrl: string | null;
}

export const setFiles = (files: SetFilesActionFile[]): SetFilesAction => {
    return {
        type: SET_FILES,
        files
    };
};

export const setFileImageUrl = (fileId: string, imageUrl: string | null): SetFileImageUrlAction => {
    return {
        type: SET_FILE_IMAGE_URL,
        fileId,
        imageUrl
    };
};

export { SET_FILES, SET_FILE_IMAGE_URL };

export type FileTypes =
    | SetFilesAction
    | SetFileImageUrlAction;