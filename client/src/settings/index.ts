import { workspace } from 'vscode';

export const EXT_NAME = 'reactTsScss';

export const getDefaultSettings = () => {
	return workspace.getConfiguration(EXT_NAME);
};

const DEFAULT_SETTINGS = getDefaultSettings();

export class Settings {
	private _kebabCase: boolean | undefined = DEFAULT_SETTINGS.get('kebabcase');

	public get kebabCase(): boolean | undefined {
		return this._kebabCase;
	}

	private _camelCase: boolean | undefined = DEFAULT_SETTINGS.get('camelCase');

	public get camelCase(): boolean | undefined {
		return this._camelCase;
	}

	private _autoComplete: boolean | undefined = DEFAULT_SETTINGS.get('autoComplete')

	public get autoComplete(): boolean | undefined {
		return this._autoComplete;
	}

	private _peek: boolean | undefined = DEFAULT_SETTINGS.get('peek')

	public get peek(): boolean | undefined {
		return this._peek;
	}

	private _definition: boolean | undefined = DEFAULT_SETTINGS.get('definition')

	public get definition(): boolean | undefined {
		return this._definition;
	}

	private _references: boolean | undefined = DEFAULT_SETTINGS.get('references')

	public get references(): boolean | undefined {
		return this._references;
	}


}