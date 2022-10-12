import { workspace } from 'vscode';

export const EXT_NAME = 'reactTsScss';

export const getSettings = () => {
	return workspace.getConfiguration(EXT_NAME);
};


export class Settings {
	public get autoComplete(): boolean | undefined {
		return getSettings().get('autoComplete');
	}

	public set autoComplete(v: boolean | undefined) {
		getSettings().update('autoComplete', v);
	}



	public get peek(): boolean | undefined {
		return getSettings().get('peekProperties');
	}


	public set peek(v: boolean | undefined) {
		workspace.getConfiguration(EXT_NAME).update('peek', v);
	}


	public get definition(): boolean | undefined {
		return getSettings().get('definition');
	}

	public set definition(v: boolean | undefined) {
		workspace.getConfiguration(EXT_NAME).update('definition', v);
	}
}

export default new Settings();