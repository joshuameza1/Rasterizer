

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const modal = document.getElementById('errorModal');
    const span = document.getElementsByClassName("close")[0];

    dropArea.addEventListener('dragenter', preventDefaults, false);
    dropArea.addEventListener('dragover', preventDefaults, false);
    dropArea.addEventListener('drop', handleDrop, false);

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});

// Function to handle dropped files

async function handleDrop(e) {
    e.preventDefault();
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);  // Convert FileList to Array for easier manipulation


    // Load XML files
    const maskedSectionsFilePath = '../assets/xml/masked_sections.xml';

    const maskedSectionsXML = await fetchAndParseMaskedSectionsXML(maskedSectionsFilePath);

    if (!maskedSectionsXML || !maskedSectionsXML.width || !maskedSectionsXML.height || !maskedSectionsXML.sections.length) {
        ipcRenderer.send('log', 'Failed to fetch or parse XML file for required dimensions');
        displayError('Failed to fetch or parse XML file for required dimensions.');
        return;
    }
    const { width: requiredWidth, height: requiredHeight, sections: maskedSections } = maskedSectionsXML;

    const newCanvasFilePath = '../assets/xml/new_canvas.xml';
    const newCanvasXML = await fetchAndParseNewCanvasXML(newCanvasFilePath);
    if (!newCanvasXML || !newCanvasXML.width || !newCanvasXML.height || !newCanvasXML.sections.length) {
        ipcRenderer.send('log', 'Failed to fetch or parse XML file for required dimensions');
        displayError('Failed to fetch or parse XML file for required dimensions.');
        return;
    }


    const { width: canvasWidth, height: canvasHeight, sections: transformedSections } = newCanvasXML;


    if (files.length === 1) {
        processSingleFile(files[0], requiredWidth, requiredHeight, maskedSections, canvasWidth, canvasHeight, transformedSections);
    } else {
        processMultipleFiles(files, requiredWidth, requiredHeight, maskedSections, canvasWidth, canvasHeight, transformedSections);
    }
}

function processSingleFile(file, requiredWidth, requiredHeight, maskedSections, canvasWidth, canvasHeight, transformedSections) {
    if (!file.type.startsWith('image/')) {
        displayError('The dropped file is not an image.');
        return;
    }

    const img = new Image();
    img.onload = () => {
        if (img.width === requiredWidth && img.height === requiredHeight) {
            processAndDownloadImage(file, maskedSections, transformedSections,  canvasWidth, canvasHeight);
        } else {
            displayError(`File ${file.name} dimensions (${img.width}x${img.height}) do not match the required dimensions (${requiredWidth}x${requiredHeight}).`);
        }
    };
    img.onerror = () => displayError(`Failed to load image ${file.name}.`);
    img.src = URL.createObjectURL(file);
}


function processMultipleFiles(files, requiredWidth, requiredHeight, maskedSections, canvasWidth, canvasHeight, transformedSections) {
    let validationPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(`The file ${file.name} is not an image.`);
                return;
            }

            const img = new Image();
            img.onload = () => {
                if (img.width === requiredWidth && img.height === requiredHeight) {
                    resolve(file); // Image is valid
                } else {
                    reject(`File ${file.name} dimensions (${img.width}x${img.height}) do not match the required dimensions (${requiredWidth}x${requiredHeight}).`);
                }
            };
            img.onerror = () => reject(`Failed to load image ${file.name}.`);
            img.src = URL.createObjectURL(file);
        });
    });

    Promise.all(validationPromises)
        .then(validFiles => {
            // All files are valid, process ZIP
            processAndDownloadZip(validFiles, maskedSections, transformedSections,  canvasWidth, canvasHeight);
        })
        .catch(error => {
            // Display error for the first invalid file encountered
            displayError(error);
        });
}




function displayError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = "block";
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function processAndDownloadImage(file, maskedSections, transformedSections,  canvasWidth, canvasHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
        try {
            // Apply masks based on XML sections
            maskedSections.forEach((section, index) => {
                ctx.drawImage(img, section.x, section.y, section.width, section.height, transformedSections[index].x, transformedSections[index].y, section.width, section.height);
            });

            canvas.toBlob(blob => {
                const newFileName = getRasterFileName(file.name);
                saveFile(blob, newFileName);  // Use saveFile specifically for single images
            });
        } catch (error) {
            ipcRenderer.send('log', `Error processing image: ${error}`);
            displayError(`Error processing image: ${file.name}. Check console for details.`);
            console.error(`Error processing image: ${error}`);
        }
    };
    img.onerror = () => {
        ipcRenderer.send('log', 'Error loading image for processing.');
        displayError('Error loading image.');
    };
    img.src = URL.createObjectURL(file); // This needs to be set last
}


function processAndDownloadZip(files, maskedSections, transformedSections,  canvasWidth, canvasHeight) {
    const zip = new JSZip(); // Create a JSZip instance
    let count = 0; // To count processed files

    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            displayError('One or more files are not images.');
            return;
        }

        const img = new Image();
        img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d');

                maskedSections.forEach((section, index) => {
                    ctx.drawImage(img, section.x, section.y, section.width, section.height, transformedSections[index].x, transformedSections[index].y, section.width, section.height);
                });

                canvas.toBlob(blob => {
                    const newFileName = getRasterFileName(file.name);
                    zip.file(newFileName, blob, {binary: true});
                    count++;

                    // Check if all files are processed
                    if (count === files.length) {
                        zip.generateAsync({type: 'blob'}).then(content => {
                            saveZipFile(content, 'CONVERTED_RASTER_IMAGES'); // Uses saveZipFile to name the zip file with the current date
                        });
                    }
                });
            
        };
        img.onerror = () => {
            displayError(`Failed to load image ${file.name}.`);
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Generates a new filename with '_RASTER' appended before the file extension.
 * @param {string} originalName - The original file name.
 * @returns {string} - The new filename with '_RASTER' appended.
 */
function getRasterFileName(originalName) {
    const dotIndex = originalName.lastIndexOf('.');
    if (dotIndex === -1) return originalName + '_RASTER';  // No extension found
    return originalName.substring(0, dotIndex) + '_RASTER' + originalName.substring(dotIndex);
}







function saveFile(blob, filename) {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    ipcRenderer.send('log', `${filename} has been saved.`);
}

function saveZipFile(blob, baseFilename) {
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10); // Formats the date to 'YYYY-MM-DD'
    const timeString = date.toTimeString().slice(0, 8).replace(/:/g, '-'); // Formats time to 'HH-MM-SS' and replaces colons with dashes for filename compatibility
    const filename = `${baseFilename}_${dateString}_${timeString}.zip`;

    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename; // Uses the newly created filename
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    console.log(`Saved zip file as ${filename}`); // Optional: Log the filename
}



// New function to fetch and parse XML for dimensions and sections
async function fetchAndParseMaskedSectionsXML(filePath) {
    try {
        const response = await fetch(filePath);
        const xmlString = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        const width = parseInt(xmlDoc.getElementsByTagName('width')[0].textContent);
        const height = parseInt(xmlDoc.getElementsByTagName('height')[0].textContent);
        const sectionsNodes = xmlDoc.getElementsByTagName('section');
        const sections = Array.from(sectionsNodes).map(sec => ({
            x: parseInt(sec.getElementsByTagName('x')[0].textContent),
            y: parseInt(sec.getElementsByTagName('y')[0].textContent),
            width: parseInt(sec.getElementsByTagName('width')[0].textContent),
            height: parseInt(sec.getElementsByTagName('height')[0].textContent),
        }));

        return { width, height, sections };
    } catch (error) {
        console.error("Failed to fetch or parse XML file:", error);
        return null;  // Return null to signify failure
    }
}


// New function to fetch and parse XML for dimensions and sections
async function fetchAndParseNewCanvasXML(filePath) {
    try {
        const response = await fetch(filePath);
        const xmlString = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        const width = parseInt(xmlDoc.getElementsByTagName('width')[0].textContent);
        const height = parseInt(xmlDoc.getElementsByTagName('height')[0].textContent);
        const sectionsNodes = xmlDoc.getElementsByTagName('section');
        const sections = Array.from(sectionsNodes).map(sec => ({
            x: parseInt(sec.getElementsByTagName('x')[0].textContent),
            y: parseInt(sec.getElementsByTagName('y')[0].textContent)
        }));

        return { width, height, sections };
    } catch (error) {
        console.error("Failed to fetch or parse XML file:", error);
        return null;  // Return null to signify failure
    }
}




// Function to load image asynchronously
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Function to fetch XML file asynchronously
async function fetchXMLFile(filePath) {
    try {
        const response = await fetch(filePath);
        const xmlString = await response.text();
        return xmlString;
    } catch (error) {
        console.error('Error fetching XML file:', error);
        return null;
    }
}

// Function to parse the XML file and extract masked sections
function parseMaskedSectionsXML(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const sections = Array.from(xmlDoc.getElementsByTagName('section')).map(section => ({
        x: parseInt(section.getElementsByTagName('x')[0].textContent),
        y: parseInt(section.getElementsByTagName('y')[0].textContent),
        width: parseInt(section.getElementsByTagName('width')[0].textContent),
        height: parseInt(section.getElementsByTagName('height')[0].textContent)
    }));
    return sections;
}

// Function to parse the XML file and extract canvas dimensions and masked sections positions
function parseCanvasXML(xmlString) {
    // Parse the XML string
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

    // Extract canvas dimensions
    const canvas = xmlDoc.getElementsByTagName('canvas')[0];
    const canvasWidth = parseInt(canvas.getElementsByTagName('width')[0].textContent);
    const canvasHeight = parseInt(canvas.getElementsByTagName('height')[0].textContent);

    // Extract masked sections positions
    const positions = Array.from(canvas.getElementsByTagName('section')).map(section => ({
        x: parseInt(section.getElementsByTagName('x')[0].textContent),
        y: parseInt(section.getElementsByTagName('y')[0].textContent)
    }));

    return { canvasWidth, canvasHeight, positions };
}
