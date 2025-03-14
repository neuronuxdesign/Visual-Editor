// /*
// GET REQUEST
// */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs')

import { hexToRgba } from "./hexToRGBA.js";

import FigmaApi from "../api/figma-api.js"
import tokenFile from "../token/token.json" assert { type: "json" };


// const FILE_KEY = "hD9z72BLcZFCyoesHSppxD"
// const FILE_KEY = "lD6lGy8minugJQEX9go3Wg"
// const FILE_KEY = "DkAAZve1ubDG8QdfLLzfUF"
const FILE_KEY = "DkAAZve1ubDG8QdfLLzfUF"
const PERSONAL_ACCESS_TOKEN = process.env.FIGMA_TOKEN;

const COLLECTION_ID = "VariableCollectionId:1:1116"

const filterResponceByCollection = (data) => {
    const filtered = {
        meta: {
            variableCollections: {},
            variables: {},
        }
    };

    filtered.meta.variableCollections[COLLECTION_ID] = data.meta.variableCollections[COLLECTION_ID];

    const { variables } = data.meta;
    Object.keys(variables).forEach(variableId => {
        if(variables[variableId].variableCollectionId === COLLECTION_ID ){
            filtered.meta.variables[variableId] = variables[variableId];
        }
    })

    return filtered;
}

async function getData(){
    const fileKey = FILE_KEY
    const { getLocalVariables } = FigmaApi(PERSONAL_ACCESS_TOKEN)

    const localVariables = await getLocalVariables(fileKey);
    console.log(localVariables)

    // const filteredData = filterResponceByCollection(localVariables);
    const data = JSON.stringify(localVariables, null, 4)

    fs.writeFile('../storybook-demo/src/json/variable.json', data, 'utf8', (err) => {
        if(err){
            console.log('Error')
            console.log(err)
        }
    })

}

// getData()

/*
    POST REQUEST
*/
// mock file with write access to update variables
const postURL = `https://api.figma.com/v1/files/${FILE_KEY}/variables/`
// const variableCollectionId = "VariableCollectionId:1:1116"
const variableCollectionId = "VariableCollectionId:1:2"

// const postURL ='https://api.figma.com/v1/files/JR5tmX06VVx9DLFKLRFOIK/variables';
// const variableCollectionId = "VariableCollectionId:1:2";



async function postData(){
 //   const jsonResponse = await fetch('./postVariable.json')
 //    const jsonData = await jsonResponse.json()
 //
    const variableId = "VariableID:1:3";
    const resultColor = hexToRgba(tokenFile.colors[0].action[0].ebl.action.color);
    console.log("Affected color: ", resultColor);
    const testData = {
        "variables": [
            {
                "action": "UPDATE",
                "id": variableId,
                "variableCollectionId": variableCollectionId,
                "description": "Item description for variable",

            }
        ],
        "variableModeValues": [
            {
                "variableId": variableId,
                "modeId": "1:0",
                "value": resultColor
            }
        ]
    }

    const response = await fetch(postURL, {
        method: 'POST',
        body: JSON.stringify(testData),
        headers: {
            'X-Figma-Token': PERSONAL_ACCESS_TOKEN,
            'Content-Type': 'application/json'
        },
    })
    const jsonData = await response.json()
    console.log(jsonData)
}

postData();
