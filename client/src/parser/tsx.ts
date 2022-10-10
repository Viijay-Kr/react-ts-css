/* eslint-disable no-console */
import { parse } from '@babel/parser';
import traverse, { Scope } from '@babel/traverse';
import { Identifier, ImportDeclaration, ImportDefaultSpecifier, StringLiteral } from '@babel/types';

export interface SourceIdentifier {
	identifier: Identifier;
	import: ImportDeclaration
}
export const parseTsx = (content: string, offset: number): Promise<{
	sourceIdentifiers: SourceIdentifier[];
	targetLiteral: StringLiteral;
	targetIdentifier: Identifier;
} | undefined> => {
	const ast = parse(content, {
		sourceType: 'module',
		errorRecovery: true,
		plugins: ['jsx', 'typescript',],
	});
	let targetLiteral: StringLiteral;
	let targetIdentifier: Identifier;
	const sourceIdentifiers: SourceIdentifier[] = [];
	return new Promise((resolve, reject) => {
		try {
			traverse(ast, {
				ImportDeclaration(path) {
					if (path.node.source.value.endsWith('.scss') || path.node.source.value.endsWith('.css')) {
						const importNode = path.node;
						const scope = new Scope(path, path.scope);
						scope.traverse(path.node, {
							Identifier(path) {
								sourceIdentifiers.push({
									identifier: path.node,
									import: importNode,
								});
							},
						});
					}
				},
				StringLiteral(path) {
					const sourceIdentifierNames = sourceIdentifiers.map(i => i.identifier.name);
					if (path.node.start! <= offset && offset <= path.node.end!) {
						const parent = path.parent;
						const _this = path.node;
						const scope = new Scope(path.parentPath, path.parentPath.scope);
						scope.traverse(parent, {
							Identifier(path) {
								if (sourceIdentifierNames.includes(path.node.name)) {
									targetLiteral = _this;
									targetIdentifier = path.node;
								}
							}
						});
					}
				},
				exit(path) {
					if (path.node.type === 'Program') {
						resolve({
							sourceIdentifiers,
							targetIdentifier,
							targetLiteral,
						});
					}
				}
			});
		} catch (e) {
			reject(e);
		}
	});
};

export const parseImports = (content: string): Promise<[ImportDefaultSpecifier[], ImportDeclaration[]] | []> => {
	const ast = parse(content, {
		sourceType: 'module',
		plugins: ['typescript']
	});
	const sourceIdentifiers: ImportDefaultSpecifier[] = [];
	const sourceDeclarations: ImportDeclaration[] = [];
	return new Promise((resolve, reject) => {
		try {
			traverse(ast, {
				ImportDefaultSpecifier(path) {
					sourceIdentifiers.push(path.node);
				},
				ImportDeclaration(path) {
					sourceDeclarations.push(path.node);
				},
				exit(path) {
					if (path.node.type === 'Program') {
						resolve([sourceIdentifiers, sourceDeclarations]);
					}
				}
			});
		} catch (e) {
			reject(e);
		}
	});
};