const { exec } = require("child_process");
const { mkdirSync, statSync, readdirSync } = require("fs");
const Jimp = require("jimp");
const { join } = require("path");
const colors = require("colors");
colors.enable();

const currentDirectory = process.cwd();
const imagesFolder = join(currentDirectory, "images");
const outDir = join(currentDirectory, "dist");
console.log("combining you images");
console.log("please wait ..");
// make the out dir folder if not exists
try {
    mkdirSync(outDir);
}
catch (err) {

}

// if the images folder not found, exit the script
try {
    if (!(statSync(imagesFolder).isDirectory())) {
        process.exit(1);
    }
}
catch (err) {
    process.exit(1);
}

const maxRows = 3;
const maxCols = 4;

const combinedImgDimension = {
    width: ((1024) / maxCols),
    height: ((1024) / maxRows),
};

const images = readdirSync(imagesFolder);
const maxImages = maxCols * maxRows;
const positions = [];

for (let i = 0; i < maxRows; i++) {
    for (let j = 0; j < maxCols; j++) {
        if (!positions[i]) {
            positions[i] = [];
        }

        positions[i][j] = {
            x: j * combinedImgDimension.width, // set the margin
            y: i * combinedImgDimension.height, // set the margin
        }
    }
}

/**
 *
 * @param {number} index
 * @param {Jimp} target
 */

async function combineOne(path, positions, target) {
    try {

        const data = await Jimp.read(path);
        data.resize(combinedImgDimension.width, combinedImgDimension.height).scale(0.97);
        target.composite(data, positions.x, positions.y);
    }
    catch (err) {
        console.log(err);
        exec("pause");
    }
}

/**
 *
 * @param {number} imgIndex
 */
function getPositionOfImg(imgIndex) {
    let row = Math.floor(imgIndex / maxCols); // get the row that contains the columns of the images positions
    let col = imgIndex % maxCols; // get the column that contains the image position
    return positions[row][col];
};

/**
 * 
 * @param {string[]} paths 
 * @returns {string[][]}
 */
function splitToChunks(paths) {
    // split the images names array to array of arrays, every nested array contains maximum 12 img path
    // and ensure the image path is png or jpeg or jpg
    let result = new Array();

    let resultPointer = 0;
    for (let i in paths) {
        if (!paths[i].endsWith(".png") && !paths[i].endsWith(".jpeg") && !paths[i].endsWith(".jpg")) {
            continue;
        }


        if (result[resultPointer]) {

            if (result[resultPointer].length >= maxImages) { // if image chunks length greater than max images will be combined into one image
                resultPointer++; // increment the pointer
                result[resultPointer] = []; // create a new row
            }

            result[resultPointer].push(paths[i]); // push the image path to chunks
        }
        else {
            result[resultPointer] = [paths[i]]; // create a new image chunk
        }
    }

    return result;
}


// function that combine a chunk images to one image
/**
 * 
 * @param {string[]} paths 
 * @param {string} outfile 
 */
async function mergeImages(imagesNames, outfile, imagesIndexInSplited) {
    const outFile = join(outDir, outfile);
    const target = new Jimp(1024, 1024);
    for (i in imagesNames) {
        const imgName = imagesNames[i];
        const path = join(imagesFolder, imgName);
        const imgIndexInImages = imagesIndexInSplited * maxImages + parseInt(i);
        const imagePosition = getPositionOfImg(imgIndexInImages % maxImages);

        await combineOne(path, imagePosition, target);
    }

    target.write(outFile);
}

// first, split the images paths
// then, log the length of images that will be created
// then, loop on every image will be created and  call the mergeImages func

async function main() {
    const splited = splitToChunks(images);

    console.log(`\nWill be created ${splited.length} chunks`.yellow);

    for (let i = 0; i < splited.length; i++) {
        const fileName = i + 1 + ".png";
        console.log(`\nCreating image #${i + 1}/${splited.length}`.green, "--".yellow, "file name:".cyan, fileName.magenta);
        await mergeImages(splited[i], fileName, i);
    };
}




main();