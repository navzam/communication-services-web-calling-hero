const SET_FILES = 'SET_FILES';

interface SetFilesActionFile {
    id: string;
    filename: string;
    size: number;
    imageUrl: string | null;
}

interface SetFilesAction {
    type: typeof SET_FILES;
    files: SetFilesActionFile[];
}

export const setFiles = (files: SetFilesActionFile[]): SetFilesAction => {
    return {
        type: SET_FILES,
        files
    };
};

export { SET_FILES };

export type FileTypes =
    | SetFilesAction;