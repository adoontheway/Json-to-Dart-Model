import * as _ from "lodash";
import * as fs from "fs";

import { Uri, window } from "vscode";
import { runDartFormat, generateClass, runBuildRunner } from "../index";
import { getUserInput, Input, promptForBaseClassName, promptForTargetDirectory } from "../input";
import { getSelectedText, handleError, validateLength } from "../lib";
import { PathType, Settings } from "../settings";
import { getConfiguration } from "../utils";

export const transformFromSelection = async (uri: Uri) => {
    const primaryInput = getConfiguration();
    const className = await promptForBaseClassName();
    let input: Input;

    if (_.isNil(className) || className.trim() === "") {
        window.showErrorMessage("The class name must not be empty");
        return;
    }

    if (primaryInput && primaryInput.primaryConfiguration) {
        input = primaryInput;
    } else {
        input = await getUserInput();
    }

    let targetDirectory: String | undefined;

    if (_.isNil(_.get(uri, "fsPath")) || !fs.lstatSync(uri.fsPath).isDirectory()) {
        targetDirectory = await promptForTargetDirectory();
        if (_.isNil(targetDirectory)) {
            window.showErrorMessage("Please select a valid directory");
            return;
        }
    } else {
        targetDirectory = uri.fsPath;
    }

    const json: string = await getSelectedText().then(validateLength).catch(handleError);

    const config: Settings = {
        className: className,
        targetDirectory: <string>targetDirectory,
        object: json,
        input: input,
        pathType: PathType.Standard,
    };
    // Create new settings.
    const settings = new Settings(config);

    await generateClass(settings).then((_) => {
        runDartFormat(<string>targetDirectory, "models");
        if (input.generate && input.runBuilder) {
            runBuildRunner();
        }
    }).catch(handleError);
};