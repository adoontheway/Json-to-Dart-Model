import * as copyPaste from "copy-paste";
import { ViewColumn, window } from "vscode";
import * as changeCase from "change-case";
import * as fs from "fs";
import { ModelGenerator } from "./model_generator";
import { ClassDefinition } from "./syntax";

export function getClipboardText() {
    try {
        return Promise.resolve(copyPaste.paste());
    } catch (error) {
        return Promise.reject(error);
    }
}

export function handleError(error: Error) {
    window.showErrorMessage(error.message);
}

export function pasteToMarker(content: string) {
    const { activeTextEditor } = window;

    return activeTextEditor?.edit(editBuilder => {
        editBuilder.replace(activeTextEditor.selection, content);
    });
}

export function getSelectedText(): Promise<string> {
    const { selection, document } = window.activeTextEditor!;
    return Promise.resolve(document.getText(selection).trim());
}

export const validateLength = (text: any) => {
    if (text.length === 0) {
        return Promise.reject(new Error("Nothing selected"));
    } else {
        return Promise.resolve(text);
    }
};

export function getViewColumn(): ViewColumn {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
        return ViewColumn.One;
    }

    switch (activeEditor.viewColumn) {
        case ViewColumn.One:
            return ViewColumn.Two;
        case ViewColumn.Two:
            return ViewColumn.Three;
    }

    return activeEditor.viewColumn as any;
}

export function parseJson(json: string): { [key: string]: any } {
    const tryEval = (str: any) => eval(`const a = ${str}; a`);

    try {
        return JSON.parse(json);
    } catch (ignored) { }

    try {
        return tryEval(json);
    } catch (error) {
        return new Error("Selected string is not a valid JSON");
    }
}

export function isArray(value: any): boolean {
    return Array.isArray(value);
}

export function isMap(value: any): boolean {
    return Object.keys(value).length !== 0
        && Object.values(value).every(item => typeof item === typeof Object.values(value)[0]);
}

export function mapTsTypeToDartType(type: string, key: String, obj: any): string {
    const types: { [name: string]: string } = {
        "integer": "int",
        "string": "String",
        "boolean": "bool",
        "object": changeCase.pascalCase(key.toLowerCase()),
        "map": `Map<String,String>`,
        "double": "double"
    };
    return types[type] ?? type;
}

export function isPremitiveType(type: string, key: String, obj: any): boolean {
    const types = [
        "int",
        "string",
        "double",
        "boolean"
    ];
    return types.includes(type);
}

export async function createClass(
    className: string,
    targetDirectory: string,
    object: string
) {

    var modelGenerator = new ModelGenerator(className);
    var classes: Array<ClassDefinition> = modelGenerator.generateDartClasses(object);

    return new Promise(async (resolve, reject) => {

        classes.map((c) => {
            const snakeClassName = changeCase.snakeCase(c.getName().toLowerCase());
            const targetPath = `${targetDirectory}/models/${snakeClassName}.dart`;
            if (fs.existsSync(targetPath)) {
                throw Error(`${snakeClassName}.dart already exists`);
            }

            fs.writeFile(
                targetPath,
                c.toString(),
                "utf8",
                error => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                }
            );
        });
    });
}